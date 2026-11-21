"use client";

// Start gate (#96): is the rider close enough to a station to start a ride?
// Real GPS -> GET /api/rides/nearby. Mock mode, no GPS yet, or endpoint not deployed -> a local guess
// that never blocks Start (the server gate in /api/rides/start still has the final say).
import { useEffect, useState } from "react";
import type { NearbyStationResponse } from "@/contracts";
import { USE_MOCKS } from "@/hooks/useMocks";
import { distanceM, nearestPlace } from "./geo";
import type { Fix } from "./useRiderPosition";

export interface NearbyState {
  canStart: boolean;
  station: { name: string; distanceM: number } | null;
  radiusM: number;
  /** true when the answer came from the server gate. */
  verified: boolean;
}

const LOCAL_RADIUS_M = 330;

function localGuess(fix: Fix): NearbyState {
  const s = nearestPlace(fix);
  return {
    canStart: true,
    station: s ? { name: s.name, distanceM: distanceM(fix, s) } : null,
    radiusM: LOCAL_RADIUS_M,
    verified: false,
  };
}

export function useNearbyStation(fix: Fix, gpsOn: boolean): NearbyState {
  const [server, setServer] = useState<{ key: string; res: NearbyStationResponse } | null>(null);
  // ~20 m buckets so we re-ask the server only when the rider actually moves.
  const key = `${fix.lat.toFixed(4)},${fix.lng.toFixed(4)}`;
  const ask = gpsOn && !USE_MOCKS;
  const { lat, lng, accuracy } = fix;

  useEffect(() => {
    if (!ask) return;
    let cancelled = false;
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), accuracy: String(Math.round(accuracy)) });
    fetch(`/api/rides/nearby?${qs}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body: NearbyStationResponse = await res.json();
        if (!cancelled) setServer({ key, res: body });
      })
      .catch(() => {
        if (!cancelled) setServer(null);
      });
    return () => {
      cancelled = true;
    };
    // lat/lng are bucketed through `key`; accuracy changes alone don't warrant a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, key]);

  if (ask && server) {
    const { res } = server;
    return {
      canStart: res.canStart,
      station: res.station ? { name: res.station.name, distanceM: res.station.distanceM } : null,
      radiusM: res.radiusM,
      verified: true,
    };
  }
  // Real mode without a GPS fix: the dot is a demo spot, so don't claim "At Park Street".
  return USE_MOCKS ? localGuess(fix) : { ...localGuess(fix), station: null };
}
