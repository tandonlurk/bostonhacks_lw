"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCityGeo } from "./geo";
import { THETA0 } from "./iso";
import type { Building } from "./model";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Animated floor counts per building. The first load rises out of the ground in a ripple from downtown;
 * later point changes ease each tower to its new height.
 */
export function useAnimatedFloors(buildings: Building[]): Map<string, number> {
  const [floors, setFloors] = useState<Map<string, number>>(() => new Map());
  const current = useRef(floors);

  useEffect(() => {
    const from = current.current;
    const first = from.size === 0;
    const to = buildings.map((b) => ({
      key: b.key,
      a: from.get(b.key) ?? 0,
      b: b.floors,
      delay: first ? (Math.hypot(b.x, b.y) / getCityGeo().radius) * 700 : 0,
    }));
    const dur = first ? 900 : 1100;
    if (prefersReducedMotion()) {
      // No animation: jump straight to the new skyline (async so we never set state during the effect body).
      const final = new Map(to.map((item) => [item.key, item.b]));
      const t = window.setTimeout(() => {
        current.current = final;
        setFloors(final);
      }, 0);
      return () => window.clearTimeout(t);
    }
    const t0 = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const elapsed = now - t0;
      let done = true;
      const next = new Map<string, number>();
      for (const item of to) {
        const t = Math.max(0, Math.min(1, (elapsed - item.delay) / dur));
        if (t < 1) done = false;
        next.set(item.key, item.a + (item.b - item.a) * easeOut(t));
      }
      current.current = next;
      setFloors(next);
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [buildings]);

  return floors;
}

/** View rotation in 90 degree steps with a smooth eased turn. */
export function useRotation() {
  const [theta, setTheta] = useState(THETA0);
  const current = useRef(THETA0);
  const target = useRef(THETA0);
  const raf = useRef(0);

  const rotate = useCallback((dir: 1 | -1 = 1) => {
    target.current += (dir * Math.PI) / 2;
    const from = current.current;
    const to = target.current;
    const t0 = performance.now();
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion()) {
      current.current = to;
      setTheta(to);
      return;
    }
    const dur = 750;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      current.current = from + (to - from) * easeInOut(t);
      setTheta(current.current);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { theta, rotate };
}
