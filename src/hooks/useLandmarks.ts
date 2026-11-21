"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClaimLandmarkResponse, LandmarksResponse } from "@/contracts";
import { claimLandmarkFixture, landmarksFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 10000;

/**
 * riderId is passed through once available so `claimed` reflects this rider's
 * own claims (see issue #54: GET /api/landmarks?riderId=.. scopes the flag;
 * omitted means anonymous browsing with claimed always false).
 */
export function useLandmarks(riderId?: string | null) {
  const [data, setData] = useState<LandmarksResponse>(USE_MOCKS ? landmarksFixture : []);
  const [loading, setLoading] = useState(!USE_MOCKS);

  const refresh = useCallback(async () => {
    if (USE_MOCKS) return;
    try {
      const qs = riderId ? `?riderId=${encodeURIComponent(riderId)}` : "";
      const res = await fetch(`/api/landmarks${qs}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // keep last known list on transient failure
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    if (USE_MOCKS) return;
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
  }, [refresh]);

  return { data, loading, refresh };
}

export async function claimLandmark(
  riderId: string,
  landmarkId: string,
  lat: number,
  lng: number,
): Promise<ClaimLandmarkResponse> {
  if (USE_MOCKS) return claimLandmarkFixture;
  const res = await fetch("/api/landmarks/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderId, landmarkId, lat, lng }),
  });
  if (!res.ok) {
    const body: { error?: { message?: string } } | null = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `landmarks/claim ${res.status}`);
  }
  return res.json();
}
