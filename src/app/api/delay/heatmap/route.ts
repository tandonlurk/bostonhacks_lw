// GET /api/delay/heatmap?minutes=120  (owner: A, T18). Contract: CONTRACTS.md section 2.
import type { NextRequest } from "next/server";
import type { DelayHeatmapResponse } from "@/contracts";
import { hasDb } from "@/server/db";
import { heatmapRows } from "@/server/delay/history";
import { handle, json } from "@/server/http";
import { getStopIndex } from "@/server/mbta/stops";

export const GET = handle(async (req: NextRequest) => {
  const raw = Number(req.nextUrl.searchParams.get("minutes") ?? 120);
  const windowMinutes = Number.isFinite(raw) ? Math.min(24 * 60, Math.max(10, Math.round(raw))) : 120;
  const base = { updatedAt: new Date().toISOString(), windowMinutes };
  if (!hasDb()) return json<DelayHeatmapResponse>({ available: false, ...base, stations: [] });

  const [rows, index] = await Promise.all([heatmapRows(windowMinutes), getStopIndex().catch(() => null)]);
  const stations = rows
    .map((r) => {
      const s = index?.byId.get(r.stopId);
      return s ? { ...r, name: s.name, lat: s.lat, lng: s.lng } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.slowShare - a.slowShare || b.observations - a.observations);
  return json<DelayHeatmapResponse>(
    { available: true, ...base, stations },
    { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
});
