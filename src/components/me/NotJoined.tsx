import Link from "next/link";
import { TEAM_ROUTE_IDS } from "@/contracts/routes";
import { RideIcon } from "@/components/icons";
import { glowVar } from "./team";
import s from "./me.module.css";

/** Friendly "no profile yet" state: a dashed avatar waiting for you, orbited by the five lines. */
export function NotJoined() {
  return (
    <div
      className={s.rise}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 14,
        padding: "24px var(--space-5) 32px",
        minHeight: "60dvh",
      }}
    >
      <svg width="176" height="176" viewBox="0 0 176 176" aria-hidden="true" style={{ overflow: "visible" }}>
        {TEAM_ROUTE_IDS.map((t, i) => {
          const r = 60 + i * 6;
          return (
            <circle
              key={t}
              cx="88"
              cy="88"
              r={r}
              fill="none"
              stroke={glowVar(t)}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray={`${r * 0.9} ${r * 5.4}`}
              transform={`rotate(${i * 72 - 90} 88 88)`}
              opacity="0.9"
            />
          );
        })}
        <circle cx="88" cy="88" r="46" fill="var(--surface)" stroke="var(--surface-3)" strokeWidth="2" strokeDasharray="5 6" />
        {/* hand-drawn "?" face */}
        <path
          d="M77 79c1-7 6-11 12-10.6 6.3.4 10.4 4.6 10 9.8-.5 6.6-9.4 7-9.8 14"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M89.2 103.6h.3" stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" />
      </svg>

      <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05, maxWidth: 300 }}>Your profile starts on the platform</h1>
      <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.45, maxWidth: 300 }}>
        Pick a home line, take a ride, and this page fills up with your points, streaks, hunts and perks.
      </p>
      <Link
        href="/"
        className={s.press}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginTop: 6,
          minHeight: 56,
          padding: "0 28px",
          borderRadius: "var(--radius-pill)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontWeight: 800,
          fontSize: 17,
          boxShadow: "0 10px 30px rgba(228, 255, 58, 0.25)",
        }}
      >
        <RideIcon size={22} weight={2.3} />
        Join on the Ride tab
      </Link>
    </div>
  );
}
