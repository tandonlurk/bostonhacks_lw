"use client";

// Hotspot helpers for the map and the station-sheet meet flow (A's T25, issue #98 item 3). Hotspot data itself comes
// from useHotspots (via HotspotPanel's onHotspots); this file adds the mock fallback and POST /api/hotspots/meet.
import type { Hotspot, MeetRequest, MeetResponse } from "@/contracts";
import { hotspotsFixture, meetMatchedFixture, meetWaitingFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "@/hooks/useMocks";

/** Mock-mode hotspots with expiries pushed into the future, for demos without a joined rider. */
export function mockHotspots(): Hotspot[] {
  const soon = new Date(Date.now() + 18 * 3600_000).toISOString();
  return hotspotsFixture.hotspots.map((h) => (Date.parse(h.expiresAt) > Date.now() ? h : { ...h, expiresAt: soon }));
}

/** Live (unexpired) hotspots, at most one per station. */
export function liveHotspots(list: Hotspot[], now = Date.now()): Hotspot[] {
  const seen = new Set<string>();
  const out: Hotspot[] = [];
  for (const h of list) {
    if (Date.parse(h.expiresAt) <= now || seen.has(h.stationId)) continue;
    seen.add(h.stationId);
    out.push(h);
  }
  return out;
}

export class HotspotError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number,
  ) {
    super(message);
  }
}

// Mock meet: waits a few polls (several seconds), then a demo partner bumps back. A typed code pairs at once.
let mockPolls = 0;
let mockExpiresAt = 0;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function meetHotspot(req: MeetRequest): Promise<MeetResponse> {
  if (USE_MOCKS) {
    await pause(350);
    if (req.code || ++mockPolls >= 4) {
      mockPolls = 0;
      return meetMatchedFixture;
    }
    if (mockPolls === 1) mockExpiresAt = Date.now() + 30_000;
    return { ...meetWaitingFixture, expiresAt: new Date(mockExpiresAt).toISOString() };
  }
  const res = await fetch("/api/hotspots/meet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body: { error?: { code?: string; message?: string } } | null = await res.json().catch(() => null);
    throw new HotspotError(body?.error?.message ?? "Couldn't reach the hotspot. Try again.", body?.error?.code ?? null, res.status);
  }
  return res.json();
}
