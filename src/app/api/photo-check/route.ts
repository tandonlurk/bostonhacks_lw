// POST /api/photo-check  (owner: A, T17). Optional; falls back to tap-to-confirm (enabled:false).
import type { PhotoCheckRequest } from "@/contracts";
import { HttpError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { checkPhoto } from "@/server/vision/gemini";

const MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 3 * 1024 * 1024;

export const POST = handle(async (req: Request) => {
  rateLimit(`photo:${clientIp(req)}`, 12, 60_000);
  const b = (await readJson<Record<string, unknown>>(req)) ?? {};
  if (typeof b.clueId !== "string" || typeof b.clueText !== "string" || !b.clueText.trim())
    throw new HttpError(400, "bad_clue", "clueId and clueText are required.");
  if (typeof b.mimeType !== "string" || !MIME.has(b.mimeType))
    throw new HttpError(400, "bad_image", "mimeType must be image/jpeg, image/png or image/webp.");
  if (typeof b.imageBase64 !== "string" || !b.imageBase64)
    throw new HttpError(400, "bad_image", "imageBase64 is required.");
  const data = b.imageBase64.replace(/^data:[^,]*,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) throw new HttpError(400, "bad_image", "imageBase64 is not valid base64.");
  if (Math.floor((data.length * 3) / 4) > MAX_BYTES) throw new HttpError(413, "image_too_large", "Photo must be under 3 MB.");
  return json(
    await checkPhoto({
      clueId: b.clueId,
      clueText: b.clueText,
      imageBase64: data.replace(/\s/g, ""),
      mimeType: b.mimeType as PhotoCheckRequest["mimeType"],
    }),
  );
});
