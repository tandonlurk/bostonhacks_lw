// End-to-end smoke test of every API in docs/CONTRACTS.md. Usage: scripts/smoke.sh [baseUrl]
// Creates one throwaway rider and briefly toggles a simulated delay on Silver (restored after).
const base = (process.argv[2] ?? "http://localhost:3001").replace(/\/$/, "");
let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!cond) failures++;
};
const warn = (name, detail) => console.log(`WARN  ${name}  (${detail})`);
async function call(path, body) {
  const t0 = Date.now();
  try {
    const res = await fetch(base + path, body === undefined ? {} : {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, ms: Date.now() - t0 };
  } catch (err) {
    return { status: 0, json: null, ms: Date.now() - t0, err: String(err) };
  }
}
const isArr = Array.isArray;

console.log(`Smoke test: ${base}\n`);

let r = await call("/api/health");
ok("GET /api/health", r.status === 200 && r.json?.ok === true, `db=${r.json?.db} ${r.ms}ms`);

r = await call("/api/routes");
ok("GET /api/routes", isArr(r.json) && r.json.length >= 13 && r.json.every((x) => x.teamRouteId && x.color), `${r.json?.length} routes`);

r = await call("/api/stops?routeId=Green-B");
ok("GET /api/stops?routeId=Green-B", isArr(r.json) && r.json.length > 10 && r.json.some((s) => s.id === "place-bucen"), `${r.json?.length} stops ${r.ms}ms`);

r = await call("/api/vehicles");
ok("GET /api/vehicles", r.status === 200 && isArr(r.json?.vehicles), `${r.json?.vehicles?.length} vehicles ${r.ms}ms`);
if (r.status === 200 && r.json.vehicles.length === 0) warn("vehicles", "no vehicles in service (late night?)");
if (r.ms > 1500) warn("vehicles latency", `${r.ms}ms`);

r = await call("/api/vehicles?teams=Nope");
ok("error shape (400 bad_team)", r.status === 400 && typeof r.json?.error?.code === "string");

r = await call("/api/delay");
ok("GET /api/delay", typeof r.json?.active === "boolean" && isArr(r.json?.teamRouteIds), `source=${r.json?.source}`);

const before = await call("/api/delay?teamRouteId=Silver");
if (before.json?.source !== "simulated") {
  r = await call("/api/delay/simulate", { teamRouteId: "Silver", active: true });
  ok("POST /api/delay/simulate on", r.json?.active === true && r.json?.source === "simulated");
  r = await call("/api/delay?teamRouteId=Silver");
  ok("GET /api/delay reflects simulate", r.json?.source === "simulated", r.json?.source === "simulated" ? "" : "different instance without a DB?");
  r = await call("/api/delay/simulate", { teamRouteId: "Silver", active: false });
  ok("POST /api/delay/simulate off", r.json?.source !== "simulated");
} else warn("simulate", "Silver already simulated; skipped toggle");

r = await call("/api/riders", { displayName: "Smoke Test", homeTeamRouteId: "Green" });
const riderId = r.json?.riderId;
ok("POST /api/riders", r.status === 201 && typeof riderId === "string");
if (riderId) {
  r = await call(`/api/riders/${riderId}`);
  ok("GET /api/riders/:id", r.json?.displayName === "Smoke Test" && typeof r.json?.points === "number", r.status === 404 ? "404: different instance without a DB?" : "");
  r = await call("/api/rides/sample", { riderId, lat: 42.350082, lng: -71.106865, accuracy: 20, speed: 0, ts: new Date().toISOString() });
  ok("POST /api/rides/sample", ["searching", "on_vehicle", "in_tunnel", "left"].includes(r.json?.state), r.json?.message ?? JSON.stringify(r.json));
  r = await call("/api/rides/end", { riderId });
  ok("POST /api/rides/end", typeof r.json?.sessionId === "string", JSON.stringify(r.json));
  r = await call(`/api/tokens?riderId=${riderId}`);
  ok("GET /api/tokens", typeof r.json?.balance === "number" && isArr(r.json?.ledger));
}

r = await call("/api/leaderboard");
ok("GET /api/leaderboard", isArr(r.json?.teams) && r.json.teams.length === 5, `${r.json?.teams?.length} teams`);
r = await call("/api/districts");
ok("GET /api/districts", isArr(r.json) && r.json.length === 5 && r.json.every((d) => isArr(d.lots)));
r = await call("/api/hunts?stopId=place-bucen");
ok("GET /api/hunts", r.status === 200 && isArr(r.json?.clues), `status ${r.status}`);
r = await call("/api/landmarks?lat=42.35&lng=-71.1&radiusM=800");
ok("GET /api/landmarks", isArr(r.json));
r = await call("/api/perks");
ok("GET /api/perks", isArr(r.json));

r = await call("/");
ok("GET / (app shell)", r.status === 200);

console.log(`\n${failures ? `${failures} FAILED` : "ALL PASSED"}`);
process.exit(failures ? 1 : 0);
