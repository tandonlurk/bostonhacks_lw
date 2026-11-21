"use client";

// Demo/screenshot helper, mock mode only: /?preview=join|idle|far|live|silver|silver-done|summary renders a ride state
// from fixtures without clicking through. Ignored entirely when NEXT_PUBLIC_USE_MOCKS is off.
import { useState, useSyncExternalStore } from "react";
import { challengesFixture, endRideFixture, rideSampleCrewFixture, riderFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "@/hooks/useMocks";
import type { RideContextValue } from "./RideSessionProvider";
import type { NearbyState } from "./useNearbyStation";

export type Preview = "join" | "idle" | "far" | "live" | "silver" | "silver-done" | "summary" | null;
const PREVIEWS = ["join", "idle", "far", "live", "silver", "silver-done", "summary"] as const;

const noop = () => () => {};

export function usePreview(): Preview {
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  if (!USE_MOCKS) return null;
  const v = new URLSearchParams(search).get("preview");
  return (PREVIEWS as readonly string[]).includes(v ?? "") ? (v as Preview) : null;
}

const RIDE_MS = 12 * 60_000 + 34_000;

export function usePreviewContext(real: RideContextValue, preview: Preview): RideContextValue {
  const [startedAt] = useState(() => Date.now() - RIDE_MS);
  if (!preview) return real;
  if (preview === "join") return { ...real, rider: null, riderLoading: false };
  const base = { ...real, rider: riderFixture, riderLoading: false };
  if (preview === "live" || preview === "silver" || preview === "silver-done") {
    const s = rideSampleCrewFixture;
    const silver = preview === "silver" || preview === "silver-done";
    const quest = challengesFixture.sideQuests?.[0];
    return {
      ...base,
      session: {
        ...real.session,
        active: true,
        state: s.state,
        sessionId: s.sessionId,
        teamRouteId: silver ? "Silver" : s.teamRouteId ?? null,
        stopsCredited: s.stopsCredited,
        nextStopId: s.nextStopId ?? null,
        message: silver ? "On the Silver Line · your home team earns the points." : s.message,
        startedAt,
        minutesRidden: silver ? preview === "silver-done" ? 3 : 2 : s.minutesRidden ?? null,
        pointsAwarded: s.pointsAwarded ?? null,
        crew: s.crew ?? null,
        sideQuest: silver && quest ? { ...quest, progressMinutes: preview === "silver-done" ? 3 : 2, done: preview === "silver-done", pointsAwarded: preview === "silver-done" ? quest.points : 0 } : s.sideQuest ?? null,
        originStationId: s.originStationId ?? null,
      },
    };
  }
  if (preview === "summary") {
    return { ...base, session: { ...real.session, active: false, lastResult: { ...endRideFixture, durationMs: RIDE_MS } } };
  }
  return base;
}

export function previewNearby(preview: Preview, nearby: NearbyState): NearbyState {
  if (preview !== "far") return nearby;
  return { canStart: false, station: { name: "Kendall/MIT", distanceM: 340 }, radiusM: 330, verified: true };
}
