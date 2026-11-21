// GET /api/riders/:id, PATCH /api/riders/:id  (owner: A, T04 / T25 #94)
import type { Rider } from "@/contracts";
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { parseProfilePatch, toRider } from "@/server/riders/profile";
import { getRiderStats } from "@/server/rides/points-bridge";
import { getRider, updateRiderProfile } from "@/server/rides/store";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/riders/[id]">) => {
  const { id } = await ctx.params;
  const rider = await getRider(id);
  if (!rider) throw new HttpError(404, "rider_not_found", "Unknown rider.");
  return json<Rider>(toRider(rider, await getRiderStats(id)));
});

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/riders/[id]">) => {
  const { id } = await ctx.params;
  rateLimit(`rider-patch:${clientIp(req)}:${id}`, 20, 60_000);
  const patch = parseProfilePatch(await readJson(req));
  const rider = await updateRiderProfile(id, patch);
  if (!rider) throw new HttpError(404, "rider_not_found", "Unknown rider.");
  return json<Rider>(toRider(rider, await getRiderStats(id)));
});
