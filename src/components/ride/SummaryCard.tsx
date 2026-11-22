"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CityIcon } from "@/components/icons";
import { Stamp } from "@/components/paper/Paper";
import { PaperT } from "@/components/paper/origami";
import { formatClock, formatPoints, glow, useCountUp } from "./util";
import styles from "./ride.module.css";

interface SummaryCardProps {
  team: TeamRouteId | null;
  stopsCredited: number;
  pointsAwarded: number;
  durationMs?: number;
  onDismiss: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.receiptRow}>
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span className={styles.receiptLeader} aria-hidden="true" />
      <span className="num" style={{ fontWeight: 800, fontSize: 16 }}>
        {children}
      </span>
    </div>
  );
}

/** Ride complete: a torn paper receipt with a rubber stamp for the points. */
export function SummaryCard({ team, stopsCredited, pointsAwarded, durationMs, onDismiss }: SummaryCardProps) {
  const shown = useCountUp(pointsAwarded, 1100);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus({ preventScroll: true });
  }, []);
  const color = team ? glow(team) : "var(--ink)";
  const lineName = team ? TEAMS[team].name : "your line";

  return (
    <section aria-labelledby="ride-done-title" className={`${styles.bottomPanel} ${styles.receiptWrap}`} style={{ zIndex: 6 }}>
      <div className={styles.receipt}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <p id="ride-done-title" className="paper-eyebrow">
              Ride receipt
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>
              Ride complete
            </p>
          </div>
          <PaperT height={34} />
        </div>

        <div className={styles.perforation} aria-hidden="true" />

        <Row label="Ride time">{durationMs != null ? formatClock(durationMs) : "—"}</Row>
        <Row label={stopsCredited === 1 ? "Stop ridden" : "Stops ridden"}>{stopsCredited}</Row>
        <Row label="Line">
          <span style={{ color, fontFamily: "var(--font-body)", fontSize: 14 }}>{lineName}</span>
        </Row>

        <div className={styles.perforation} aria-hidden="true" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <p className="paper-eyebrow">Points earned</p>
            <p className="num" aria-label={`${pointsAwarded} points`} style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: "var(--accent)", letterSpacing: "-0.04em" }}>
              +{formatPoints(shown)}
            </p>
            <p style={{ fontSize: 13, fontWeight: 650, marginTop: 2 }}>
              for the <span style={{ color }}>{lineName}</span>
            </p>
          </div>
          <Stamp color="var(--accent)" rotate={-6} className={styles.stampIn} style={{ fontSize: 13, padding: "6px 10px", borderWidth: 3, flexShrink: 0 }}>
            Ride
            <br />
            verified
          </Stamp>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <Link href="/city" className="paper-btn" style={{ minHeight: 50 }}>
            <CityIcon size={20} weight={2.2} />
            See the city
          </Link>
          <button ref={btnRef} type="button" className="paper-btn paper-btn--primary" onClick={onDismiss} style={{ minHeight: 50, fontSize: 16 }}>
            Nice!
          </button>
        </div>
      </div>
    </section>
  );
}
