// Ride flow orchestration (owner: A, T04): IO around the pure engine.
import type {
  CrewBonus,
  EndRideResponse,
  ManualRideHint,
  NearbyStationResponse,
  NearStation,
  PlayableTeamId,
  RideSampleRequest,
  RideSampleResponse,
  SideQuest,
  StartRideRequest,
  StartRideResponse,
  TeamRouteId,
} from "@/contracts";
import { isTeamRouteId, MBTA_ROUTES } from "@/contracts";
import { HttpError } from "@/server/http";
import { getStopIndex, getStopOrder, getStops } from "@/server/mbta/stops";
import { getVehicleSnapshot, type LiveVehicle } from "@/server/mbta/vehicles";
import { isSimulationRunning } from "@/server/sim";
import { CFG, distanceM, nearestCandidate, step, type Sample, type SessionData } from "./engine";
import { awardBonus, awardPoints } from "./points-bridge";
import { progressSilverQuest } from "@/server/challenges/sidequest";
import {
  SOCIAL,
  crewEndsAt,
  crewMessage,
  crewMultiplier,
  crewMinuteBonus,
  creditableUntil,
  formatDistance,
  minutesToCredit,
  nearestStation,
  rideSummary,
  startRadiusM,
} from "./social";
import * as store from "./store";

/** Ignore samples arriving faster than this (anti-spam; clients send about every 10 s). */
const MIN_SAMPLE_INTERVAL_MS = 3_000;

// ---------- validation ----------
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function parseSample(body: unknown): RideSampleRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.riderId !== "string" || !b.riderId) throw new HttpError(400, "bad_rider", "riderId is required.");
  if (!isNum(b.lat) || !isNum(b.lng) || Math.abs(b.lat) > 90 || Math.abs(b.lng) > 180)
    throw new HttpError(400, "bad_location", "lat and lng must be valid numbers.");
  const accuracy = isNum(b.accuracy) && b.accuracy >= 0 ? b.accuracy : 1000;
  const speed = isNum(b.speed) && b.speed >= 0 ? b.speed : null;
  let manual: ManualRideHint | undefined;
  if (b.manual != null) {
    const m = b.manual as Record<string, unknown>;
    if (
      typeof m.routeId !== "string" ||
      !MBTA_ROUTES.some((r) => r.id === m.routeId) ||
      (m.directionId !== 0 && m.directionId !== 1) ||
      typeof m.stopId !== "string"
    )
      throw new HttpError(400, "bad_manual", "manual needs a valid routeId, directionId (0|1) and stopId.");
    manual = { routeId: m.routeId, directionId: m.directionId, stopId: m.stopId };
  }
  return {
    riderId: b.riderId,
    lat: b.lat,
    lng: b.lng,
    accuracy,
    speed,
    ts: typeof b.ts === "string" ? b.ts : new Date().toISOString(),
    manual,
  };
}

/** Shared by GET /api/rides/nearby (query string) and POST /api/rides/start (body). */
export function parseLocation(b: Record<string, unknown>): { lat: number; lng: number; accuracy: number } {
  const num = (x: unknown) => (typeof x === "string" && x.trim() ? Number(x) : x);
  const lat = num(b.lat);
  const lng = num(b.lng);
  const acc = num(b.accuracy);
  if (!isNum(lat) || !isNum(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new HttpError(400, "bad_location", "lat and lng must be valid numbers.");
  return { lat, lng, accuracy: isNum(acc) && acc >= 0 ? acc : 1000 };
}

export function parseStart(body: unknown): StartRideRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.riderId !== "string" || !b.riderId) throw new HttpError(400, "bad_rider", "riderId is required.");
  return { riderId: b.riderId, ...parseLocation(b) };
}

export function parseRider(body: unknown): { displayName: string; homeTeamRouteId: TeamRouteId } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.displayName === "string" ? b.displayName.trim().replace(/\s+/g, " ") : "";
  if (name.length < 1 || name.length > 24)
    throw new HttpError(400, "bad_name", "displayName must be 1-24 characters.");
  if (!isTeamRouteId(b.homeTeamRouteId))
    throw new HttpError(400, "bad_team", "homeTeamRouteId must be one of Red, Orange, Blue, Green.");
  return { displayName: name, homeTeamRouteId: b.homeTeamRouteId };
}

