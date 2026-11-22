"use client";

import type { TeamRouteId } from "@/contracts/routes";
import { CheckIcon } from "@/components/icons";
import { TEAM_INK, TEAM_SHORT, teamFill, teamGlow } from "./format";
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
  const onTeam = myLine && team;
  return (
    <div className={s.chipRow} role="toolbar" aria-label="Filter posts">
      <button
        type="button"
        aria-pressed={myLine}
        onClick={() => onMyLine(!myLine)}
        className={s.chip}
        style={onTeam ? { background: teamFill(team), borderColor: teamGlow(team), color: TEAM_INK[team] } : undefined}
      >
        <span
          aria-hidden="true"
          style={{
            width: 16,
            height: 5,
            borderRadius: 1,
            background: onTeam ? "currentColor" : team ? teamFill(team) : "var(--muted)",
          }}
        />
        {team ? `${TEAM_SHORT[team]} Line` : "My line"}
        {onTeam ? <CheckIcon size={14} weight={3} /> : null}
      </button>
      <span aria-hidden="true" style={{ flex: "none", width: 1, margin: "8px 2px", borderLeft: "1px dashed var(--faint)" }} />
      {KINDS.map((k) => {
        const active = k.value === kind;
        return (
          <button key={k.value} type="button" aria-pressed={active} onClick={() => onKind(k.value)} className={s.chip}>
            {k.label}
            <span className="num" style={{ fontSize: 12.5, opacity: 0.8 }}>
              {counts[k.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
