import { riderFixture } from "@/contracts/fixtures";
import { LineChip } from "@/components/LineChip";

export default function MePage() {
  const rider = riderFixture;
  return (
    <div style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: "var(--space-2)" }}>Me</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: "var(--space-4)" }}>
        Join flow lands in T06 — this is a preview card using fixture data.
      </p>
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
    </div>
  );
}
