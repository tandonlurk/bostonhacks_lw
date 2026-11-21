"use client";

// Where to draw the blue dot. Real GPS via watchPosition when allowed; otherwise (mock mode, permission
// not granted yet, denied, or unsupported) a believable demo spot that drifts along the Green Line so
// the map still feels alive. The map's render loop pulls `getFix(now)` every frame; React only gets a
// 1 Hz snapshot (for "Near Park Street" and the GPS badge).
import { useCallback, useEffect, useRef, useState } from "react";
import { USE_MOCKS } from "@/hooks/useMocks";
import { bearingDeg, demoAt, distanceM, type LatLng } from "./geo";

export interface Fix extends LatLng {
  /** Degrees clockwise from north, null when unknown (standing still). */
  heading: number | null;
  /** Accuracy radius in meters. */
  accuracy: number;
}

export type GpsState = "off" | "locating" | "on" | "denied" | "unsupported";

const DEMO_SPEED_IDLE = 4; // m/s, a slow stroll
const DEMO_SPEED_RIDING = 13; // m/s, roughly a Green Line train between stops
const INITIAL_FIX: Fix = { ...demoAt(0), accuracy: 25 };

export function useRiderPosition({ riding, reducedMotion }: { riding: boolean; reducedMotion: boolean }) {
  const [gpsWanted, setGpsWanted] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>("off");
  const gpsFixRef = useRef<Fix | null>(null);
  const headingAnchorRef = useRef<LatLng | null>(null);
  const [snapshot, setSnapshot] = useState<Fix>(INITIAL_FIX);
  const currentRef = useRef<Fix>(INITIAL_FIX);
  const demoRef = useRef({ travelled: 0, last: 0 });
  const optsRef = useRef({ riding, reducedMotion });
  useEffect(() => {
    optsRef.current = { riding, reducedMotion };
  }, [riding, reducedMotion]);

  // Only ask for location when it won't surprise anyone: already granted, a ride starts, or a tap.
  useEffect(() => {
    if (USE_MOCKS || typeof navigator === "undefined") return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setGpsState("unsupported"));
      return;
    }
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (p.state === "granted") setGpsWanted(true);
        if (p.state === "denied") setGpsState("denied");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (riding && !USE_MOCKS) queueMicrotask(() => setGpsWanted(true));
  }, [riding]);

  useEffect(() => {
    if (!gpsWanted || USE_MOCKS || typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    queueMicrotask(() => setGpsState((s) => (s === "on" ? s : "locating")));
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        const next: LatLng = { lat: latitude, lng: longitude };
        let h: number | null = gpsFixRef.current?.heading ?? null;
        const anchor = headingAnchorRef.current;
        if (heading != null && !Number.isNaN(heading) && (speed ?? 0) > 0.6) {
          h = heading;
          headingAnchorRef.current = next;
        } else if (!anchor) {
          headingAnchorRef.current = next;
        } else if (distanceM(anchor, next) > 12) {
          // No compass heading: derive it once we've moved far enough to trust the direction.
          h = bearingDeg(anchor, next);
          headingAnchorRef.current = next;
        }
        gpsFixRef.current = { ...next, heading: h, accuracy: accuracy || 30 };
        setGpsState("on");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsState("denied");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gpsWanted]);

  /** Called by the render loop every frame. Advances the demo drift. */
  const getFix = useCallback((now: number): Fix => {
    const gps = gpsFixRef.current;
    if (gps) {
      currentRef.current = gps;
      return gps;
    }
    const demo = demoRef.current;
    const dt = demo.last ? Math.min(0.1, (now - demo.last) / 1000) : 0;
    demo.last = now;
    const { riding: r, reducedMotion: rm } = optsRef.current;
    const speed = r ? DEMO_SPEED_RIDING : rm ? 0 : DEMO_SPEED_IDLE;
    demo.travelled += dt * speed;
    const fix: Fix = { ...demoAt(demo.travelled), accuracy: 25 };
    currentRef.current = fix;
    return fix;
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSnapshot(currentRef.current), 1000);
    return () => clearInterval(id);
  }, []);

  const requestGps = useCallback(() => setGpsWanted(true), []);

  return { getFix, snapshot, gpsState, requestGps, isDemo: gpsState !== "on" };
}
