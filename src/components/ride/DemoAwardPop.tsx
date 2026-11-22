"use client";

// Brief "+5 pts" pop when a demo hop (arrow keys) earns points.
import { useEffect, useState } from "react";
import { TEAMS } from "@/contracts/routes";
import { Stamp } from "@/components/paper/Paper";
import { useDemoAward } from "./demoLocation";
import styles from "./ride.module.css";

export function DemoAwardPop() {
  const award = useDemoAward();
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  useEffect(() => {
    if (!award) return;
    const t = setTimeout(() => setHiddenId(award.id), 1600);
    return () => clearTimeout(t);
  }, [award]);
  if (!award || hiddenId === award.id) return null;
  return (
    <div
      key={award.id}
      role="status"
      className={`paper ${styles.awardPop}`}
      style={{
        position: "absolute", left: "50%", top: "34%", zIndex: 30,
        display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 8px",
        borderLeft: `6px solid ${TEAMS[award.teamRouteId]?.color ?? "#7c878e"}`,
        boxShadow: "var(--shadow-float)", pointerEvents: "none", whiteSpace: "nowrap",
      }}
    >
      <Stamp color="var(--accent)" rotate={-6} style={{ fontSize: 15, padding: "3px 8px" }}>
        +{award.points} pts
      </Stamp>
      <span style={{ color: "var(--ink)", fontWeight: 650, fontSize: 13.5 }}>{award.stationName}</span>
    </div>
  );
}
