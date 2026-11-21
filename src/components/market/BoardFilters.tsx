"use client";

import type { TeamRouteId } from "@/contracts/routes";
import { TEAM_SHORT, teamFill, teamGlow } from "./format";
import s from "./market.module.css";

export type KindFilter = "all" | "bounty" | "trade" | "offer";

const KINDS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bounty", label: "Bounties" },
  { value: "trade", label: "Trades" },
  { value: "offer", label: "Offers" },
];

interface Props {
  kind: KindFilter;
  onKind: (k: KindFilter) => void;
  counts: Record<KindFilter, number>;
  myLine: boolean;
  onMyLine: (v: boolean) => void;
  team: TeamRouteId | null;
}

export function BoardFilters({ kind, onKind, counts, myLine, onMyLine, team }: Props) {
  return (
    <div className={s.chipRow} role="toolbar" aria-label="Filter posts">
      <button
        type="button"
        aria-pressed={myLine}
        onClick={() => onMyLine(!myLine)}
        className={s.press}
        style={{
          ...chip,
          ...(myLine && team
            ? { background: teamFill(team), borderColor: teamGlow(team), color: team === "Orange" || team === "Silver" ? "#14181c" : "#fff" }
            : null),
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: team ? teamGlow(team) : "var(--muted)",
            boxShadow: myLine ? "0 0 0 2px rgba(255,255,255,0.8)" : "none",
          }}
        />
        {team ? `${TEAM_SHORT[team]} Line` : "My line"}
      </button>
      <span aria-hidden="true" style={{ flex: "none", width: 1, margin: "8px 2px", background: "var(--border)" }} />
      {KINDS.map((k) => {
        const active = k.value === kind;
        return (
          <button
            key={k.value}
            type="button"
            aria-pressed={active}
            onClick={() => onKind(k.value)}
            className={s.press}
            style={{ ...chip, ...(active ? chipActive : null) }}
          >
            {k.label}
            <span className="num" style={{ fontSize: 12.5, opacity: active ? 0.7 : 0.55 }}>
              {counts[k.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const chip: React.CSSProperties = {
  flex: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  minHeight: 44,
  padding: "0 16px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontWeight: 700,
  fontSize: 14.5,
  whiteSpace: "nowrap",
};

const chipActive: React.CSSProperties = {
  background: "var(--accent)",
  borderColor: "var(--accent)",
  color: "var(--accent-ink)",
};
