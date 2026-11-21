// Next trains at a station (owner: A). MBTA predictions first; when MBTA has none (or is
// unreachable), an estimate from live vehicles heading to the station.
import type { TeamRouteId } from "@/contracts";
import { MBTA_ROUTES, toTeamRouteId } from "@/contracts";
import { cached } from "./cache";
import { mbtaGet, relId, ttl } from "./client";
import { getStopIndex } from "./stops";
import { getVehicleSnapshot } from "./vehicles";

export interface NextTrain {
  routeId: string;
  teamRouteId: TeamRouteId;
  directionId: 0 | 1;
  arrivalAt: string;
}
export interface NextTrainsResponse {
  stopId: string;
  source: "predictions" | "estimate" | "none";
  updatedAt: string;
  trains: NextTrain[];
}

type PredAttrs = { arrival_time: string | null; departure_time: string | null; direction_id: 0 | 1 };

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function fromPredictions(stopId: string, now: number): Promise<NextTrain[]> {
  const doc = await mbtaGet<PredAttrs>("/predictions", {
    "filter[stop]": stopId,
    "filter[route]": MBTA_ROUTES.map((r) => r.id).join(","),
    "fields[prediction]": "arrival_time,departure_time,direction_id",
    sort: "arrival_time",
    "page[limit]": "12",
  });
  const out: NextTrain[] = [];
  for (const p of doc.data) {
    const routeId = relId(p, "route");
    const team = routeId ? toTeamRouteId(routeId) : null;
    const t = p.attributes.arrival_time ?? p.attributes.departure_time;
    if (!routeId || !team || !t || Date.parse(t) < now - 30_000) continue;
    out.push({ routeId, teamRouteId: team, directionId: p.attributes.direction_id, arrivalAt: t });
  }
  return out.sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt)).slice(0, 4);
}

async function fromVehicles(stopId: string, now: number): Promise<NextTrain[]> {
  const [snap, index] = await Promise.all([getVehicleSnapshot(), getStopIndex()]);
  const st = index.byId.get(stopId);
  if (!st) return [];
  return snap.vehicles
    .filter((v) => v.stopId === stopId && v.currentStatus !== "STOPPED_AT")
    .map((v) => {
      const secs = haversine(v, st) / Math.max(v.speed ?? 0, 6); // assume ~6 m/s when crawling or unknown
      return { routeId: v.routeId, teamRouteId: v.teamRouteId, directionId: v.directionId, arrivalAt: new Date(now + Math.min(secs, 1800) * 1000).toISOString() };
    })
    .sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt))
    .slice(0, 4);
}

export async function nextTrains(stopId: string): Promise<NextTrainsResponse> {
  return cached(`next:${stopId}`, ttl(15_000), async () => {
    const now = Date.now();
    const base = { stopId, updatedAt: new Date(now).toISOString() };
    const preds = await fromPredictions(stopId, now).catch((err) => {
      console.warn("[mbta] predictions unavailable", String(err));
      return [];
    });
    if (preds.length) return { ...base, source: "predictions" as const, trains: preds };
    const est = await fromVehicles(stopId, now).catch(() => []);
    return { ...base, source: est.length ? ("estimate" as const) : ("none" as const), trains: est };
  });
}
