"use client";

import { useState } from "react";
import type { ManualRideHint } from "@/contracts";
import { stopsFixture } from "@/contracts/fixtures";
import { StatusBadge } from "./StatusBadge";

interface RideControlsProps {
  active: boolean;
  state: "searching" | "on_vehicle" | "in_tunnel" | "left" | null;
  stopsCredited: number;
  message: string | null;
  error: string | null;
  lastResult: { stopsCredited: number; pointsAwarded: number } | null;
  onStartGeo: () => void;
  onStartManual: (hint: ManualRideHint, lat: number, lng: number) => void;
  onStop: () => void;
}

export function RideControls({
  active,
  state,
  stopsCredited,
  message,
  error,
  lastResult,
  onStartGeo,
  onStartManual,
  onStop,
}: RideControlsProps) {
  const [showManual, setShowManual] = useState(false);
  const [stopId, setStopId] = useState(stopsFixture[0]?.id ?? "");

  function submitManual() {
    const stop = stopsFixture.find((s) => s.id === stopId);
    if (!stop) return;
    onStartManual({ routeId: "Green-B", directionId: 1, stopId: stop.id }, stop.lat, stop.lng);
    setShowManual(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        padding: "var(--space-4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        margin: "0 var(--space-4) var(--space-4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700 }}>Ride</span>
        {state ? <StatusBadge state={state} /> : null}
      </div>

      {message ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{message}</p> : null}
      {active ? <p style={{ fontSize: 13 }}>{stopsCredited} stop(s) credited this ride.</p> : null}
      {error ? <p style={{ fontSize: 13, color: "var(--line-red)" }}>{error}</p> : null}
      {!active && lastResult ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          Last ride: {lastResult.stopsCredited} stops, +{lastResult.pointsAwarded} points.
        </p>
      ) : null}

      {!active ? (
        <>
          <button type="button" onClick={onStartGeo} style={primaryBtn}>
            Start ride
          </button>
          <button type="button" onClick={() => setShowManual((v) => !v)} style={ghostBtn}>
            Can&apos;t get GPS? Pick your stop manually
          </button>
          {showManual ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <select
                value={stopId}
                onChange={(e) => setStopId(e.target.value)}
                style={{ minHeight: "var(--tap-min)", borderRadius: "var(--radius-card)", border: "1px solid var(--border)" }}
              >
                {stopsFixture.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Green Line B)
                  </option>
                ))}
              </select>
              <button type="button" onClick={submitManual} style={primaryBtn}>
                Confirm manual pick
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <button type="button" onClick={onStop} style={dangerBtn}>
          End ride
        </button>
      )}
    </div>
  );
}

const baseBtn: React.CSSProperties = {
  minHeight: "var(--tap-min)",
  borderRadius: "var(--radius-card)",
  border: "none",
  fontWeight: 700,
  fontSize: 15,
};

const primaryBtn: React.CSSProperties = { ...baseBtn, background: "var(--ink)", color: "var(--paper)" };
const dangerBtn: React.CSSProperties = { ...baseBtn, background: "var(--line-red)", color: "#fff" };
const ghostBtn: React.CSSProperties = { ...baseBtn, background: "none", color: "var(--ink)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 13 };
