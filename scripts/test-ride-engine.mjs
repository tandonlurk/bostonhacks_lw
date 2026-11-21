// Offline tests for the ride engine. Run: node scripts/test-ride-engine.mjs  (Node >= 22.18)
import assert from "node:assert/strict";
import { CFG, emptyState, step } from "../src/server/rides/engine.ts";

const ORDER = ["place-a", "place-b", "place-c", "place-d", "place-e"];
const COORD = { "place-a": [42.35, -71.11], "place-b": [42.35, -71.105], "place-c": [42.35, -71.1], "place-d": [42.35, -71.095], "place-e": [42.35, -71.09] };

let T = Date.parse("2026-11-21T19:00:00Z");
const vehicle = (o) => ({
  id: "G-1", routeId: "Green-B", teamRouteId: "Green", directionId: 1, bearing: 90, speed: 8,
  currentStatus: "IN_TRANSIT_TO", stopId: "place-b", stopSequence: 10, label: "1", platformStopId: null,
  tripId: "t", reportedAt: new Date(T).toISOString(), lat: 42.35, lng: -71.108, ...o,
});
const ctx = (vehicles) => ({
  vehicles, now: T,
  stopOrder: (r, d) => (r === "Green-B" && d === 1 ? ORDER : []),
  stationCoords: (id) => (COORD[id] ? { lat: COORD[id][0], lng: COORD[id][1] } : null),
});
const fresh = () => ({
  id: "ses_1", riderId: "rdr_1", status: "searching", vehicleId: null, routeId: null, teamRouteId: null,
  directionId: null, stopsCredited: 0, pointsAwarded: 0, startedAt: new Date(T).toISOString(), endedAt: null,
  manual: false, state: emptyState(),
});
const run = (s, sample, vehicles, manual) => step(s, { accuracy: 20, speed: 8, ...sample, t: T }, ctx(vehicles), manual);
const tick = (ms = 10_000) => { T += ms; };

let results = [];
function test(name, fn) {
  T = Date.parse("2026-11-21T19:00:00Z");
  try { fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name, e.message]); }
}

test("binds after 3 consecutive matching moving samples", () => {
  let s = fresh();
  let r = run(s, { lat: 42.35, lng: -71.108 }, [vehicle()]); s = r.session;
  assert.equal(s.status, "searching"); assert.equal(s.state.candidateCount, 1);
  tick(); r = run(s, { lat: 42.35, lng: -71.1072 }, [vehicle({ lng: -71.1072 })]); s = r.session;
  assert.equal(s.state.candidateCount, 2);
  tick(); r = run(s, { lat: 42.35, lng: -71.1064 }, [vehicle({ lng: -71.1064 })]); s = r.session;
  assert.equal(s.status, "on_vehicle"); assert.equal(s.vehicleId, "G-1"); assert.equal(s.teamRouteId, "Green");
  assert.equal(r.nextStopId, "place-b");
});

test("stationary phone next to a train does not bind", () => {
  let s = fresh();
  for (let i = 0; i < 4; i++) { s = run(s, { lat: 42.35, lng: -71.108, speed: 0 }, [vehicle({ speed: 0, currentStatus: "STOPPED_AT", stopId: "place-a" })]).session; tick(); }
  assert.equal(s.status, "searching");
});

test("far vehicle does not match; chain resets after a gap", () => {
  let s = fresh();
  s = run(s, { lat: 42.36, lng: -71.108 }, [vehicle()]).session;
  assert.equal(s.state.candidateCount, 0);
  s = run(s, { lat: 42.35, lng: -71.108 }, [vehicle()]).session; tick(); 
  s = run(s, { lat: 42.35, lng: -71.1072 }, [vehicle({ lng: -71.1072 })]).session; assert.equal(s.state.candidateCount, 2);
  tick(CFG.chainGapMs + 1000);
  s = run(s, { lat: 42.35, lng: -71.1064 }, [vehicle({ lng: -71.1064 })]).session; assert.equal(s.state.candidateCount, 1);
});

function boundSession() {
  let s = fresh();
  for (const lng of [-71.108, -71.1072, -71.1064]) { s = run(s, { lat: 42.35, lng }, [vehicle({ lng })]).session; tick(); }
  assert.equal(s.status, "on_vehicle");
  return s;
}

test("credits stations as the vehicle reaches them, once each", () => {
  let s = boundSession(); // IN_TRANSIT_TO b => reached a
  let r = run(s, { lat: 42.35, lng: -71.105 }, [vehicle({ lng: -71.105, currentStatus: "STOPPED_AT", stopId: "place-b" })]); s = r.session;
  assert.deepEqual(r.credits.map((c) => c.stationId), ["place-b"]);
  tick(); r = run(s, { lat: 42.35, lng: -71.105 }, [vehicle({ lng: -71.105, currentStatus: "STOPPED_AT", stopId: "place-b" })]); s = r.session;
  assert.equal(r.credits.length, 0);
  tick(); r = run(s, { lat: 42.35, lng: -71.0955 }, [vehicle({ lng: -71.0955, currentStatus: "INCOMING_AT", stopId: "place-d" })]); s = r.session;
  assert.deepEqual(r.credits.map((c) => c.stationId), ["place-c"]);
  assert.equal(s.stopsCredited, 2);
});

test("boarding station is not credited", () => {
  let s = fresh();
  const v = (lng) => vehicle({ lng, speed: 0, currentStatus: "STOPPED_AT", stopId: "place-a" });
  for (const lng of [-71.11, -71.1099, -71.1098]) { s = run(s, { lat: 42.35, lng, speed: 0 }, [v(lng)]).session; tick(); }
  // Not moving yet -> still searching. Train departs:
  s = run(s, { lat: 42.35, lng: -71.108 }, [vehicle({ lng: -71.108 })]).session;
  assert.equal(s.status, "on_vehicle"); assert.equal(s.stopsCredited, 0);
});

