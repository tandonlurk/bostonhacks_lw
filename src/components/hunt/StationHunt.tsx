"use client";

// Restyled station hunt (same flow as src/components/HuntCard: clues, "I found it", "Snap it" photo check), in the
// paper Hunt sheet style: clues are pinned notes, results are rubber stamps, and unverified clues say so.
import { useState } from "react";
import type { CompleteHuntResponse } from "@/contracts";
import { CameraIcon, CheckIcon } from "@/components/icons";
import { PaperButton, Stamp } from "@/components/paper/Paper";
import { completeHuntClue, useHunt } from "@/hooks/useHunt";
import { checkPhoto } from "@/hooks/usePhotoCheck";
import { downscaleToJpegBase64 } from "./downscale";
import { PRIMARY_BTN, SECONDARY_BTN, kraftWell, paperCard } from "./styles";

interface StationHuntProps {
  stopId: string;
  riderId: string | null;
  /** Photo mode leads with the camera button. */
  photoFirst?: boolean;
  onEarned: () => void;
}

export function StationHunt({ stopId, riderId, photoFirst, onEarned }: StationHuntProps) {
  const { data, loading } = useHunt(stopId);
  const [done, setDone] = useState<Record<string, CompleteHuntResponse>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function confirm(clueId: string) {
    if (!riderId || done[clueId] || pending) return;
    setPending(clueId);
    setError(null);
    try {
      const result = await completeHuntClue(riderId, clueId);
      setDone((prev) => ({ ...prev, [clueId]: result }));
      onEarned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't confirm that clue. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function snap(clueId: string, clueText: string, file: File) {
    if (!riderId || done[clueId] || pending) return;
    setPending(clueId);
    setError(null);
    setNote((prev) => ({ ...prev, [clueId]: "Checking your photo…" }));
    try {
      const base64 = await downscaleToJpegBase64(file);
      const result = await checkPhoto(clueId, clueText, base64, "image/jpeg");
      setNote((prev) => ({ ...prev, [clueId]: result.reason }));
      if (result.enabled && result.passed) {
        setPending(null);
        await confirm(clueId);
        return;
      }
    } catch (err) {
      setNote((prev) => ({ ...prev, [clueId]: err instanceof Error ? err.message : "Couldn't check that photo. Tap I found it instead." }));
    }
    setPending(null);
  }

  if (loading && !data) {
    return <p style={{ color: "var(--muted)", fontSize: 14, padding: "12px 0" }}>Looking for clues at this stop…</p>;
  }
  if (!data?.clues.length) {
    return (
      <div style={{ ...kraftWell, padding: "16px", fontSize: 14, color: "var(--muted)" }}>
        <p style={{ color: "var(--ink)", fontWeight: 700, marginBottom: 4 }}>No clues posted here yet</p>
        Clues only go live once someone has checked them in person. Try a trivia round while you wait.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ol style={{ listStyle: "none", display: "grid", gap: 12 }}>
        {data.clues.map((clue, i) => {
          const result = done[clue.id];
          const isDemo = clue.id.startsWith("demo:");
          const busy = pending === clue.id;
          const disabled = !riderId || busy;
          const inputId = `hunt-photo-${clue.id}`;
          const camera = (
            <label
              key="snap"
              htmlFor={inputId}
              className={photoFirst ? PRIMARY_BTN : SECONDARY_BTN}
              style={{ opacity: disabled ? 0.55 : 1, cursor: disabled ? "default" : "pointer" }}
            >
              <CameraIcon size={18} weight={2.2} />
              Snap it
              <input
                id={inputId}
                type="file"
                accept="image/*"
                capture="environment"
                disabled={disabled}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) snap(clue.id, clue.text, file);
                }}
              />
            </label>
          );
          const found = (
            <PaperButton key="found" variant={photoFirst ? "default" : "primary"} onClick={() => confirm(clue.id)} disabled={disabled}>
              {busy ? "Confirming…" : "I found it"}
            </PaperButton>
          );
          return (
            <li key={clue.id} style={{ ...paperCard, padding: "16px 14px 14px", display: "grid", gap: 10 }}>
              <span aria-hidden="true" className="paper-pin" style={{ top: -5, left: 18 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <span className="hand" aria-hidden="true" style={{ fontSize: 28, color: "var(--accent)", lineHeight: 0.9 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, lineHeight: 1.4 }}>{clue.text}</p>
                  {isDemo ? (
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, fontWeight: 650 }}>Bonus clue</p>
                  ) : !clue.verified ? (
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, fontWeight: 650, borderTop: "1px dashed var(--paper-edge)", paddingTop: 5 }}>
                      Not yet verified in person
                    </p>
                  ) : (
                    <Stamp color="var(--accent)" rotate={-3} style={{ marginTop: 6 }}>
                      Verified
                    </Stamp>
                  )}
                </div>
              </div>
              {result ? (
                <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                  <Stamp color="var(--accent)" rotate={-5}>
                    <CheckIcon size={14} weight={2.8} />
                    Found
                  </Stamp>
                  {result.alreadyDone ? "Already found earlier" : `+${result.pointsAwarded} pts · +${result.tokensAwarded} tokens`}
                </p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{photoFirst ? [camera, found] : [found, camera]}</div>
              )}
              {note[clue.id] ? <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{note[clue.id]}</p> : null}
            </li>
          );
        })}
      </ol>
      {!riderId ? <p style={{ fontSize: 13, color: "var(--muted)" }}>Join from the Ride tab to bank points for clues.</p> : null}
      {error ? <p role="alert" style={{ fontSize: 13, color: "var(--glow-red)" }}>{error}</p> : null}
    </div>
  );
}
