import type { District } from "@/contracts";
import { LineChip } from "./LineChip";
import { BuildingTile } from "./BuildingTile";

export function DistrictGrid({ district }: { district: District }) {
  const cols = Math.max(1, ...district.lots.map((l) => l.x + 1));

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: "var(--space-3)",
        marginBottom: "var(--space-4)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <div>
          <LineChip teamRouteId={district.teamRouteId} size="sm" />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{district.name}</p>
        </div>
        <strong style={{ fontSize: 16 }}>{district.totalPoints} pts</strong>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 6,
        }}
      >
        {district.lots.map((lot) => (
          <BuildingTile key={lot.id} team={district.teamRouteId} tier={lot.tier} points={lot.points} kind={lot.kind} />
        ))}
      </div>
    </section>
  );
}
