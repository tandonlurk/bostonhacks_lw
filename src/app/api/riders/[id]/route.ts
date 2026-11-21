// GET /api/riders/:id  (owner: A, T04)
import type { Rider } from "@/contracts";
import { HttpError, handle, json } from "@/server/http";
import { getRiderStats } from "@/server/rides/points-bridge";
import { getRider } from "@/server/rides/store";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/riders/[id]">) => {
  const { id } = await ctx.params;
  const rider = await getRider(id);
  if (!rider) throw new HttpError(404, "rider_not_found", "Unknown rider.");
  const stats = await getRiderStats(id);
  return json<Rider>({
    riderId: rider.id,
    displayName: rider.displayName,
    homeTeamRouteId: rider.homeTeamRouteId,
    ...stats,
  });
});
