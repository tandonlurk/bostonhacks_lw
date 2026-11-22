"use client";

import type { CSSProperties } from "react";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { TeamIcon, TrophyIcon } from "@/components/icons";
import { PaperBadge, PaperButton, PaperCard } from "@/components/paper/Paper";
import { Sheet } from "@/components/ui/Sheet";
import { DOCK_BOTTOM, TeamSwatch, TierPips, fmtCompact, fmtFull } from "./CityOverlay";
import { ExpandIcon } from "./icons";
import { TIER_NAMES, type TeamStat } from "./model";
import { TEAM_HEX } from "./palette";
import styles from "./city3d.module.css";

interface DockProps {
  ranked: TeamStat[];
  selected: TeamRouteId | null;
  mine: TeamRouteId | null;
  onSelect: (team: TeamRouteId) => void;
  onExpand: () => void;
}

/** Collapsed leaderboard: a strip of card stock with ranks 1-5 as team tags, floating above the nav. */
export function LeaderboardDock({ ranked, selected, mine, onSelect, onExpand }: DockProps) {
  return (
    <PaperCard as="nav" data-ui aria-label="Team leaderboard" className={styles.dock} style={{ position: "absolute", bottom: DOCK_BOTTOM, boxShadow: "var(--shadow-float)" }}>
      <PaperButton variant="primary" className={styles.dockOpen} style={{ padding: 0, gap: 0 }} onClick={onExpand} aria-label="Open full leaderboard">
        <TrophyIcon size={22} weight={2.3} />
        <ExpandIcon size={14} weight={2.6} style={{ marginTop: -2 }} />
      </PaperButton>
      {ranked.map((s) => (
        <button
          key={s.team}
          type="button"
          className={styles.pill}
          aria-pressed={selected === s.team}
          aria-label={`Rank ${s.rank}: ${TEAMS[s.team].name}, ${fmtFull(s.points)} points${mine === s.team ? ", your team" : ""}`}
          onClick={() => onSelect(s.team)}
        >
          {mine === s.team ? (
            <span className={styles.mineMark} aria-hidden="true">
              YOU
            </span>
          ) : null}
          <span className={styles.rankNo}>No.{s.rank}</span>
          <TeamSwatch team={s.team} />
          <span className="num" style={{ fontSize: 14, fontWeight: 800, color: s.rank === 1 && s.points > 0 ? "var(--accent)" : "var(--ink)" }}>
            {fmtCompact(s.points)}
          </span>
        </button>
      ))}
    </PaperCard>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  ranked: TeamStat[];
  tiers: Record<TeamRouteId, number>;
  mine: TeamRouteId | null;
  onSelect: (team: TeamRouteId) => void;
}

/** Expanded leaderboard: rank seals, team tags, tiers, riders and progress relative to the leader. */
export function LeaderboardSheet({ open, onClose, ranked, tiers, mine, onSelect }: SheetProps) {
  const top = Math.max(1, ranked[0]?.points ?? 1);
  const quiet = (ranked[0]?.points ?? 0) === 0;
  return (
    <Sheet open={open} onClose={onClose} title="Leaderboard">
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -6, marginBottom: 14 }}>
        {quiet ? "No points on the board yet. Ride any line to fold the first floors of its skyline." : "Every point a line earns folds its skyline taller. Tap a team to fly to its district."}
      </p>
      <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {ranked.map((s) => {
          const hex = TEAM_HEX[s.team];
          const isMine = mine === s.team;
          const pct = Math.round((s.points / top) * 100);
          const gold = s.rank === 1 && !quiet;
          return (
            <li key={s.team}>
              <button
                type="button"
                onClick={() => onSelect(s.team)}
                aria-label={`Rank ${s.rank}: ${TEAMS[s.team].name}, ${fmtFull(s.points)} points, ${s.riders} riders, tier ${tiers[s.team]}. Show on map.`}
                className={`paper ${styles.row} ${isMine ? styles.rowMine : ""}`}
              >
                <span aria-hidden="true" className={`${styles.seal} ${gold ? styles.sealGold : ""}`}>
                  {s.rank}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <TeamSwatch team={s.team} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 750, fontSize: 16, color: hex.ink }}>{TEAMS[s.team].name}</span>
                    {isMine ? (
                      <PaperBadge bg="var(--accent)" ink="var(--accent-ink)">
                        You
                      </PaperBadge>
                    ) : null}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.districtName}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                    <TierPips tier={tiers[s.team]} />
                    <span aria-hidden="true">
                      Tier {tiers[s.team]} · {TIER_NAMES[tiers[s.team]]}
                    </span>
                  </span>
                  <span className={styles.bar} style={{ display: "block", marginTop: 7 }}>
                    <span className={styles.barFill} style={{ display: "block", width: `${pct}%`, backgroundColor: hex.base } as CSSProperties} />
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
