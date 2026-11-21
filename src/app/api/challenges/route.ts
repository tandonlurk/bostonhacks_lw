// GET /api/challenges?riderId=..  (owner: A, T26). Delay photo challenges; empty when no delay.
import type { NextRequest } from "next/server";
import { getChallenges } from "@/server/challenges";
import { HttpError, clientIp, handle, json, rateLimit } from "@/server/http";

export const GET = handle(async (req: NextRequest) => {
  rateLimit(`challenges:${clientIp(req)}`, 60, 60_000);
  const riderId = req.nextUrl.searchParams.get("riderId");
  if (riderId !== null && (!riderId || riderId.length > 64)) throw new HttpError(400, "bad_rider", "riderId is invalid.");
  return json(await getChallenges(riderId ?? undefined), { headers: { "cache-control": "no-store" } });
});