// ---------- flow ----------
function toResponse(
  s: SessionData,
  message: string,
  nextStopId?: string,
  crew: CrewBonus | null = null,
  sideQuest: SideQuest | null = null,
): RideSampleResponse {
  const state = s.status === "ended" ? "left" : s.status;
  return {
    state,
    sessionId: s.id,
    ...(s.vehicleId ? { vehicleId: s.vehicleId } : {}),
    ...(s.teamRouteId ? { teamRouteId: s.teamRouteId } : {}),
    stopsCredited: s.stopsCredited,
    ...(nextStopId ? { nextStopId } : {}),
    message,
    minutesRidden: s.state.minutesCredited,
    pointsAwarded: s.pointsAwarded,
    ...(s.state.originStationId ? { originStationId: s.state.originStationId } : {}),
    crew,
    sideQuest,
  };
}

const isBound = (s: SessionData) => s.status === "on_vehicle" || s.status === "in_tunnel";

/** Engine copy plus the ride summary once the rider has been on a train ("On Green Line. 7 min, 7 pts."). */
function withSummary(s: SessionData, message: string): string {
  if (s.state.boundAt == null) return message;
  if (isBound(s) && s.state.minutesCredited === 0) return message;
  return `${message} ${rideSummary(s.state.minutesCredited, s.pointsAwarded)}`;
}

/**
 * Ride points are time-based (CONTRACTS.md section 6): 1 ride_stop point per full minute bound to a
 * train, ref `<sessionId>:min:<n>`, so B's hourly cap and daily bonuses still apply. While a crew
 * is riding together each minute also earns (multiplier - 1) co_ride points, fractions carried.
 * Idempotent: minutes already credited are never re-awarded, and refs dedupe on retries.
 */
async function creditMinutes(s: SessionData, end: number, multiplier = 1): Promise<SessionData> {
  if (s.state.boundAt == null || !s.teamRouteId) return s;
  const team = await pointsTeam(s);
  if (!team) return s;
  const until = creditableUntil(
    { ...s.state, manual: s.manual, startedAt: Date.parse(s.startedAt) },
    end,
    { tunnelGraceMs: CFG.tunnelGraceMs, vehicleMissingMs: CFG.vehicleMissingMs, manualGraceMs: CFG.manualGraceMs },
  );
  let next = s;
  for (const n of minutesToCredit(s.state.boundAt, until, s.state.minutesCredited)) {
    let minutePoints: number;
    try {
      const res = await awardPoints({
        riderId: next.riderId,
        teamRouteId: team,
        type: "ride_stop",
        amount: 1,
        ref: `${next.id}:min:${n}`,
      });
      minutePoints = res.pointsAwarded;
    } catch (err) {
      console.error("[rides] awardPoints failed; will retry next sample", n, err);
      break; // minutesCredited stays put, so this minute is retried
    }
    next = {
      ...next,
      pointsAwarded: next.pointsAwarded + minutePoints,
      state: { ...next.state, minutesCredited: n },
    };
    // No crew bonus on a minute the hourly ride cap zeroed out.
    if (multiplier <= 1 || minutePoints <= 0) continue;
    const bonus = crewMinuteBonus(next.state.crewBonusCarry, multiplier);
    next = { ...next, state: { ...next.state, crewBonusCarry: bonus.carry } };
    if (bonus.points <= 0) continue;
    try {
      const res = await awardBonus({
        riderId: next.riderId,
        teamRouteId: team,
        type: "co_ride",
        amount: bonus.points,
        ref: `${next.id}:crew:${n}`,
      });
      next = {
        ...next,
        pointsAwarded: next.pointsAwarded + res.pointsAwarded,
        state: { ...next.state, crewBonusPoints: next.state.crewBonusPoints + res.pointsAwarded },
      };
    } catch (err) {
      console.error("[rides] crew bonus failed", n, err);
    }
  }
  return next;
}

/**
 * Team that earns this ride's points: the line ridden when it is a team, else (Silver, #115) the
 * rider's home team.
 */
async function pointsTeam(s: SessionData): Promise<PlayableTeamId | null> {
  if (isTeamRouteId(s.teamRouteId)) return s.teamRouteId;
  const rider = await store.getRider(s.riderId);
  return rider && isTeamRouteId(rider.homeTeamRouteId) ? rider.homeTeamRouteId : null;
}

/** Silver Line side quest (#115): progress while on a Silver vehicle, completing at the target. */
async function silverQuest(s: SessionData): Promise<{ session: SessionData; quest: SideQuest | null; awarded: number }> {
  if (s.teamRouteId !== "Silver" || s.state.boundAt == null) return { session: s, quest: null, awarded: 0 };
  const team = await pointsTeam(s);
  if (!team) return { session: s, quest: null, awarded: 0 };
  const { quest, awarded } = await progressSilverQuest(s.riderId, team, s.state.minutesCredited).catch((err) => {
    console.warn("[rides] silver quest failed", String(err));
    return { quest: null, awarded: 0 };
  });
  return { session: awarded ? { ...s, pointsAwarded: s.pointsAwarded + awarded } : s, quest, awarded };
}

