// POST /api/challenges/submit { riderId, challengeId, imageBase64, mimeType }  (owner: A, T26).
// Gemini grades the photo; a pass awards round(points x score) once per challenge per delay round.
import { submitChallenge } from "@/server/challenges";
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { parseImage } from "@/server/vision/image";

export const POST = handle(async (req: Request) => {
  rateLimit(`challenge-submit:ip:${clientIp(req)}`, 8, 60_000);
  const b = (await readJson<Record<string, unknown>>(req)) ?? {};
  if (typeof b.riderId !== "string" || !b.riderId || b.riderId.length > 64)
    throw new HttpError(400, "bad_rider", "riderId is required.");
  rateLimit(`challenge-submit:rider:${b.riderId}`, 8, 60_000);
  const image = parseImage(b);
  if (typeof b.challengeId !== "string" || !b.challengeId)
    throw new HttpError(404, "challenge_not_found", "challengeId is required.");
  return json(await submitChallenge({ riderId: b.riderId, challengeId: b.challengeId, ...image }), {
    headers: { "cache-control": "no-store" },
  });
});
