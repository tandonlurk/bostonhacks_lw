"use client";

import { useEffect, useState } from "react";
import type { DelayResponse } from "@/contracts";
import { delayFixture, noDelayFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 5000;

export function useDelay(teamRouteId?: string | null) {
  const [data, setData] = useState<DelayResponse>(USE_MOCKS ? delayFixture : noDelayFixture);

  useEffect(() => {
    if (USE_MOCKS) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const qs = teamRouteId ? `?teamRouteId=${encodeURIComponent(teamRouteId)}` : "";
        const res = await fetch(`/api/delay${qs}`, { cache: "no-store" });
        if (res.ok) {
          const next: DelayResponse = await res.json();
          if (!cancelled) setData(next);
        }
      } catch {
        // keep last known delay state on transient failure
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [teamRouteId]);

  return data;
}