/** A session that should be closed before anything else happens (quiet for too long). */
function isStale(s: SessionData, now: number): boolean {
  if (s.state.lastSampleT) return now - s.state.lastSampleT > CFG.staleSessionMs;
  return now - Date.parse(s.startedAt) > CFG.startBindTimeoutMs;
}

/** End a session: credit the completed minutes up to now and fill in where the rider got off. */
async function closeSession(s: SessionData, now: number): Promise<SessionData> {
  const credited = (await silverQuest(await creditMinutes(s, now))).session;
  const ended: SessionData = {
    ...credited,
    status: "ended",
    endedAt: new Date(now).toISOString(),
    state: {
      ...credited.state,
      destStationId: credited.state.destStationId ?? credited.state.creditedStationIds.at(-1) ?? credited.state.lastStationId,
    },
  };
  await store.saveSession(ended);
  return ended;
}

// ---------- start gate (#96) ----------
async function findNearestStation(point: { lat: number; lng: number }): Promise<NearStation | null> {
  const index = await getStopIndex();
  return nearestStation(point, index.byId.values(), (id) => index.parentOf.has(id));
}

export async function nearby(loc: { lat: number; lng: number; accuracy: number }): Promise<NearbyStationResponse> {
  const radiusM = startRadiusM(loc.accuracy);
  const station = await findNearestStation(loc);
  const near = !!station && station.distanceM <= radiusM;
  // Demo mode must work without real trains (or stations) nearby.
  const demo = !near && !!station && (await isSimulationRunning());
  let message: string;
  if (!station) message = "Can't find any stations right now. Try again in a moment.";
  else if (near) message = `You're at ${station.name}. Ready to ride.`;
  else if (demo) message = `Ready to ride. Nearest station is ${station.name}.`;
  else message = `Nearest station is ${station.name}, ${formatDistance(station.distanceM)} away. Get within ${formatDistance(radiusM)} of a station to start a ride.`;
  return { canStart: near || demo, radiusM, station, message };
}

const RIDE_ACTIVE = "You already have a ride in progress. Keep riding, or end it first.";

export async function startRide(req: StartRideRequest): Promise<StartRideResponse> {
  await requireRider(req.riderId);
  const now = Date.now();
  const active = await store.getActiveSession(req.riderId);
  if (active && !isStale(active, now)) throw new HttpError(409, "ride_active", RIDE_ACTIVE);
  if (active) await closeSession(active, now);

  const near = await nearby(req);
  if (!near.station) throw new HttpError(503, "mbta_unavailable", near.message);
  if (!near.canStart) throw new HttpError(403, "not_near_station", near.message);

  const station = near.station;
  const session = await store.createSession(req.riderId, { originStationId: station.id });
  // Lost a race with a concurrent start: the other request's ride wins.
  if (session.state.originStationId !== station.id) throw new HttpError(409, "ride_active", RIDE_ACTIVE);
  return {
    sessionId: session.id,
    state: "searching",
    station,
    radiusM: near.radiusM,
    message: `Ride started at ${station.name}. Board any train; we'll pick it up automatically.`,
  };
}

// ---------- crew bonus (#96) ----------
/** Teammates (same home team) bound to the same vehicle who have sampled recently. */
async function findCrew(s: SessionData, now: number): Promise<{ riderId: string; displayName: string }[]> {
  if (!s.vehicleId || !isBound(s)) return [];
  const others = (await store.listActiveOnVehicle(s.vehicleId)).filter(
    (o) =>
      o.id !== s.id &&
      o.riderId !== s.riderId &&
      o.state.lastSampleT != null &&
      now - o.state.lastSampleT <= SOCIAL.crewStaleMs,
  );
  if (!others.length) return [];
  const riders = await store.getRiders([s.riderId, ...new Set(others.map((o) => o.riderId))]);
  const me = riders.find((r) => r.id === s.riderId);
  if (!me) return [];
  return riders
    .filter((r) => r.id !== me.id && r.homeTeamRouteId === me.homeTeamRouteId)
    .map((r) => ({ riderId: r.id, displayName: r.displayName }));
}

async function requireRider(riderId: string) {
  const rider = await store.getRider(riderId);
  if (!rider) throw new HttpError(404, "rider_not_found", "Unknown riderId. Create a rider first.");
  return rider;
}

