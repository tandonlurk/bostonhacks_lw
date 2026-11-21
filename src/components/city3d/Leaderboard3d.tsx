"use client";

import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { TeamIcon, TrophyIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import { DOCK_BOTTOM, fmtCompact, fmtFull } from "./CityOverlay";
import { ExpandIcon } from "./icons";
import type { TeamStat } from "./model";
import { TEAM_HEX } from "./palette";
import styles from "./city3d.module.css";

interface DockProps {
  ranked: TeamStat[];
  selected: TeamRouteId | null;
  mine: TeamRouteId | null;
  onSelect: (team: TeamRouteId) => void;
  onExpand: () => void;
}

/** Collapsed leaderboard: ranks 1-5 as a row of team pills floating above the nav. */
export function LeaderboardDock({ ranked, selected, mine, onSelect, onExpand }: DockProps) {
  return (
    <nav
      data-ui
      aria-label="Team leaderboard"
      className="glass"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: DOCK_BOTTOM,
        zIndex: 5,
        display: "flex",
        alignItems: "stretch",
        gap: 2,
        padding: 6,
        borderRadius: 22,
        boxShadow: "var(--shadow-float)",
      }}
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label="Open full leaderboard"
        style={{
          flex: "none",
          width: 48,
          minHeight: 52,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          border: "none",
          borderRadius: 16,
          background: "var(--accent)",
          color: "var(--accent-ink)",
        }}
      >
        <TrophyIcon size={22} weight={2.3} />
        <ExpandIcon size={14} weight={2.6} style={{ marginTop: -2 }} />
      </button>
      {ranked.map((s) => {
        const hex = TEAM_HEX[s.team];
        return (
          <button
            key={s.team}
            type="button"
            className={styles.pill}
            aria-pressed={selected === s.team}
            aria-label={`Rank ${s.rank}: ${TEAMS[s.team].name}, ${fmtFull(s.points)} points${mine === s.team ? ", your team" : ""}`}
            onClick={() => onSelect(s.team)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--muted)" }}>
              <span className="num">{s.rank}</span>
              <span
                aria-hidden="true"
                style={{ width: 9, height: 9, borderRadius: 3, background: hex.glow, boxShadow: `0 0 8px ${hex.glow}` }}
              />
            </span>
            <span className="num" style={{ fontSize: 15, fontWeight: 800, color: s.rank === 1 && s.points > 0 ? "var(--accent)" : "var(--ink)" }}>
              {fmtCompact(s.points)}
            </span>
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 3,
                borderRadius: 2,
                background: mine === s.team ? "var(--accent)" : "transparent",
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  ranked: TeamStat[];
  mine: TeamRouteId | null;
  onSelect: (team: TeamRouteId) => void;
}

/** Expanded leaderboard: full ranks, riders, district names and progress relative to the leader. */
export function LeaderboardSheet({ open, onClose, ranked, mine, onSelect }: SheetProps) {
  const top = Math.max(1, ranked[0]?.points ?? 1);
  const quiet = (ranked[0]?.points ?? 0) === 0;
  return (
    <Sheet open={open} onClose={onClose} title="Leaderboard">
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -6, marginBottom: 14 }}>
        {quiet
          ? "No points on the board yet. Ride any line to put the first floors on its skyline."
          : "Every point a line earns raises its skyline. Tap a team to fly to its district."}
      </p>
      <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {ranked.map((s) => {
          const hex = TEAM_HEX[s.team];
          const isMine = mine === s.team;
          const pct = Math.round((s.points / top) * 100);
          return (
            <li key={s.team}>
              <button
                type="button"
                onClick={() => onSelect(s.team)}
                aria-label={`Rank ${s.rank}: ${TEAMS[s.team].name}, ${fmtFull(s.points)} points, ${s.riders} riders. Show on map.`}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "34px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 12px 12px 10px",
                  textAlign: "left",
                  borderRadius: 18,
                  border: `1px solid ${isMine ? "var(--accent)" : "var(--border)"}`,
                  background: isMine ? "rgba(228,255,58,0.06)" : "var(--surface-2)",
                }}
              >
                <span className="num" style={{ fontSize: 26, fontWeight: 800, textAlign: "center", color: s.rank === 1 && !quiet ? "var(--accent)" : "var(--muted)" }}>
                  {s.rank}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: hex.glow, boxShadow: `0 0 10px ${hex.glow}`, flex: "none" }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>{TEAMS[s.team].name}</span>
                    {isMine ? (
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 999, background: "var(--accent)", color: "var(--accent-ink)" }}>
                        YOU
                      </span>
                    ) : null}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.districtName}
                  </span>
                  <span className={styles.bar} style={{ display: "block", marginTop: 8 }}>
                    <span className={styles.barFill} style={{ display: "block", width: `${pct}%`, background: hex.glow }} />
                  </span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span className="num" style={{ display: "block", fontSize: 20, fontWeight: 800 }}>
                    {fmtFull(s.points)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    <TeamIcon size={14} /> {s.riders}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
