// GET /api/hotspots?riderId=..  (owner: A, T25). Generates on the first eligible call, then reuses
// the rider's live hotspots (24 h) so they stay stable.
import type { HotspotsResponse } from "@/contracts";
import { HttpError, clientIp, handle, json, rateLimit } from "@/server/http";
import { getHotspots } from "@/server/hotspots";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  rateLimit(`hotspots:${clientIp(req)}`, 120, 60_000);
  const riderId = new URL(req.url).searchParams.get("riderId")?.trim();
  if (!riderId || riderId.length > 200) throw new HttpError(400, "bad_rider", "Pass riderId.");
  return json<HotspotsResponse>(await getHotspots(riderId), { headers: { "cache-control": "no-store" } });
});