export async function handleSample(req: RideSampleRequest): Promise<RideSampleResponse> {
  await requireRider(req.riderId);
  const now = Date.now();

  let session = await store.getActiveSession(req.riderId);
  // A ride that went quiet for a long time is closed; the rider presses Start again. (A started
  // ride that never sent a sample ends in the engine's start timeout instead, with a message.)
  if (session && session.state.lastSampleT && isStale(session, now)) {
    await closeSession(session, now);
    session = null;
  }
  if (!session) {
    throw new HttpError(409, "ride_not_started", "No ride in progress. Press Start at a station to begin a ride.");
  }

  if (session.state.lastSampleT && now - session.state.lastSampleT < MIN_SAMPLE_INTERVAL_MS) {
    return toResponse(session, "Got it. Keep the app open while you ride.");
  }

  const snapshot = await getVehicleSnapshot().catch((err) => {
    console.error("[rides] vehicles unavailable", err);
    throw new HttpError(503, "mbta_unavailable", "Live train data is unavailable. Try again in a moment.");
  });
  const index = await getStopIndex().catch(() => null);
  // Manual check-in needs the chosen station's coordinates; the route's stop list is a cheaper fallback.
  const manualStops = req.manual && !index?.byId.has(req.manual.stopId)
    ? await getStops(req.manual.routeId).catch(() => [])
    : [];
  const sample: Sample = { lat: req.lat, lng: req.lng, accuracy: req.accuracy, speed: req.speed, t: now };

  // Preload the stop order the engine may need (bound route, manual route, or best candidate).
  const orders = new Map<string, string[]>();
  const need: [string, 0 | 1][] = [];
  if (session.routeId && session.directionId !== null) need.push([session.routeId, session.directionId]);
  if (req.manual) {
    need.push([req.manual.routeId, req.manual.directionId]);
  } else if (session.status === "searching") {
    const cand = nearestCandidate(sample, snapshot.vehicles, now);
    if (cand) need.push([cand.v.routeId, cand.v.directionId]);
  }
  await Promise.all(
    need.map(async ([r, d]) => {
      orders.set(`${r}:${d}`, await getStopOrder(r, d).catch(() => []));
    }),
  );

  const result = step(
    session,
    sample,
    {
      vehicles: snapshot.vehicles,
      stopOrder: (r, d) => orders.get(`${r}:${d}`) ?? [],
      stationCoords: (id) => index?.byId.get(id) ?? manualStops.find((x) => x.id === id) ?? null,
      now,
    },
    req.manual,
  );

  let next = result.session;

  // Crew: teammates on the same train. The clock starts the first time a crew is seen on this
  // ride and is not reset if they drop out for a moment (no gaming the 3x by splitting up).
  const crewMates = await findCrew(next, now).catch((err) => {
    console.warn("[rides] crew lookup failed", String(err));
    return [];
  });
  if (crewMates.length && next.state.crewFormedAt == null) {
    next = { ...next, state: { ...next.state, crewFormedAt: now } };
  }
  const formedAt = next.state.crewFormedAt;
  const multiplier = crewMates.length && formedAt != null ? crewMultiplier(formedAt, now) : 1;

  // Stops are still tracked (display, hotspots), but ride points are per full minute on the train.
  // On an automatic "left" this credits the completed minutes up to the end of the ride.
  next = await creditMinutes(next, now, multiplier);
  const silver = await silverQuest(next);
  next = silver.session;

  const crew: CrewBonus | null =
    crewMates.length && isBound(next) && formedAt != null
      ? {
          teammates: crewMates,
          multiplier,
          endsAt: new Date(crewEndsAt(formedAt)).toISOString(),
          bonusPoints: next.state.crewBonusPoints,
          message: crewMessage(crewMates.map((m) => m.displayName), multiplier),
        }
      : null;

  await store.saveSession(next);
  const bound: LiveVehicle | undefined = snapshot.vehicles.find((v) => v.id === next.vehicleId);
  await store
    .recordSample(next.id, sample, next.vehicleId ?? next.state.candidateVehicleId, bound ? distanceM(sample, bound) : null)
    .catch((err) => console.warn("[rides] recordSample failed", String(err)));

  const message = withSummary(next, result.message);
  return toResponse(
    next,
    silver.awarded ? `Silver Line side quest complete! +${silver.awarded} for your team. ${message}` : message,
    result.nextStopId,
    crew,
    silver.quest,
  );
}

export async function endRide(riderId: string): Promise<EndRideResponse> {
  await requireRider(riderId);
  const active = await store.getActiveSession(riderId);
  if (active) {
    const ended = await closeSession(active, Date.now());
    return { sessionId: ended.id, stopsCredited: ended.stopsCredited, pointsAwarded: ended.pointsAwarded };
  }
  // Idempotent: the engine may already have ended the ride ("left").
  const latest = await store.getLatestSession(riderId);
  if (!latest) throw new HttpError(404, "no_ride", "This rider has no ride to end.");
  return { sessionId: latest.id, stopsCredited: latest.stopsCredited, pointsAwarded: latest.pointsAwarded };
}