test("poor GPS underground keeps the session in tunnel and still credits", () => {
  let s = boundSession();
  tick(); let r = run(s, { lat: 42.34, lng: -71.12, accuracy: 900 }, [vehicle({ lng: -71.1, currentStatus: "STOPPED_AT", stopId: "place-c" })]); s = r.session;
  assert.equal(s.status, "in_tunnel");
  assert.deepEqual(r.credits.map((c) => c.stationId), ["place-b", "place-c"]);
  tick(); r = run(s, { lat: 42.35, lng: -71.0951, accuracy: 15 }, [vehicle({ lng: -71.095 })]); s = r.session;
  assert.equal(s.status, "on_vehicle");
});

test("tunnel grace expires", () => {
  let s = boundSession();
  for (let i = 0; i < 6; i++) { tick(2 * 60_000); s = run(s, { lat: 42.3, lng: -71.2, accuracy: 1500 }, [vehicle()]).session; }
  assert.equal(s.status, "left"); assert.ok(s.endedAt);
});

test("good fixes away from the train -> left after 3 fresh samples", () => {
  let s = boundSession();
  for (let i = 0; i < 2; i++) { tick(); s = run(s, { lat: 42.36, lng: -71.108 + i * 0.0003, accuracy: 10, speed: 1 }, [vehicle({ lng: -71.09 })]).session; }
  assert.equal(s.status, "in_tunnel");
  tick(); s = run(s, { lat: 42.36, lng: -71.107, accuracy: 10, speed: 1 }, [vehicle({ lng: -71.09 })]).session;
  assert.equal(s.status, "left");
});

test("repeated identical (cached) fix does not count as leaving", () => {
  let s = boundSession();
  for (let i = 0; i < 5; i++) { tick(); s = run(s, { lat: 42.36, lng: -71.108, accuracy: 10 }, [vehicle({ lng: -71.09 })]).session; }
  assert.equal(s.status, "in_tunnel");
});

test("vehicle missing from feed -> tunnel, then left after timeout", () => {
  let s = boundSession();
  tick(); s = run(s, { lat: 42.35, lng: -71.1 }, []).session; assert.equal(s.status, "in_tunnel");
  tick(CFG.vehicleMissingMs + 1000); s = run(s, { lat: 42.35, lng: -71.1 }, []).session; assert.equal(s.status, "left");
});

test("direction flip at terminal ends the ride", () => {
  let s = boundSession();
  tick(); s = run(s, { lat: 42.35, lng: -71.1 }, [vehicle({ directionId: 0 })]).session;
  assert.equal(s.status, "left");
});

test("manual fallback binds to nearest matching vehicle near the stop", () => {
  let s = fresh();
  const r = run(s, { lat: 42.35, lng: -71.105, accuracy: 1200 }, [vehicle({ id: "G-far", lng: -71.09, stopId: "place-e" }), vehicle({ id: "G-near", lng: -71.104 })], { routeId: "Green-B", directionId: 1, stopId: "place-b" });
  assert.equal(r.session.status, "on_vehicle"); assert.equal(r.session.vehicleId, "G-near"); assert.equal(r.session.manual, true);
});

test("manual fallback prefers the train at the station over one that already passed", () => {
  const passed = vehicle({ id: "G-passed", lng: -71.1045, currentStatus: "IN_TRANSIT_TO", stopId: "place-d" });
  const arriving = vehicle({ id: "G-arriving", lng: -71.108, currentStatus: "IN_TRANSIT_TO", stopId: "place-b" });
  const r = run(fresh(), { lat: 42.35, lng: -71.105, accuracy: 50 }, [passed, arriving], { routeId: "Green-B", directionId: 1, stopId: "place-b" });
  assert.equal(r.session.vehicleId, "G-arriving");
});

test("manual session keeps tracking while the client stays in manual mode", () => {
  const hint = { routeId: "Green-B", directionId: 1, stopId: "place-b" };
  let s = run(fresh(), { lat: 42.35, lng: -71.105, accuracy: 50 }, [vehicle({ lng: -71.104 })], hint).session;
  assert.equal(s.status, "on_vehicle");
  for (let i = 0; i < 6; i++) { tick(2 * 60_000); s = run(s, { lat: 42.35, lng: -71.105, accuracy: 50 }, [vehicle({ lng: -71.1, currentStatus: "STOPPED_AT", stopId: "place-c" })], hint).session; }
  assert.equal(s.status, "on_vehicle");
  assert.equal(s.stopsCredited, 2);
});

test("manual fallback rejects a rider far from the stop with good GPS", () => {
  const r = run(fresh(), { lat: 42.40, lng: -71.105, accuracy: 10 }, [vehicle({ lng: -71.104 })], { routeId: "Green-B", directionId: 1, stopId: "place-b" });
  assert.equal(r.session.status, "searching");
});

test("big station jump (branch switch) credits only the arrival", () => {
  let s = boundSession();
  tick(); const r = run(s, { lat: 42.35, lng: -71.09, accuracy: 900 }, [vehicle({ lng: -71.09, currentStatus: "STOPPED_AT", stopId: "place-e" })]);
  assert.deepEqual(r.credits.map((c) => c.stationId), ["place-e"]);
});

for (const [st, n, e] of results) console.log(`${st}  ${n}${e ? "\n      " + e : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
