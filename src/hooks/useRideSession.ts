"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrewBonus, ManualRideHint, NearStation, RideSampleResponse, RideState, SideQuest, StartRideResponse } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import {
  rideSampleCrewFixture,
  rideSampleFixture,
  rideSampleSearchingFixture,
  rideSampleTunnelFixture,
  startRideFixture,
  endRideFixture,
} from "@/contracts/fixtures";
import { USE_MOCKS } from "./useMocks";
import { RIDER_ID_KEY } from "./useRider";
import { getDemoSpot } from "@/components/ride/demoLocation";

const SAMPLE_INTERVAL_MS = 10_000;
/** Cross-tab hint for which station to show a hunt for; read by useHunt's default stopId. */
export const LAST_STOP_KEY = "tcity.lastStopId";
const MOCK_SEQUENCE = [
  rideSampleSearchingFixture,
  rideSampleSearchingFixture,
  rideSampleFixture,
  rideSampleCrewFixture,
  rideSampleTunnelFixture,
];

type ApiError = { error?: { code?: string; message?: string } } | null;

const EXPIRED = "Your session expired. Refresh and rejoin from the Ride tab.";

/**
 * POST /api/rides/start (start gate, #96). Resolves with the response, or null when the endpoint isn't
 * deployed yet (404) or the ride is already active (409 ride_active). Throws a friendly Error otherwise
 * (e.g. 403 not_near_station, whose message names the nearest station).
 */
async function callStart(riderId: string, lat: number, lng: number, accuracy: number): Promise<StartRideResponse | null> {
  if (USE_MOCKS) return startRideFixture;
  const res = await fetch("/api/rides/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ riderId, lat, lng, accuracy }),
  });
  if (res.ok) return res.json();
  const body: ApiError = await res.json().catch(() => null);
  if (body?.error?.code === "rider_not_found") {
    window.localStorage.removeItem(RIDER_ID_KEY);
    throw new Error(EXPIRED);
  }
  if (res.status === 404 || res.status === 405) return null;
  if (res.status === 409 && body?.error?.code === "ride_active") return null;
  throw new Error(body?.error?.message ?? `Couldn't start the ride (${res.status}).`);
}

interface RideSessionState {
  active: boolean;
  state: RideState | null;
  sessionId: string | null;
  teamRouteId: TeamRouteId | null;
  stopsCredited: number;
  nextStopId: string | null;
  message: string | null;
  error: string | null;
  /** Epoch ms when the current ride started (client clock), null when idle. */
  startedAt: number | null;
  /** #96: whole minutes bound to a train, when the server reports it. */
  minutesRidden: number | null;
  /** #96: points earned so far this ride (bonuses included), when reported. */
  pointsAwarded: number | null;
  /** #96: teammates on the same train, null when riding solo. */
  crew: CrewBonus | null;
  /** Daily Silver Line quest, supplied only while this ride is on Silver. */
  sideQuest: SideQuest | null;
  originStationId: string | null;
  /** Station the start gate matched, when /api/rides/start is available. */
  startStation: NearStation | null;
  lastResult: { stopsCredited: number; pointsAwarded: number; durationMs?: number } | null;
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
  startedAt: null,
  minutesRidden: null,
  pointsAwarded: null,
  crew: null,
  sideQuest: null,
  originStationId: null,
  startStation: null,
  lastResult: null,
};

export function useRideSession(riderId: string | null) {
  const [session, setSession] = useState<RideSessionState>(IDLE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleCountRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  // Stop sampling if the owner unmounts (otherwise the interval leaks and keeps posting samples).
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

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
      minutesRidden: res.minutesRidden ?? prev.minutesRidden,
      pointsAwarded: res.pointsAwarded ?? prev.pointsAwarded,
      crew: res.crew === undefined ? prev.crew : res.crew,
      sideQuest: res.sideQuest ?? null,
      originStationId: res.originStationId ?? prev.originStationId,
      error: null,
    }));
  }, []);

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : undefined;
    startedAtRef.current = null;
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
      setSession({ ...IDLE, lastResult: { stopsCredited: result.stopsCredited, pointsAwarded: result.pointsAwarded, durationMs } });
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
          const body: ApiError = await res.json().catch(() => null);
          if (body?.error?.code === "ride_not_started") {
            // The server has no open ride (e.g. it expired); re-open it from this fix and keep sampling.
            await callStart(riderId, lat, lng, accuracy);
            return;
          }
          if (body?.error?.code === "rider_not_found") {
            window.localStorage.removeItem(RIDER_ID_KEY);
            throw new Error(EXPIRED);
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

  /** Opens the ride through the start gate, then runs `tick` now and every SAMPLE_INTERVAL_MS. */
  const begin = useCallback(
    async (lat: number, lng: number, accuracy: number, tick: () => void) => {
      if (!riderId) return;
      try {
        const started = await callStart(riderId, lat, lng, accuracy);
        if (startedAtRef.current === null) return; // ended while we were starting
        if (started) {
          setSession((prev) => ({
            ...prev,
            sessionId: started.sessionId,
            state: started.state,
            message: started.message,
            startStation: started.station,
          }));
        }
        if (timerRef.current) clearInterval(timerRef.current);
        tick();
        timerRef.current = setInterval(tick, SAMPLE_INTERVAL_MS);
      } catch (err) {
        startedAtRef.current = null;
        setSession({ ...IDLE, error: err instanceof Error ? err.message : "Couldn't start the ride." });
      }
    },
    [riderId],
  );

  const startGeo = useCallback(() => {
    if (!riderId) return;
    // Hidden arrow-key demo override: sample the pinned station instead of real GPS.
    if (getDemoSpot()) {
      sampleCountRef.current = 0;
      startedAtRef.current = Date.now();
      setSession({ ...IDLE, active: true, state: "searching", message: "Checking you're at a station…", startedAt: startedAtRef.current });
      const pinnedTick = () => {
        const p = getDemoSpot();
        if (p) sendSample(p.lat, p.lng, 10, null);
      };
      const p = getDemoSpot()!;
      void begin(p.lat, p.lng, 10, pinnedTick);
      return;
    }
    if (!("geolocation" in navigator)) {
      setSession((prev) => ({ ...prev, error: "This device doesn't report location. Use the manual fallback below." }));
      return;
    }
    sampleCountRef.current = 0;
    startedAtRef.current = Date.now();
    setSession({ ...IDLE, active: true, state: "searching", message: "Checking you're at a station…", startedAt: startedAtRef.current });

    const tick = () => {
      const pinned = getDemoSpot();
      if (pinned) {
        sendSample(pinned.lat, pinned.lng, 10, null);
        return;
      }
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

    if (USE_MOCKS) {
      // Mock mode replays fixtures, so don't make sampling depend on a real GPS fix.
      void begin(0, 0, 0, () => sendSample(0, 0, 0, null));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void begin(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, tick),
      (err) => {
        startedAtRef.current = null;
        setSession({ ...IDLE, error: `Location unavailable (${err.message}). Try picking your stop instead.` });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [riderId, sendSample, begin]);

  const startManual = useCallback(
    (hint: ManualRideHint, lat: number, lng: number) => {
      if (!riderId) return;
      sampleCountRef.current = 0;
      startedAtRef.current = Date.now();
      setSession({ ...IDLE, active: true, state: "searching", message: "Checking your manual pick…", startedAt: startedAtRef.current });
      void begin(lat, lng, 50, () => sendSample(lat, lng, 50, null, hint));
    },
    [riderId, sendSample, begin],
  );

  return { session, startGeo, startManual, stop };
}
