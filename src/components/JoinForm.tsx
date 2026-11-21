"use client";

import { useState } from "react";
import { TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import { LineChip } from "./LineChip";

export function JoinForm({ onJoin, loading }: { onJoin: (name: string, team: TeamRouteId) => void; loading?: boolean }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<TeamRouteId>("Green");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onJoin(name.trim(), team);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        margin: "0 var(--space-4) var(--space-4)",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
          required
          maxLength={40}
          style={{
            minHeight: "var(--tap-min)",
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            fontSize: 16,
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        />
      </label>

      <fieldset style={{ border: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 4 }}>Pick your home line</legend>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TEAM_ROUTE_IDS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              aria-pressed={team === t}
              style={{
                border: team === t ? "2px solid var(--ink)" : "2px solid transparent",
                background: "none",
                padding: 0,
                borderRadius: "var(--radius-pill)",
                minHeight: "var(--tap-min)",
              }}
            >
              <LineChip teamRouteId={t} />
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        style={{
          minHeight: "var(--tap-min)",
          borderRadius: "var(--radius-card)",
          border: "none",
          background: "var(--ink)",
          color: "var(--paper)",
          fontWeight: 700,
          fontSize: 15,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Joining…" : "Join T-City"}
      </button>
    </form>
  );
}
