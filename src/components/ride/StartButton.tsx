"use client";

import { useEffect, useState } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { RideIcon } from "@/components/icons";
import { fill, glow, TEAM_ON } from "./util";
import styles from "./ride.module.css";

/** Snapchat-shutter style start button: lime ring, line-colored core, springy press + burst. */
export function StartButton({ team, onStart, disabled }: { team: TeamRouteId | null; onStart: () => void; disabled?: boolean }) {
  const [firing, setFiring] = useState(false);
  useEffect(() => {
    if (!firing) return;
    const id = setTimeout(() => setFiring(false), 620);
    return () => clearTimeout(id);
  }, [firing]);

  const core = team ? fill(team) : "var(--surface-3)";
  const hi = team ? glow(team) : "var(--muted)";

  return (
    <button
      type="button"
      className={styles.shutter}
      data-firing={firing}
      disabled={disabled}
      aria-label="Start ride"
      onClick={() => {
        setFiring(true);
        onStart();
      }}
    >
      <span className={styles.shutterHalo} aria-hidden="true" />
      <span className={styles.shutterRing} aria-hidden="true" />
      <span
        className={styles.shutterCore}
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${hi} 70%, white) 0%, ${hi} 34%, ${core} 78%)`,
          color: team ? TEAM_ON[team] : "var(--ink)",
        }}
      >
        <span style={{ display: "grid", justifyItems: "center", gap: 1, lineHeight: 1 }}>
          <RideIcon size={30} weight={2.4} />
          <span style={{ fontSize: 16, letterSpacing: "0.04em" }}>START</span>
        </span>
      </span>
    </button>
  );
}
