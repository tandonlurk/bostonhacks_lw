"use client";

import { useState } from "react";
import { TEAM_ROUTE_IDS, TEAMS, type TeamRouteId } from "@/contracts/routes";
import { ChevronIcon } from "@/components/icons";
import { Stamp } from "@/components/paper/Paper";
import { Brownstone, StateHouse, TripleDecker } from "@/components/paper/origami";
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
      className={`paper paper--stack ${styles.rise}`}
      aria-labelledby="join-title"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && !loading) onJoin(trimmed, team);
      }}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: "calc(var(--nav-clearance) + 44px)",
        maxWidth: 520,
        margin: "0 auto",
        maxHeight: "calc(100dvh - var(--nav-clearance) - 70px - var(--banner-space) - env(safe-area-inset-top, 0px))",
        overflowY: "auto",
        zIndex: 6,
        padding: "18px 16px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <Stamp color="var(--accent)" rotate={-3}>
          <SparkleIcon size={14} weight={2.2} />
          tspots
        </Stamp>
        <span aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2, marginBottom: -4 }}>
          <Brownstone height={34} />
          <StateHouse height={44} />
          <TripleDecker height={34} />
        </span>
      </div>
      <h1 id="join-title" style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, lineHeight: 1.02, marginTop: 12 }}>
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
                background: fill(t),
                color: TEAM_ON[t],
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
        <p role="alert" style={{ fontSize: 13, color: "#8f3c1f", marginTop: 10 }}>
          Couldn&apos;t join just now ({error}). Try again in a moment.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!trimmed || loading}
        className="paper-btn paper-btn--primary"
        style={{ width: "100%", minHeight: 54, marginTop: 14, fontWeight: 800, fontSize: 16, opacity: loading ? 0.7 : undefined }}
      >
        {loading ? "Joining…" : `Join the ${TEAMS[team].name}`}
        {loading ? null : <ChevronIcon size={18} weight={2.6} />}
      </button>
    </form>
  );
}
