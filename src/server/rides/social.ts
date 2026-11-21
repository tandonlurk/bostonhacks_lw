// Ride start gate + teammate crew bonus math (owner: A, #96). Pure: no IO, so it can be tested
// offline (scripts/test-ride-social.mjs). Type-only imports only: node's type stripping can't
// resolve extensionless relative imports, so this file doesn't import engine.ts.
import type { NearStation } from "@/contracts";

/** Great-circle distance in meters (same formula as engine.distanceM). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- tunables ----------
export const SOCIAL = {
  /** base start radius around a station (m) */
  startRadiusM: 300,
  /** GPS inaccuracy (m) added to the radius, capped */
  maxAccuracyAllowanceM: 150,
  /** crew multiplier at the moment the crew forms */
  crewMaxMultiplier: 3,
  /** multiplier decays linearly to 1x over this long */
  crewDecayMs: 10 * 60_000,
  /** teammates whose last sample is older than this don't count */
  crewStaleMs: 2 * 60_000,
};

// ---------- start gate ----------
/** Effective start radius for one GPS fix. Missing accuracy is treated as 1000 m. */
export function startRadiusM(accuracy: number | null | undefined): number {
  const acc = accuracy == null || !Number.isFinite(accuracy) || accuracy < 0 ? 1000 : accuracy;
  return SOCIAL.startRadiusM + Math.min(acc, SOCIAL.maxAccuracyAllowanceM);
}

export interface StationLike {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Nearest *station* to a point: parent stations and stand-alone (Silver Line) stops. Platforms
 * and other child stops (`isChild`) are skipped, so the result is always something a rider names.
 */
export function nearestStation(
  point: { lat: number; lng: number },
  stations: Iterable<StationLike>,
  isChild: (id: string) => boolean = () => false,
): NearStation | null {
  let best: NearStation | null = null;
  for (const s of stations) {
    if (isChild(s.id)) continue;
    const d = distanceM(point, s);
    if (!best || d < best.distanceM) best = { id: s.id, name: s.name, lat: s.lat, lng: s.lng, distanceM: d };
  }
  return best ? { ...best, distanceM: Math.round(best.distanceM) } : null;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// ---------- crew bonus ----------
/** Multiplier on ride points (per minute): 3x when the crew forms, down to 1x after 10 minutes (1 decimal). */
export function crewMultiplier(crewFormedAt: number, now: number): number {
  const elapsed = Math.max(0, now - crewFormedAt);
  const raw = SOCIAL.crewMaxMultiplier - ((SOCIAL.crewMaxMultiplier - 1) * elapsed) / SOCIAL.crewDecayMs;
  return Math.max(1, Math.round(raw * 10) / 10);
}

export function crewEndsAt(crewFormedAt: number): number {
  return crewFormedAt + SOCIAL.crewDecayMs;
}

/**
 * Bonus for one credited minute: (multiplier - 1) points, accumulated in tenths so fractions are
 * never lost. Returns whole points to pay now and the remainder to carry.
 */
export function crewMinuteBonus(carry: number, multiplier: number): { points: number; carry: number } {
  const tenths = Math.round(carry * 10) + Math.max(0, Math.round((multiplier - 1) * 10));
  const points = Math.floor(tenths / 10);
  return { points, carry: (tenths - points * 10) / 10 };
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export function crewMessage(names: string[], multiplier: number): string {
  const who = joinNames(names);
  if (multiplier <= 1) return `Riding with ${who}.`;
  const verb = names.length === 1 ? "is" : "are";
  const fading = multiplier < SOCIAL.crewMaxMultiplier ? ", fading fast" : "";
  return `${who} ${verb} on your train! ${multiplier}x points${fading}.`;
}

// ---------- time-based ride points ----------
const MINUTE_MS = 60_000;

export interface RideClock {
  /** epoch ms the ride bound to a train; null = never boarded */
  boundAt: number | null;
  lastSampleT: number | null;
  lastGoodMatchT: number | null;
  lastVehicleSeenT: number | null;
  manual: boolean;
  /** epoch ms of the Start press (manual check-ins time out from here) */
  startedAt: number;
}

export interface RideWindows {
  tunnelGraceMs: number;
  vehicleMissingMs: number;
  manualGraceMs: number;
}

/**
 * Latest moment of a ride that can earn points: never past the last sample (no evidence after
 * that), never past the tunnel-grace or vehicle-missing windows that end a ride, never past `end`.
 */
export function creditableUntil(c: RideClock, end: number, w: RideWindows): number {
  let until = end;
  if (c.lastSampleT != null) until = Math.min(until, c.lastSampleT);
  if (c.lastVehicleSeenT != null) until = Math.min(until, c.lastVehicleSeenT + w.vehicleMissingMs);
  if (c.manual) until = Math.min(until, c.startedAt + w.manualGraceMs);
  else if (c.lastGoodMatchT != null) until = Math.min(until, c.lastGoodMatchT + w.tunnelGraceMs);
  return until;
}

/** Whole minutes ridden between boarding and `until`. */
export function minutesRidden(boundAt: number | null, until: number): number {
  if (boundAt == null || until <= boundAt) return 0;
  return Math.floor((until - boundAt) / MINUTE_MS);
}

/** Minute indices (1-based) still owed, given how many were already credited. Idempotent. */
export function minutesToCredit(boundAt: number | null, until: number, alreadyCredited: number): number[] {
  const total = minutesRidden(boundAt, until);
  const out: number[] = [];
  for (let n = alreadyCredited + 1; n <= total; n++) out.push(n);
  return out;
}

/** "7 min, 7 pts." */
export function rideSummary(minutes: number, points: number): string {
  return `${minutes} min, ${points} ${points === 1 ? "pt" : "pts"}.`;
}
