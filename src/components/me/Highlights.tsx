"use client";

import { useState } from "react";
import type { Landmark, TokenLedgerEntry } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { StarIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import { KIND_COPY, countByKind, kindOf, type ActivityKind } from "./activity";
import { ActivityList, kindVisual } from "./ActivityFeed";
import s from "./me.module.css";

type HighlightKind = Extract<ActivityKind, "ride" | "hunt" | "landmark" | "perk">;
const ORDER: HighlightKind[] = ["ride", "hunt", "landmark", "perk"];

const EMPTY_HINT: Record<HighlightKind, string> = {
  ride: "Start a ride from the big button below. Every verified stop counts.",
  hunt: "When your line is delayed, a hunt drops at the station. Clear one to save it here.",
  landmark: "Ride to a landmark stop and claim it for bonus points.",
  perk: "Spend CitiTokens on a perk and it shows up here.",
};

interface HighlightsProps {
  ledger: TokenLedgerEntry[];
  landmarks: Landmark[];
  team: TeamRouteId;
  now: number;
}

/** Instagram-style story highlight bubbles; tapping one opens that slice of your history. */
export function Highlights({ ledger, landmarks, team, now }: HighlightsProps) {
  const [open, setOpen] = useState<HighlightKind | null>(null);
  const counts = countByKind(ledger);
  const claimed = landmarks.filter((l) => l.claimed);
  // Landmark claims come from the landmarks endpoint (authoritative); the ledger may not tag them.
  const countFor = (k: HighlightKind) => (k === "landmark" ? Math.max(claimed.length, counts.landmark) : counts[k]);

  return (
    <section aria-labelledby="me-highlights" style={{ padding: "0 var(--space-4)" }}>
      <h3 id="me-highlights" className="visually-hidden">
        Highlights
      </h3>
      <div className={s.scrollRow} style={{ justifyContent: "space-between" }}>
        {ORDER.map((k) => {
          const n = countFor(k);
          const { Icon, color } = kindVisual(k, team);
          return (
            <button
              key={k}
              type="button"
              className={s.highlight}
              data-empty={n === 0}
              onClick={() => setOpen(k)}
              aria-label={`${KIND_COPY[k].plural}: ${n}`}
              style={{ ["--hl" as string]: color }}
            >
              <span className={s.highlightRing}>
                <Icon size={28} />
                {n > 0 ? <span className={`${s.badge} num`}>{n}</span> : null}
              </span>
              {KIND_COPY[k].plural}
            </button>
          );
        })}
      </div>

      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open ? KIND_COPY[open].plural : "Highlights"}>
        {open === "landmark" ? (
          <LandmarkList claimed={claimed} />
        ) : open ? (
          <ActivityList
            entries={ledger.filter((e) => kindOf(e.reason) === open)}
            team={team}
            now={now}
            empty={<EmptyHint text={EMPTY_HINT[open]} />}
          />
        ) : null}
      </Sheet>
    </section>
  );
}

function LandmarkList({ claimed }: { claimed: Landmark[] }) {
  if (!claimed.length) return <EmptyHint text={EMPTY_HINT.landmark} />;
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      {claimed.map((l) => (
        <li
          key={l.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minHeight: 60,
            padding: "8px 12px",
            borderRadius: 16,
            background: "var(--surface-2)",
          }}
        >
          <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "var(--accent)", color: "var(--accent-ink)" }}>
            <StarIcon size={20} />
          </span>
          <span style={{ flex: 1, fontWeight: 700 }}>{l.name}</span>
          <span className="num" style={{ color: "var(--accent)", fontWeight: 800 }}>
            +{l.bonusPoints} pts
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return <p style={{ padding: "12px 0 8px", color: "var(--muted)", fontSize: 15, lineHeight: 1.45 }}>{text}</p>;
}
