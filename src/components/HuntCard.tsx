"use client";

import { useState } from "react";
import type { CompleteHuntResponse, HuntResponse } from "@/contracts";
import { completeHuntClue } from "@/hooks/useHunt";

export function HuntCard({ hunt, riderId }: { hunt: HuntResponse; riderId: string | null }) {
  const [done, setDone] = useState<Record<string, CompleteHuntResponse>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(clueId: string) {
    if (!riderId || done[clueId] || pending) return;
    setPending(clueId);
    setError(null);
    try {
      const result = await completeHuntClue(riderId, clueId);
      setDone((prev) => ({ ...prev, [clueId]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't confirm that clue. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", listStyle: "none" }}>
        {hunt.clues.map((clue) => {
          const result = done[clue.id];
          return (
            <li key={clue.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 15 }}>{clue.text}</p>
              {!clue.verified ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                  ⚠ not yet verified in person — demo content
                </span>
              ) : null}
              {result ? (
                <p style={{ fontSize: 13, color: "var(--line-green)", fontWeight: 600 }}>
                  {result.alreadyDone
                    ? "Already completed earlier."
                    : `✓ +${result.pointsAwarded} pts, +${result.tokensAwarded} tokens`}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => confirm(clue.id)}
                  disabled={!riderId || pending === clue.id}
                  style={{
                    minHeight: "var(--tap-min)",
                    alignSelf: "flex-start",
                    padding: "0 var(--space-4)",
                    borderRadius: "var(--radius-card)",
                    border: "none",
                    background: "var(--ink)",
                    color: "var(--paper)",
                    fontWeight: 700,
                    opacity: !riderId || pending === clue.id ? 0.6 : 1,
                  }}
                >
                  {pending === clue.id ? "Confirming…" : "I found it"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!riderId ? <p style={{ fontSize: 12, color: "var(--muted)" }}>Join from the Ride tab to earn points for clues.</p> : null}
      {error ? <p style={{ fontSize: 12, color: "var(--line-red)" }}>{error}</p> : null}
    </div>
  );
}
