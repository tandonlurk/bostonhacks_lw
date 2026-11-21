"use client";

import type { LeaderboardTeam, RideState } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { LineChip } from "@/components/LineChip";
import { ClockIcon, TrophyIcon } from "@/components/icons";
import { HoldToEnd } from "./HoldToEnd";
import { StateBadge } from "./TopCard";
import { formatClock, formatPoints, useCountUp, useNow } from "./util";
import styles from "./ride.module.css";

interface LivePanelProps {
  team: TeamRouteId | null;
  state: RideState | null;
  startedAt: number | null;
  stopsCredited: number;
  message: string | null;
  teamStats: LeaderboardTeam | null;
  /** Team points gained since this ride started (from the live leaderboard). */
  teamGain: number;
  onEnd: () => void;
  ending: boolean;
}

function Stat({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 10px 9px",
        borderRadius: 16,
        background: accent ? "rgba(228,255,58,0.08)" : "rgba(255,255,255,0.045)",
        border: `1px solid ${accent ? "rgba(228,255,58,0.22)" : "var(--glass-border)"}`,
        minWidth: 0,
      }}
    >
      <div className="num" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.05, color: accent ? "var(--accent)" : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {children}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

export function LivePanel(p: LivePanelProps) {
  const now = useNow(true, 1000);
  const elapsed = p.startedAt ? now - p.startedAt : 0;
  const teamPoints = useCountUp(p.teamStats?.points ?? 0);

  return (
    <section
      aria-label="Live ride"
      className={`glass ${styles.rise}`}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: "calc(var(--nav-clearance) + 14px)",
        maxWidth: 520,
        margin: "0 auto",
        zIndex: 5,
        borderRadius: 28,
        padding: 14,
        boxShadow: "var(--shadow-float)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "var(--hot)" }}>
          <span className={styles.liveDot} aria-hidden="true" />
          LIVE
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <StateBadge active state={p.state} />
          {p.team ? <LineChip teamRouteId={p.team} size="sm" label="short" /> : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
        <div>
          <div
            className="num"
            role="timer"
            aria-label={`Ride time ${formatClock(elapsed)}`}
            style={{ fontSize: 64, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}
          >
            {formatClock(elapsed)}
          </div>
          <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginTop: 4 }}>
            <ClockIcon size={15} weight={2.2} />
            ride time
          </p>
        </div>
      </div>

      {p.message ? (
        <p aria-live="polite" style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.35 }}>
          {p.message}
        </p>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.4fr 0.8fr", gap: 8, marginTop: 12 }}>
        <Stat label="stops credited">
          <span key={p.stopsCredited} className={styles.tick} style={{ display: "inline-block" }}>
            {p.stopsCredited}
          </span>
        </Stat>
        <Stat label={p.teamGain > 0 ? `team pts · +${formatPoints(p.teamGain)} this ride` : "team points"} accent>
          {p.teamStats ? formatPoints(teamPoints) : "—"}
        </Stat>
        <Stat label="team rank">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <TrophyIcon size={18} weight={2.3} style={{ color: "var(--muted)" }} />
            {p.teamStats ? `#${p.teamStats.rank}` : "—"}
          </span>
        </Stat>
      </div>

      <div style={{ marginTop: 12 }}>
        <HoldToEnd onEnd={p.onEnd} busy={p.ending} />
      </div>
    </section>
  );
}
