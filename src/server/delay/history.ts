// T18: vehicle position history (owner: A). Recorded opportunistically when the vehicle cache
// refreshes, at most every RECORD_EVERY_MS per instance. Postgres only; no-op without a DB.
import type { TeamRouteId } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import type { LiveVehicle } from "@/server/mbta/vehicles";

const RECORD_EVERY_MS = 30_000;
const RETAIN_HOURS = 48;
const g = globalThis as unknown as { __tcityLastRecord?: number; __tcityLastPrune?: number };

export function recordVehicles(vehicles: LiveVehicle[]): void {
  if (!hasDb() || vehicles.length === 0) return;
  const now = Date.now();
  if (now - (g.__tcityLastRecord ?? 0) < RECORD_EVERY_MS) return;
  g.__tcityLastRecord = now;
  const ts = new Date(now);
  const rows = vehicles.map((v) => ({
    ts,
    vehicle_id: v.id,
    route_id: v.routeId,
    team_route_id: v.teamRouteId,
    direction_id: v.directionId,
    lat: v.lat,
    lng: v.lng,
    speed: v.speed,
    status: v.currentStatus,
    stop_id: v.stopId,
  }));
  const sql = getSql();
  void (async () => {
    try {
      await sql`insert into vehicle_positions ${sql(rows)}`;
      if (now - (g.__tcityLastPrune ?? 0) > 60 * 60_000) {
        g.__tcityLastPrune = now;
        await sql`delete from vehicle_positions where ts < now() - make_interval(hours => ${RETAIN_HOURS})`;
      }
    } catch (err) {
      console.warn("[history] record failed", String(err));
    }
  })();
}

export interface HeatmapRow {
  stopId: string;
  teamRouteId: TeamRouteId;
  observations: number;
  slowShare: number;
  avgSpeedMps: number | null;
}

/**
 * Per station: how often trains heading to it were crawling (< 1.5 m/s) between stations.
 * Speed comes from MBTA when reported, else from consecutive positions of the same vehicle.
 */
export async function heatmapRows(minutes: number): Promise<HeatmapRow[]> {
  const rows = await getSql()<
    { stop_id: string; team_route_id: TeamRouteId; observations: number; slow: number; avg_speed: number | null }[]
  >`
    with p as (
      select ts, vehicle_id, team_route_id, status, stop_id, speed, lat, lng,
             lag(ts)  over w as pts, lag(lat) over w as plat, lag(lng) over w as plng
      from vehicle_positions
      where ts > now() - make_interval(mins => ${minutes})
      window w as (partition by vehicle_id order by ts)
    ), s as (
      select stop_id, team_route_id,
             coalesce(speed,
               case when pts is not null and extract(epoch from ts - pts) between 5 and 180 then
                 sqrt(power((lat - plat) * 111320, 2) + power((lng - plng) * 111320 * cos(radians(lat)), 2))
                   / extract(epoch from ts - pts)
               end) as mps
      from p
      where status <> 'STOPPED_AT' and stop_id is not null
    )
    select stop_id, team_route_id,
           count(*)::int as observations,
           count(*) filter (where mps < 1.5)::int as slow,
           avg(mps)::float8 as avg_speed
    from s
    where mps is not null
    group by stop_id, team_route_id
    having count(*) >= 3`;
  return rows.map((r) => ({
    stopId: r.stop_id,
    teamRouteId: r.team_route_id,
    observations: r.observations,
    slowShare: r.observations ? Math.round((r.slow / r.observations) * 100) / 100 : 0,
    avgSpeedMps: r.avg_speed === null ? null : Math.round(r.avg_speed * 10) / 10,
  }));
}
