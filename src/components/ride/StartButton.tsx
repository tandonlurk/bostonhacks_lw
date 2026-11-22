"use client";

import { useEffect, useState } from "react";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { RideIcon } from "@/components/icons";
import { faces } from "@/components/paper/origami";
import styles from "./ride.module.css";

const ACCENT = "#2f6b45";

/** Eight-point origami rosette: each point is two facets (lit + shaded) meeting on a crease. */
function Rosette({ color }: { color: string }) {
  const f = faces(color);
  const C = 60;
  const R = 59;
  const r = 40;
  const pt = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(C + rad * Math.cos(a)).toFixed(2)},${(C + rad * Math.sin(a)).toFixed(2)}`;
  };
  const facets: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a0 = i * 45;
    const tip = a0 + 22.5;
    facets.push(
      <polygon key={`l${i}`} points={`${C},${C} ${pt(a0, r)} ${pt(tip, R)}`} fill={i % 2 ? f.mid : f.lit} />,
      <polygon key={`d${i}`} points={`${C},${C} ${pt(tip, R)} ${pt(a0 + 45, r)}`} fill={i % 2 ? f.crease : f.dark} />,
    );
  }
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <g stroke="rgba(42,30,18,0.28)" strokeWidth={0.6} strokeLinejoin="round">
        {facets}
      </g>
      <circle cx={C} cy={C} r={r - 2} fill={f.dark} opacity={0.35} />
    </svg>
  );
}

/** Start control: a folded paper medallion in the rider's line color with a cream "START" disc. */
export function StartButton({ team, onStart, disabled }: { team: TeamRouteId | null; onStart: () => void; disabled?: boolean }) {
  const [firing, setFiring] = useState(false);
  useEffect(() => {
    if (!firing) return;
    const id = setTimeout(() => setFiring(false), 640);
    return () => clearTimeout(id);
  }, [firing]);

  return (
    <button
      type="button"
      className={styles.medallion}
      data-firing={firing}
      disabled={disabled}
      aria-label="Start ride"
      onClick={() => {
        setFiring(true);
        onStart();
      }}
    >
      <span className={styles.medallionHalo} aria-hidden="true" />
      <span className={styles.medallionFacets} aria-hidden="true">
        <Rosette color={team ? TEAMS[team].color : ACCENT} />
      </span>
      <span className={styles.medallionCore} aria-hidden="true">
        <RideIcon size={26} weight={2.3} />
        <span>START</span>
      </span>
    </button>
  );
}
