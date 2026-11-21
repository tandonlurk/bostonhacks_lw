// Ride verification state machine (owner: A, T04). Pure: no IO, so it can be tested offline.
// Spec: docs/KICKOFF.md section 5. Only relative / type-only imports here (see scripts/test-ride-engine.mjs).
import type { RideState, TeamRouteId } from "@/contracts";
import type { LiveVehicle } from "../mbta/vehicles";

// ---------- tunables ----------
export const CFG = {
  /** consecutive matching samples needed to bind */
  bindSamples: 3,
  /** max gap between samples in one candidate chain */
  chainGapMs: 75_000,
  /** a GPS fix is "good" when its accuracy radius is at most this */
  goodAccuracyM: 200,
  /** keep a bound session alive this long without a good on-vehicle fix */
  tunnelGraceMs: 8 * 60_000,
  /** bound vehicle missing from the feed this long -> left */
  vehicleMissingMs: 3 * 60_000,
  /** good-accuracy samples away from the vehicle needed to declare "left" */
  leftSamples: 3,
  /** rider must show movement (m) across the bind window unless GPS speed shows it */
  minDisplacementM: 60,
  minMovingSpeed: 1.5,
  /** max |rider speed - vehicle speed| (m/s) for a candidate */
  maxSpeedDiff: 7,
  /** idle sessions older than this are discarded on the next sample */
  staleSessionMs: 20 * 60_000,
  /** manual fallback: vehicle must be within this of the chosen stop */
  manualVehicleRadiusM: 2000,
  /** manual fallback: rider (with good GPS) must be within this of the chosen stop */
  manualRiderRadiusM: 1500,
  /** a jump of more than this many stations between samples credits only the arrival station */
  maxStationJump: 3,
};

// ---------- types ----------
export interface Sample {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  /** server-normalized epoch ms */
  t: number;
}

export interface WindowPoint {
  lat: number;
  lng: number;
  speed: number | null;
  t: number;
}

export interface EngineState {
  candidateVehicleId: string | null;
  candidateCount: number;
  window: WindowPoint[];
  lastSampleT: number | null;
  lastGoodMatchT: number | null;
  lastVehicleSeenT: number | null;
  awayCount: number;
  lastAwayPos: { lat: number; lng: number } | null;
  /** index into the route/direction stop order of the last station reached */
  lastReachedIdx: number | null;
  lastStationId: string | null;
  creditedStationIds: string[];
}

export type SessionStatus = RideState | "ended";

export interface SessionData {
  id: string;
  riderId: string;
  status: SessionStatus;
  vehicleId: string | null;
  routeId: string | null;
  teamRouteId: TeamRouteId | null;
  directionId: 0 | 1 | null;
  stopsCredited: number;
  pointsAwarded: number;
  startedAt: string;
  endedAt: string | null;
  manual: boolean;
  state: EngineState;
}

export interface Credit {
  stationId: string;
}

export interface StepContext {
  vehicles: LiveVehicle[];
  /** ordered station ids for the bound (or candidate) route+direction; [] if unknown */
  stopOrder: (routeId: string, directionId: 0 | 1) => string[];
  /** station coordinates, for the manual fallback */
  stationCoords: (stopId: string) => { lat: number; lng: number } | null;
  now: number;
}

export interface StepResult {
  session: SessionData;
  credits: Credit[];
  message: string;
  nextStopId?: string;
}

export interface ManualHint {
  routeId: string;
  directionId: 0 | 1;
  stopId: string;
}

export function emptyState(): EngineState {
  return {
    candidateVehicleId: null,
    candidateCount: 0,
    window: [],
    lastSampleT: null,
    lastGoodMatchT: null,
    lastVehicleSeenT: null,
    awayCount: 0,
    lastAwayPos: null,
    lastReachedIdx: null,
    lastStationId: null,
    creditedStationIds: [],
  };
}

// ---------- geometry ----------
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Match radius grows with GPS inaccuracy and with how stale the vehicle's reported position is. */
export function matchRadiusM(accuracy: number, vehicle: LiveVehicle, now: number): number {
  const ageS = Math.max(0, Math.min(90, (now - Date.parse(vehicle.reportedAt)) / 1000));
  const vSpeed = vehicle.speed ?? 8;
  return Math.min(700, 75 + 1.5 * Math.min(accuracy, 300) + ageS * vSpeed);
}

function speedsCompatible(riderSpeed: number | null, v: LiveVehicle): boolean {
  if (riderSpeed == null || riderSpeed < 0 || v.speed == null) return true;
  return Math.abs(riderSpeed - v.speed) <= Math.max(CFG.maxSpeedDiff, 0.5 * v.speed);
}

export function nearestCandidate(sample: Sample, vehicles: LiveVehicle[], now: number) {
  let best: { v: LiveVehicle; d: number } | null = null;
  for (const v of vehicles) {
    const d = distanceM(sample, v);
    if (d > matchRadiusM(sample.accuracy, v, now)) continue;
    if (!speedsCompatible(sample.speed, v)) continue;
    if (!best || d < best.d) best = { v, d };
  }
  return best;
}

