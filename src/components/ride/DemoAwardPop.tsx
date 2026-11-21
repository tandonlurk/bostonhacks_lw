"use client";

// Brief "+5 pts" pop when a demo hop (arrow keys) earns points.
import { useEffect, useState } from "react";
import { TEAMS } from "@/contracts/routes";
import { useDemoAward } from "./demoLocation";

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
      style={{
        position: "absolute", left: "50%", top: "30%", transform: "translateX(-50%)", zIndex: 30,
        padding: "8px 16px", borderRadius: 999, background: "rgba(10,14,18,0.85)",
        border: `1px solid ${TEAMS[award.teamRouteId]?.color ?? "#fff"}`, color: "var(--accent)",
        fontWeight: 800, fontSize: 18, pointerEvents: "none", whiteSpace: "nowrap",
      }}
    >
      +{award.points} pts <span style={{ color: "#fff", fontWeight: 500, fontSize: 13 }}>· {award.stationName}</span>
    </div>
  );
}
