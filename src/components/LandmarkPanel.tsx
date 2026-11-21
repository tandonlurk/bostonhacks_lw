"use client";

import { useState } from "react";
import type { Landmark } from "@/contracts";
import { claimLandmark } from "@/hooks/useLandmarks";

interface LandmarkPanelProps {
  landmark: Landmark;
  riderId: string | null;
  onClaimed: () => void;
  onDismiss: () => void;
}

export function LandmarkPanel({ landmark, riderId, onClaimed, onDismiss }: LandmarkPanelProps) {
  const [status, setStatus] = useState<"idle" | "locating" | "claiming" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);

  function claim() {
    if (!riderId) {
      setStatus("error");
      setResult("Join from the Ride tab first.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setResult("This device can't report location.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("claiming");
        try {
          const res = await claimLandmark(riderId, landmark.id, pos.coords.latitude, pos.coords.longitude);
          setStatus("done");
          setResult(res.alreadyClaimed ? "Already claimed." : `+${res.pointsAwarded} bonus points!`);
          onClaimed();
        } catch (err) {
          setStatus("error");
          setResult(err instanceof Error ? err.message : "Couldn't claim — try again closer to the landmark.");
        }
      },
      () => {
        setStatus("error");
        setResult("Couldn't get your location. Enable location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div
      role="status"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div>
        <p style={{ fontWeight: 700 }}>{landmark.name}</p>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          {landmark.claimed ? "Claimed" : `+${landmark.bonusPoints} pts nearby`}
          {result ? ` · ${result}` : ""}
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {!landmark.claimed && status !== "done" ? (
          <button
            type="button"
            onClick={claim}
            disabled={status === "locating" || status === "claiming"}
            style={{
              minHeight: "var(--tap-min)",
              padding: "0 var(--space-3)",
              borderRadius: "var(--radius-card)",
              border: "none",
              background: "var(--ink)",
              color: "var(--paper)",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {status === "locating" ? "Locating…" : status === "claiming" ? "Claiming…" : "I'm here"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ minHeight: "var(--tap-min)", minWidth: "var(--tap-min)", border: "none", background: "none" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
