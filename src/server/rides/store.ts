// Rider + ride-session persistence (owner: A). Postgres when DATABASE_URL is set, else in-memory.
import { randomUUID } from "node:crypto";
import type { TeamRouteId } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { registerMemoryRider } from "./points-bridge";
import { emptyState, type EngineState, type SessionData, type Sample } from "./engine";

export interface RiderRow {
  id: string;
  displayName: string;
  homeTeamRouteId: TeamRouteId;
  createdAt: string;
  /** #96 */
  interests: string[];
  avatarDataUrl: string | null;
}

/** #96: a finished ride with a known origin and destination (hotspot pattern mining). */
export interface TripRow {
  sessionId: string;
  riderId: string;
  originStationId: string;
  destStationId: string;
  routeId: string | null;
  teamRouteId: TeamRouteId | null;
  endedAt: string;
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
    return { id: r.id, displayName, homeTeamRouteId, createdAt: r.created_at.toISOString(), interests: [], avatarDataUrl: null };
  }
  const row: RiderRow = {
    id: newId("rdr"),
    displayName,
    homeTeamRouteId,
    createdAt: new Date().toISOString(),
    interests: [],
    avatarDataUrl: null,
  };
  mem().riders.set(row.id, row);
  registerMemoryRider({ riderId: row.id, displayName, homeTeamRouteId }); // B's in-memory game state
  return row;
}

type RiderDbRow = {
  id: string;
  display_name: string;
  home_team_route_id: TeamRouteId;
  created_at: Date;
  interests: string[] | null;
  avatar_data_url: string | null;
};
const riderFromRow = (r: RiderDbRow): RiderRow => ({
  id: r.id,
  displayName: r.display_name,
  homeTeamRouteId: r.home_team_route_id,
  createdAt: r.created_at.toISOString(),
  interests: r.interests ?? [],
  avatarDataUrl: r.avatar_data_url,
});

export async function getRider(id: string): Promise<RiderRow | null> {
  if (hasDb()) {
    const rows = await getSql()<RiderDbRow[]>`
      select id, display_name, home_team_route_id, created_at, interests, avatar_data_url from riders where id = ${id}`;
    return rows[0] ? riderFromRow(rows[0]) : null;
  }
  return mem().riders.get(id) ?? null;
}

/** #96: riders by id (missing ids are skipped). */
export async function getRiders(ids: string[]): Promise<RiderRow[]> {
  if (!ids.length) return [];
  if (hasDb()) {
    const rows = await getSql()<RiderDbRow[]>`
      select id, display_name, home_team_route_id, created_at, interests, avatar_data_url from riders where id = any(${ids})`;
    return rows.map(riderFromRow);
  }
  return ids.map((id) => mem().riders.get(id)).filter((r): r is RiderRow => Boolean(r));
}

/** #96: update profile fields; undefined leaves a field unchanged. Returns null for an unknown rider. */
export async function updateRiderProfile(
  id: string,
  patch: { interests?: string[]; avatarDataUrl?: string | null },
): Promise<RiderRow | null> {
  if (hasDb()) {
    const sql = getSql();
    const rows = await sql<RiderDbRow[]>`
      update riders set
        interests = coalesce(${patch.interests ?? null}::text[], interests),
        avatar_data_url = ${patch.avatarDataUrl === undefined ? sql`avatar_data_url` : patch.avatarDataUrl}
      where id = ${id}
      returning id, display_name, home_team_route_id, created_at, interests, avatar_data_url`;
    return rows[0] ? riderFromRow(rows[0]) : null;
  }
  const r = mem().riders.get(id);
  if (!r) return null;
  const next: RiderRow = {
    ...r,
    ...(patch.interests !== undefined ? { interests: patch.interests } : {}),
    ...(patch.avatarDataUrl !== undefined ? { avatarDataUrl: patch.avatarDataUrl } : {}),
  };
  mem().riders.set(id, next);
  return next;
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

/** #96: active sessions bound to a vehicle (crew detection). */
export async function listActiveOnVehicle(vehicleId: string): Promise<SessionData[]> {
  if (hasDb()) {
    const rows = await getSql()<SessionRow[]>`
      select * from ride_sessions where vehicle_id = ${vehicleId} and ended_at is null
        and status in ('on_vehicle','in_tunnel')`;
    return rows.map(fromRow);
  }
  const out: SessionData[] = [];
  for (const id of mem().active.values()) {
    const s = mem().sessions.get(id);
    if (s && s.vehicleId === vehicleId && (s.status === "on_vehicle" || s.status === "in_tunnel")) out.push(s);
  }
  return out;
}

/**
 * #96: finished rides with a known origin and destination, newest first. Pass riderId to scope
 * to one rider, or omit it for everyone (bounded by limit).
 */
export async function listTrips(opts: { riderId?: string; limit?: number; sinceDays?: number } = {}): Promise<TripRow[]> {
  const limit = opts.limit ?? 200;
  const since = new Date(Date.now() - (opts.sinceDays ?? 30) * 86_400_000);
  const toTrip = (s: SessionData): TripRow | null =>
    s.endedAt && s.state.originStationId && s.state.destStationId && s.state.originStationId !== s.state.destStationId
      ? {
          sessionId: s.id,
          riderId: s.riderId,
          originStationId: s.state.originStationId,
          destStationId: s.state.destStationId,
          routeId: s.routeId,
          teamRouteId: s.teamRouteId,
          endedAt: s.endedAt,
        }
      : null;
  if (hasDb()) {
    const sql = getSql();
    const rows = await sql<SessionRow[]>`
      select * from ride_sessions
      where ended_at is not null and ended_at > ${since}
        and state->>'originStationId' is not null and state->>'destStationId' is not null
        ${opts.riderId ? sql`and rider_id = ${opts.riderId}` : sql``}
      order by ended_at desc limit ${limit}`;
    return rows.map(fromRow).map(toTrip).filter((t): t is TripRow => t !== null);
  }
  return [...mem().sessions.values()]
    .filter((s) => (!opts.riderId || s.riderId === opts.riderId) && s.endedAt && Date.parse(s.endedAt) > since.getTime())
    .map(toTrip)
    .filter((t): t is TripRow => t !== null)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .slice(0, limit);
}

/** #96 demo/tests: record a synthetic finished trip (memory and DB). */
export async function recordSyntheticTrip(
  riderId: string,
  originStationId: string,
  destStationId: string,
  routeId: string | null,
  teamRouteId: TeamRouteId | null,
): Promise<void> {
  const now = new Date().toISOString();
  const state = { ...emptyState(), originStationId, destStationId };
  if (hasDb()) {
    const sql = getSql();
    await sql`
      insert into ride_sessions (rider_id, status, route_id, team_route_id, state, ended_at)
      values (${riderId}, 'ended', ${routeId}, ${teamRouteId}, ${sql.json(JSON.parse(JSON.stringify(state)))}, ${now})`;
    return;
  }
  const s: SessionData = {
    id: newId("ses"),
    riderId,
    status: "ended",
    vehicleId: null,
    routeId,
    teamRouteId,
    directionId: null,
    stopsCredited: 0,
    pointsAwarded: 0,
    manual: false,
    state,
    startedAt: now,
    endedAt: now,
  };
  mem().sessions.set(s.id, s);
}
