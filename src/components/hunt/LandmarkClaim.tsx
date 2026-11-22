"use client";

// Restyled landmark check-in (same flow as src/components/LandmarkPanel: geolocate, then POST /api/landmarks/claim).
import { useState } from "react";
import type { Landmark } from "@/contracts";
import { CheckIcon, PinIcon } from "@/components/icons";
import { PaperButton, Stamp } from "@/components/paper/Paper";
import { StationArt } from "@/components/paper/origami";
import { claimLandmark } from "@/hooks/useLandmarks";
import { paperCard } from "./styles";

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
      <div className="paper--fold" style={{ ...paperCard, padding: 18, display: "flex", gap: 14, alignItems: "center", borderTop: "4px solid var(--gold)" }}>
        <span aria-hidden="true" style={{ display: "grid", placeItems: "end center", width: 60, height: 60, flexShrink: 0 }}>
          <StationArt name={landmark.name} height={56} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{landmark.name}</p>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
            Walk over and check in for <strong className="num" style={{ color: "var(--gold-ink)" }}>+{landmark.bonusPoints} pts</strong>. We check your GPS is close by.
          </p>
        </div>
      </div>
      {status === "done" ? (
        <p role="status" style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700, color: "var(--accent)" }}>
          <Stamp color="var(--brick)" rotate={-6} style={{ fontSize: 13 }}>
            <CheckIcon size={14} weight={2.8} />
            Claimed
          </Stamp>
          {message}
        </p>
      ) : (
        <PaperButton variant="primary" onClick={claim} disabled={busy} style={{ minHeight: 52, fontSize: 16 }}>
          <PinIcon size={18} weight={2.3} />
          {status === "locating" ? "Finding you…" : status === "claiming" ? "Checking in…" : "I'm here, check me in"}
        </PaperButton>
      )}
      {status === "error" && message ? <p role="alert" style={{ fontSize: 13, color: "var(--glow-red)" }}>{message}</p> : null}
    </div>
  );
}
