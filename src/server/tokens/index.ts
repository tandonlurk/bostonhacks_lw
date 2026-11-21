import type { TokensResponse, TokenLedgerEntry } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { memoryGame } from "@/server/points/state";
import { ScoringError } from "@/server/points/rules";
export async function tokenWallet(riderId: string): Promise<TokensResponse> {
  if (typeof riderId !== "string" || !riderId.trim() || riderId.length > 200) throw new ScoringError("invalid_rider", "riderId is required.");
  let ledger: TokenLedgerEntry[];
  if (hasDb()) {
    const sql=getSql();
    if (!(await sql`select id from riders where id=${riderId}`).length) throw new ScoringError("rider_not_found", "Unknown rider.",404);
    const rows=await sql`select delta,reason,created_at,tx_signature from token_ledger where rider_id=${riderId} order by id desc`;
    ledger=rows.map(row=>({delta:row.delta,reason:row.reason,createdAt:new Date(row.created_at).toISOString(),...(row.tx_signature?{txSignature:row.tx_signature}:{})}));
  } else {
    const state=memoryGame();
    if(!state.riders.has(riderId)) throw new ScoringError("rider_not_found", "Unknown rider.",404);
    ledger=state.tokens.filter(t=>t.riderId===riderId).slice().reverse().map(({delta,reason,createdAt,txSignature})=>({delta,reason,createdAt,...(txSignature?{txSignature}:{})}));
  }
  return {balance:ledger.reduce((sum,e)=>sum+e.delta,0),ledger};
}
