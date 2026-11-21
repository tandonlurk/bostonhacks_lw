// Offline tests for the ride start gate, time-based ride points and the crew bonus (#96).
// Run: node scripts/test-ride-social.mjs  (Node >= 22.18)
import assert from "node:assert/strict";
import { CFG, emptyState, step } from "../src/server/rides/engine.ts";
import {
  SOCIAL,
  creditableUntil,
  crewEndsAt,
  crewMessage,
  crewMinuteBonus,
  crewMultiplier,
  distanceM,
  formatDistance,
  minutesRidden,
  minutesToCredit,
  nearestStation,
  rideSummary,
  startRadiusM,
} from "../src/server/rides/social.ts";

const results = [];
function test(name, fn) {
  try { fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name, e.message]); }
}
const MIN = 60_000;
const WINDOWS = { tunnelGraceMs: CFG.tunnelGraceMs, vehicleMissingMs: CFG.vehicleMissingMs, manualGraceMs: CFG.manualGraceMs };

// ---------- start gate ----------
const STATIONS = [
  { id: "place-bucen", name: "Boston University Central", lat: 42.350082, lng: -71.106865 },
  { id: "70144", name: "Boston University Central (platform)", lat: 42.35009, lng: -71.10687 },
  { id: "place-buest", name: "Boston University East", lat: 42.349735, lng: -71.103889 },
  { id: "17091", name: "Terminal A", lat: 42.365553, lng: -71.017227 },
];
const isChild = (id) => id === "70144";

test("radius = 300 + min(accuracy, 150); missing accuracy counts as 1000", () => {
  assert.equal(startRadiusM(0), 300);
  assert.equal(startRadiusM(30), 330);
  assert.equal(startRadiusM(150), 450);
  assert.equal(startRadiusM(5000), 450);
  assert.equal(startRadiusM(undefined), 450);
  assert.equal(startRadiusM(null), 450);
  assert.equal(startRadiusM(Number.NaN), 450);
});

test("nearest station skips platforms and rounds distance", () => {
  const s = nearestStation({ lat: 42.35009, lng: -71.10687 }, STATIONS, isChild);
  assert.equal(s.id, "place-bucen");
  assert.ok(Number.isInteger(s.distanceM) && s.distanceM < 5);
});

test("Silver Line stop that is its own station can be nearest", () => {
  assert.equal(nearestStation({ lat: 42.3656, lng: -71.0172 }, STATIONS, isChild).id, "17091");
});

test("far point (harbor) is outside the radius but still reports the nearest station", () => {
  const harbor = { lat: 42.335, lng: -70.99 };
  const s = nearestStation(harbor, STATIONS, isChild);
  assert.equal(s.id, "17091");
  assert.ok(s.distanceM > startRadiusM(20));
  assert.equal(nearestStation(harbor, [], isChild), null);
});

test("distance formatting and haversine sanity", () => {
  assert.equal(formatDistance(84.4), "84 m");
  assert.equal(formatDistance(2440), "2.4 km");
  const d = distanceM(STATIONS[0], STATIONS[2]);
  assert.ok(d > 200 && d < 300, String(d));
});

// ---------- crew multiplier ----------
test("multiplier decays 3x -> 1x over 10 minutes, 1 decimal", () => {
  const t0 = 1_000_000;
  assert.equal(crewMultiplier(t0, t0), 3);
  assert.equal(crewMultiplier(t0, t0 + 3 * MIN), 2.4);
  assert.equal(crewMultiplier(t0, t0 + 5 * MIN), 2);
  assert.equal(crewMultiplier(t0, t0 + 10 * MIN), 1);
  assert.equal(crewMultiplier(t0, t0 + 60 * MIN), 1);
  assert.equal(crewMultiplier(t0, t0 - MIN), 3); // clock skew never exceeds 3x
  assert.equal(crewEndsAt(t0), t0 + SOCIAL.crewDecayMs);
});

test("fractional crew bonus accumulates without loss", () => {
  // 1.6x for 5 minutes = 0.6 * 5 = 3 bonus points exactly
  let carry = 0, paid = 0;
  for (let i = 0; i < 5; i++) { const b = crewMinuteBonus(carry, 1.6); carry = b.carry; paid += b.points; }
  assert.equal(paid, 3); assert.equal(carry, 0);
  // 1.3x: 0.3, 0.6, 0.9 -> 0, then 1.2 -> pay 1 carry 0.2
  carry = 0; paid = 0;
  const seq = [];
  for (let i = 0; i < 4; i++) { const b = crewMinuteBonus(carry, 1.3); carry = b.carry; paid += b.points; seq.push(b.points); }
  assert.deepEqual(seq, [0, 0, 0, 1]); assert.equal(carry, 0.2);
  // 3x pays 2 per minute; 1x pays nothing and keeps the carry
  assert.deepEqual(crewMinuteBonus(0, 3), { points: 2, carry: 0 });
  assert.deepEqual(crewMinuteBonus(0.4, 1), { points: 0, carry: 0.4 });
});

