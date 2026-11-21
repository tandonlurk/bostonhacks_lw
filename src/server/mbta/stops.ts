import type { Stop } from "@/contracts";
import { MBTA_ROUTES, isTeamRouteId } from "@/contracts";
import { cached } from "./cache";
import { mbtaGet } from "./client";
import staticStops from "./static-stops.json";

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
  return liveStops(ids).catch((err) => {
    console.warn("[mbta] stops from snapshot:", String(err));
    const seen = new Set<string>();
    const out: Stop[] = [];
    for (const id of ids) {
      for (const sid of STATIC.orders[`${id}:1`] ?? []) {
        const st = STATIC.stations[sid];
        if (st && !seen.has(sid)) {
          seen.add(sid);
          out.push({ id: sid, ...st });
        }
      }
    }
    if (!out.length) throw err;
    return out;
  });
}

function liveStops(ids: string[]): Promise<Stop[]> {
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

// Static snapshot (scripts/snapshot-stops.mjs): used when the MBTA API is rate-limited or offline.
const STATIC = staticStops as {
  stations: Record<string, { name: string; lat: number; lng: number }>;
  parentOf: Record<string, string>;
  orders: Record<string, string[]>;
};

function staticIndex(): StopIndex {
  const byId = new Map<string, Stop>();
  for (const [id, s] of Object.entries(STATIC.stations)) byId.set(id, { id, ...s });
  return { parentOf: new Map(Object.entries(STATIC.parentOf)), byId };
}

/**
 * Index of stations, platforms and Silver Line stops for mapping vehicle stop ids. Live data,
 * refreshed twice a day; falls back to the bundled snapshot when MBTA can't be reached.
 */
export async function getStopIndex(): Promise<StopIndex> {
  try {
    return await cached("stops:index", 12 * HOUR, async () => {
      // filter[route] returns parent stations (filter[route_type] would only match platforms);
      // child_stops maps every platform, including ones a route filter misses.
      const doc = await mbtaGet<StopAttrs>("/stops", {
        "filter[route]": MBTA_ROUTES.map((r) => r.id).join(","),
        "fields[stop]": "name,latitude,longitude,location_type",
        include: "child_stops",
      });
      const childType = new Map((doc.included ?? []).map((c) => [c.id, (c.attributes as StopAttrs).location_type]));
      const index = staticIndex();
      for (const s of doc.data) {
        const a = s.attributes;
        index.byId.set(s.id, { id: s.id, name: a.name, lat: a.latitude, lng: a.longitude });
        const kids = s.relationships?.child_stops?.data;
        for (const c of Array.isArray(kids) ? kids : []) {
          const t = childType.get(c.id);
          if (t === 0 || t === 4) index.parentOf.set(c.id, s.id);
        }
      }
      return index;
    }, 7 * 24 * HOUR);
  } catch (err) {
    console.warn("[mbta] stop index from snapshot:", String(err));
    return staticIndex();
  }
}

/** Map a vehicle's platform stop id to its parent station id when known. */
export function toStationId(index: StopIndex | null, stopId: string | null): string | null {
  if (!stopId) return null;
  return index?.parentOf.get(stopId) ?? stopId;
}

/** Ordered station ids for one MBTA route + direction (vehicle travel order). Snapshot first. */
export async function getStopOrder(routeId: string, directionId: 0 | 1): Promise<string[]> {
  const snap = STATIC.orders[`${routeId}:${directionId}`];
  if (snap?.length) return snap;
  return cached(`stops:order:${routeId}:${directionId}`, 6 * HOUR, async () => {
    const doc = await mbtaGet<StopAttrs>("/stops", {
      "filter[route]": routeId,
      "filter[direction_id]": String(directionId),
      "fields[stop]": "name",
    });
    return doc.data.map((s) => s.id);
  }, 7 * 24 * HOUR);
}
