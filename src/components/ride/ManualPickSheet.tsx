"use client";

import { useMemo, useState } from "react";
import type { ManualRideHint } from "@/contracts";
import { TEAM_ROUTE_IDS, TEAMS, type TeamRouteId } from "@/contracts/routes";
import { Sheet } from "@/components/ui/Sheet";
import { CheckIcon } from "@/components/icons";
import { stationsFor } from "@/components/map/projection";
import { distanceM, formatDistance, type LatLng } from "./geo";
import { DIRECTIONS, routeIdFor } from "./manualRoutes";
import { fill, glow, TEAM_ON } from "./util";
import styles from "./ride.module.css";

interface ManualPickSheetProps {
  open: boolean;
  onClose: () => void;
  defaultTeam: TeamRouteId;
  near: LatLng;
  onConfirm: (hint: ManualRideHint, lat: number, lng: number) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  margin: "14px 0 8px",
};

/** "Can't get GPS?" fallback: pick line, station (nearest first) and direction, then check in. */
export function ManualPickSheet(p: ManualPickSheetProps) {
  return (
    <Sheet open={p.open} onClose={p.onClose} title="Pick your stop">
      {/* Remount per open so it always starts from the rider's line and current spot. */}
      {p.open ? <ManualPickForm {...p} /> : null}
    </Sheet>
  );
}

function ManualPickForm({ defaultTeam, near, onConfirm, onClose }: ManualPickSheetProps) {
  const [team, setTeam] = useState<TeamRouteId>(defaultTeam);
  // Freeze the origin while the sheet is open so the list doesn't reshuffle under a finger.
  const [origin] = useState(near);
  const stations = useMemo(
    () =>
      stationsFor(team)
        .filter((s) => s.id.startsWith("place-"))
        .map((s) => ({ ...s, d: distanceM(origin, s) }))
        .sort((a, b) => a.d - b.d),
    [team, origin],
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [direction, setDirection] = useState<0 | 1>(1);
  const station = stations.find((s) => s.id === pickedId) ?? stations[0];

  return (
    <div>
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.4 }}>
        No GPS fix? Tell us where you boarded and we&apos;ll match you to a train near that station.
      </p>

      <p style={labelStyle}>Line</p>
      <div role="radiogroup" aria-label="Line" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {TEAM_ROUTE_IDS.map((t) => {
          const on = t === team;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={TEAMS[t].name}
              className={styles.press}
              onClick={() => {
                setTeam(t);
                setPickedId(null);
              }}
              style={{
                minHeight: 44,
                borderRadius: 14,
                border: on ? "2px solid var(--ink)" : "2px solid transparent",
                background: fill(t),
                color: TEAM_ON[t],
                fontWeight: 800,
                fontSize: 13,
                opacity: on ? 1 : 0.55,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <p style={labelStyle}>Station · nearest first</p>
      <div
        role="radiogroup"
        aria-label="Station"
        style={{
          maxHeight: 232,
          overflowY: "auto",
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}
      >
        {stations.map((s, i) => {
          const on = s.id === station?.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPickedId(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                minHeight: 48,
                padding: "0 14px",
                border: "none",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                background: on ? "rgba(255,255,255,0.06)" : "transparent",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: `3px solid ${glow(team)}`,
                  background: on ? glow(team) : "transparent",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0, fontWeight: on ? 800 : 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.name}
              </span>
              <span className="num" style={{ fontSize: 13, color: "var(--muted)", flexShrink: 0 }}>
                {formatDistance(s.d)}
              </span>
              {on ? <CheckIcon size={18} weight={2.6} style={{ color: "var(--accent)", flexShrink: 0 }} /> : null}
            </button>
          );
        })}
      </div>

      <p style={labelStyle}>Heading toward</p>
      <div role="radiogroup" aria-label="Direction" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {([1, 0] as const).map((d) => {
          const on = d === direction;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              className={styles.press}
              onClick={() => setDirection(d)}
              style={{
                minHeight: 48,
                padding: "6px 10px",
                borderRadius: 14,
                border: on ? `2px solid ${glow(team)}` : "1px solid var(--border)",
                background: on ? "rgba(255,255,255,0.06)" : "var(--surface-2)",
                fontWeight: on ? 800 : 600,
                fontSize: 14,
                lineHeight: 1.25,
              }}
            >
              {DIRECTIONS[team][d]}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!station}
        className={styles.press}
        onClick={() => {
          if (!station) return;
          onConfirm({ routeId: routeIdFor(team, station.id), directionId: direction, stopId: station.id }, station.lat, station.lng);
          onClose();
        }}
        style={{
          width: "100%",
          minHeight: 54,
          marginTop: 18,
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        {station ? `Check in at ${station.name}` : "Pick a station"}
      </button>
    </div>
  );
}
