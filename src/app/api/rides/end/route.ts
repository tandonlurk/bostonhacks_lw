// POST /api/rides/end { riderId }  (owner: A, T04)
import { HttpError, handle, json, readJson } from "@/server/http";
import { endRide } from "@/server/rides/service";

export const POST = handle(async (req: Request) => {
  const body = (await readJson<{ riderId?: unknown }>(req)) ?? {};
  if (typeof body.riderId !== "string" || !body.riderId) throw new HttpError(400, "bad_rider", "riderId is required.");
  return json(await endRide(body.riderId));
});
