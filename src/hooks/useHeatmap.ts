"use client";

import { useEffect, useState } from "react";
import type { DelayHeatmapResponse } from "@/contracts";
import { heatmapFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

// Observations accrue slowly (vehicles poll every ~30s+), so this doesn't need fast polling.
const POLL_MS = 60000;

export function useHeatmap(enabled: boolean, minutes = 120) {
  const [data, setData] = useState<DelayHeatmapResponse | null>(USE_MOCKS ? heatmapFixture : null);

  useEffect(() => {
    if (USE_MOCKS || !enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/delay/heatmap?minutes=${minutes}`, { cache: "no-store" });
        if (res.ok) {
          const next: DelayHeatmapResponse = await res.json();
          if (!cancelled) setData(next);
        }
      } catch {
        // keep last known snapshot on transient failure
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, minutes]);

  // Loading is implicit: enabled with no data yet means the first fetch hasn't resolved.
  return { data, loading: enabled && !data };
}
