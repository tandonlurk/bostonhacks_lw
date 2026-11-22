"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import type { Building } from "./model";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Previous floor count per building key, from the build before this one. Buildings use it to unfold from
 * their old height (CSS only: no per-frame React renders while the skyline grows).
 */
export function usePrevFloors(buildings: Building[]): Map<string, number> {
  const [state, setState] = useState(() => ({ cur: buildings, prev: new Map<string, number>() }));
  if (state.cur !== buildings) {
    setState({ cur: buildings, prev: new Map(state.cur.map((b) => [b.key, b.floors])) });
  }
  return state.prev;
}

/** True for the first couple of seconds: the city pops up out of the table in a ripple from downtown. */
export function useIntro(ms = 2200): boolean {
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return intro;
}

export type TurnPhase = "idle" | "out" | "in";

/**
 * View rotation in quarter turns. The diorama folds edge-on, swaps to the next quarter view and unfolds,
 * so the scene is only re-projected once per turn (never per frame).
 */
export function useRotation() {
  const [rot, setRot] = useState(0);
  const [phase, setPhase] = useState<TurnPhase>("idle");
  const timers = useRef<number[]>([]);

  const rotate = useCallback((dir: 1 | -1 = 1) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const turn = () => setRot((r) => (r + dir + 4) % 4);
    if (prefersReducedMotion()) {
      turn();
      return;
    }
    setPhase("out");
    timers.current.push(
      window.setTimeout(() => {
        turn();
        setPhase("in");
        timers.current.push(window.setTimeout(() => setPhase("idle"), 420));
      }, 170),
    );
  }, []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return { rot, phase, rotate };
}

export interface TierUp {
  id: number;
  team: TeamRouteId;
  tier: number;
}

/** "Tier N" paper stamps whenever a team's skyline reaches a new tier between polls. */
export function useTierUps(tiers: Record<TeamRouteId, number>): TierUp[] {
  const [prev, setPrev] = useState(tiers);
  const [ups, setUps] = useState<TierUp[]>([]);
  if (prev !== tiers) {
    const fresh: TierUp[] = [];
    const prevMax = Math.max(...TEAM_ROUTE_IDS.map((t) => prev[t]));
    if (prevMax > 0) {
      for (const t of TEAM_ROUTE_IDS) if (tiers[t] > prev[t]) fresh.push({ id: TEAM_ROUTE_IDS.indexOf(t) * 10 + tiers[t], team: t, tier: tiers[t] });
    }
    setPrev(tiers);
    if (fresh.length) setUps((u) => [...u, ...fresh].slice(-5));
  }
  useEffect(() => {
    if (!ups.length) return;
    const oldest = ups[0].id;
    const t = window.setTimeout(() => setUps((u) => u.filter((x) => x.id !== oldest)), 2600);
    return () => window.clearTimeout(t);
  }, [ups]);
  return ups;
}
