// Shared photo upload validation for /api/photo-check and /api/challenges/submit (owner: A).
import type { PhotoCheckRequest } from "@/contracts";
import { HttpError } from "@/server/http";

const MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 3 * 1024 * 1024;

/** Validate { imageBase64, mimeType } (data: prefix tolerated). Throws 400 bad_image / 413 image_too_large. */
export function parseImage(b: Record<string, unknown>): { imageBase64: string; mimeType: PhotoCheckRequest["mimeType"] } {
  if (typeof b.mimeType !== "string" || !MIME.has(b.mimeType))
    throw new HttpError(400, "bad_image", "mimeType must be image/jpeg, image/png or image/webp.");
  if (typeof b.imageBase64 !== "string" || !b.imageBase64)
    throw new HttpError(400, "bad_image", "imageBase64 is required.");
  const data = b.imageBase64.replace(/^data:[^,]*,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) throw new HttpError(400, "bad_image", "imageBase64 is not valid base64.");
  if (Math.floor((data.length * 3) / 4) > MAX_BYTES) throw new HttpError(413, "image_too_large", "Photo must be under 3 MB.");
  return { imageBase64: data.replace(/\s/g, ""), mimeType: b.mimeType as PhotoCheckRequest["mimeType"] };
}
