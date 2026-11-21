"use client";

// Dependency-free pan / pinch / wheel / double-tap zoom for an SVG map.
// The transform is written straight to a <g> each frame (no React render while dragging); React only re-renders when the
// zoom crosses a bucket, which drives marker sizes and label level-of-detail.
import { useCallback, useEffect, useRef, useState } from "react";

export interface View {
  x: number;
  y: number;
  k: number;
}

interface Options {
  minK: number;
  maxK: number;
  world: { w: number; h: number };
  /** Called with svg-local screen coordinates on a clean tap (no drag). */
  onTap: (sx: number, sy: number, view: View) => void;
}

const TAP_SLOP = 8;
const DOUBLE_TAP_MS = 300;

/** Zoom buckets are 1/6 of an octave apart, so marker sizes drift at most ~6% between re-renders. */
export function zoomBucket(k: number) {
  return Math.pow(2, Math.round(Math.log2(k) * 6) / 6);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function usePanZoom({ minK, maxK, world, onTap }: Options) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const size = useRef({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const bucket = useRef(1);
  const anim = useRef<number | null>(null);
  const onTapRef = useRef(onTap);

  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const clamp = useCallback(
    (v: View): View => {
      const k = Math.min(maxK, Math.max(minK, v.k));
      const { w, h } = size.current;
      // Keep at least ~40% of the viewport over the network so the map can't be flung away.
      const minX = w * 0.4 - world.w * k;
      const maxX = w * 0.6;
      const minY = h * 0.4 - world.h * k;
      const maxY = h * 0.6;
      return { k, x: Math.min(maxX, Math.max(minX, v.x)), y: Math.min(maxY, Math.max(minY, v.y)) };
    },
    [minK, maxK, world.w, world.h],
  );

  const apply = useCallback(
    (next: View) => {
      const v = clamp(next);
      view.current = v;
      groupRef.current?.setAttribute("transform", `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) scale(${v.k.toFixed(4)})`);
      const b = zoomBucket(v.k);
      if (b !== bucket.current) {
        bucket.current = b;
        setZoom(b);
      }
    },
    [clamp],
  );

  const stopAnim = () => {
    if (anim.current != null) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  const animateTo = useCallback(
    (target: View, ms = 380) => {
      stopAnim();
      const from = { ...view.current };
      const to = clamp(target);
      if (prefersReducedMotion() || ms <= 0) {
        apply(to);
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - t, 3);
        // Interpolate zoom geometrically so it feels even.
        const k = from.k * Math.pow(to.k / from.k, e);
        apply({ k, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
        anim.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply, clamp],
  );

  /** Zoom by `factor` keeping the screen point (sx, sy) fixed. */
  const zoomAt = useCallback(
    (factor: number, sx: number, sy: number, animated = false) => {
      const v = view.current;
      const k = Math.min(maxK, Math.max(minK, v.k * factor));
      const wx = (sx - v.x) / v.k;
      const wy = (sy - v.y) / v.k;
      const next = { k, x: sx - wx * k, y: sy - wy * k };
      if (animated) animateTo(next, 260);
      else apply(next);
    },
    [animateTo, apply, maxK, minK],
  );

  /** Fit a world rect into the viewport (minus insets), optionally animated. */
  const fit = useCallback(
    (r: { x: number; y: number; w: number; h: number }, inset = { top: 0, bottom: 0, side: 16 }, animated = false) => {
      const { w, h } = size.current;
      const availW = Math.max(1, w - inset.side * 2);
      const availH = Math.max(1, h - inset.top - inset.bottom);
      const k = Math.min(availW / r.w, availH / r.h);
      const x = inset.side + (availW - r.w * k) / 2 - r.x * k;
      const y = inset.top + (availH - r.h * k) / 2 - r.y * k;
      if (animated) animateTo({ x, y, k });
      else apply({ x, y, k });
    },
    [animateTo, apply],
  );

  /** Center a world point at a fraction of the viewport height (e.g. 0.3 to sit above a sheet). */
  const focus = useCallback(
    (wx: number, wy: number, k: number, yFrac = 0.5) => {
      const { w, h } = size.current;
      animateTo({ k, x: w / 2 - wx * k, y: h * yFrac - wy * k });
    },
    [animateTo],
  );

  const getView = useCallback(() => view.current, []);
  const getSize = useCallback(() => size.current, []);

  // Size tracking: measure once up front (ResizeObserver can lag a frame), then follow resizes.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const first = svg.getBoundingClientRect();
    if (first.width > 0 && size.current.w === 0) {
      size.current = { w: first.width, h: first.height };
      setReady(true);
    }
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const prev = size.current;
      size.current = { w: width, h: height };
      if (prev.w === 0 && width > 0) setReady(true);
      else if (prev.w > 0) {
        // Keep the same center on rotate / resize.
        const v = view.current;
        apply({ k: v.k, x: v.x + (width - prev.w) / 2, y: v.y + (height - prev.h) / 2 });
      }
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, [apply]);

  // Pointer + wheel gestures.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pts = new Map<number, { x: number; y: number }>();
    let base: { v: View; pts: { x: number; y: number }[] } | null = null;
    let moved = 0;
    let downAt = 0;
    let lastTap = { t: 0, x: 0, y: 0 };

    const local = (e: PointerEvent | WheelEvent) => {
      const r = svg.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const rebase = () => {
      base = { v: { ...view.current }, pts: [...pts.values()].map((p) => ({ ...p })) };
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stopAnim();
      svg.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) {
        moved = 0;
        downAt = performance.now();
      }
      rebase();
    };

    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId) || !base) return;
      const p = local(e);
      pts.set(e.pointerId, p);
      const now = [...pts.values()];
      if (now.length === 1 && base.pts.length >= 1) {
        const dx = p.x - base.pts[0].x;
        const dy = p.y - base.pts[0].y;
        moved = Math.max(moved, Math.hypot(dx, dy));
        apply({ k: base.v.k, x: base.v.x + dx, y: base.v.y + dy });
      } else if (now.length >= 2 && base.pts.length >= 2) {
        moved = TAP_SLOP + 1;
        const [a0, b0] = base.pts;
        const [a, b] = now;
        const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const k = Math.min(maxK, Math.max(minK, base.v.k * (d / d0)));
        const wx = (m0.x - base.v.x) / base.v.k;
        const wy = (m0.y - base.v.y) / base.v.k;
        apply({ k, x: m.x - wx * k, y: m.y - wy * k });
      }
    };

    const up = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e);
      const wasSingle = pts.size === 1;
      pts.delete(e.pointerId);
      rebase();
      if (!wasSingle || e.type === "pointercancel") return;
      const quick = performance.now() - downAt < 450;
      if (moved > TAP_SLOP || !quick) return;
      const t = performance.now();
      if (t - lastTap.t < DOUBLE_TAP_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
        lastTap = { t: 0, x: 0, y: 0 };
        zoomAt(2, p.x, p.y, true);
        return;
      }
      lastTap = { t, x: p.x, y: p.y };
      onTapRef.current(p.x, p.y, view.current);
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      stopAnim();
      const p = local(e);
      const scale = e.deltaMode === 1 ? 0.05 : 0.0022;
      zoomAt(Math.exp(-e.deltaY * scale), p.x, p.y);
    };

    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => {
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("wheel", wheel);
      stopAnim();
    };
  }, [apply, maxK, minK, zoomAt]);

  return { svgRef, groupRef, zoom, ready, apply, animateTo, zoomAt, fit, focus, getView, getSize };
}
