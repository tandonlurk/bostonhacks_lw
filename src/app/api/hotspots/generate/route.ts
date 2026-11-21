// POST /api/hotspots/generate { riderId } -> HotspotsResponse  (owner: A, T25). Recomputes now.
// With the demo simulator running, seeds a commute for riders with too few trips.
import type { HotspotsResponse } from "@/contracts";
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { getHotspots } from "@/server/hotspots";

export const POST = handle(async (req: Request) => {
  rateLimit(`hotspots-gen:${clientIp(req)}`, 20, 60_000);
  const body = await readJson<{ riderId?: unknown }>(req);
  const riderId = typeof body?.riderId === "string" ? body.riderId.trim() : "";
  if (!riderId || riderId.length > 200) throw new HttpError(400, "bad_rider", "Pass riderId.");
  return json<HotspotsResponse>(await getHotspots(riderId, true));
});
