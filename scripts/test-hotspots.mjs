// Offline tests for hotspots (graph, alternate routes, interest pull, commute mining, meet matching).
// Run: node scripts/test-hotspots.mjs   (memory mode; unset DATABASE_URL)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

delete process.env.DATABASE_URL;
// Load TS modules (and "@/..." imports) with the project's compiler, no extra test dependency.
const require = createRequire(import.meta.url);
const Module = require("node:module");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (specifier, parent, ...rest) {
  return resolve.call(this, specifier.startsWith("@/") ? path.join(process.cwd(), "src", specifier.slice(2)) : specifier, parent, ...rest);
};
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText,
    filename,
  );

const G = require("../src/server/hotspots/graph.ts");
const A = require("../src/server/hotspots/algorithm.ts");
const M = require("../src/server/hotspots/meet.ts");
const routes = require("../src/contracts/routes.ts");
const stops = JSON.parse(fs.readFileSync(new URL("../src/server/mbta/static-stops.json", import.meta.url), "utf8"));
const names = Object.fromEntries(Object.values(routes.TEAMS).map((t) => [t.id, t.name]));
const g = G.buildGraph(stops, routes.toTeamRouteId, names);
const neighbors = (id) => (g.adj.get(id) ?? []).map((e) => e.to);

test("graph builds from static-stops.json with lines, not branches", () => {
  const stations = [...g.adj.keys()].filter((id) => id.startsWith("place-"));
  assert.ok(stations.length > 100, `only ${stations.length} stations`);
  const lines = new Set([...g.adj.values()].flat().map((e) => e.line));
  assert.deepEqual([...lines].sort(), ["Blue", "Green", "Orange", "Red", "Silver"]);
  // Red Line branch fix: no Ashmont <-> North Quincy edge, JFK <-> North Quincy instead.
  assert.ok(!neighbors("place-asmnl").includes("place-nqncy"));
  assert.ok(neighbors("place-jfk").includes("place-nqncy"));
  // Green branches are one line: Kenmore -> Park Street has no transfer.
  const p = G.shortestPath(g, "place-bland", "place-pktrm");
  assert.equal(p.transfers, 0);
  assert.deepEqual(p.legs.map((l) => l.line), ["Green"]);
  // SL5 street stops connect to the network.
  assert.ok(G.shortestPath(g, "place-nubn", "place-dwnxg"));
});

test("usual path vs alternate on another line: BU Central -> Downtown Crossing", () => {
  const r = A.findCandidates(g, "place-bucen", "place-dwnxg");
  assert.deepEqual(r.usual.legs.map((l) => l.line), ["Green", "Red"]);
  assert.ok(r.candidates.length >= 2, "want a choice of stations");
  for (const c of r.candidates) {
    assert.equal(c.tier, "alternate");
    assert.ok(c.lines.some((l) => !["Green", "Red"].includes(l)), `${c.stationId} uses no new line`);
    assert.equal(c.path[0], "place-bucen");
    assert.equal(c.path.at(-1), "place-dwnxg");
    assert.ok(c.path.includes(c.stationId));
    assert.equal(new Set(c.path).size, c.path.length, "no revisits");
    assert.ok(c.cost <= r.usual.cost * A.HOTSPOT.maxCostFactor + A.HOTSPOT.maxCostSlack);
    assert.ok(c.lines.every((l, i) => i === 0 || c.lines[i - 1] !== l), "collapsed");
    assert.ok(!c.lines.some((l) => l.startsWith("Green-")));
  }
  const haymarket = r.candidates.find((c) => c.stationId === "place-haecl");
  assert.ok(haymarket, "Orange via Haymarket");
  assert.match(haymarket.reason, /Switch to the Orange Line at Haymarket instead of riding the Green Line/);
});

test("swapping Green branches alone is not a different route", () => {
  const r = A.findCandidates(g, "place-kencl", "place-pktrm");
  for (const c of r.candidates) if (c.tier === "alternate") assert.ok(c.lines.some((l) => l !== "Green"));
});

