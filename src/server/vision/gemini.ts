// T17: optional Gemini vision check for hunt photos (owner: A). Off unless GEMINI_API_KEY is set.
// Never awards points; the UI calls /api/hunts/complete after a pass, or uses tap-to-confirm.
import type { PhotoCheckRequest, PhotoCheckResponse } from "@/contracts";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const PASS_THRESHOLD = 0.6;

export const DISABLED: PhotoCheckResponse = {
  enabled: false,
  passed: null,
  confidence: null,
  reason: "Photo check is off. Tap to confirm instead.",
};

export function photoCheckEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Parse Gemini's generateContent response into our verdict; null if it is unusable. */
export function parseVerdict(body: unknown): PhotoCheckResponse | null {
  const text = (body as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content
    ?.parts?.map((p) => p.text ?? "")
    .join("");
  if (!text) return null;
  let v: { matches?: unknown; confidence?: unknown; reason?: unknown };
  try {
    v = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (typeof v.matches !== "boolean") return null;
  const confidence = typeof v.confidence === "number" ? Math.max(0, Math.min(1, v.confidence)) : 0.5;
  const passed = v.matches && confidence >= PASS_THRESHOLD;
  const reason =
    typeof v.reason === "string" && v.reason.trim()
      ? v.reason.trim().slice(0, 160)
      : passed
        ? "Looks right. Nice find!"
        : "That doesn't look like the clue. Try another angle.";
  return { enabled: true, passed, confidence: Math.round(confidence * 100) / 100, reason };
}

export async function checkPhoto(req: PhotoCheckRequest): Promise<PhotoCheckResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return DISABLED;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt =
    "You verify photos for a transit-station scavenger hunt. Decide whether the photo plausibly shows " +
    "what this clue asks the player to find. Be lenient about angle, lighting and blur, strict about " +
    "unrelated subjects (selfies, blank walls, screenshots).\n" +
    `Clue: ${JSON.stringify(req.clueText.slice(0, 500))}\n` +
    'Reply with JSON only: {"matches": boolean, "confidence": number 0-1, "reason": "one short friendly sentence for the player"}';
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: req.mimeType, data: req.imageBase64 } }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("[vision] gemini HTTP", res.status, (await res.text()).slice(0, 300));
      return { ...DISABLED, reason: "Photo check is unavailable right now. Tap to confirm instead." };
    }
    return parseVerdict(await res.json()) ?? { ...DISABLED, reason: "Couldn't read that photo. Tap to confirm instead." };
  } catch (err) {
    console.error("[vision] gemini failed", String(err));
    return { ...DISABLED, reason: "Photo check is unavailable right now. Tap to confirm instead." };
  }
}
