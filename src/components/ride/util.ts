"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TeamRouteId } from "@/contracts/routes";

export const TEAM_SHORT: Record<TeamRouteId, string> = { Red: "RL", Orange: "OL", Blue: "BL", Green: "GL", Silver: "SL" };

/** Readable text on a solid line-color fill (same contrast rules as LineChip). */
export const TEAM_ON: Record<TeamRouteId, string> = {
  Red: "#fff",
  Orange: "#14181c",
  Blue: "#fff",
  Green: "#fff",
  Silver: "#14181c",
};

export const glow = (t: TeamRouteId) => `var(--glow-${t.toLowerCase()})`;
export const fill = (t: TeamRouteId) => `var(--line-${t.toLowerCase()})`;

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

export const formatPoints = (n: number) => Math.round(n).toLocaleString("en-US");

/** Wall clock that ticks every `ms` while `active`. */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards (avoids localStorage-driven hydration mismatches). */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Animates a number toward `value` (count-up from the last shown value), instantly under reduced motion. */
export function useCountUp(value: number, durationMs = 900): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const origin = shownRef.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / durationMs);
      const next = origin + (value - origin) * (1 - Math.pow(1 - t, 3));
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reduced]);
  return shown;
}
