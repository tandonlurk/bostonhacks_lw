// Rider + ride-session persistence (owner: A). Postgres when DATABASE_URL is set, else in-memory.
import { randomUUID } from "node:crypto";
import type { TeamRouteId } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { emptyState, type EngineState, type SessionData, type Sample } from "./engine";

export interface RiderRow {
  id: string;
  displayName: string;
  homeTeamRouteId: TeamRouteId;
  createdAt: string;
}

const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "")}`;

// ---------- memory backend ----------
interface Mem {
  riders: Map<string, RiderRow>;
  sessions: Map<string, SessionData>;
  active: Map<string, string>; // riderId -> sessionId
}
const g = globalThis as unknown as { __tcityRideMem?: Mem };
const mem = (): Mem =>
  (g.__tcityRideMem ??= { riders: new Map(), sessions: new Map(), active: new Map() });

// ---------- row mapping ----------
type SessionRow = {
  id: string;
  rider_id: string;
  status: SessionData["status"];
  vehicle_id: string | null;
  route_id: string | null;
  team_route_id: TeamRouteId | null;
  direction_id: number | null;
  stops_credited: number;
  points_awarded: number;
  manual: boolean;
  state: EngineState;
  started_at: Date;
  ended_at: Date | null;
};

function fromRow(r: SessionRow): SessionData {
  return {
    id: r.id,
    riderId: r.rider_id,
    status: r.status,
    vehicleId: r.vehicle_id,
    routeId: r.route_id,
    teamRouteId: r.team_route_id,
    directionId: r.direction_id === null ? null : (r.direction_id as 0 | 1),
    stopsCredited: r.stops_credited,
    pointsAwarded: r.points_awarded,
    manual: r.manual,
    state: { ...emptyState(), ...r.state },
    startedAt: r.started_at.toISOString(),
    endedAt: r.ended_at ? r.ended_at.toISOString() : null,
  };
}

// ---------- riders ----------
export async function createRider(displayName: string, homeTeamRouteId: TeamRouteId): Promise<RiderRow> {
  if (hasDb()) {
    const [r] = await getSql()<{ id: string; created_at: Date }[]>`
      insert into riders (display_name, home_team_route_id)
      values (${displayName}, ${homeTeamRouteId})
      returning id, created_at`;
    return { id: r.id, displayName, homeTeamRouteId, createdAt: r.created_at.toISOString() };
  }
  const row: RiderRow = { id: newId("rdr"), displayName, homeTeamRouteId, createdAt: new Date().toISOString() };
  mem().riders.set(row.id, row);
  return row;
}

export async function getRider(id: string): Promise<RiderRow | null> {
  if (hasDb()) {
    const rows = await getSql()<{ id: string; display_name: string; home_team_route_id: TeamRouteId; created_at: Date }[]>`
      select id, display_name, home_team_route_id, created_at from riders where id = ${id}`;
    const r = rows[0];
    return r
      ? { id: r.id, displayName: r.display_name, homeTeamRouteId: r.home_team_route_id, createdAt: r.created_at.toISOString() }
      : null;
  }
  return mem().riders.get(id) ?? null;
}

// ---------- sessions ----------
export async function getActiveSession(riderId: string): Promise<SessionData | null> {
  if (hasDb()) {
    const rows = await getSql()<SessionRow[]>`
      select * from ride_sessions where rider_id = ${riderId} and ended_at is null limit 1`;
    return rows[0] ? fromRow(rows[0]) : null;
  }
  const id = mem().active.get(riderId);
  return id ? (mem().sessions.get(id) ?? null) : null;
}

/** Most recent session for a rider (active or ended). */
export async function getLatestSession(riderId: string): Promise<SessionData | null> {
  if (hasDb()) {
    const rows = await getSql()<SessionRow[]>`
      select * from ride_sessions where rider_id = ${riderId} order by started_at desc limit 1`;
    return rows[0] ? fromRow(rows[0]) : null;
  }
  let latest: SessionData | null = null;
  for (const s of mem().sessions.values()) {
    if (s.riderId === riderId && (!latest || s.startedAt > latest.startedAt)) latest = s;
  }
  return latest;
}

export async function createSession(riderId: string): Promise<SessionData> {
  const base: Omit<SessionData, "id"> = {
    riderId,
    status: "searching",
    vehicleId: null,
    routeId: null,
    teamRouteId: null,
    directionId: null,
    stopsCredited: 0,
    pointsAwarded: 0,
    manual: false,
    state: emptyState(),
    startedAt: new Date().toISOString(),
    endedAt: null,
  };
  if (hasDb()) {
    const sql = getSql();
    try {
      const [r] = await sql<SessionRow[]>`
        insert into ride_sessions (rider_id, status, state)
        values (${riderId}, 'searching', ${sql.json(JSON.parse(JSON.stringify(base.state)))})
        returning *`;
      return fromRow(r);
    } catch (err) {
      // Lost a race with a concurrent sample: use the winner's session.
      const existing = await getActiveSession(riderId);
      if (existing) return existing;
      throw err;
    }
  }
  const s: SessionData = { id: newId("ses"), ...base };
  mem().sessions.set(s.id, s);
  mem().active.set(riderId, s.id);
  return s;
}

export async function saveSession(s: SessionData): Promise<void> {
  if (hasDb()) {
    const sql = getSql();
    await sql`
      update ride_sessions set
        status = ${s.status},
        vehicle_id = ${s.vehicleId},
        route_id = ${s.routeId},
        team_route_id = ${s.teamRouteId},
        direction_id = ${s.directionId},
        stops_credited = ${s.stopsCredited},
        points_awarded = ${s.pointsAwarded},
        manual = ${s.manual},
        state = ${sql.json(JSON.parse(JSON.stringify(s.state)))},
        updated_at = now(),
        ended_at = ${s.endedAt}
      where id = ${s.id}`;
    return;
  }
  mem().sessions.set(s.id, s);
  if (s.endedAt && mem().active.get(s.riderId) === s.id) mem().active.delete(s.riderId);
}

export async function recordSample(
  sessionId: string,
  sample: Sample,
  matchedVehicleId: string | null,
  distance: number | null,
): Promise<void> {
  if (!hasDb()) return; // samples are debug-only; skip in memory mode
  await getSql()`
    insert into ride_samples (session_id, lat, lng, accuracy, speed, ts, matched_vehicle_id, distance_m)
    values (${sessionId}, ${sample.lat}, ${sample.lng}, ${sample.accuracy}, ${sample.speed},
            ${new Date(sample.t)}, ${matchedVehicleId}, ${distance})`;
}

/** Total stops credited to a rider across all sessions (fallback stat when B's ledger is absent). */
export async function riderStopTotals(riderId: string): Promise<{ stops: number; points: number }> {
  if (hasDb()) {
    const [r] = await getSql()<{ stops: number; points: number }[]>`
      select coalesce(sum(stops_credited), 0)::int as stops, coalesce(sum(points_awarded), 0)::int as points
      from ride_sessions where rider_id = ${riderId}`;
    return r;
  }
  let stops = 0;
  let points = 0;
  for (const s of mem().sessions.values()) {
    if (s.riderId === riderId) {
      stops += s.stopsCredited;
      points += s.pointsAwarded;
    }
  }
  return { stops, points };
}
