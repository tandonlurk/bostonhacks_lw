import type { LeaderboardResponse } from "@/contracts";
import { LineChip } from "./LineChip";
import { EmptyState } from "./EmptyState";

export function Leaderboard({ data, loading }: { data: LeaderboardResponse | null; loading: boolean }) {
  if (loading && !data) return <EmptyState title="Loading leaderboard…" />;
  if (!data?.teams.length) return <EmptyState title="No points yet" body="Be the first to ride and score." />;

  return (
    <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {data.teams.map((team) => (
        <li
          key={team.teamRouteId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 800, color: "var(--muted)", width: 20 }}>#{team.rank}</span>
            <LineChip teamRouteId={team.teamRouteId} size="sm" />
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <strong style={{ fontSize: 16 }}>{team.points}</strong>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>pts · {team.riders} riders</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