function showedMovement(window: WindowPoint[]): boolean {
  if (window.some((p) => p.speed != null && p.speed >= CFG.minMovingSpeed)) return true;
  if (window.length < 2) return false;
  let maxD = 0;
  for (const p of window) maxD = Math.max(maxD, distanceM(window[0], p));
  return maxD >= CFG.minDisplacementM;
}

/** Index (in travel order) of the last station the vehicle has reached. */
function reachedIndex(v: LiveVehicle, order: string[]): number | null {
  if (!v.stopId) return null;
  const i = order.indexOf(v.stopId);
  if (i < 0) return null;
  return v.currentStatus === "STOPPED_AT" ? i : i - 1;
}

function nextStopFor(v: LiveVehicle, order: string[]): string | undefined {
  if (!v.stopId) return undefined;
  if (v.currentStatus !== "STOPPED_AT") return v.stopId;
  const i = order.indexOf(v.stopId);
  return i >= 0 && i + 1 < order.length ? order[i + 1] : undefined;
}

// ---------- the state machine ----------
function bind(session: SessionData, v: LiveVehicle, ctx: StepContext, manual: boolean): SessionData {
  const order = ctx.stopOrder(v.routeId, v.directionId);
  return {
    ...session,
    status: "on_vehicle",
    vehicleId: v.id,
    routeId: v.routeId,
    teamRouteId: v.teamRouteId,
    directionId: v.directionId,
    manual,
    state: {
      ...session.state,
      candidateVehicleId: null,
      candidateCount: 0,
      window: [],
      lastGoodMatchT: ctx.now,
      lastVehicleSeenT: ctx.now,
      awayCount: 0,
      lastAwayPos: null,
      lastReachedIdx: reachedIndex(v, order),
      lastStationId: v.currentStatus === "STOPPED_AT" ? v.stopId : null,
    },
  };
}

/** Credit stations the bound vehicle has reached since the last step. */
function creditProgress(session: SessionData, v: LiveVehicle, ctx: StepContext): { session: SessionData; credits: Credit[] } {
  const order = ctx.stopOrder(v.routeId, v.directionId);
  const st = { ...session.state, creditedStationIds: [...session.state.creditedStationIds] };
  const credits: Credit[] = [];
  const credit = (id: string) => {
    if (st.creditedStationIds.includes(id)) return;
    st.creditedStationIds.push(id);
    credits.push({ stationId: id });
  };

  const reached = reachedIndex(v, order);
  if (reached != null && st.lastReachedIdx != null) {
    const jump = reached - st.lastReachedIdx;
    if (jump > 0 && jump <= CFG.maxStationJump) {
      for (let i = st.lastReachedIdx + 1; i <= reached; i++) credit(order[i]);
    } else if (jump > CFG.maxStationJump && reached >= 0) {
      credit(order[reached]); // branch switch or long gap: credit only the arrival
    }
    if (jump > 0) st.lastReachedIdx = reached;
  } else if (reached != null) {
    st.lastReachedIdx = reached;
  } else if (v.currentStatus === "STOPPED_AT" && v.stopId && v.stopId !== st.lastStationId) {
    // station not in the ordered list (rare): credit on arrival
    if (st.lastStationId !== null) credit(v.stopId);
  }
  if (v.currentStatus === "STOPPED_AT" && v.stopId) st.lastStationId = v.stopId;

  return {
    session: { ...session, state: st, stopsCredited: session.stopsCredited + credits.length },
    credits,
  };
}

function end(session: SessionData, status: "left" | "ended", now: number): SessionData {
  return { ...session, status, endedAt: new Date(now).toISOString() };
}

