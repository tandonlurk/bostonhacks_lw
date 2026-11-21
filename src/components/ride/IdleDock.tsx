"use client";

import type { ReactNode } from "react";

import type { LeaderboardTeam } from "@/contracts";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CheckIcon, PinIcon, TrophyIcon } from "@/components/icons";
import { StartButton } from "./StartButton";
import { formatDistance } from "./geo";
import type { NearbyState } from "./useNearbyStation";
import { formatPoints, glow } from "./util";
import styles from "./ride.module.css";

interface IdleDockProps {
  team: TeamRouteId | null;
  teamStats: LeaderboardTeam | null;
  nearby: NearbyState;
  onStart: () => void;
  onPickStop: () => void;
}

function GateLine({ nearby }: { nearby: NearbyState }) {
  const s = nearby.station;
  const at = s && s.distanceM <= nearby.radiusM;
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    maxWidth: "calc(100vw - 48px)",
    padding: "6px 12px",
    borderRadius: "var(--radius-pill)",
    fontSize: 13.5,
    fontWeight: 700,
    background: "rgba(7,9,13,0.72)",
    border: "1px solid var(--glass-border)",
  };
  const text = (t: string) => <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>;

  if (!nearby.canStart) {
    return (
      <p role="status" style={{ ...base, color: "var(--ink)" }}>
        <PinIcon size={16} weight={2.2} style={{ color: "var(--hot)", flexShrink: 0 }} />
        {text(s ? `Walk to a station · ${formatDistance(s.distanceM)} to ${s.name}` : "Walk to a station to start")}
      </p>
    );
  }
  if (s && at) {
    return (
      <p role="status" style={{ ...base, color: "var(--glow-green)" }}>
        <CheckIcon size={16} weight={2.6} style={{ flexShrink: 0 }} />
        {text(`At ${s.name}`)}
      </p>
    );
  }
  return (
    <p role="status" style={{ ...base, color: "var(--muted)" }}>
      <PinIcon size={16} weight={2.2} style={{ flexShrink: 0 }} />
      {text(s ? `${s.name} · ${formatDistance(s.distanceM)}` : "Tap to start at your station")}
    </p>
  );
}

/** Idle state: team standing, the big shutter Start button, start-gate status, manual fallback. */
export function IdleDock({ team, teamStats, nearby, onStart, onPickStop, children }: IdleDockProps & { children?: ReactNode }) {
  return (
    <div
      className={styles.rise}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "calc(var(--nav-clearance) + 16px)",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "0 16px",
      }}
    >
      {team ? (
        <p
          className="glass"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 14px 7px 8px",
            borderRadius: "var(--radius-pill)",
            fontSize: 13.5,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(255,255,255,0.07)",
              color: glow(team),
            }}
          >
            <TrophyIcon size={15} weight={2.4} />
            {teamStats ? `#${teamStats.rank}` : "—"}
          </span>
          <span>{TEAMS[team].name}</span>
          <span className="num" style={{ color: "var(--accent)" }}>
            {teamStats ? `${formatPoints(teamStats.points)} pts` : "warming up"}
          </span>
        </p>
      ) : null}

      <StartButton team={team} onStart={onStart} disabled={!nearby.canStart} />
      <GateLine nearby={nearby} />
      {children}

      <button type="button" className={styles.textBtn} onClick={onPickStop}>
        Can&apos;t get GPS? Pick your stop
      </button>
    </div>
  );
}
