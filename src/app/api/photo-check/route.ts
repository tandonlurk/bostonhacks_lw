// POST /api/photo-check  (owner: A, T17). Optional; falls back to tap-to-confirm (enabled:false).
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { checkPhoto } from "@/server/vision/gemini";
import { parseImage } from "@/server/vision/image";

export const POST = handle(async (req: Request) => {
  rateLimit(`photo:${clientIp(req)}`, 12, 60_000);
  const b = (await readJson<Record<string, unknown>>(req)) ?? {};
  if (typeof b.clueId !== "string" || typeof b.clueText !== "string" || !b.clueText.trim())
    throw new HttpError(400, "bad_clue", "clueId and clueText are required.");
  return json(await checkPhoto({ clueId: b.clueId, clueText: b.clueText, ...parseImage(b) }));
});