test("fallbacks: short trips get a nearby interchange or a walkable other line, else a clear reason", () => {
  const short = A.findCandidates(g, "place-sstat", "place-wtcst");
  assert.ok(short.candidates.length && short.candidates.every((c) => c.tier === "nearby"));
  const hop = A.findCandidates(g, "place-kencl", "place-hymnl");
  assert.ok(hop.candidates.length && hop.candidates.every((c) => c.tier === "nearest"));
  assert.match(hop.candidates[0].reason, /min on foot from Hynes/);
  const none = A.findCandidates(g, "place-asmnl", "place-qnctr");
  assert.equal(none.candidates.length, 0);
  assert.ok(none.noAlternative);
  assert.ok(A.findCandidates(g, "place-nope", "place-qnctr").noAlternative);
});

test("commute mining: A->B and B->A merge, recent trips weigh more", () => {
  const now = Date.parse("2026-11-21T20:00:00Z");
  const at = (days) => new Date(now - days * 86_400_000).toISOString();
  const trips = [
    { originStationId: "a", destStationId: "b", endedAt: at(0) },
    { originStationId: "b", destStationId: "a", endedAt: at(0.5) },
    { originStationId: "a", destStationId: "b", endedAt: at(1) },
    // three old trips: more trips, but weeks ago
    ...[20, 21, 22].map((d) => ({ originStationId: "c", destStationId: "d", endedAt: at(d) })),
    { originStationId: "e", destStationId: "e", endedAt: at(0) },
  ];
  const c = A.mineCommutes(trips, now);
  assert.equal(c.length, 2);
  assert.deepEqual([c[0].from, c[0].to, c[0].trips], ["a", "b", 3]);
  assert.deepEqual([c[1].from, c[1].to], ["c", "d"]);
});

test("interest pull: shared interests converge on one station far more than disjoint ones", () => {
  const { candidates } = A.findCandidates(g, "place-bucen", "place-dwnxg");
  const day = "2026-11-21";
  const run = (theirs) => {
    let same = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const a = { riderId: `rdr_a${i}`, interests: ["music", "coffee", "climbing"] };
      const b = { riderId: `rdr_b${i}`, interests: theirs };
      const pickA = A.chooseHotspot(candidates, a, [], day, g);
      const holders = [{ riderId: a.riderId, stationId: pickA.candidate.stationId, interests: a.interests }];
      const pickB = A.chooseHotspot(candidates, b, holders, day, g);
      if (pickA.candidate.stationId === pickB.candidate.stationId) {
        same++;
        assert.equal(pickB.sharedWith, 1);
      }
    }
    return same / N;
  };
  const overlap = run(["music", "coffee", "art"]);
  const disjoint = run(["chess", "anime"]);
  console.log(`   same station: overlapping interests ${(overlap * 100).toFixed(0)}%, disjoint ${(disjoint * 100).toFixed(0)}%`);
  assert.ok(overlap > 0.9, `overlap ${overlap}`);
  assert.ok(disjoint < 0.75, `disjoint ${disjoint}`);
  assert.ok(overlap - disjoint > 0.3);
  // Stable per rider per day; shared interests reported.
  const me = { riderId: "rdr_x", interests: ["music", "coffee"] };
  const holders = [{ riderId: "rdr_y", stationId: "place-gover", interests: ["coffee", "music", "art"] }];
  const p1 = A.chooseHotspot(candidates, me, holders, day, g);
  assert.equal(p1.candidate.stationId, "place-gover");
  assert.deepEqual(p1.sharedInterests, ["coffee", "music"]);
  assert.equal(A.chooseHotspot(candidates, me, holders, day, g).candidate.stationId, p1.candidate.stationId);
});

// ---------- meet matching (pure) ----------
const T0 = Date.parse("2026-11-21T20:00:00Z");
const row = (o) => ({
  id: 1, riderId: "r1", hotspotId: "hs_1", stationId: "place-haecl", code: "1234", lat: 0, lng: 0,
  partnerId: null, points: 0, lastSeenAt: T0, expiresAt: T0 + M.MEET.codeTtlMs, matchedAt: null, ...o,
});
const holders = new Set(["r1"]);

