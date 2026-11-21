// E2E ride check against live MBTA data: creates a rider, picks a moving train, and sends that
// train's live position as the rider's GPS every 10 s. Expect: searching -> on_vehicle -> stops credited.
// Usage: node scripts/ride-follow.mjs [baseUrl=http://localhost:3001] [routeId=Green-B] [minutes=4]
const [base = "http://localhost:3001", routeId = "Green-B", minutes = "4"] = process.argv.slice(2);
const team = routeId.startsWith("Green") ? "Green" : /^7\d\d$/.test(routeId) ? "Silver" : routeId;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (path, body) => {
  const res = await fetch(base + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(json)}`);
  return json;
};

const { riderId } = await call("/api/riders", { displayName: "E2E bot", homeTeamRouteId: team });
const { vehicles } = await call(`/api/vehicles?teams=${team}`);
const pick = vehicles.filter((v) => v.routeId === routeId).sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0))[0];
if (!pick) throw new Error(`no ${routeId} vehicles in service`);
console.log(`rider ${riderId} following ${pick.id} (${pick.routeId} dir ${pick.directionId}) ${pick.currentStatus} ${pick.stopId}`);

const until = Date.now() + Number(minutes) * 60_000;
let last;
while (Date.now() < until) {
  const { vehicles: vs } = await call(`/api/vehicles?teams=${team}`);
  const v = vs.find((x) => x.id === pick.id);
  if (!v) { console.log("vehicle left the feed"); break; }
  last = await call("/api/rides/sample", {
    riderId, lat: v.lat + 0.00008, lng: v.lng - 0.00008, accuracy: 15,
    speed: v.speed ?? (v.currentStatus === "STOPPED_AT" ? 0 : 6), ts: new Date().toISOString(),
  });
  console.log(new Date().toISOString().slice(11, 19), last.state.padEnd(10), `stops=${last.stopsCredited}`, `veh=${v.currentStatus} ${v.stopId}`, "|", last.message);
  await sleep(10_000);
}
console.log("end:", await call("/api/rides/end", { riderId }));
console.log("rider:", await call(`/api/riders/${riderId}`));
