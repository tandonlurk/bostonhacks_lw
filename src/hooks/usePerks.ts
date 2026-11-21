"use client";

import { useCallback, useEffect, useState } from "react";
import type { PerksResponse, RedeemPerkResponse } from "@/contracts";
import { perksFixture, redeemPerkFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";

const POLL_MS = 10000;

export function usePerks() {
  const [data, setData] = useState<PerksResponse>(USE_MOCKS ? perksFixture : []);
  const [loading, setLoading] = useState(!USE_MOCKS);

  const refresh = useCallback(async () => {
    if (USE_MOCKS) return;
    try {
      const res = await fetch("/api/perks", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // keep last known catalog on transient failure
    } finally {
      setLoading(false);
    }
  }, []);

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

export async function redeemPerk(riderId: string, perkId: string): Promise<RedeemPerkResponse> {
  if (USE_MOCKS) return redeemPerkFixture;
  const res = await fetch("/api/perks/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderId, perkId }),
  });
  if (!res.ok) {
    const body: { error?: { message?: string } } | null = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `perks/redeem ${res.status}`);
  }
  return res.json();
}
