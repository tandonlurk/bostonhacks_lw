import { randomBytes } from "node:crypto";
import type { TransactionSql } from "postgres";
import seeds from "../../../data/perks.json";
import type { Perk, RedeemPerkResponse } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { GAME_LOCK } from "@/server/points";
import { memoryGame } from "@/server/points/state";
import { ScoringError } from "@/server/points/rules";

export const ROTATION_MS=3600000;
interface MemoryCatalog { window: number; perks: Map<string,Perk> }
const shared=globalThis as unknown as {__tcityPerks?:MemoryCatalog};
function rotation(at=Date.now()) {
  const window=Math.floor(at/ROTATION_MS);
  const active=Array.from({length:3},(_,i)=>seeds[(window+i)%seeds.length]);
  return {window,active,rotatesAt:new Date((window+1)*ROTATION_MS).toISOString()};
}
function catalogMemory(): MemoryCatalog {
  const current=rotation();
  if(!shared.__tcityPerks || shared.__tcityPerks.window!==current.window) {
    shared.__tcityPerks={window:current.window,perks:new Map(seeds.map(seed=>[seed.id,{id:seed.id,title:seed.title,partner:seed.partner,
      costTokens:seed.costTokens,remaining:seed.remaining,rotatesAt:current.rotatesAt}]))};
  }
  return shared.__tcityPerks;
}
async function syncCatalog(sql:TransactionSql) {
  const current=rotation();
  for(const seed of seeds) await sql`insert into perks (id,title,partner,cost_tokens,quantity_remaining,rotates_at)
    values (${seed.id},${seed.title},${seed.partner},${seed.costTokens},${seed.remaining},${current.rotatesAt})
    on conflict (id) do update set title=excluded.title,partner=excluded.partner,cost_tokens=excluded.cost_tokens,
      quantity_remaining=case when perks.rotates_at<=${new Date().toISOString()} then excluded.quantity_remaining else perks.quantity_remaining end,
      rotates_at=case when perks.rotates_at<=${new Date().toISOString()} then excluded.rotates_at else perks.rotates_at end`;
  return current;
}
export async function perkCatalog():Promise<Perk[]> {
  if(!hasDb()) {
    const catalog=catalogMemory();
    return rotation().active.map(seed=>({...catalog.perks.get(seed.id)!}));
  }
  return await getSql().begin(async sql=>{
    await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
    const current=await syncCatalog(sql);
    const rows=await sql`select id,title,partner,cost_tokens,quantity_remaining,rotates_at from perks where id in ${sql(current.active.map(p=>p.id))}`;
    return rows.map(r=>({id:r.id,title:r.title,partner:r.partner,costTokens:r.cost_tokens,remaining:r.quantity_remaining,rotatesAt:new Date(r.rotates_at).toISOString()}));
  });
}
export async function redeemPerk(riderId:string,perkId:string):Promise<RedeemPerkResponse> {
  if(typeof riderId!=="string" || !riderId.trim() || typeof perkId!=="string") throw new ScoringError("invalid_redemption","riderId and perkId are required.");
  const redemptionCode=`TCITY-${randomBytes(8).toString("hex").toUpperCase()}`;
  if(!hasDb()) {
    const state=memoryGame();const catalog=catalogMemory();
    if(!state.riders.has(riderId)) throw new ScoringError("rider_not_found","Unknown rider.",404);
    const perk=catalog.perks.get(perkId);
    if(!perk || !rotation().active.some(p=>p.id===perkId)) throw new ScoringError("perk_unavailable","This perk is not in the current rotation.",404);
    if(perk.remaining<=0) throw new ScoringError("perk_sold_out","This perk is sold out.",409);
    const balance=state.tokens.filter(t=>t.riderId===riderId).reduce((sum,t)=>sum+t.delta,0);
    if(balance<perk.costTokens) throw new ScoringError("insufficient_tokens","Earn more CitiTokens to redeem this perk.",409);
    // Validation and mutations run synchronously: concurrent requests cannot overspend.
    perk.remaining--;
    state.tokens.push({riderId,delta:-perk.costTokens,reason:`redeem:${perkId}`,ref:`redeem:${redemptionCode}`,createdAt:new Date().toISOString()});
    return {redemptionCode,tokensLeft:balance-perk.costTokens};
  }
  return await getSql().begin(async sql=>{
    await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
    if(!(await sql`select id from riders where id=${riderId}`).length) throw new ScoringError("rider_not_found","Unknown rider.",404);
    const current=await syncCatalog(sql);
    if(!current.active.some(p=>p.id===perkId)) throw new ScoringError("perk_unavailable","This perk is not in the current rotation.",404);
    const [perk]=await sql`select cost_tokens,quantity_remaining from perks where id=${perkId} for update`;
    if(!perk || perk.quantity_remaining<=0) throw new ScoringError("perk_sold_out","This perk is sold out.",409);
    const [wallet]=await sql`select coalesce(sum(delta),0)::int as balance from token_ledger where rider_id=${riderId}`;
    if(wallet.balance<perk.cost_tokens) throw new ScoringError("insufficient_tokens","Earn more CitiTokens to redeem this perk.",409);
    await sql`update perks set quantity_remaining=quantity_remaining-1 where id=${perkId}`;
    await sql`insert into redemptions (rider_id,perk_id,code) values (${riderId},${perkId},${redemptionCode})`;
    await sql`insert into token_ledger (rider_id,delta,reason,ref) values (${riderId},${-perk.cost_tokens},${`redeem:${perkId}`},${`redeem:${redemptionCode}`})`;
    return {redemptionCode,tokensLeft:wallet.balance-perk.cost_tokens};
  });
}
