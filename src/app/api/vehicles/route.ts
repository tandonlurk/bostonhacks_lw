// GET /api/vehicles?teams=Red,Green  (owner: A, T02)
import type { NextRequest } from "next/server";
import type { TeamRouteId } from "@/contracts";
import { isLineId } from "@/contracts";
import { HttpError, handle, json } from "@/server/http";
import { getVehicles } from "@/server/mbta/vehicles";

export const GET = handle(async (req: NextRequest) => {
  const raw = req.nextUrl.searchParams.get("teams");
  let teams: TeamRouteId[] | undefined;
  if (raw) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const bad = parts.filter((p) => !isLineId(p));
    if (bad.length) throw new HttpError(400, "bad_team", `Unknown line(s): ${bad.join(", ")}`);
    teams = parts as TeamRouteId[];
  }
  const body = await getVehicles(teams).catch((err) => {
    console.error("[api/vehicles]", err);
    throw new HttpError(502, "mbta_unavailable", "Live vehicle data is temporarily unavailable.");
  });
  return json(body, { headers: { "cache-control": "public, s-maxage=4, stale-while-revalidate=20" } });
});
