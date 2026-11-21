import type { TeamRouteId, Vehicle, VehicleStatus } from "@/contracts";
import { MBTA_ROUTES, toTeamRouteId } from "@/contracts";
import { cached, cachedAt } from "./cache";
import { mbtaGet, relId, ttl } from "./client";
import { recordVehicles } from "@/server/delay/history";
import { getStopIndex, toStationId, type StopIndex } from "./stops";

type VehicleAttrs = {
  bearing: number | null;
  current_status: VehicleStatus;
  current_stop_sequence: number | null;
  direction_id: 0 | 1;
  label: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  updated_at: string;
  revenue?: string;
};

/** Internal vehicle: contract fields plus extras the ride engine needs. */
export interface LiveVehicle extends Vehicle {
  /** Raw platform stop id from MBTA (Vehicle.stopId is the parent station). */
  platformStopId: string | null;
  tripId: string | null;
  /** When MBTA last updated this vehicle's position. */
  reportedAt: string;
}

export interface VehicleSnapshot {
  updatedAt: string;
  vehicles: LiveVehicle[];
}

const KEY = "vehicles:all";

/** All tracked vehicles, cached ~5 s (10 s when keyless). */
export async function getVehicleSnapshot(): Promise<VehicleSnapshot> {
  return cached(KEY, ttl(5_000), async () => {
    const [doc, index] = await Promise.all([
      mbtaGet<VehicleAttrs>("/vehicles", {
        "filter[route]": MBTA_ROUTES.map((r) => r.id).join(","),
        "fields[vehicle]":
          "bearing,current_status,current_stop_sequence,direction_id,label,latitude,longitude,speed,updated_at,revenue",
      }),
      getStopIndex().catch((err): StopIndex | null => {
        console.warn("[mbta] stop index unavailable", String(err));
        return null;
      }),
    ]);
    const vehicles: LiveVehicle[] = [];
    for (const v of doc.data) {
      const a = v.attributes;
      const routeId = relId(v, "route");
      const teamRouteId = routeId ? toTeamRouteId(routeId) : null;
      if (!routeId || !teamRouteId || a.latitude == null || a.longitude == null) continue;
      if (a.revenue && a.revenue !== "REVENUE") continue;
      const platformStopId = relId(v, "stop");
      vehicles.push({
        id: v.id,
        routeId,
        teamRouteId,
        directionId: a.direction_id,
        lat: a.latitude,
        lng: a.longitude,
        bearing: a.bearing ?? null,
        speed: a.speed ?? null,
        currentStatus: a.current_status,
        stopId: toStationId(index, platformStopId),
        stopSequence: a.current_stop_sequence ?? null,
        label: a.label,
        platformStopId,
        tripId: relId(v, "trip"),
        reportedAt: a.updated_at,
      });
    }
    recordVehicles(vehicles); // T18 history; throttled, fire-and-forget, no-op without a DB
    return { updatedAt: new Date().toISOString(), vehicles };
  });
}

/** Contract-shaped vehicles, optionally filtered by team. */
export async function getVehicles(teams?: TeamRouteId[]): Promise<{ updatedAt: string; vehicles: Vehicle[] }> {
  const snap = await getVehicleSnapshot();
  const list = teams && teams.length ? snap.vehicles.filter((v) => teams.includes(v.teamRouteId)) : snap.vehicles;
  return {
    updatedAt: new Date(cachedAt(KEY) ?? Date.now()).toISOString(),
    vehicles: list.map((v) => ({
      id: v.id,
      routeId: v.routeId,
      teamRouteId: v.teamRouteId,
      directionId: v.directionId,
      lat: v.lat,
      lng: v.lng,
      bearing: v.bearing,
      speed: v.speed,
      currentStatus: v.currentStatus,
      stopId: v.stopId,
      stopSequence: v.stopSequence,
      label: v.label,
    })),
  };
}
