// POST /api/rides/sample  (owner: A, T04). Spec: docs/KICKOFF.md section 5.
import { clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { handleSample, parseSample } from "@/server/rides/service";

export const POST = handle(async (req: Request) => {
  // Many riders can share one IP (venue Wi-Fi), so this is generous; per-rider spam is throttled in the service.
  rateLimit(`sample:${clientIp(req)}`, 600, 60_000);
  return json(await handleSample(parseSample(await readJson(req))));
});
