"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CityIcon } from "@/components/icons";
import { formatClock, formatPoints, glow, useCountUp } from "./util";
import styles from "./ride.module.css";

interface SummaryCardProps {
  team: TeamRouteId | null;
  stopsCredited: number;
  pointsAwarded: number;
  durationMs?: number;
  onDismiss: () => void;
}

/** Hand-drawn burst of marker strokes behind the points number. */
function Burst({ color }: { color: string }) {
  // Rays fan out from the left and right of the number (viewBox 300x110, number sits in the middle).
  const rays = [
    "M62 22c-7-5.4-12.6-9.6-19-13.2",
    "M48 56c-9.6-.4-17.4-.2-25.4.8",
    "M60 90c-6.8 4.2-12.8 8.6-18.6 13.4",
    "M238 22c7-5.4 12.6-9.6 19-13.2",
    "M252 56c9.6-.4 17.4-.2 25.4.8",
    "M240 90c6.8 4.2 12.8 8.6 18.6 13.4",
  ];
  return (
    <svg
      width="300"
      height="110"
      viewBox="0 0 300 110"
      aria-hidden="true"
      style={{ position: "absolute", left: "50%", top: 44, marginLeft: -150, pointerEvents: "none" }}
    >
      {rays.map((d, i) => (
        <path
          key={d}
          d={d}
          className={styles.spark}
          style={{ animationDelay: `${120 + i * 40}ms` }}
          stroke={i % 2 ? color : "var(--accent)"}
          strokeWidth={3.2}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </svg>
  );
}

export function SummaryCard({ team, stopsCredited, pointsAwarded, durationMs, onDismiss }: SummaryCardProps) {
  const shown = useCountUp(pointsAwarded, 1100);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus({ preventScroll: true });
  }, []);
  const color = team ? glow(team) : "var(--ink)";

  return (
    <section
      aria-labelledby="ride-done-title"
      className={`glass ${styles.pop}`}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: "calc(var(--nav-clearance) + 14px)",
        maxWidth: 520,
        margin: "0 auto",
        zIndex: 6,
        borderRadius: 30,
        padding: "20px 16px 16px",
        textAlign: "center",
        boxShadow: `var(--shadow-float), 0 0 60px color-mix(in srgb, ${color} 18%, transparent)`,
      }}
    >
      <Burst color={color} />
      <p id="ride-done-title" style={{ position: "relative", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "var(--muted)" }}>
        RIDE COMPLETE
      </p>
      <p
        className="num"
        aria-label={`${pointsAwarded} points`}
        style={{ position: "relative", fontSize: 84, fontWeight: 800, lineHeight: 1, color: "var(--accent)", marginTop: 14, letterSpacing: "-0.05em" }}
      >
        +{formatPoints(shown)}
      </p>
      <p style={{ position: "relative", fontSize: 15, fontWeight: 700, marginTop: 4 }}>
        points for the <span style={{ color }}>{team ? TEAMS[team].name : "your line"}</span>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        <div style={{ padding: "10px 8px", borderRadius: 16, background: "rgba(18,22,29,0.045)", border: "1px solid var(--glass-border)" }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>
            {durationMs != null ? formatClock(durationMs) : "—"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>ride time</div>
        </div>
        <div style={{ padding: "10px 8px", borderRadius: 16, background: "rgba(18,22,29,0.045)", border: "1px solid var(--glass-border)" }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>
            {stopsCredited}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{stopsCredited === 1 ? "stop" : "stops"} ridden</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <Link
          href="/city"
          className={styles.press}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 52,
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--glass-border)",
            background: "rgba(18,22,29,0.06)",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <CityIcon size={20} weight={2.2} />
          See the city
        </Link>
        <button
          ref={btnRef}
          type="button"
          onClick={onDismiss}
          className={styles.press}
          style={{
            minHeight: 52,
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          Nice!
        </button>
      </div>
    </section>
  );
}
