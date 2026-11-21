// Snapshot static MBTA stop data (station index, platform->station map, per-route travel order)
// into src/server/mbta/static-stops.json. Used as a fallback when the MBTA API is rate-limited or
// unreachable (offline demo). Re-run if MBTA changes stations: node scripts/snapshot-stops.mjs
import { writeFileSync } from "node:fs";

const ROUTES = ["Red", "Orange", "Blue", "Green-B", "Green-C", "Green-D", "Green-E", "741", "742", "743", "746", "749", "751"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`https://api-v3.mbta.com${path}`);
    if (res.status === 429) { await sleep(15_000); continue; }
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    await sleep(3500); // stay under the keyless 20/min limit
    return (await res.json()).data;
  }
  throw new Error(`${path} rate limited`);
}
const round = (x) => Math.round(x * 1e6) / 1e6;

const stations = {};
const parentOf = {};
// filter[route] returns parent stations (filter[route_type] only matches platforms); child_stops
// maps every platform, including ones a route filter misses (e.g. Silver Line 746xx).
const res = await fetch(`https://api-v3.mbta.com/stops?filter[route]=${ROUTES.join(",")}&fields[stop]=name,latitude,longitude,location_type&include=child_stops`);
if (!res.ok) throw new Error(`stations -> ${res.status}`);
const doc = await res.json();
await sleep(3500);
const childType = new Map((doc.included ?? []).map((c) => [c.id, c.attributes.location_type]));
for (const s of doc.data) {
  stations[s.id] = { name: s.attributes.name, lat: round(s.attributes.latitude), lng: round(s.attributes.longitude) };
  for (const c of s.relationships?.child_stops?.data ?? []) {
    if ([0, 4].includes(childType.get(c.id))) parentOf[c.id] = s.id; // platforms and boarding areas
  }
}
const orders = {};
for (const r of ROUTES) for (const d of [0, 1]) {
  orders[`${r}:${d}`] = (await get(`/stops?filter[route]=${r}&filter[direction_id]=${d}&fields[stop]=name`)).map((s) => s.id);
}
const out = { generatedAt: new Date().toISOString(), stations, parentOf, orders };
writeFileSync("src/server/mbta/static-stops.json", JSON.stringify(out) + "\n");
console.log(`stations ${Object.keys(stations).length}, platforms ${Object.keys(parentOf).length}, orders ${Object.keys(orders).length}`);
