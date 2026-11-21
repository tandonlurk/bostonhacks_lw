// GET /api/predictions?stopId=place-xxx  (owner: A). Next trains at a station for the ride screen timer.
import type { NextRequest } from "next/server";
import { HttpError, clientIp, handle, json, rateLimit } from "@/server/http";
import { nextTrains } from "@/server/mbta/predictions";

export const GET = handle(async (req: NextRequest) => {
  rateLimit(`predictions:${clientIp(req)}`, 60, 60_000);
  const stopId = req.nextUrl.searchParams.get("stopId") ?? "";
  if (!/^[\w-]{1,40}$/.test(stopId)) throw new HttpError(400, "bad_stop", "stopId is required.");
  return json(await nextTrains(stopId), { headers: { "cache-control": "no-store" } });
});
