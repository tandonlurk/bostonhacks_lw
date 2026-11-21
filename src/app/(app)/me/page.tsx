"use client";

import { useRider } from "@/hooks/useRider";
import { LineChip } from "@/components/LineChip";
import { EmptyState } from "@/components/EmptyState";

export default function MePage() {
  const { rider, loading } = useRider();

  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>Me</h1>

      {loading ? <EmptyState title="Loading your profile…" /> : null}
      {!loading && !rider ? (
        <EmptyState title="You haven't joined yet" body="Join from the Ride tab to pick a home line and start earning points." />
      ) : null}

      {rider ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>{rider.displayName}</span>
            <LineChip teamRouteId={rider.homeTeamRouteId} size="sm" />
          </div>
          <div style={{ display: "flex", gap: "var(--space-5)" }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800 }}>{rider.points}</p>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>points</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800 }}>{rider.tokens}</p>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>CitiTokens</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800 }}>{rider.streakDays}</p>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>day streak</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