export function step(
  input: SessionData,
  sample: Sample,
  ctx: StepContext,
  manual?: ManualHint,
): StepResult {
  const now = ctx.now;
  let session: SessionData = { ...input, state: { ...input.state, lastSampleT: sample.t } };
  const goodFix = sample.accuracy <= CFG.goodAccuracyM;

  // ----- bound: on_vehicle / in_tunnel -----
  if (session.status === "on_vehicle" || session.status === "in_tunnel") {
    const v = ctx.vehicles.find((x) => x.id === session.vehicleId);
    if (!v) {
      const missingFor = now - (session.state.lastVehicleSeenT ?? now);
      if (missingFor > CFG.vehicleMissingMs) {
        return { session: end(session, "left", now), credits: [], message: rideOverMessage(session, "Your train left service.") };
      }
      return { session: { ...session, status: "in_tunnel" }, credits: [], message: "Lost track of the train for a moment. Hang tight." };
    }
    if (v.directionId !== session.directionId) {
      return { session: end(session, "left", now), credits: [], message: rideOverMessage(session, "The train reached the end of the line.") };
    }
    session = { ...session, state: { ...session.state, lastVehicleSeenT: now } };

    const d = distanceM(sample, v);
    const near = d <= matchRadiusM(sample.accuracy, v, now);
    const order = ctx.stopOrder(v.routeId, v.directionId);

    if (near) {
      session = { ...session, status: "on_vehicle", state: { ...session.state, lastGoodMatchT: now, awayCount: 0, lastAwayPos: null } };
    } else if (goodFix) {
      // A good fix far from the train. Count it only if the position is fresh (not a cached fix).
      const prev = session.state.lastAwayPos;
      const moved = !prev || prev.lat !== sample.lat || prev.lng !== sample.lng;
      const awayCount = moved ? session.state.awayCount + 1 : session.state.awayCount;
      session = { ...session, state: { ...session.state, awayCount, lastAwayPos: { lat: sample.lat, lng: sample.lng } } };
      if (awayCount >= CFG.leftSamples) {
        return { session: end(session, "left", now), credits: [], message: rideOverMessage(session, "Looks like you got off.") };
      }
      session = { ...session, status: "in_tunnel" };
    } else {
      // Poor GPS: assume underground.
      session = { ...session, status: "in_tunnel" };
    }

    if (session.status === "in_tunnel" && now - (session.state.lastGoodMatchT ?? now) > CFG.tunnelGraceMs) {
      return { session: end(session, "left", now), credits: [], message: rideOverMessage(session, "We lost you underground for too long.") };
    }

    const progressed = creditProgress(session, v, ctx);
    const nextStopId = nextStopFor(v, order);
    const msg =
      progressed.session.status === "in_tunnel"
        ? `Underground. Still tracking your train. ${plural(progressed.session.stopsCredited, "stop")} credited.`
        : `On ${routeLabel(v.routeId)}. ${plural(progressed.session.stopsCredited, "stop")} credited.`;
    return { session: progressed.session, credits: progressed.credits, message: msg, nextStopId };
  }

  // ----- searching -----
  if (manual) {
    const stop = ctx.stationCoords(manual.stopId);
    if (!stop) {
      return { session, credits: [], message: "Unknown station for manual check-in." };
    }
    if (goodFix && distanceM(sample, stop) > CFG.manualRiderRadiusM) {
      return { session, credits: [], message: "You seem too far from that station. Try again once you're aboard." };
    }
    let best: { v: LiveVehicle; d: number } | null = null;
    for (const v of ctx.vehicles) {
      if (v.routeId !== manual.routeId || v.directionId !== manual.directionId) continue;
      const d = v.stopId === manual.stopId ? 0 : distanceM(stop, v);
      if (d > CFG.manualVehicleRadiusM) continue;
      if (!best || d < best.d) best = { v, d };
    }
    if (!best) {
      return { session, credits: [], message: `No ${routeLabel(manual.routeId)} train near that station right now.` };
    }
    const bound = bind(session, best.v, ctx, true);
    return {
      session: bound,
      credits: [],
      message: `Checked in on ${routeLabel(best.v.routeId)}.`,
      nextStopId: nextStopFor(best.v, ctx.stopOrder(best.v.routeId, best.v.directionId)),
    };
  }

  const st = session.state;
  const prevT = input.state.lastSampleT;
  const chainBroken = prevT == null || sample.t - prevT > CFG.chainGapMs;
  const cand = nearestCandidate(sample, ctx.vehicles, now);
  if (!cand) {
    return {
      session: { ...session, state: { ...st, candidateVehicleId: null, candidateCount: 0, window: [] } },
      credits: [],
      message: goodFix ? "Looking for your train..." : "Waiting for a better GPS fix...",
    };
  }
  const point: WindowPoint = { lat: sample.lat, lng: sample.lng, speed: sample.speed, t: sample.t };
  const same = !chainBroken && st.candidateVehicleId === cand.v.id;
  const window = same ? [...st.window, point].slice(-6) : [point];
  const count = same ? st.candidateCount + 1 : 1;
  session = { ...session, state: { ...st, candidateVehicleId: cand.v.id, candidateCount: count, window } };

  if (count >= CFG.bindSamples) {
    if (!showedMovement(window)) {
      return { session, credits: [], message: "Near a train, waiting to see it move with you..." };
    }
    const bound = bind(session, cand.v, ctx, false);
    return {
      session: bound,
      credits: [],
      message: `Found you on ${routeLabel(cand.v.routeId)}.`,
      nextStopId: nextStopFor(cand.v, ctx.stopOrder(cand.v.routeId, cand.v.directionId)),
    };
  }
  return {
    session,
    credits: [],
    message: `Looking for your train... (${count}/${CFG.bindSamples} matches)`,
  };
}

// ---------- copy ----------
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function routeLabel(routeId: string): string {
  if (routeId.startsWith("Green-")) return `Green Line ${routeId.slice(6)}`;
  if (["Red", "Orange", "Blue"].includes(routeId)) return `${routeId} Line`;
  const sl: Record<string, string> = { "741": "SL1", "742": "SL2", "743": "SL3", "746": "SLW", "749": "SL5", "751": "SL4" };
  return sl[routeId] ? `Silver Line ${sl[routeId]}` : routeId;
}

function rideOverMessage(session: SessionData, why: string): string {
  return `${why} Ride over: ${plural(session.stopsCredited, "stop")} credited.`;
}
