import { randomUUID } from "node:crypto";
import { TEAM_ROUTE_IDS } from "@/contracts";
import type { DemoSimAction, DemoSimResponse } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { awardPoints, GAME_LOCK, registerMemoryRider } from "@/server/points";
import { memoryGame } from "@/server/points/state";
import { ScoringError } from "@/server/points/rules";
import { projectDistricts } from "@/server/districts";

export const TICK_MS = 5000;
export const SIM_RIDERS = TEAM_ROUTE_IDS.flatMap(team => Array.from({ length: 5 }, (_, i) => ({
  riderId: `rdr_sim_${team.toLowerCase()}_${i}`, displayName: `Demo ${team} ${i + 1}`, homeTeamRouteId: team, isSimulated: true,
})));
interface SimState { running: boolean; runId: string; startedAt: number; processedTick: number }
const shared = globalThis as unknown as { __tcitySim?: SimState; __tcitySimAdvance?: Promise<void> };
function memoryState(): SimState {
  return shared.__tcitySim ??= { running: false, runId: randomUUID(), startedAt: Date.now(), processedTick: -1 };
}
async function readState(): Promise<SimState> {
  if (!hasDb()) return memoryState();
  const [row] = await getSql()`select running, run_id, started_at, processed_tick from demo_sim_state where id='main'`;
  return row ? { running: row.running, runId: row.run_id, startedAt: new Date(row.started_at).getTime(), processedTick: row.processed_tick }
    : { running: false, runId: "", startedAt: Date.now(), processedTick: -1 };
}
async function seedRiders() {
  if (!hasDb()) { SIM_RIDERS.forEach(registerMemoryRider); return; }
  for (const rider of SIM_RIDERS) await getSql()`insert into riders (id,display_name,home_team_route_id,is_simulated)
    values (${rider.riderId},${rider.displayName},${rider.homeTeamRouteId},true) on conflict (id) do nothing`;
}
async function advance() {
  const state = await readState();
  if (!state.running) return;
  await seedRiders();
  const tick = Math.floor((Date.now() - state.startedAt) / TICK_MS);
  // Bound cold-start catch-up to two minutes rather than replaying hours of awards.
  const first = Math.max(state.processedTick + 1, tick - 23);
  for (let t = first; t <= tick; t++) {
    const current = await readState();
    if (!current.running || current.runId !== state.runId) return;
    await Promise.all(SIM_RIDERS.map(rider => awardPoints({ riderId: rider.riderId, teamRouteId: rider.homeTeamRouteId,
      type: "ride_stop", amount: 1, ref: `sim:${state.runId}:${t}:${rider.riderId}` })));
  }
  if (!hasDb()) { if (memoryState().runId === state.runId) memoryState().processedTick = Math.max(memoryState().processedTick, tick); }
  else await getSql()`update demo_sim_state set processed_tick=greatest(processed_tick,${tick}) where id='main' and run_id=${state.runId}`;
}
export async function advanceSimulation(): Promise<void> {
  if (shared.__tcitySimAdvance) return shared.__tcitySimAdvance;
  shared.__tcitySimAdvance = advance();
  try { await shared.__tcitySimAdvance; } finally { shared.__tcitySimAdvance = undefined; }
}
export async function simulationControl(action: DemoSimAction): Promise<DemoSimResponse> {
  if (!["start", "stop", "reset"].includes(action)) throw new ScoringError("invalid_action", "Choose start, stop or reset.");
  if (shared.__tcitySimAdvance) await shared.__tcitySimAdvance;
  if (!hasDb()) {
    const state = memoryState();
    if (action === "reset") {
      state.running = false;
      const game = memoryGame();
      const simulated = new Set([...game.riders.values()].filter(r => r.isSimulated).map(r => r.riderId));
      game.events = game.events.filter(e => !simulated.has(e.riderId));
      game.tokens = game.tokens.filter(t => !simulated.has(t.riderId));
      simulated.forEach(id => game.riders.delete(id));
      state.runId = randomUUID(); state.processedTick = -1; state.startedAt = Date.now();
    } else if (action === "start" && !state.running) {
      state.running = true; state.startedAt = Date.now(); state.processedTick = -1; state.runId = randomUUID();
    } else if (action === "stop") state.running = false;
  } else {
    await getSql().begin(async sql => {
      await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
      if (action === "reset") {
        await sql`delete from riders where is_simulated=true`;
        const events = await sql<{ teamRouteId: typeof TEAM_ROUTE_IDS[number]; amount: number }[]>`select team_route_id as "teamRouteId", amount from point_events`;
        for (const district of projectDistricts(events)) {
          await sql`delete from district_lots where team_route_id=${district.teamRouteId}`;
          for (const lot of district.lots) await sql`insert into district_lots (team_route_id,lot_id,tier,points,x,y,kind)
            values (${district.teamRouteId},${lot.id},${lot.tier},${lot.points},${lot.x},${lot.y},${lot.kind})`;
        }
      }
      const [existing] = await sql`select running from demo_sim_state where id='main'`;
      if (action === "start" && existing?.running) return;
      await sql`insert into demo_sim_state (id,running,run_id,started_at,processed_tick)
        values ('main',${action === "start"},${randomUUID()},now(),-1)
        on conflict (id) do update set running=excluded.running, run_id=excluded.run_id, started_at=excluded.started_at, processed_tick=-1`;
    });
  }
  if (action === "start") await advanceSimulation();
  const state = await readState();
  const riders = hasDb() ? Number((await getSql()`select count(*) as count from riders where is_simulated=true`)[0].count)
    : [...memoryGame().riders.values()].filter(r => r.isSimulated).length;
  return { running: state.running, riders };
}

export async function isSimulationRunning(): Promise<boolean> { return (await readState()).running; }
