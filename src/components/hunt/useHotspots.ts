"use client";

import { useCallback, useEffect, useState } from "react";
import type { HotspotsResponse } from "@/contracts";
import { hotspotsFixture } from "@/contracts/fixtures";
import { USE_MOCKS } from "@/hooks/useMocks";

export async function hotspotJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Couldn’t connect. Please try again.");
  return body as T;
}

export function useHotspots(riderId: string | null) {
  const [state, setState] = useState<{ riderId: string; data: HotspotsResponse | null; error: string | null } | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!riderId) return;
    let alive = true;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const active = controller;
      try {
        const data = USE_MOCKS
          ? { ...hotspotsFixture, riderId, hotspots: hotspotsFixture.hotspots.map((h) => ({ ...h, expiresAt: new Date(Date.now() + 86400000).toISOString() })) }
          : await hotspotJson<HotspotsResponse>(`/api/hotspots?riderId=${encodeURIComponent(riderId)}`, { signal: active.signal });
        if (alive) setState({ riderId, data, error: null });
      } catch (error) {
        if (alive && !active.signal.aborted) setState((previous) => ({ riderId, data: previous?.riderId === riderId ? previous.data : null, error: error instanceof Error ? error.message : "Couldn’t load your hotspots." }));
      }
    };
    void load();
    const interval = window.setInterval(load, 15000);
    return () => { alive = false; controller?.abort(); window.clearInterval(interval); };
  }, [riderId, version]);

  const current = state?.riderId === riderId ? state : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !!riderId && !current, refresh };
}
