"use client";

// Delay photo challenges (A's T26, issue #98 item 4): GET /api/challenges?riderId and POST /api/challenges/submit.
// Fixtures in mock mode. If the endpoint is missing or failing, `available` stays false and the Hunt map falls back
// to the placeholder photo game.
import { useCallback, useEffect, useState } from "react";
import type { ChallengeSubmitResponse, ChallengesResponse } from "@/contracts";
import { challengeSubmitFixture, challengesFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "@/hooks/useMocks";

const POLL_MS = 20000;

interface ChallengesState {
  data: ChallengesResponse | null;
  available: boolean;
}

async function fetchChallenges(riderId: string | null): Promise<ChallengesResponse | null> {
  const qs = riderId ? `?riderId=${encodeURIComponent(riderId)}` : "";
  const res = await fetch(`/api/challenges${qs}`, { cache: "no-store" });
  if (res.ok) return res.json();
  // A stale rider id 404s with rider_not_found; still show the round anonymously.
  if (riderId && res.status === 404) {
    const body: { error?: { code?: string } } | null = await res.json().catch(() => null);
    if (body?.error?.code === "rider_not_found") return fetchChallenges(null);
  }
  return null;
}

/** `enabled` should be true only while a delay is active, so we don't poll for nothing. */
export function useChallenges(riderId: string | null, enabled: boolean) {
  const [state, setState] = useState<ChallengesState>(
    USE_MOCKS ? { data: challengesFixture, available: true } : { data: null, available: false },
  );

  const refresh = useCallback(async () => {
    if (USE_MOCKS) return;
    try {
      const data = await fetchChallenges(riderId);
      setState({ data, available: !!data });
    } catch {
      setState((prev) => ({ ...prev, available: false }));
    }
  }, [riderId]);

  useEffect(() => {
    if (USE_MOCKS || !enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await refresh();
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, refresh]);

  const live = enabled && state.available && !!state.data?.active && (state.data?.challenges.length ?? 0) > 0;
  return { data: live ? state.data : null, refresh };
}

export async function submitChallenge(riderId: string, challengeId: string, imageBase64: string): Promise<ChallengeSubmitResponse> {
  if (USE_MOCKS) return challengeSubmitFixture;
  const res = await fetch("/api/challenges/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderId, challengeId, imageBase64, mimeType: "image/jpeg" }),
  });
  if (!res.ok) {
    const body: { error?: { message?: string } } | null = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `challenges/submit ${res.status}`);
  }
  return res.json();
}
