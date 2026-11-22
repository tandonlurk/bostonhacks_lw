"use client";

// Full-bleed, Google-Maps-navigation-style map: a tilted ground plane drawn on canvas with a
// perspective camera, centered on the rider, rotated heading-up. No route line, just the T.
import { useEffect, useRef } from "react";
import type { Vehicle } from "@/contracts";
import { TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import { angleDelta, makeView, type CameraState } from "./navCamera";
import { drawNavMap, type MapColors } from "./drawNavMap";
import { distanceM } from "./geo";
import { LocationDot } from "./LocationDot";
import type { Fix } from "./useRiderPosition";

export type MapMode = "idle" | "riding" | "onboarding";

interface NavMapProps {
  getFix: (now: number) => Fix;
  team: TeamRouteId | null;
  mode: MapMode;
  /** Vertical position of the rider on screen, 0..1. */
  anchorY: number;
  vehicles: Vehicle[];
  nearestId: string | null;
  reducedMotion: boolean;
}

const MODE_CAMERA: Record<MapMode, { tilt: number; dist: number; zoom: number }> = {
  idle: { tilt: 1.06, dist: 900, zoom: 0.4 },
  riding: { tilt: 1.12, dist: 800, zoom: 0.34 },
  onboarding: { tilt: 0.9, dist: 1600, zoom: 0.22 },
};

function readColors(el: Element): MapColors {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const team = Object.fromEntries(
    TEAM_ROUTE_IDS.map((t) => [t, v(`--glow-${t.toLowerCase()}`, "#ffffff")]),
  ) as Record<TeamRouteId, string>;
  return {
    bg: v("--bg", "#07090d"),
    ground: "#f3f5f8",
    grid: "#8a96a8",
    water: "#cfe3f5",
    ink: v("--ink", "#f4f5f2"),
    muted: v("--muted", "#98a0ab"),
    dot: "#3d8bff",
    team,
  };
}

export function NavMap({ getFix, team, mode, anchorY, vehicles, nearestId, reducedMotion }: NavMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ getFix, team, mode, anchorY, vehicles, nearestId, reducedMotion });
  useEffect(() => {
    propsRef.current = { getFix, team, mode, anchorY, vehicles, nearestId, reducedMotion };
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = readColors(canvas);
    const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const size = { w: 0, h: 0, dpr: 1 };
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      size.w = r.width;
      size.h = r.height;
      size.dpr = Math.min(2.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * size.dpr);
      canvas.height = Math.round(r.height * size.dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let cam: CameraState | null = null;
    let cyFrac = propsRef.current.anchorY;
    let last = 0;
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!size.w || !size.h) return;
      const p = propsRef.current;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      const fix = p.getFix(now);
      const target = MODE_CAMERA[p.mode];

      if (!cam || distanceM(cam, fix) > 3000) {
        cam = { lat: fix.lat, lng: fix.lng, bearing: fix.heading ?? 0, ...target, cx: 0, cy: 0 };
        cyFrac = p.anchorY;
      }
      const ease = (rate: number) => (p.reducedMotion ? 1 : 1 - Math.exp(-dt * rate));
      const kPos = ease(5);
      cam.lat += (fix.lat - cam.lat) * kPos;
      cam.lng += (fix.lng - cam.lng) * kPos;
      if (fix.heading != null) cam.bearing = (cam.bearing + angleDelta(cam.bearing, fix.heading) * ease(2.2) + 360) % 360;
      const kCam = ease(2.6);
      cam.tilt += (target.tilt - cam.tilt) * kCam;
      cam.dist += (target.dist - cam.dist) * kCam;
      cam.zoom += (target.zoom - cam.zoom) * kCam;
      cyFrac += (p.anchorY - cyFrac) * kCam;
      cam.cx = size.w / 2;
      cam.cy = size.h * cyFrac;

      const view = makeView(cam);
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      drawNavMap(ctx, view, {
        width: size.w,
        height: size.h,
        colors,
        font,
        team: p.team,
        vehicles: p.vehicles,
        accuracy: fix.accuracy,
        coneAngle: fix.heading == null ? null : angleDelta(cam.bearing, fix.heading),
        nearestId: p.nearestId,
        labelMinY: p.mode === "onboarding" ? 60 : 190,
        labelMaxY: size.h * Math.min(0.9, cyFrac + 0.2),
        phase: p.reducedMotion ? 0 : (now / 1800) % 1,
      });
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${cam.cx}px, ${cam.cy}px, 0)`;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div ref={dotRef} style={{ position: "absolute", left: 0, top: 0, transform: "translate3d(50vw, 50vh, 0)", willChange: "transform" }}>
        <LocationDot />
      </div>
    </div>
  );
}
