"use client";

import { useEffect, useState } from "react";
import type { LeaderboardResponse } from "@/contracts";
import { leaderboardFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 5000;

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(USE_MOCKS ? leaderboardFixture : null);
  const [loading, setLoading] = useState(!USE_MOCKS);

  useEffect(() => {
    if (USE_MOCKS) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!res.ok) throw new Error(`leaderboard ${res.status}`);
        const next: LeaderboardResponse = await res.json();
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
