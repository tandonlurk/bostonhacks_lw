// POST /api/hotspots/meet { riderId, hotspotId, lat, lng, code?, accuracy? } -> MeetResponse  (owner: A, T25)
// Poll every ~2 s while status is "waiting". Optional `accuracy` (m) widens the radius a little.
import type { MeetRequest, MeetResponse } from "@/contracts";
import { HttpError, handle, json, rateLimit, readJson } from "@/server/http";
import { meet } from "@/server/hotspots";

export const POST = handle(async (req: Request) => {
  const b = await readJson<Partial<MeetRequest> & { accuracy?: unknown }>(req);
  const riderId = typeof b?.riderId === "string" ? b.riderId.trim() : "";
  if (!riderId || riderId.length > 200) throw new HttpError(400, "bad_rider", "Pass riderId.");
  const hotspotId = typeof b.hotspotId === "string" ? b.hotspotId.trim() : "";
  if (!hotspotId || hotspotId.length > 100) throw new HttpError(400, "bad_hotspot", "Pass hotspotId.");
  const { lat, lng } = b;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new HttpError(400, "bad_location", "We need your location to check you're at the hotspot.");
  let code: string | undefined;
  if (b.code !== undefined && b.code !== null && b.code !== "") {
    code = String(b.code).trim();
    if (!/^\d{4}$/.test(code)) throw new HttpError(400, "bad_code", "Codes are 4 digits.");
  }
  const accuracy = typeof b.accuracy === "number" && Number.isFinite(b.accuracy) ? b.accuracy : undefined;
  rateLimit(`meet:${riderId}`, 60, 60_000);
  return json<MeetResponse>(await meet({ riderId, hotspotId, lat, lng, code, accuracy }));
});