test("crew messages", () => {
  assert.equal(crewMessage(["Sam"], 2.4), "Sam is on your train! 2.4x points, fading fast.");
  assert.equal(crewMessage(["Sam", "Alex"], 3), "Sam and Alex are on your train! 3x points.");
  assert.equal(crewMessage(["Sam"], 1), "Riding with Sam.");
  assert.equal(crewMessage(["A", "B", "C", "D"], 1), "Riding with A, B and 2 more.");
});

// ---------- time-based ride points ----------
test("whole minutes only, from bind time", () => {
  assert.equal(minutesRidden(null, 10 * MIN), 0);
  assert.equal(minutesRidden(0, 59_999), 0);
  assert.equal(minutesRidden(0, 60_000), 1);
  assert.equal(minutesRidden(0, 7 * MIN + 30_000), 7);
  assert.equal(minutesRidden(5 * MIN, MIN), 0);
});

test("no double award across samples and end", () => {
  const boundAt = 0;
  const ledger = new Set(); // refs paid, like B's idempotent ledger
  let credited = 0;
  const sampleAt = (t) => {
    for (const n of minutesToCredit(boundAt, t, credited)) { assert.ok(!ledger.has(n), `minute ${n} paid twice`); ledger.add(n); credited = n; }
  };
  for (let t = 10_000; t <= 6 * MIN + 40_000; t += 10_000) sampleAt(t); // samples every 10 s
  assert.equal(credited, 6);
  sampleAt(6 * MIN + 40_000); // repeated sample
  sampleAt(6 * MIN + 59_000); // end before the 7th minute completes
  assert.equal(credited, 6);
  sampleAt(7 * MIN); // end exactly at 7 min
  assert.equal(credited, 7); assert.equal(ledger.size, 7);
  assert.deepEqual(minutesToCredit(boundAt, 7 * MIN, 7), []);
});

test("creditable time stops at the last sample and the windows that end a ride", () => {
  const base = { boundAt: 0, lastSampleT: 20 * MIN, lastGoodMatchT: 20 * MIN, lastVehicleSeenT: 20 * MIN, manual: false, startedAt: 0 };
  assert.equal(creditableUntil(base, 20 * MIN, WINDOWS), 20 * MIN);
  // /end long after the last sample: no credit for time with no evidence
  assert.equal(creditableUntil(base, 40 * MIN, WINDOWS), 20 * MIN);
  // underground (poor GPS) for longer than the grace: capped at lastGoodMatch + grace
  const tunnel = { ...base, lastSampleT: 30 * MIN, lastGoodMatchT: 10 * MIN };
  assert.equal(creditableUntil(tunnel, 30 * MIN, WINDOWS), 10 * MIN + CFG.tunnelGraceMs);
  // vehicle missing from the feed
  const missing = { ...base, lastSampleT: 30 * MIN, lastVehicleSeenT: 25 * MIN };
  assert.equal(creditableUntil(missing, 30 * MIN, WINDOWS), 25 * MIN + CFG.vehicleMissingMs);
  // manual check-in: capped by the manual window, not the GPS tunnel grace
  const manual = { ...base, manual: true, lastGoodMatchT: 0, lastSampleT: 40 * MIN, lastVehicleSeenT: 40 * MIN };
  assert.equal(creditableUntil(manual, 40 * MIN, WINDOWS), CFG.manualGraceMs);
});

test("ride summary copy", () => {
  assert.equal(rideSummary(7, 7), "7 min, 7 pts.");
  assert.equal(rideSummary(1, 1), "1 min, 1 pt.");
});

// ---------- engine: bind time and destination ----------
test("engine: boundAt set at bind, destStationId tracks the last station reached", () => {
  let T = Date.parse("2026-11-21T19:00:00Z");
  const ORDER = ["place-a", "place-b", "place-c"];
  const v = (o) => ({ id: "G-1", routeId: "Green-C", teamRouteId: "Green", directionId: 1, bearing: 90, speed: 8,
    currentStatus: "IN_TRANSIT_TO", stopId: "place-b", stopSequence: 1, label: "1", platformStopId: null, tripId: "t",
    reportedAt: new Date(T).toISOString(), lat: 42.35, lng: -71.108, ...o });
  const ctx = (vs) => ({ vehicles: vs, now: T, stopOrder: () => ORDER, stationCoords: () => null });
  let s = { id: "ses", riderId: "r", status: "searching", vehicleId: null, routeId: null, teamRouteId: null, directionId: null,
    stopsCredited: 0, pointsAwarded: 0, startedAt: new Date(T).toISOString(), endedAt: null, manual: false,
    state: { ...emptyState(), originStationId: "place-a" } };
  for (const lng of [-71.108, -71.1072, -71.1064]) { s = step(s, { lat: 42.35, lng, accuracy: 20, speed: 8, t: T }, ctx([v({ lng })])).session; T += 10_000; }
  assert.equal(s.status, "on_vehicle"); assert.equal(s.state.boundAt, T - 10_000);
  assert.equal(s.state.originStationId, "place-a");
  const r = step(s, { lat: 42.35, lng: -71.105, accuracy: 20, speed: 8, t: T }, ctx([v({ lng: -71.105, currentStatus: "STOPPED_AT", stopId: "place-c" })]));
  assert.equal(r.session.state.destStationId, "place-c");
  assert.equal(r.message, "On Green Line.");
});

for (const [st, n, e] of results) console.log(`${st}  ${n}${e ? "\n      " + e : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
