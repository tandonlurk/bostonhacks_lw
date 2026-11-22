import type { LeaderboardResponse } from "@/contracts";
import { LineChip } from "./LineChip";
import { EmptyState } from "./EmptyState";
import { PaperCard, Stamp } from "./paper/Paper";

/** Simple team leaderboard: paper rows with rank stamps. */
export function Leaderboard({ data, loading }: { data: LeaderboardResponse | null; loading: boolean }) {
  if (loading && !data) return <EmptyState title="Loading leaderboard…" />;
  if (!data?.teams.length) return <EmptyState title="No points yet" body="Be the first to ride and score." />;

  return (
    <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {data.teams.map((team) => (
        <PaperCard
          as="li"
          key={team.teamRouteId}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "var(--space-2) var(--space-3)" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Stamp color={team.rank === 1 && team.points > 0 ? "var(--gold-ink)" : "var(--muted)"} rotate={-5} style={{ minWidth: 40, justifyContent: "center" }}>
              No.{team.rank}
            </Stamp>
            <LineChip teamRouteId={team.teamRouteId} size="sm" />
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <strong className="num" style={{ fontSize: 17 }}>
              {team.points}
            </strong>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>pts · {team.riders} riders</span>
          </span>
        </PaperCard>
      ))}
    </ol>
  );
}
