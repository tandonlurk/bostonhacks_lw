"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { SCENE_FRAME } from "./CityScene";

interface Cam {
  x: number;
  y: number;
  s: number;
}

const MIN_S = 0.45;
const MAX_S = 3.2;
const TAP_SLOP = 8;

/**
 * Drag to pan, pinch / wheel to zoom. The transform is written straight to the DOM (no React state), so
 * gestures never re-render the 3D scene. Scene coordinates are the SVG's viewBox units, centred on downtown.
 */
export function useCamera(
  stageRef: RefObject<HTMLDivElement | null>,
  cameraRef: RefObject<HTMLDivElement | null>,
  driftRef: RefObject<HTMLDivElement | null>,
  onTap: (team: TeamRouteId | null) => void,
) {
  const cam = useRef<Cam>({ x: 0, y: 0, s: 1 });
  const tapRef = useRef(onTap);
  useEffect(() => {
    tapRef.current = onTap;
  }, [onTap]);

  const apply = useCallback(
    (animate = false) => {
      const el = cameraRef.current;
      if (!el) return;
      el.dataset.animating = animate ? "true" : "false";
      const { x, y, s } = cam.current;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    },
    [cameraRef],
  );

  const clamp = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const c = cam.current;
    c.s = Math.min(MAX_S, Math.max(MIN_S, c.s));
    const w = SCENE_FRAME.width * c.s;
    const h = SCENE_FRAME.height * c.s;
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    // Keep at least ~35% of the viewport covered by the city.
    c.x = Math.min(vw * 0.65, Math.max(vw * 0.35 - w, c.x));
    c.y = Math.min(vh * 0.65, Math.max(vh * 0.35 - h, c.y));
  }, [stageRef]);

  /** Put scene point (sx, sy) at the given fraction of the viewport. */
  const focus = useCallback(
    (sx: number, sy: number, scale?: number, at: [number, number] = [0.5, 0.42], animate = true) => {
      const stage = stageRef.current;
      if (!stage) return;
      const s = scale ?? cam.current.s;
      cam.current = {
        s,
        x: stage.clientWidth * at[0] - (sx - SCENE_FRAME.minX) * s,
        y: stage.clientHeight * at[1] - (sy - SCENE_FRAME.minY) * s,
      };
      clamp();
      apply(animate);
    },
    [apply, clamp, stageRef],
  );

  const home = useCallback(
    (animate = true) => {
      const stage = stageRef.current;
      if (!stage) return;
      // Downtown fills the screen; the suburbs are a short pan away, downtown just above centre.
      const s = Math.min(1.6, Math.max(0.7, (stage.clientWidth * 1.7) / SCENE_FRAME.width));
      focus(0, -40, s, [0.5, 0.5], animate);
    },
    [focus, stageRef],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    home(false);

    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; team: TeamRouteId | null; multi: boolean } | null = null;
    let pinch: { d: number; s: number; mx: number; my: number; cx: number; cy: number } | null = null;
    let pan: { x: number; y: number; cx: number; cy: number } | null = null;
    let idle = 0;
    let touched = false;

    const pauseDrift = () => {
      touched = true;
      if (driftRef.current) driftRef.current.dataset.paused = "true";
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (driftRef.current) driftRef.current.dataset.paused = "false";
      }, 5000);
    };

    const local = (e: PointerEvent | WheelEvent) => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const beginPinch = () => {
      const [a, b] = [...pointers.values()];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: cam.current.s, mx, my, cx: cam.current.x, cy: cam.current.y };
      pan = null;
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest("[data-ui]")) return;
      stage.setPointerCapture(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, p);
      pauseDrift();
      if (pointers.size === 1) {
        const hit = (e.target as Element).closest("[data-team]");
        start = { x: p.x, y: p.y, team: (hit?.getAttribute("data-team") as TeamRouteId | null) ?? null, multi: false };
        pan = { x: p.x, y: p.y, cx: cam.current.x, cy: cam.current.y };
      } else if (pointers.size === 2) {
        if (start) start.multi = true;
        beginPinch();
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const s = Math.min(MAX_S, Math.max(MIN_S, (pinch.s * d) / pinch.d));
        // Keep the content point under the original midpoint glued to the current midpoint.
        const k = s / pinch.s;
        cam.current = { s, x: mx - (pinch.mx - pinch.cx) * k, y: my - (pinch.my - pinch.cy) * k };
      } else if (pan) {
        cam.current = { ...cam.current, x: pan.cx + p.x - pan.x, y: pan.cy + p.y - pan.y };
      }
      clamp();
      apply();
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {
        // Pinch -> one finger left: continue as a pan from here.
        const [rest] = [...pointers.values()];
        pinch = null;
        pan = { x: rest.x, y: rest.y, cx: cam.current.x, cy: cam.current.y };
        return;
      }
      if (pointers.size === 0) {
        if (start && !start.multi && Math.hypot(p.x - start.x, p.y - start.y) < TAP_SLOP && e.type === "pointerup") {
          tapRef.current(start.team);
        }
        start = null;
        pinch = null;
        pan = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pauseDrift();
      const p = local(e);
      const c = cam.current;
      const s = Math.min(MAX_S, Math.max(MIN_S, c.s * Math.exp(-e.deltaY * 0.0015)));
      const k = s / c.s;
      cam.current = { s, x: p.x - (p.x - c.x) * k, y: p.y - (p.y - c.y) * k };
      clamp();
      apply();
    };

    // Until the user moves the camera, keep the framing fitted to the stage (it can resize after first paint).
    const ro = new ResizeObserver(() => {
      if (!touched) home(false);
      else {
        clamp();
        apply();
      }
    });
    ro.observe(stage);

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(idle);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [apply, clamp, driftRef, home, stageRef]);

  return { focus, home, scale: () => cam.current.s };
}
