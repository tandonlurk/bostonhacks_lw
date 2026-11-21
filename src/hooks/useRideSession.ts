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

const SAMPLE_INTERVAL_MS = 10_000;
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

  const sendSample = useCallback(
    async (lat: number, lng: number, accuracy: number, speed: number | null, manual?: ManualRideHint) => {
      if (!riderId) return;
      try {
        if (USE_MOCKS) {
          const fixture = MOCK_SEQUENCE[Math.min(sampleCountRef.current, MOCK_SEQUENCE.length - 1)];
          sampleCountRef.current += 1;
          applySample(fixture);
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
        if (!res.ok) throw new Error(`rides/sample ${res.status}`);
        applySample(await res.json());
      } catch (err) {
        setSession((prev) => ({ ...prev, error: err instanceof Error ? err.message : "sample failed" }));
      }
    },
    [riderId, applySample],
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

  return { session, startGeo, startManual, stop };
}
