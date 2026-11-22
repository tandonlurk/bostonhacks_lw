"use client";

import type { CrewBonus, LeaderboardTeam, RideState, SideQuest } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { LineChip } from "@/components/LineChip";
import { SideQuestCard } from "@/components/SideQuestCard";
import { ClockIcon, TeamIcon, TrophyIcon } from "@/components/icons";
import { HoldToEnd } from "./HoldToEnd";
import { StateBadge } from "./TopCard";
import { formatClock, formatPoints, useCountUp, useNow } from "./util";
import styles from "./ride.module.css";

interface LivePanelProps {
  team: TeamRouteId | null;
  homeTeam?: TeamRouteId | null;
  state: RideState | null;
  startedAt: number | null;
  stopsCredited: number;
  minutesRidden: number | null;
  pointsAwarded: number | null;
  crew: CrewBonus | null;
  sideQuest?: SideQuest | null;
  message: string | null;
  teamStats: LeaderboardTeam | null;
  onEnd: () => void;
  ending: boolean;
}

function Stat({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 10px 9px",
        borderRadius: 16,
        background: accent ? "rgba(63,122,0,0.08)" : "rgba(18,22,29,0.045)",
        border: `1px solid ${accent ? "rgba(63,122,0,0.22)" : "var(--glass-border)"}`,
        minWidth: 0,
      }}
    >
      <div
        className="num"
        style={{
          fontSize: 25,
          fontWeight: 800,
          lineHeight: 1.05,
          color: accent ? "var(--accent)" : "var(--ink)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </div>
    </div>
  );
}

function CrewChip({ crew }: { crew: CrewBonus }) {
  const names = crew.teammates.map((t) => t.displayName);
  const who = names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  return (
    <div
      className={styles.pop}
      title={crew.message}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        padding: "7px 10px 7px 7px",
        borderRadius: "var(--radius-pill)",
        background: "rgba(255,61,127,0.12)",
        border: "1px solid rgba(255,61,127,0.35)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <span
        className="num"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          padding: "2px 8px",
          borderRadius: "var(--radius-pill)",
          background: "var(--hot)",
          color: "#fff",
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        <TeamIcon size={15} weight={2.4} />x{crew.multiplier.toFixed(1).replace(/\.0$/, "")}
      </span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Crew with {who}</span>
      {crew.bonusPoints > 0 ? (
        <span className="num" style={{ marginLeft: "auto", color: "var(--accent)", flexShrink: 0 }}>
          +{formatPoints(crew.bonusPoints)}
        </span>
      ) : null}
    </div>
  );
}

export function LivePanel(p: LivePanelProps) {
  const now = useNow(true, 1000);
  const elapsed = p.startedAt ? now - p.startedAt : 0;
  const teamPoints = useCountUp(p.teamStats?.points ?? 0);
  const ridePoints = useCountUp(p.pointsAwarded ?? 0, 600);
  const onTrain = p.minutesRidden != null ? `${p.minutesRidden} min on train` : null;
  const stops = `${p.stopsCredited} ${p.stopsCredited === 1 ? "stop" : "stops"}`;

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
        maxHeight: p.sideQuest ? "calc(100svh - var(--nav-clearance) - 160px)" : undefined,
        overflowY: p.sideQuest ? "auto" : undefined,
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

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
        <div style={{ minWidth: 0 }}>
          <div
            className="num"
            role="timer"
            aria-label={`Ride time ${formatClock(elapsed)}`}
            style={{ fontSize: 64, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}
          >
            {formatClock(elapsed)}
          </div>
          <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginTop: 5 }}>
            <ClockIcon size={15} weight={2.2} />
            ride time · {onTrain ? `${onTrain} · ${stops}` : stops}
          </p>
        </div>
      </div>

      {p.message ? (
        <p aria-live="polite" style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.35 }}>
          {p.message}
        </p>
      ) : null}

      {p.crew && p.crew.teammates.length > 0 ? <CrewChip crew={p.crew} /> : null}

      {p.sideQuest ? <div style={{ marginTop: 12 }}><SideQuestCard quest={p.sideQuest} homeTeam={p.homeTeam} compact /></div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr 0.75fr", gap: 8, marginTop: 12 }}>
        <Stat label="pts this ride" accent>
          {p.pointsAwarded != null ? `+${formatPoints(ridePoints)}` : "+0"}
        </Stat>
        <Stat label={p.homeTeam ? `${TEAMS[p.homeTeam].name} pts` : "team points"}>
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
