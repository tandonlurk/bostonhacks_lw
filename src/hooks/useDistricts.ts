"use client";

import { useEffect, useState } from "react";
import type { DistrictsResponse } from "@/contracts";
import { districtsFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 5000;

export function useDistricts() {
  const [data, setData] = useState<DistrictsResponse | null>(USE_MOCKS ? districtsFixture : null);
  const [loading, setLoading] = useState(!USE_MOCKS);

  useEffect(() => {
    if (USE_MOCKS) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch("/api/districts", { cache: "no-store" });
        if (!res.ok) throw new Error(`districts ${res.status}`);
        const next: DistrictsResponse = await res.json();
        if (!cancelled) {
          setData(next);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, loading };
}
