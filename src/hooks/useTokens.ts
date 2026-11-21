"use client";

import { useEffect, useState } from "react";
import type { TokensResponse } from "@/contracts";
import { tokensFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 10000;

export function useTokens(riderId: string | null) {
  const [data, setData] = useState<TokensResponse | null>(USE_MOCKS ? tokensFixture : null);
  const [loading, setLoading] = useState(!USE_MOCKS);

  useEffect(() => {
    if (USE_MOCKS || !riderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/tokens?riderId=${encodeURIComponent(riderId!)}`, { cache: "no-store" });
        if (res.ok) {
          const next: TokensResponse = await res.json();
          if (!cancelled) setData(next);
        }
      } catch {
        // keep last known balance on transient failure
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(poll, POLL_MS);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [riderId]);

  return { data, loading };
}
