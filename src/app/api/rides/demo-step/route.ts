// POST /api/rides/demo-step  (owner: A). Demo only: the hidden arrow-key control on the Ride screen
// moves the rider one station; this awards points for the hop as if they rode it.
// Body { riderId, fromStationId, toStationId } -> { pointsAwarded, teamRouteId, stationName }
// Only while the demo simulator runs, and only between stations adjacent on a real MBTA route.
import { MBTA_ROUTES, isTeamRouteId, toPlayableTeam } from "@/contracts";
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { getStopIndex, getStopOrder } from "@/server/mbta/stops";
import { awardBonus } from "@/server/rides/points-bridge";
import { getRider } from "@/server/rides/store";
import { isSimulationRunning } from "@/server/sim";

const POINTS_PER_STOP = 5;

async function adjacentRoute(a: string, b: string): Promise<string | null> {
  for (const r of MBTA_ROUTES) {
    for (const dir of [0, 1] as const) {
      const order = await getStopOrder(r.id, dir).catch(() => [] as string[]);
      const i = order.indexOf(a);
      if (i >= 0 && (order[i + 1] === b || order[i - 1] === b)) return r.id;
    }
  }
  return null;
}

export const POST = handle(async (req: Request) => {
  rateLimit(`demo-step:${clientIp(req)}`, 120, 60_000);
  const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
  if (typeof b.riderId !== "string" || typeof b.fromStationId !== "string" || typeof b.toStationId !== "string")
    throw new HttpError(400, "bad_step", "riderId, fromStationId and toStationId are required.");
  if (!(await isSimulationRunning())) throw new HttpError(403, "demo_only", "Demo stepping works only while the demo simulator runs.");
  const rider = await getRider(b.riderId);
  if (!rider) throw new HttpError(404, "rider_not_found", "Unknown riderId. Create a rider first.");
  const routeId = await adjacentRoute(b.fromStationId, b.toStationId);
  if (!routeId) throw new HttpError(400, "not_adjacent", "Those stations aren't next to each other.");

  const line = toPlayableTeam(routeId);
  const team = line ?? (isTeamRouteId(rider.homeTeamRouteId) ? rider.homeTeamRouteId : "Green");
  const res = await awardBonus({
    riderId: rider.id,
    teamRouteId: team,
    type: "challenge",
    amount: POINTS_PER_STOP,
    ref: `demo-step:${rider.id}:${b.fromStationId}:${b.toStationId}:${Math.floor(Date.now() / 5000)}`,
  });
  const index = await getStopIndex().catch(() => null);
  return json({ pointsAwarded: res.pointsAwarded, teamRouteId: team, stationName: index?.byId.get(b.toStationId)?.name ?? b.toStationId });
});
