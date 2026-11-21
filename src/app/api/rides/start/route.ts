// POST /api/rides/start { riderId, lat, lng, accuracy }  (owner: A, #96). Rides begin only here, near a station.
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { parseStart, startRide } from "@/server/rides/service";

export const POST = handle(async (req: Request) => {
  rateLimit(`start:${clientIp(req)}`, 60, 60_000);
  return json(await startRide(parseStart(await readJson(req))));
});
