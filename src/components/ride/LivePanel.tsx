"use client";

import type { CrewBonus, LeaderboardTeam, RideState, SideQuest } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { LineChip } from "@/components/LineChip";
import { SideQuestCard } from "@/components/SideQuestCard";
import { ClockIcon, TeamIcon, TrophyIcon } from "@/components/icons";
import { PaperCard, Stamp } from "@/components/paper/Paper";
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

/** A small card of stock with a big number on it. */
function Stat({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={styles.statCard} data-accent={accent ? "true" : undefined}>
      <div
        className="num"
        style={{
          fontSize: 23,
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
      <div style={{ fontSize: 11.5, fontWeight: 650, color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
      className={`${styles.pop} ${styles.chip}`}
      title={crew.message}
      style={{ display: "flex", marginTop: 10, minHeight: 40, padding: "0 10px 0 6px", background: "#f8e4e7", fontSize: 13 }}
    >
      <Stamp color="var(--hot)" rotate={-3} style={{ fontSize: 12, padding: "1px 6px", flexShrink: 0 }}>
        <TeamIcon size={14} weight={2.4} />x{crew.multiplier.toFixed(1).replace(/\.0$/, "")}
      </Stamp>
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
    <PaperCard
      as="section"
      stack
      aria-label="Live ride"
      className={`${styles.bottomPanel} ${styles.livePanel}`}
      style={{
        position: "absolute",
        maxHeight: p.sideQuest ? "calc(100svh - var(--nav-clearance) - 200px)" : undefined,
        overflowY: p.sideQuest ? "auto" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "var(--hot)" }}>
          <span className={styles.liveDot} aria-hidden="true" />
          LIVE RIDE
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <StateBadge active state={p.state} />
          {p.team ? <LineChip teamRouteId={p.team} size="sm" label="short" /> : null}
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        <div className="num" role="timer" aria-label={`Ride time ${formatClock(elapsed)}`} style={{ fontSize: 50, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em" }}>
          {formatClock(elapsed)}
        </div>
        <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--muted)", marginTop: 4 }}>
          <ClockIcon size={15} weight={2.2} />
          ride time · {onTrain ? `${onTrain} · ${stops}` : stops}
        </p>
      </div>

      {p.message ? (
        <p aria-live="polite" style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.35 }}>
          {p.message}
        </p>
      ) : null}

      {p.crew && p.crew.teammates.length > 0 ? <CrewChip crew={p.crew} /> : null}

      {p.sideQuest ? (
        <div style={{ marginTop: 10 }}>
          <SideQuestCard quest={p.sideQuest} homeTeam={p.homeTeam} compact />
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr 0.8fr", gap: 8, marginTop: 10 }}>
        <Stat label="pts this ride" accent>
          {p.pointsAwarded != null ? `+${formatPoints(ridePoints)}` : "+0"}
        </Stat>
        <Stat label={p.homeTeam ? `${TEAMS[p.homeTeam].name} pts` : "team points"}>{p.teamStats ? formatPoints(teamPoints) : "—"}</Stat>
        <Stat label="team rank">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <TrophyIcon size={17} weight={2.3} style={{ color: "var(--gold-ink)" }} />
            {p.teamStats ? `#${p.teamStats.rank}` : "—"}
          </span>
        </Stat>
      </div>

      <div style={{ marginTop: 10 }}>
        <HoldToEnd onEnd={p.onEnd} busy={p.ending} />
      </div>
    </PaperCard>
  );
}
