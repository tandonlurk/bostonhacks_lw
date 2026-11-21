"use client";

import { useEffect, useState } from "react";
import type { CompleteHuntResponse, HuntResponse } from "@/contracts";
import { completeHuntFixture, huntFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";
import { LAST_STOP_KEY } from "./useRideSession";

const DEFAULT_STOP_ID = "place-bucen";

export function readLastStopId(): string {
  if (typeof window === "undefined") return DEFAULT_STOP_ID;
  return window.localStorage.getItem(LAST_STOP_KEY) || DEFAULT_STOP_ID;
}

export function useHunt(stopId: string) {
  const [data, setData] = useState<HuntResponse | null>(USE_MOCKS ? huntFixture : null);
  const [loading, setLoading] = useState(!USE_MOCKS);

  useEffect(() => {
    if (USE_MOCKS) return;
    let cancelled = false;

    fetch(`/api/hunts?stopId=${encodeURIComponent(stopId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((next: HuntResponse | null) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stopId]);

  return { data, loading };
}

export async function completeHuntClue(riderId: string, clueId: string): Promise<CompleteHuntResponse> {
  if (USE_MOCKS) return completeHuntFixture;
  const res = await fetch("/api/hunts/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderId, clueId }),
  });
  if (!res.ok) throw new Error(`hunts/complete ${res.status}`);
  return res.json();
}
