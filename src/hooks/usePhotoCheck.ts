import type { PhotoCheckResponse } from "@/contracts";
import { photoCheckFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

export async function checkPhoto(
  clueId: string,
  clueText: string,
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<PhotoCheckResponse> {
  if (USE_MOCKS) return photoCheckFixture;
  const res = await fetch("/api/photo-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clueId, clueText, imageBase64, mimeType }),
  });
  if (!res.ok) {
    const body: { error?: { message?: string } } | null = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `photo-check ${res.status}`);
  }
  return res.json();
}
