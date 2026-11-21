"use client";

import { useCallback, useEffect, useState } from "react";
import type { Rider } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { createRiderFixture, riderFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

/** localStorage key for the joined rider's id; exported so useRideSession can clear it on rider_not_found. */
export const RIDER_ID_KEY = "tcity.riderId";
const STORAGE_KEY = RIDER_ID_KEY;

interface RiderState {
  rider: Rider | null;
  loading: boolean;
  error: string | null;
}

function readStoredRiderId(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
}

async function fetchRider(riderId: string): Promise<Rider> {
  if (USE_MOCKS) return { ...riderFixture, riderId };
  const res = await fetch(`/api/riders/${riderId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`riders/${riderId} ${res.status}`);
  return res.json();
}

async function createRider(displayName: string, homeTeamRouteId: TeamRouteId): Promise<string> {
  if (USE_MOCKS) return createRiderFixture.riderId;
  const res = await fetch("/api/riders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, homeTeamRouteId }),
  });
  if (!res.ok) throw new Error(`riders ${res.status}`);
  const data: { riderId: string } = await res.json();
  return data.riderId;
}

export function useRider() {
  const [state, setState] = useState<RiderState>({ rider: null, loading: !!readStoredRiderId(), error: null });

  useEffect(() => {
    const stored = readStoredRiderId();
    if (!stored) return;
    let cancelled = false;
    fetchRider(stored)
      .then((rider) => {
        if (!cancelled) setState({ rider, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ rider: null, loading: false, error: err instanceof Error ? err.message : "failed to load rider" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const join = useCallback(async (displayName: string, homeTeamRouteId: TeamRouteId) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const riderId = await createRider(displayName, homeTeamRouteId);
      window.localStorage.setItem(STORAGE_KEY, riderId);
      const rider = await fetchRider(riderId);
      setState({ rider, loading: false, error: null });
    } catch (err) {
      setState({ rider: null, loading: false, error: err instanceof Error ? err.message : "failed to join" });
    }
  }, []);

  return { ...state, join };
}
