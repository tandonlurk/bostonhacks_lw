import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require } from '../../../scripts/sim/register-ts.mjs';
const {perkCatalog,redeemPerk,ROTATION_MS}=require('@/server/perks/index.ts');
const {tokenWallet}=require('@/server/tokens/index.ts');
const {registerMemoryRider,awardPoints}=require('@/server/points/index.ts');

test('memory redemptions cannot overdraft or oversell; rotation replenishes stock',async t=>{
 registerMemoryRider({riderId:'perk_one',displayName:'One',homeTeamRouteId:'Green'});
 const list=await perkCatalog();assert.equal(list.length,3);assert.ok(list.every(p=>p.title.includes('demo only')));
 const perk=list.sort((a,b)=>a.costTokens-b.costTokens)[0];
 await assert.rejects(redeemPerk('perk_one',perk.id),e=>e.code==='insufficient_tokens');
 await awardPoints({riderId:'perk_one',teamRouteId:'Green',type:'landmark',amount:perk.costTokens*10,ref:'perk_one:fund'});
 const one=await Promise.allSettled(Array.from({length:20},()=>redeemPerk('perk_one',perk.id)));
 const won=one.filter(r=>r.status==='fulfilled');assert.equal(won.length,1);assert.match(won[0].value.redemptionCode,/^TCITY-DEMO-[A-F0-9]{16}$/);
 assert.equal((await tokenWallet('perk_one')).balance,0);
 const remaining=(await perkCatalog()).find(p=>p.id===perk.id).remaining;assert.equal(remaining,perk.remaining-1);
 registerMemoryRider({riderId:'perk_rich',displayName:'Rich',homeTeamRouteId:'Green'});
 await awardPoints({riderId:'perk_rich',teamRouteId:'Green',type:'landmark',amount:10000,ref:'perk_rich:fund'});
 const many=await Promise.allSettled(Array.from({length:100},()=>redeemPerk('perk_rich',perk.id)));
 assert.equal(many.filter(r=>r.status==='fulfilled').length,remaining);
 assert.equal((await perkCatalog()).find(p=>p.id===perk.id).remaining,0);
 assert.ok((await tokenWallet('perk_rich')).balance>=0);
 const at=Date.now();t.mock.method(Date,'now',()=>at+ROTATION_MS);
 const next=await perkCatalog();assert.notDeepEqual(next.map(p=>p.id),list.map(p=>p.id));assert.ok(next.every(p=>p.remaining>0));
 await assert.rejects(tokenWallet('missing'),e=>e.code==='rider_not_found');
});

test('Postgres last-stock race and injected failure keep balance, redemption and inventory atomic',{skip:!process.env.TCITY_TEST_DATABASE_URL},async()=>{
 process.env.DATABASE_URL=process.env.TCITY_TEST_DATABASE_URL;const {getSql}=require('@/server/db.ts');const sql=getSql();
 try{
  await sql`insert into riders (id,display_name,home_team_route_id) values ('perk_db','Test','Green')`;
  await awardPoints({riderId:'perk_db',teamRouteId:'Green',type:'landmark',amount:1000,ref:'perk_db:fund'});
  const perk=(await perkCatalog())[0];await sql`update perks set quantity_remaining=1 where id=${perk.id}`;
  const results=await Promise.allSettled(Array.from({length:20},()=>redeemPerk('perk_db',perk.id)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await tokenWallet('perk_db')).balance,100-perk.costTokens);
  await sql`update perks set quantity_remaining=1 where id=${perk.id}`;
  await sql.unsafe(`create or replace function tcity_test_redeem_failure() returns trigger language plpgsql as $$ begin if NEW.rider_id = 'perk_db' and NEW.delta < 0 then raise exception 'injected redeem failure'; end if; return NEW; end $$`);
  await sql.unsafe('create trigger tcity_test_redeem_failure before insert on token_ledger for each row execute function tcity_test_redeem_failure()');
  await assert.rejects(redeemPerk('perk_db',perk.id),/injected redeem failure/);
  const [stock]=await sql`select quantity_remaining from perks where id=${perk.id}`;assert.equal(stock.quantity_remaining,1);
  const [redemptions]=await sql`select count(*)::int as count from redemptions where rider_id='perk_db'`;assert.equal(redemptions.count,1);
  assert.equal((await tokenWallet('perk_db')).balance,100-perk.costTokens);
 }finally{
  await sql.unsafe('drop trigger if exists tcity_test_redeem_failure on token_ledger');await sql.unsafe('drop function if exists tcity_test_redeem_failure()');
  await sql`delete from riders where id='perk_db'`;await sql.end();delete process.env.DATABASE_URL;
 }
});