test("meet: bump window", () => {
  const rows = [row({})];
  const p = M.planMeet(rows, { riderId: "r2", now: T0 + 4000, holders });
  assert.equal(p.kind, "match");
  assert.equal(p.partner.riderId, "r1");
  assert.equal(M.planMeet(rows, { riderId: "r2", now: T0 + 10_500, holders }).kind, "wait", "too late for a bump");
  // ...but the waiting rider keeps polling (lastSeen refresh), so a new arrival still pairs.
  assert.equal(M.planMeet([row({ lastSeenAt: T0 + 9000 })], { riderId: "r2", now: T0 + 10_500, holders }).kind, "match");
  // No one else: wait (create) / poll own pending (refresh).
  assert.deepEqual(M.planMeet([], { riderId: "r1", now: T0, holders }), { kind: "wait", mine: null });
  assert.equal(M.planMeet(rows, { riderId: "r1", now: T0 + 2000, holders }).mine.id, 1);
  // Neither holds a hotspot here: no bump.
  assert.equal(M.planMeet(rows, { riderId: "r2", now: T0 + 1000, holders: new Set() }).kind, "wait");
});

test("meet: code path", () => {
  const rows = [row({ lastSeenAt: T0 - 20_000, expiresAt: T0 + 10_000 })];
  assert.equal(M.planMeet(rows, { riderId: "r2", code: "1234", now: T0, holders }).kind, "match");
  assert.equal(M.planMeet(rows, { riderId: "r2", code: "9999", now: T0, holders }).kind, "code_not_found");
  assert.equal(M.planMeet(rows, { riderId: "r1", code: "1234", now: T0, holders }).kind, "code_not_found", "own code");
  assert.equal(M.planMeet(rows, { riderId: "r2", code: "1234", now: T0 + 11_000, holders }).kind, "code_not_found", "expired code");
  assert.equal(M.planMeet(rows, { riderId: "r2", code: "1234", now: T0, holders: new Set() }).kind, "no_holder");
});

test("meet: deliver to the waiting rider once, report expiry", () => {
  const matched = row({ partnerId: "r2", matchedAt: T0, points: 50, expiresAt: T0 + M.MEET.deliveryMs });
  assert.equal(M.planMeet([matched], { riderId: "r1", now: T0 + 2000, holders }).kind, "deliver");
  // after delivery (expiresAt = now) the next call starts a new request
  assert.equal(M.planMeet([{ ...matched, expiresAt: T0 + 2000 }], { riderId: "r1", now: T0 + 4000, holders }).kind, "wait");
  const lapsed = row({ expiresAt: T0 - 1000 });
  assert.equal(M.planMeet([lapsed], { riderId: "r1", now: T0, holders }).kind, "expired");
  assert.equal(M.planMeet([row({ expiresAt: T0 - 10 * 60_000 })], { riderId: "r1", now: T0, holders }).kind, "wait");
  const code = M.newCode([row({ code: "0000" })], T0, () => 0);
  assert.notEqual(code, "0000");
  assert.match(code, /^\d{4}$/);
});

test("meet: award ref is once per pair per station per UTC day", () => {
  const a = M.meetRef("r1", "r2", "place-haecl", T0);
  assert.equal(a, M.meetRef("r1", "r2", "place-haecl", T0 + 3_600_000));
  assert.notEqual(a, M.meetRef("r2", "r1", "place-haecl", T0), "each rider has their own ref");
  assert.ok(a.includes("r1+r2") && M.meetRef("r2", "r1", "place-haecl", T0).includes("r1+r2"));
  assert.notEqual(a, M.meetRef("r1", "r2", "place-haecl", T0 + 86_400_000));
  assert.notEqual(a, M.meetRef("r1", "r2", "place-state", T0));
  assert.notEqual(a, M.meetRef("r1", "r3", "place-haecl", T0));
  assert.equal(M.meetRadiusM(), 150);
  assert.equal(M.meetRadiusM(500), 250);
});

