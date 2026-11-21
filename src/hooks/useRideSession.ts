"use client";

import { useCallback, useRef, useState } from "react";
import type { ManualRideHint, RideSampleResponse, RideState } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import {
  rideSampleFixture,
  rideSampleSearchingFixture,
  rideSampleTunnelFixture,
  endRideFixture,
} from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";
import { RIDER_ID_KEY } from "./useRider";

const SAMPLE_INTERVAL_MS = 10_000;
/** Cross-tab hint for which station to show a hunt for; read by useHunt's default stopId. */
export const LAST_STOP_KEY = "tcity.lastStopId";
const MOCK_SEQUENCE = [rideSampleSearchingFixture, rideSampleSearchingFixture, rideSampleFixture, rideSampleTunnelFixture];

interface RideSessionState {
  active: boolean;
  state: RideState | null;
  sessionId: string | null;
  teamRouteId: TeamRouteId | null;
  stopsCredited: number;
  nextStopId: string | null;
  message: string | null;
  error: string | null;
  lastResult: { stopsCredited: number; pointsAwarded: number } | null;
}

const IDLE: RideSessionState = {
  active: false,
  state: null,
  sessionId: null,
  teamRouteId: null,
  stopsCredited: 0,
  nextStopId: null,
  message: null,
  error: null,
  lastResult: null,
};

export function useRideSession(riderId: string | null) {
  const [session, setSession] = useState<RideSessionState>(IDLE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleCountRef = useRef(0);

  const applySample = useCallback((res: RideSampleResponse) => {
    if (typeof window !== "undefined" && res.nextStopId) {
      window.localStorage.setItem(LAST_STOP_KEY, res.nextStopId);
    }
    setSession((prev) => ({
      ...prev,
      active: true,
      state: res.state,
      sessionId: res.sessionId,
      teamRouteId: res.teamRouteId ?? prev.teamRouteId,
      stopsCredited: res.stopsCredited,
      nextStopId: res.nextStopId ?? null,
      message: res.message,
      error: null,
    }));
  }, []);

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (!riderId) {
      setSession(IDLE);
      return;
    }
    try {
      const result = USE_MOCKS
        ? endRideFixture
        : await fetch("/api/rides/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ riderId }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`rides/end ${res.status}`);
            return res.json();
          });
      setSession({ ...IDLE, lastResult: { stopsCredited: result.stopsCredited, pointsAwarded: result.pointsAwarded } });
    } catch (err) {
      setSession({ ...IDLE, error: err instanceof Error ? err.message : "failed to end ride" });
    }
  }, [riderId]);

  const sendSample = useCallback(
    async (lat: number, lng: number, accuracy: number, speed: number | null, manual?: ManualRideHint) => {
      if (!riderId) return;
      try {
        if (USE_MOCKS) {
          const fixture = MOCK_SEQUENCE[Math.min(sampleCountRef.current, MOCK_SEQUENCE.length - 1)];
          sampleCountRef.current += 1;
          applySample(fixture);
          if (fixture.state === "left") await stop();
          return;
        }
        const res = await fetch("/api/rides/sample", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riderId,
            lat,
            lng,
            accuracy,
            speed,
            ts: new Date().toISOString(),
            manual,
          }),
        });
        if (!res.ok) {
          const body: { error?: { code?: string; message?: string } } | null = await res.json().catch(() => null);
          if (body?.error?.code === "rider_not_found") {
            window.localStorage.removeItem(RIDER_ID_KEY);
            throw new Error("Your session expired. Refresh and rejoin from the Ride tab.");
          }
          throw new Error(body?.error?.message ?? `rides/sample ${res.status}`);
        }
        const result: RideSampleResponse = await res.json();
        applySample(result);
        // Server ends the session once the rider leaves the vehicle; stop sampling and show the summary.
        if (result.state === "left") await stop();
      } catch (err) {
        setSession((prev) => ({ ...prev, error: err instanceof Error ? err.message : "sample failed" }));
      }
    },
    [riderId, applySample, stop],
  );

  const startGeo = useCallback(() => {
    if (!riderId) return;
    if (!("geolocation" in navigator)) {
      setSession((prev) => ({ ...prev, error: "This device doesn't report location. Use the manual fallback below." }));
      return;
    }
    sampleCountRef.current = 0;
    setSession({ ...IDLE, active: true, state: "searching", message: "Looking for your train…" });

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          sendSample(latitude, longitude, accuracy, speed ?? null);
        },
        (err) => {
          setSession((prev) => ({ ...prev, error: `Location unavailable (${err.message}). Try the manual fallback.` }));
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    };

    tick();
    timerRef.current = setInterval(tick, SAMPLE_INTERVAL_MS);
  }, [riderId, sendSample]);

  const startManual = useCallback(
    (hint: ManualRideHint, lat: number, lng: number) => {
      if (!riderId) return;
      sampleCountRef.current = 0;
      setSession({ ...IDLE, active: true, state: "searching", message: "Checking your manual pick…" });

      const tick = () => sendSample(lat, lng, 50, null, hint);
      tick();
      timerRef.current = setInterval(tick, SAMPLE_INTERVAL_MS);
    },
    [riderId, sendSample],
  );

  return { session, startGeo, startManual, stop };
}
