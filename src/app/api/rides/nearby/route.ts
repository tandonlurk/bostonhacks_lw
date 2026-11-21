// GET /api/rides/nearby?lat=..&lng=..&accuracy=..  (owner: A, #96): can the Start button be enabled here?
import { clientIp, handle, json, rateLimit } from "@/server/http";
import { nearby, parseLocation } from "@/server/rides/service";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  rateLimit(`nearby:${clientIp(req)}`, 240, 60_000);
  const q = new URL(req.url).searchParams;
  const loc = parseLocation({
    lat: q.get("lat") ?? undefined,
    lng: q.get("lng") ?? undefined,
    accuracy: q.get("accuracy") ?? undefined,
  });
  return json(await nearby(loc), { headers: { "cache-control": "no-store" } });
});
