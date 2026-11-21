"use client";

// Owns the rider + ride session so tracking can outlive the Ride tab. The Ride page renders its own
// provider when none is mounted above it, so this works both standalone and when AppShell wraps the
// whole app in <RideSessionProvider> (recommended: then switching tabs mid-ride keeps sampling).
import { createContext, useContext, useEffect, useMemo } from "react";
import { useRider } from "@/hooks/useRider";
import { useRideSession } from "@/hooks/useRideSession";
import { setRideLive } from "@/components/ui/liveRide";

type RiderApi = ReturnType<typeof useRider>;
type SessionApi = ReturnType<typeof useRideSession>;

export interface RideContextValue {
  rider: RiderApi["rider"];
  riderLoading: boolean;
  riderError: string | null;
  join: RiderApi["join"];
  session: SessionApi["session"];
  startGeo: SessionApi["startGeo"];
  startManual: SessionApi["startManual"];
  stop: SessionApi["stop"];
}

const RideContext = createContext<RideContextValue | null>(null);

export function RideSessionProvider({ children }: { children: React.ReactNode }) {
  const { rider, loading, error, join } = useRider();
  const { session, startGeo, startManual, stop } = useRideSession(rider?.riderId ?? null);

  useEffect(() => {
    setRideLive(session.active);
  }, [session.active]);
  useEffect(() => () => setRideLive(false), []);

  const value = useMemo<RideContextValue>(
    () => ({ rider, riderLoading: loading, riderError: error, join, session, startGeo, startManual, stop }),
    [rider, loading, error, join, session, startGeo, startManual, stop],
  );

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

/** The nearest ride session, or null when no provider is mounted. */
export function useRideContext(): RideContextValue | null {
  return useContext(RideContext);
}
