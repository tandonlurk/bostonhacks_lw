import type { Stop } from "@/contracts";
import { MBTA_ROUTES, isTeamRouteId } from "@/contracts";
import { cached } from "./cache";
import { mbtaGet, relId } from "./client";

type StopAttrs = { name: string; latitude: number; longitude: number; location_type: number };

const HOUR = 60 * 60_000;

/** Expand a team id ("Green") or MBTA route id ("Green-B") into MBTA route ids. */
export function expandRouteIds(routeId: string): string[] {
  if (isTeamRouteId(routeId)) return MBTA_ROUTES.filter((r) => r.teamRouteId === routeId).map((r) => r.id);
  return MBTA_ROUTES.some((r) => r.id === routeId) ? [routeId] : [];
}

/** Stations (parent stops) served by a team or MBTA route, in MBTA order. */
export async function getStops(routeId: string): Promise<Stop[]> {
  const ids = expandRouteIds(routeId);
  if (ids.length === 0) return [];
  return cached(`stops:${ids.join(",")}`, 6 * HOUR, async () => {
    const doc = await mbtaGet<StopAttrs>("/stops", {
      "filter[route]": ids.join(","),
      "fields[stop]": "name,latitude,longitude,location_type",
    });
    const seen = new Set<string>();
    const out: Stop[] = [];
    for (const s of doc.data) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push({ id: s.id, name: s.attributes.name, lat: s.attributes.latitude, lng: s.attributes.longitude });
    }
    return out;
  }, 24 * HOUR);
}

export interface StopIndex {
  /** platform/child stop id -> parent station id ("70144" -> "place-bucen") */
  parentOf: Map<string, string>;
  /** any stop id (platform or station) -> station info */
  byId: Map<string, Stop>;
}

/** Index of all rapid-transit platforms plus Silver Line stops, for mapping vehicle stop ids. */
export async function getStopIndex(): Promise<StopIndex> {
  return cached("stops:index", 12 * HOUR, async () => {
    const [platforms, stations, silver, silverPlatforms] = await Promise.all([
      mbtaGet<StopAttrs>("/stops", {
        "filter[route_type]": "0,1",
        "filter[location_type]": "0",
        "fields[stop]": "name,latitude,longitude",
      }),
      mbtaGet<StopAttrs>("/stops", {
        "filter[route_type]": "0,1",
        "filter[location_type]": "1",
        "fields[stop]": "name,latitude,longitude",
      }),
      mbtaGet<StopAttrs>("/stops", {
        "filter[route]": expandRouteIds("Silver").join(","),
        "fields[stop]": "name,latitude,longitude",
      }),
      mbtaGet<StopAttrs>("/stops", {
        "filter[route]": expandRouteIds("Silver").join(","),
        "filter[location_type]": "0",
        "fields[stop]": "name,latitude,longitude",
      }),
    ]);
    const parentOf = new Map<string, string>();
    const byId = new Map<string, Stop>();
    const add = (id: string, a: StopAttrs) =>
      byId.set(id, { id, name: a.name, lat: a.latitude, lng: a.longitude });
    for (const s of stations.data) add(s.id, s.attributes);
    for (const s of silver.data) if (!byId.has(s.id)) add(s.id, s.attributes);
    for (const p of [...platforms.data, ...silverPlatforms.data]) {
      const parent = relId(p, "parent_station");
      if (parent) parentOf.set(p.id, parent);
      if (!byId.has(p.id)) add(p.id, p.attributes);
    }
    return { parentOf, byId };
  }, 7 * 24 * HOUR);
}

/** Map a vehicle's platform stop id to its parent station id when known. */
export function toStationId(index: StopIndex | null, stopId: string | null): string | null {
  if (!stopId) return null;
  return index?.parentOf.get(stopId) ?? stopId;
}

/** Ordered station ids for one MBTA route + direction (vehicle travel order). */
export async function getStopOrder(routeId: string, directionId: 0 | 1): Promise<string[]> {
  return cached(`stops:order:${routeId}:${directionId}`, 6 * HOUR, async () => {
    const doc = await mbtaGet<StopAttrs>("/stops", {
      "filter[route]": routeId,
      "filter[direction_id]": String(directionId),
      "fields[stop]": "name",
    });
    return doc.data.map((s) => s.id);
  }, 7 * 24 * HOUR);
}
