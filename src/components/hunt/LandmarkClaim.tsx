"use client";

// Restyled landmark check-in (same flow as src/components/LandmarkPanel: geolocate, then POST /api/landmarks/claim).
import { useState } from "react";
import type { Landmark } from "@/contracts";
import { CheckIcon, PinIcon, StarIcon } from "@/components/icons";
import { claimLandmark } from "@/hooks/useLandmarks";
import { primaryButton } from "./styles";

type Status = "idle" | "locating" | "claiming" | "done" | "error";

export function LandmarkClaim({ landmark, riderId, onClaimed }: { landmark: Landmark; riderId: string | null; onClaimed: () => void }) {
  const [status, setStatus] = useState<Status>(landmark.claimed ? "done" : "idle");
  const [message, setMessage] = useState<string | null>(landmark.claimed ? "Already in your collection." : null);

  function claim() {
    if (!riderId) {
      setStatus("error");
      setMessage("Join from the Ride tab first.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("This device can't share its location.");
      return;
    }
    setStatus("locating");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("claiming");
        try {
          const res = await claimLandmark(riderId, landmark.id, pos.coords.latitude, pos.coords.longitude);
          setStatus("done");
          setMessage(res.alreadyClaimed ? "Already in your collection." : `+${res.pointsAwarded} bonus points!`);
          onClaimed();
        } catch (err) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Couldn't claim it. Try again closer to the landmark.");
        }
      },
      () => {
        setStatus("error");
        setMessage("Couldn't get your location. Allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const busy = status === "locating" || status === "claiming";
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ padding: 18, borderRadius: 22, background: "linear-gradient(150deg, rgba(255,209,92,0.2), rgba(255,209,92,0.03))", border: "1px solid rgba(255,209,92,0.3)", display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 18, background: "rgba(255,209,92,0.16)", color: "#a87900", flexShrink: 0 }}>
          <StarIcon size={30} weight={2.2} />
        </span>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{landmark.name}</p>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
            Walk over and check in for <strong className="num" style={{ color: "var(--accent)" }}>+{landmark.bonusPoints} pts</strong>. We check your GPS is close by.
          </p>
        </div>
      </div>
      {status === "done" ? (
        <p style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, color: "var(--glow-green)" }}>
          <CheckIcon size={20} weight={2.6} />
          {message}
        </p>
      ) : (
        <button type="button" onClick={claim} disabled={busy} style={{ ...primaryButton, minHeight: 52, fontSize: 16, opacity: busy ? 0.7 : 1 }}>
          <PinIcon size={18} weight={2.3} />
          {status === "locating" ? "Finding you…" : status === "claiming" ? "Checking in…" : "I'm here, check me in"}
        </button>
      )}
      {status === "error" && message ? <p style={{ fontSize: 13, color: "var(--glow-red)" }}>{message}</p> : null}
    </div>
  );
}
