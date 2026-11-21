// Ride flow orchestration (owner: A, T04): IO around the pure engine.
import type {
  EndRideResponse,
  ManualRideHint,
  RideSampleRequest,
  RideSampleResponse,
  TeamRouteId,
} from "@/contracts";
import { isTeamRouteId, MBTA_ROUTES } from "@/contracts";
import { HttpError } from "@/server/http";
import { getStopIndex, getStopOrder, getStops } from "@/server/mbta/stops";
import { getVehicleSnapshot, type LiveVehicle } from "@/server/mbta/vehicles";
import { CFG, distanceM, nearestCandidate, step, type Sample, type SessionData } from "./engine";
import { awardPoints } from "./points-bridge";
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

export function parseRider(body: unknown): { displayName: string; homeTeamRouteId: TeamRouteId } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.displayName === "string" ? b.displayName.trim().replace(/\s+/g, " ") : "";
  if (name.length < 1 || name.length > 24)
    throw new HttpError(400, "bad_name", "displayName must be 1-24 characters.");
  if (!isTeamRouteId(b.homeTeamRouteId))
    throw new HttpError(400, "bad_team", "homeTeamRouteId must be one of Red, Orange, Blue, Green, Silver.");
  return { displayName: name, homeTeamRouteId: b.homeTeamRouteId };
}

// ---------- flow ----------
function toResponse(s: SessionData, message: string, nextStopId?: string): RideSampleResponse {
  const state = s.status === "ended" ? "left" : s.status;
  return {
    state,
    sessionId: s.id,
    ...(s.vehicleId ? { vehicleId: s.vehicleId } : {}),
    ...(s.teamRouteId ? { teamRouteId: s.teamRouteId } : {}),
    stopsCredited: s.stopsCredited,
    ...(nextStopId ? { nextStopId } : {}),
    message,
  };
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
  if (session && session.state.lastSampleT && now - session.state.lastSampleT > CFG.staleSessionMs) {
    await store.saveSession({ ...session, status: "ended", endedAt: new Date(now).toISOString() });
    session = null;
  }
  session ??= await store.createSession(req.riderId);

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
  for (const c of result.credits) {
    try {
      const res = await awardPoints({
        riderId: next.riderId,
        teamRouteId: next.teamRouteId!,
        type: "ride_stop",
        amount: 1,
        ref: `ride:${next.id}:${c.stationId}`,
      });
      next = { ...next, pointsAwarded: next.pointsAwarded + res.pointsAwarded };
    } catch (err) {
      console.error("[rides] awardPoints failed", c, err);
    }
  }

  await store.saveSession(next);
  const bound: LiveVehicle | undefined = snapshot.vehicles.find((v) => v.id === next.vehicleId);
  await store
    .recordSample(next.id, sample, next.vehicleId ?? next.state.candidateVehicleId, bound ? distanceM(sample, bound) : null)
    .catch((err) => console.warn("[rides] recordSample failed", String(err)));

  return toResponse(next, result.message, result.nextStopId);
}

export async function endRide(riderId: string): Promise<EndRideResponse> {
  await requireRider(riderId);
  const active = await store.getActiveSession(riderId);
  if (active) {
    const ended: SessionData = { ...active, status: "ended", endedAt: new Date().toISOString() };
    await store.saveSession(ended);
    return { sessionId: ended.id, stopsCredited: ended.stopsCredited, pointsAwarded: ended.pointsAwarded };
  }
  // Idempotent: the engine may already have ended the ride ("left").
  const latest = await store.getLatestSession(riderId);
  if (!latest) throw new HttpError(404, "no_ride", "This rider has no ride to end.");
  return { sessionId: latest.id, stopsCredited: latest.stopsCredited, pointsAwarded: latest.pointsAwarded };
}
