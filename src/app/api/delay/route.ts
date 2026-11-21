// GET /api/delay?teamRouteId=Red  (owner: A, T07). Omit teamRouteId to aggregate all lines.
import type { NextRequest } from "next/server";
import { isTeamRouteId } from "@/contracts";
import { getDelay } from "@/server/delay";
import { HttpError, handle, json } from "@/server/http";

export const GET = handle(async (req: NextRequest) => {
  const team = req.nextUrl.searchParams.get("teamRouteId");
  if (team === null) return json(await getDelay(), { headers: { "cache-control": "no-store" } });
  if (!isTeamRouteId(team)) throw new HttpError(400, "bad_team", `Unknown teamRouteId: ${team}`);
  return json(await getDelay(team), { headers: { "cache-control": "no-store" } });
});
