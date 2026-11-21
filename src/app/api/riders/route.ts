// POST /api/riders  { displayName, homeTeamRouteId } -> { riderId }  (owner: A, T04)
import type { CreateRiderResponse } from "@/contracts";
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { parseRider } from "@/server/rides/service";
import { createRider } from "@/server/rides/store";

export const POST = handle(async (req: Request) => {
  rateLimit(`riders:${clientIp(req)}`, 20, 60_000);
  const { displayName, homeTeamRouteId } = parseRider(await readJson(req));
  const rider = await createRider(displayName, homeTeamRouteId);
  return json<CreateRiderResponse>({ riderId: rider.id }, { status: 201 });
});
