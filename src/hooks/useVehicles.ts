"use client";

import { useEffect, useState } from "react";
import type { VehiclesResponse } from "@/contracts";
import { vehiclesFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 4000;

interface VehiclesState {
  data: VehiclesResponse | null;
  loading: boolean;
  error: string | null;
}

export function useVehicles(teams?: string[]): VehiclesState {
  const [state, setState] = useState<VehiclesState>({
    data: USE_MOCKS ? vehiclesFixture : null,
    loading: !USE_MOCKS,
    error: null,
  });
  const teamsKey = teams?.join(",") ?? "";

  useEffect(() => {
    if (USE_MOCKS) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const qs = teamsKey ? `?teams=${encodeURIComponent(teamsKey)}` : "";
        const res = await fetch(`/api/vehicles${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`vehicles ${res.status}`);
        const data: VehiclesResponse = await res.json();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: err instanceof Error ? err.message : "failed to load vehicles",
          }));
        }
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [teamsKey]);

  return state;
}
