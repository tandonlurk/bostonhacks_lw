"use client";

// Delay photo challenges: solo scavenger prompts graded by Gemini (POST /api/challenges/submit, A's T26).
import { useState } from "react";
import type { ChallengeSubmitResponse, ChallengesResponse } from "@/contracts";
import { CameraIcon, CheckIcon } from "@/components/icons";
import { downscaleToJpegBase64 } from "./downscale";
import { primaryButton } from "./styles";
import { submitChallenge } from "./useChallenges";

interface ChallengeGameProps {
  data: ChallengesResponse;
  riderId: string | null;
  onEarned: () => void;
}

export function ChallengeGame({ data, riderId, onEarned }: ChallengeGameProps) {
  const [results, setResults] = useState<Record<string, ChallengeSubmitResponse>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function snap(challengeId: string, file: File) {
    if (!riderId || pending) return;
    setPending(challengeId);
    setErrors((e) => ({ ...e, [challengeId]: "" }));
    try {
      const base64 = await downscaleToJpegBase64(file);
      const res = await submitChallenge(riderId, challengeId, base64);
      setResults((r) => ({ ...r, [challengeId]: res }));
      if (res.pointsAwarded > 0) onEarned();
    } catch (err) {
      setErrors((e) => ({ ...e, [challengeId]: err instanceof Error ? err.message : "Couldn't grade that photo. Try again." }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.45 }}>
        Solo scavenger hunt for this delay. Snap each one, our AI grades it, and better photos earn more points.
      </p>
      <ol style={{ listStyle: "none", display: "grid", gap: 10 }}>
        {data.challenges.map((c) => {
          const result = results[c.id];
          const passed = c.done || (result?.passed ?? false);
          const awarded = result ? result.pointsAwarded : c.pointsAwarded;
          const busy = pending === c.id;
          const disabled = !riderId || !!pending;
          const inputId = `challenge-${c.id}`;
          return (
            <li
              key={c.id}
              style={{
                padding: 14,
                borderRadius: 18,
                background: "var(--surface-2)",
                border: `1px solid ${passed ? "rgba(31,209,122,0.4)" : "var(--border)"}`,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <p style={{ flex: 1, fontSize: 15.5, fontWeight: 650, lineHeight: 1.35 }}>{c.prompt}</p>
                <span className="num" style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", whiteSpace: "nowrap" }}>
                  {passed ? `+${awarded}` : `up to ${c.points}`}
                </span>
              </div>
              {passed ? (
                <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 750, color: "var(--glow-green)" }}>
                  <CheckIcon size={18} weight={2.6} />
                  {result?.alreadyDone ? "Already done this round" : result ? result.reason : "Done this round"}
                </p>
              ) : (
                <label
                  htmlFor={inputId}
                  style={{ ...primaryButton, justifySelf: "start", opacity: disabled ? 0.55 : 1, cursor: disabled ? "default" : "pointer" }}
                >
                  <CameraIcon size={18} weight={2.2} />
                  {busy ? "Grading…" : result ? "Try another shot" : "Snap it"}
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
                      if (file) snap(c.id, file);
                    }}
                  />
                </label>
              )}
              {result && !passed ? (
                <p style={{ fontSize: 13, color: result.enabled ? "var(--glow-orange)" : "var(--muted)" }}>
                  {result.reason}
                  {result.score != null ? ` (score ${Math.round(result.score * 100)}%)` : ""}
                </p>
              ) : null}
              {errors[c.id] ? <p style={{ fontSize: 13, color: "var(--glow-red)" }}>{errors[c.id]}</p> : null}
            </li>
          );
        })}
      </ol>
      {!riderId ? <p style={{ fontSize: 13, color: "var(--muted)" }}>Join from the Ride tab to get graded and bank points.</p> : null}
    </div>
  );
}
