"use client";

import { useState } from "react";
import type { CompleteHuntResponse, HuntResponse } from "@/contracts";
import { completeHuntClue } from "@/hooks/useHunt";
import { checkPhoto } from "@/hooks/usePhotoCheck";

const MAX_DIMENSION = 1024;

function downscaleToJpegBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(url);
      resolve(dataUrl.split(",")[1] ?? "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo"));
    };
    img.src = url;
  });
}

export function HuntCard({ hunt, riderId }: { hunt: HuntResponse; riderId: string | null }) {
  const [done, setDone] = useState<Record<string, CompleteHuntResponse>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<Record<string, string>>({});

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

  async function snapPhoto(clueId: string, clueText: string, file: File) {
    if (!riderId || done[clueId] || pending) return;
    setPending(clueId);
    setError(null);
    setPhotoNote((prev) => ({ ...prev, [clueId]: "" }));
    try {
      const base64 = await downscaleToJpegBase64(file);
      const result = await checkPhoto(clueId, clueText, base64, "image/jpeg");
      if (result.enabled && result.passed) {
        await confirm(clueId);
        return;
      }
      setPhotoNote((prev) => ({ ...prev, [clueId]: result.reason }));
    } catch (err) {
      setPhotoNote((prev) => ({
        ...prev,
        [clueId]: err instanceof Error ? err.message : "Couldn't check that photo. Try tap-to-confirm instead.",
      }));
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
          const isDemo = clue.id.startsWith("demo:");
          const inputId = `photo-${clue.id}`;
          return (
            <li key={clue.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 15 }}>{clue.text}</p>
              {isDemo ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                  🧪 Demo clue — practice only, not tied to this physical station
                </span>
              ) : !clue.verified ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                  ⚠ not yet verified in person
                </span>
              ) : null}
              {result ? (
                <p style={{ fontSize: 13, color: "var(--line-green)", fontWeight: 600 }}>
                  {result.alreadyDone
                    ? "Already completed earlier."
                    : `✓ +${result.pointsAwarded} pts, +${result.tokensAwarded} tokens`}
                </p>
              ) : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => confirm(clue.id)}
                    disabled={!riderId || pending === clue.id}
                    style={{
                      minHeight: "var(--tap-min)",
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
                  <label
                    htmlFor={inputId}
                    style={{
                      minHeight: "var(--tap-min)",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0 var(--space-4)",
                      borderRadius: "var(--radius-card)",
                      border: "1px solid var(--border)",
                      fontWeight: 600,
                      fontSize: 13,
                      opacity: !riderId || pending === clue.id ? 0.6 : 1,
                      cursor: !riderId || pending === clue.id ? "default" : "pointer",
                    }}
                  >
                    📷 Snap it
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={!riderId || pending === clue.id}
                      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) snapPhoto(clue.id, clue.text, file);
                      }}
                    />
                  </label>
                </div>
              )}
              {photoNote[clue.id] ? (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>{photoNote[clue.id]}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!riderId ? <p style={{ fontSize: 12, color: "var(--muted)" }}>Join from the Ride tab to earn points for clues.</p> : null}
      {error ? <p style={{ fontSize: 12, color: "var(--line-red)" }}>{error}</p> : null}
    </div>
  );
}
