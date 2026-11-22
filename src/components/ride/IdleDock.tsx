"use client";

import type { ReactNode } from "react";

import type { TeamRouteId } from "@/contracts/routes";
import { CheckIcon, PinIcon } from "@/components/icons";
import { StartButton } from "./StartButton";
import { formatDistance } from "./geo";
import type { NearbyState } from "./useNearbyStation";
import { WalkIcon } from "./rideIcons";
import styles from "./ride.module.css";

interface IdleDockProps {
  team: TeamRouteId | null;
  nearby: NearbyState;
  onStart: () => void;
  onPickStop: () => void;
}

const ellipsis: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** Start-gate status as a paper chip: icon + words. */
function GateLine({ nearby }: { nearby: NearbyState }) {
  const s = nearby.station;
  const at = s && s.distanceM <= nearby.radiusM;
  const style: React.CSSProperties = { maxWidth: "100%", minHeight: 34, fontSize: 13.5, boxShadow: "var(--shadow-card)" };

  if (!nearby.canStart) {
    return (
      <p role="status" className={styles.chip} data-tone="bad" style={style}>
        <WalkIcon size={17} weight={2.2} style={{ flexShrink: 0 }} />
        <span style={ellipsis}>{s ? `Walk to a station · ${formatDistance(s.distanceM)} to ${s.name}` : "Walk to a station to start"}</span>
      </p>
    );
  }
  if (s && at) {
    return (
      <p role="status" className={styles.chip} data-tone="good" style={style}>
        <CheckIcon size={16} weight={2.6} style={{ flexShrink: 0 }} />
        <span style={ellipsis}>{`At ${s.name} · ready to ride`}</span>
      </p>
    );
  }
  return (
    <p role="status" className={styles.chip} style={style}>
      <PinIcon size={16} weight={2.2} style={{ flexShrink: 0 }} />
      <span style={ellipsis}>{s ? `${s.name} · ${formatDistance(s.distanceM)}` : "Tap to start at your station"}</span>
    </p>
  );
}

/** Idle state: the folded Start medallion, start-gate status, next train, manual fallback. */
export function IdleDock({ team, nearby, onStart, onPickStop, children }: IdleDockProps & { children?: ReactNode }) {
  return (
    <div
      className={styles.rise}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "calc(var(--nav-clearance) + 6px)",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        // Side gutters keep the dock clear of the bottom-left demo trigger.
        padding: "0 60px",
      }}
    >
      <StartButton team={team} onStart={onStart} disabled={!nearby.canStart} />
      <GateLine nearby={nearby} />
      {children}
      <button type="button" className={styles.textBtn} onClick={onPickStop}>
        Can&apos;t get GPS? Pick your stop
      </button>
    </div>
  );
}
