"use client";

import { useState } from "react";
import { TEAM_ROUTE_IDS, TEAMS, type TeamRouteId } from "@/contracts/routes";
import { ChevronIcon } from "@/components/icons";
import { SparkleIcon } from "./rideIcons";
import { fill, glow, TEAM_ON, TEAM_SHORT } from "./util";
import styles from "./ride.module.css";

interface JoinCardProps {
  onJoin: (name: string, team: TeamRouteId) => void;
  loading: boolean;
  error: string | null;
}

/** First-run onboarding floating over the map: name + home line, then straight to the Start button. */
export function JoinCard({ onJoin, loading, error }: JoinCardProps) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<TeamRouteId>("Green");
  const trimmed = name.trim();

  return (
    <form
      className={`glass ${styles.rise}`}
      aria-labelledby="join-title"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && !loading) onJoin(trimmed, team);
      }}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: "calc(var(--nav-clearance) + 14px)",
        maxWidth: 520,
        margin: "0 auto",
        maxHeight: "calc(100dvh - var(--nav-clearance) - 40px - var(--banner-space) - env(safe-area-inset-top, 0px))",
        overflowY: "auto",
        zIndex: 6,
        borderRadius: 30,
        padding: "18px 16px 16px",
        boxShadow: "var(--shadow-float)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px 4px 7px",
          borderRadius: "var(--radius-pill)",
          background: "rgba(63,122,0,0.12)",
          color: "var(--accent)",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.1em",
        }}
      >
        <SparkleIcon size={16} weight={2.2} />
        T-CITY
      </span>
      <h1 id="join-title" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.02, marginTop: 10 }}>
        Your commute
        <br />
        builds the city.
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, lineHeight: 1.4 }}>
        Ride the T, earn points for your line, grow its district. Delays turn into hunts.
      </p>

      <label style={{ display: "block", marginTop: 16 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>What should we call you?</span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="nickname"
          maxLength={40}
          required
        />
      </label>

      <fieldset style={{ border: "none", marginTop: 16 }}>
        <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, padding: 0 }}>Pick your home line</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
          {TEAM_ROUTE_IDS.map((t) => (
            <button
              key={t}
              type="button"
              className={styles.lineTile}
              aria-pressed={team === t}
              aria-label={TEAMS[t].name}
              onClick={() => setTeam(t)}
              style={{
                background: `linear-gradient(160deg, ${glow(t)} 0%, ${fill(t)} 70%)`,
                color: TEAM_ON[t],
                boxShadow: team === t ? `0 10px 24px color-mix(in srgb, ${fill(t)} 55%, transparent)` : "none",
              }}
            >
              <span className="num" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                {TEAM_SHORT[t]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t}</span>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
          Building <strong style={{ color: glow(team) }}>{TEAMS[team].districtName}</strong>
        </p>
      </fieldset>

      {error ? (
        <p role="alert" style={{ fontSize: 13, color: "var(--hot)", marginTop: 10 }}>
          Couldn&apos;t join just now ({error}). Try again in a moment.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!trimmed || loading}
        className={styles.press}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          minHeight: 54,
          marginTop: 14,
          borderRadius: "var(--radius-pill)",
          border: "none",
          background: trimmed ? "var(--accent)" : "var(--surface-3)",
          color: trimmed ? "var(--accent-ink)" : "var(--muted)",
          fontWeight: 800,
          fontSize: 16,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Joining…" : `Join the ${TEAMS[team].name}`}
        {loading ? null : <ChevronIcon size={18} weight={2.6} />}
      </button>
    </form>
  );
}