test("every demo commute has a real alternate, and teams share hubs", () => {
  const { DEMO_COMMUTES } = require("../src/server/hotspots/index.ts");
  const sets = {};
  for (const [team, c] of Object.entries(DEMO_COMMUTES)) {
    const r = A.findCandidates(g, c.from, c.to);
    assert.ok(r.candidates.length && r.candidates.every((x) => x.tier === "alternate"), team);
    sets[team] = new Set(r.candidates.map((x) => x.stationId));
  }
  assert.ok([...sets.Green].some((s) => sets.Orange.has(s)), "Green and Orange can meet");
  assert.ok([...sets.Green].some((s) => sets.Blue.has(s)), "Green and Blue can meet");
  assert.ok([...sets.Orange].some((s) => sets.Red.has(s)), "Orange and Red can meet");
});

test("service (memory): generate, share by interests, bump, code, once per pair per day", async () => {
  const store = require("../src/server/rides/store.ts");
  const svc = require("../src/server/hotspots/index.ts");
  const { getRiderStats } = require("../src/server/points/index.ts");
  const r1 = await store.createRider("Ana", "Green");
  const r2 = await store.createRider("Ben", "Orange");
  await store.updateRiderProfile(r1.id, { interests: ["music", "coffee"] });
  await store.updateRiderProfile(r2.id, { interests: ["music", "coffee", "art"] });
  const before = await svc.getHotspots(r1.id);
  assert.equal(before.eligible, false);
  assert.equal(before.hotspots.length, 0);
  for (const [o, d] of [["place-bucen", "place-dwnxg"], ["place-dwnxg", "place-bucen"], ["place-bucen", "place-dwnxg"]]) {
    await store.recordSyntheticTrip(r1.id, o, d, "Green-B", "Green");
    await store.recordSyntheticTrip(r2.id, o, d, "Green-B", "Green");
  }
  const h1 = await svc.getHotspots(r1.id);
  assert.equal(h1.eligible, true);
  assert.equal(h1.tripsLogged, 3);
  assert.equal(h1.hotspots.length, 1);
  assert.deepEqual((await svc.getHotspots(r1.id)).hotspots.map((h) => h.id), h1.hotspots.map((h) => h.id), "stable on GET");
  const h2 = await svc.getHotspots(r2.id);
  const spot = h1.hotspots[0];
  assert.equal(h2.hotspots[0].stationId, spot.stationId, "shared interests pull Ben to Ana's station");
  assert.equal(h2.hotspots[0].sharedWith, 1);
  assert.deepEqual(h2.hotspots[0].sharedInterests, ["coffee", "music"]);
  assert.equal(spot.meetPoints, 50);
  assert.equal(spot.multiplier, 5);

  const at = { lat: spot.lat, lng: spot.lng };
  await assert.rejects(svc.meet({ riderId: r1.id, hotspotId: spot.id, lat: spot.lat + 0.01, lng: spot.lng }), { code: "not_at_hotspot" });
  const w = await svc.meet({ riderId: r1.id, hotspotId: spot.id, ...at });
  assert.equal(w.status, "waiting");
  assert.match(w.code, /^\d{4}$/);
  const m = await svc.meet({ riderId: r2.id, hotspotId: h2.hotspots[0].id, ...at });
  assert.equal(m.status, "matched");
  assert.equal(m.pointsAwarded, 50);
  assert.equal(m.partner.riderId, r1.id);
  const polled = await svc.meet({ riderId: r1.id, hotspotId: spot.id, ...at });
  assert.equal(polled.status, "matched");
  assert.equal(polled.pointsAwarded, 50);
  assert.equal(polled.partner.riderId, r2.id);
  assert.equal((await getRiderStats(r1.id)).points, 50);
  assert.equal((await getRiderStats(r2.id)).points, 50);

  // Again by code: matched, but no second bonus today.
  const w2 = await svc.meet({ riderId: r1.id, hotspotId: spot.id, ...at });
  assert.equal(w2.status, "waiting");
  await assert.rejects(svc.meet({ riderId: r2.id, hotspotId: spot.id, ...at, code: w2.code === "0000" ? "0001" : "0000" }), { code: "code_not_found" });
  const again = await svc.meet({ riderId: r2.id, hotspotId: spot.id, ...at, code: w2.code });
  assert.equal(again.status, "matched");
  assert.equal(again.pointsAwarded, 0);
  assert.match(again.message, /already met/);
  assert.equal((await getRiderStats(r2.id)).points, 50);
});
