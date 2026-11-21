// POST /api/riders  { displayName, homeTeamRouteId } -> { riderId }  (owner: A, T04)
import type { CreateRiderResponse } from "@/contracts";
import { handle, json, readJson } from "@/server/http";
import { parseRider } from "@/server/rides/service";
import { createRider } from "@/server/rides/store";

export const POST = handle(async (req: Request) => {
  const { displayName, homeTeamRouteId } = parseRider(await readJson(req));
  const rider = await createRider(displayName, homeTeamRouteId);
  return json<CreateRiderResponse>({ riderId: rider.id }, { status: 201 });
});
