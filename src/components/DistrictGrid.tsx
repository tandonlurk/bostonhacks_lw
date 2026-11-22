import type { District } from "@/contracts";
import { LineChip } from "./LineChip";
import { BuildingTile } from "./BuildingTile";
import { PaperCard } from "./paper/Paper";

/** A team's district as a sheet of card stock holding its lots. */
export function DistrictGrid({ district }: { district: District }) {
  const cols = Math.max(1, ...district.lots.map((l) => l.x + 1));

  return (
    <PaperCard as="section" stack style={{ padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <div>
          <LineChip teamRouteId={district.teamRouteId} size="sm" />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{district.name}</p>
        </div>
        <strong className="num" style={{ fontSize: 18 }}>
          {district.totalPoints} pts
        </strong>
      </header>
      <div className="paper--kraft" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, padding: 6, borderRadius: 4 }}>
        {district.lots.map((lot) => (
          <BuildingTile key={lot.id} team={district.teamRouteId} tier={lot.tier} points={lot.points} kind={lot.kind} />
        ))}
      </div>
    </PaperCard>
  );
}
