import type { TransactionSql } from "postgres";
import { getSql, hasDb } from "@/server/db";
import { TEAM_ROUTE_IDS } from "@/contracts";
import type { AwardPointsInput, AwardPointsResult, LeaderboardResponse } from "@/contracts";
import { memoryGame } from "./state";
import type { PointEvent } from "./state";
import { awardResult, planAward, ScoringError, streakDays, validateAward } from "./rules";
import { projectDistricts } from "@/server/districts";
export { registerMemoryRider } from "./state";

// Shared by every game write (awards, claims, redemptions) in Postgres.
export const GAME_LOCK = 4262026;
export async function pointEvents(): Promise<PointEvent[]> {
  if (!hasDb()) return memoryGame().events;
  return await getSql()<PointEvent[]>`select rider_id as "riderId", team_route_id as "teamRouteId", type, amount, ref,
    to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt" from point_events order by id`;
}
export async function awardPoints(input: AwardPointsInput): Promise<AwardPointsResult> {
  return commitAward(input);
}
/** Record the domain completion in the same transaction as points and tokens. */
export async function awardCompletion(input: AwardPointsInput, kind: "hunt" | "landmark", id: string): Promise<AwardPointsResult> {
  return commitAward(input, { kind, id });
}
/** DB controls and late ticks share GAME_LOCK; stale runs become no-ops. */
export async function awardSimulatedStop(input: AwardPointsInput, runId: string): Promise<AwardPointsResult> {
  return commitAward(input, undefined, runId);
}
export async function awardPointsInTransaction(input: AwardPointsInput, sql: TransactionSql): Promise<AwardPointsResult> {
  return commitAward(input, undefined, undefined, sql);
}
async function commitAward(input: AwardPointsInput, completion?: { kind: "hunt" | "landmark"; id: string }, simRunId?: string, transaction?: TransactionSql): Promise<AwardPointsResult> {
  validateAward(input);
  if (!hasDb()) {
    const state = memoryGame();
    if (!state.riders.has(input.riderId)) throw new ScoringError("rider_not_found", "Create a rider before earning points.", 404);
    // No awaits: planning and commit are one synchronous operation in memory.
    const added = planAward(input, state.events, new Date());
    const result = awardResult(state.events, added, input.riderId);
    state.events.push(...added);
    if (result.tokensAwarded > 0) state.tokens.push({ riderId: input.riderId, delta: result.tokensAwarded,
      reason: `points:${input.type}`, ref: `points:${input.ref}`, createdAt: added[0].createdAt });
    return result;
  }
  const commit = async (sql: TransactionSql) => {
    await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
    if (simRunId !== undefined) {
      const [run] = await sql`select running,run_id from demo_sim_state where id='main'`;
      if (!run?.running || run.run_id !== simRunId) return { pointsAwarded: 0, tokensAwarded: 0 };
    }
    const riders = await sql`select id from riders where id = ${input.riderId}`;
    if (!riders.length) throw new ScoringError("rider_not_found", "Create a rider before earning points.", 404);
    const events = await sql<PointEvent[]>`select rider_id as "riderId", team_route_id as "teamRouteId", type, amount, ref,
      to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt" from point_events
      where rider_id = ${input.riderId} or ref = ${input.ref} order by id`;
    const added = planAward(input, events, new Date());
    const result = awardResult(events, added, input.riderId);
    for (const event of added) {
      await sql`insert into point_events (rider_id, team_route_id, type, amount, ref, created_at)
        values (${event.riderId}, ${event.teamRouteId}, ${event.type}, ${event.amount}, ${event.ref}, ${event.createdAt})`;
    }
    if (result.tokensAwarded > 0) await sql`insert into token_ledger (rider_id, delta, reason, ref)
      values (${input.riderId}, ${result.tokensAwarded}, ${`points:${input.type}`}, ${`points:${input.ref}`})`;
    if (added.length) {
      const [row] = await sql`select coalesce(sum(amount),0)::int as total from point_events where team_route_id = ${input.teamRouteId}`;
      const district = projectDistricts([{ ...added[0], amount: row.total }]).find(d => d.teamRouteId === input.teamRouteId)!;
      for (const lot of district.lots) await sql`insert into district_lots (team_route_id,lot_id,tier,points,x,y,kind)
        values (${input.teamRouteId},${lot.id},${lot.tier},${lot.points},${lot.x},${lot.y},${lot.kind})
        on conflict (team_route_id,lot_id) do update set tier=excluded.tier, points=excluded.points`;
    }
    if (completion?.kind === "hunt") await sql`insert into hunt_completions (rider_id,clue_id)
      values (${input.riderId},${completion.id}) on conflict do nothing`;
    if (completion?.kind === "landmark") await sql`insert into landmark_claims (rider_id,landmark_id)
      values (${input.riderId},${completion.id}) on conflict do nothing`;
    return result;
  };
  return transaction ? commit(transaction) : await getSql().begin(commit);
}
export async function getRiderStats(riderId: string) {
  const events = (await pointEvents()).filter(e => e.riderId === riderId);
  let tokens: number;
  if (hasDb()) {
    const [row] = await getSql()`select coalesce(sum(delta),0)::int as balance from token_ledger where rider_id = ${riderId}`;
    tokens = row.balance;
  } else tokens = memoryGame().tokens.filter(t => t.riderId === riderId).reduce((sum, t) => sum + t.delta, 0);
  return { points: events.reduce((sum, e) => sum + e.amount, 0), tokens, streakDays: streakDays(events, new Date()) };
}
export async function leaderboard(): Promise<LeaderboardResponse> {
  const events = await pointEvents();
  const teams = TEAM_ROUTE_IDS.map(teamRouteId => {
    const own = events.filter(e => e.teamRouteId === teamRouteId && e.amount > 0);
    return { teamRouteId, points: own.reduce((sum, e) => sum + e.amount, 0), rank: 0, riders: new Set(own.map(e => e.riderId)).size };
  }).sort((a, b) => b.points - a.points);
  teams.forEach((team, i) => { team.rank = i > 0 && teams[i - 1].points === team.points ? teams[i - 1].rank : i + 1; });
  return { updatedAt: new Date().toISOString(), teams };
}
export async function districts() { return projectDistricts(await pointEvents()); }
