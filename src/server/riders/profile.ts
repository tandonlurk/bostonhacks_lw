// Rider profile validation for PATCH /api/riders/:id (owner: A, T25 / #94).
import type { Rider, UpdateRiderRequest } from "@/contracts";
import { HttpError } from "@/server/http";
import type { RiderRow } from "@/server/rides/store";

export const MAX_INTERESTS = 12;
export const MAX_INTEREST_LEN = 24;
/** ~150 KB of image as base64 */
export const MAX_AVATAR_CHARS = 200_000;
const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Trim, lowercase, collapse spaces, de-duplicate. Throws 400 bad_interests. */
export function normalizeInterests(raw: unknown): string[] {
  const bad = () =>
    new HttpError(400, "bad_interests", `Pick up to ${MAX_INTERESTS} interests, each 1-${MAX_INTEREST_LEN} characters.`);
  if (!Array.isArray(raw)) throw bad();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") throw bad();
    const tag = item.trim().replace(/\s+/g, " ").toLowerCase();
    if (tag.length < 1 || tag.length > MAX_INTEREST_LEN) throw bad();
    if (!out.includes(tag)) out.push(tag);
  }
  if (out.length > MAX_INTERESTS) throw bad();
  return out;
}

export function parseProfilePatch(body: unknown): UpdateRiderRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_json", "Send a JSON object.");
  const b = body as Record<string, unknown>;
  const patch: UpdateRiderRequest = {};
  if (b.interests !== undefined) patch.interests = normalizeInterests(b.interests);
  if (b.avatarDataUrl !== undefined) {
    const a = b.avatarDataUrl;
    if (a !== null && (typeof a !== "string" || a.length > MAX_AVATAR_CHARS || !AVATAR_RE.test(a)))
      throw new HttpError(400, "bad_avatar", "Avatar must be a JPEG, PNG or WebP image under about 150 KB.");
    patch.avatarDataUrl = a as string | null;
  }
  return patch;
}

export function toRider(row: RiderRow, stats: { points: number; tokens: number; streakDays: number }): Rider {
  return {
    riderId: row.id,
    displayName: row.displayName,
    homeTeamRouteId: row.homeTeamRouteId,
    ...stats,
    interests: row.interests,
    avatarDataUrl: row.avatarDataUrl,
  };
}
