// E2E ride check against live MBTA data: creates rider(s), picks a moving train, presses Start at the
// train's station, then sends that train's live position as the riders' GPS every 10 s.
// Expect: searching -> on_vehicle -> 1 pt per full minute. With riders >= 2 (same team, same train)
// expect `crew` with a decaying multiplier and co_ride bonus points.
// Usage: node scripts/ride-follow.mjs [baseUrl=http://localhost:3001] [routeId=Green-B] [minutes=4] [riders=1]
const [base = "http://localhost:3001", routeId = "Green-B", minutes = "4", riderCount = "1"] = process.argv.slice(2);
const team = routeId.startsWith("Green") ? "Green" : /^7\d\d$/.test(routeId) ? "Silver" : routeId;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (path, body) => {
  const res = await fetch(base + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(json)}`);
  return json;
};

const n = Math.max(1, Number(riderCount) || 1);
const riders = [];
for (let i = 0; i < n; i++) {
  const { riderId } = await call("/api/riders", { displayName: n === 1 ? "E2E bot" : `E2E bot ${i + 1}`, homeTeamRouteId: team });
  riders.push(riderId);
}
const { vehicles } = await call(`/api/vehicles?teams=${team}`);
const pick = vehicles.filter((v) => v.routeId === routeId).sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0))[0];
if (!pick) throw new Error(`no ${routeId} vehicles in service`);
console.log(`riders ${riders.join(", ")} following ${pick.id} (${pick.routeId} dir ${pick.directionId}) ${pick.currentStatus} ${pick.stopId}`);

// Press Start at the station the train is at / heading to (where a rider would be waiting).
const stops = await call(`/api/stops?routeId=${routeId}`).catch(() => []);
const at = stops.find((s) => s.id === pick.stopId) ?? { lat: pick.lat, lng: pick.lng };
for (const riderId of riders) {
  const started = await call("/api/rides/start", { riderId, lat: at.lat, lng: at.lng, accuracy: 15 });
  console.log("start:", started.station.name, `${started.station.distanceM} m`, "|", started.message);
}

const until = Date.now() + Number(minutes) * 60_000;
const last = new Map();
while (Date.now() < until) {
  const { vehicles: vs } = await call(`/api/vehicles?teams=${team}`);
  const v = vs.find((x) => x.id === pick.id);
  if (!v) { console.log("vehicle left the feed"); break; }
  for (const [i, riderId] of riders.entries()) {
    const r = await call("/api/rides/sample", {
      riderId, lat: v.lat + 0.00008 * (i + 1), lng: v.lng - 0.00008, accuracy: 15,
      speed: v.speed ?? (v.currentStatus === "STOPPED_AT" ? 0 : 6), ts: new Date().toISOString(),
    });
    last.set(riderId, r);
    const crew = r.crew ? ` crew=${r.crew.multiplier}x bonus=${r.crew.bonusPoints}` : "";
    console.log(new Date().toISOString().slice(11, 19), `#${i + 1}`, r.state.padEnd(10), `min=${r.minutesRidden ?? "-"} pts=${r.pointsAwarded ?? "-"} stops=${r.stopsCredited}${crew}`, `veh=${v.currentStatus} ${v.stopId}`, "|", r.message, r.crew ? `| ${r.crew.message}` : "");
  }
  if ([...last.values()].every((r) => r.state === "left")) break;
  await sleep(10_000);
}
for (const riderId of riders) {
  console.log("end:", await call("/api/rides/end", { riderId }));
  console.log("rider:", await call(`/api/riders/${riderId}`));
}
