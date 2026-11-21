"use client";

import { RideScreen } from "@/components/ride/RideScreen";
import { RideSessionProvider, useRideContext } from "@/components/ride/RideSessionProvider";

// Ride tab. Uses the app-wide ride session when AppShell provides one (tracking survives tab
// switches); otherwise scopes a session to this page.
export default function RidePage() {
  const shared = useRideContext();
  if (shared) return <RideScreen />;
  return (
    <RideSessionProvider>
      <RideScreen />
    </RideSessionProvider>
  );
}
