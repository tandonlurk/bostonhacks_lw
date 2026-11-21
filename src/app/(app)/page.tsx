"use client";

import { LiveMap } from "@/components/LiveMap";
import { JoinForm } from "@/components/JoinForm";
import { RideControls } from "@/components/RideControls";
import { Leaderboard } from "@/components/Leaderboard";
import { useRider } from "@/hooks/useRider";
import { useRideSession } from "@/hooks/useRideSession";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function Home() {
  const { rider, loading: riderLoading, join } = useRider();
  const { session, startGeo, startManual, stop } = useRideSession(rider?.riderId ?? null);
  const { data: leaderboard, loading: leaderboardLoading } = useLeaderboard();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "var(--space-4) var(--space-4) 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>T-City</h1>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Your commute builds the city.</p>
      </header>

      {!rider ? (
        <JoinForm onJoin={join} loading={riderLoading} />
      ) : (
        <RideControls
          active={session.active}
          state={session.state}
          stopsCredited={session.stopsCredited}
          message={session.message}
          error={session.error}
          lastResult={session.lastResult}
          onStartGeo={startGeo}
          onStartManual={startManual}
          onStop={stop}
        />
      )}

      <details style={{ margin: "0 var(--space-4) var(--space-4)" }}>
        <summary style={{ fontWeight: 700, padding: "var(--space-2) 0", cursor: "pointer" }}>Leaderboard</summary>
        <Leaderboard data={leaderboard} loading={leaderboardLoading} />
      </details>

      <LiveMap />
    </div>
  );
}
