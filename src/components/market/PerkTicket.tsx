"use client";

import type { Perk } from "@/contracts";
import { ClockIcon } from "@/components/icons";
import { countdown } from "./format";
import { Coin, Stamp } from "./bits";
import s from "./market.module.css";

const HOLES = 10;

/** A perk as a tear-off transit ticket: details on the left, a punchable cost stub on the right. */
export function PerkTicket({
  perk,
  balance,
  now,
  onOpen,
}: {
  perk: Perk;
  balance: number | null;
  now: number | null;
  onOpen: (perk: Perk) => void;
}) {
  const soldOut = perk.remaining <= 0;
  const canAfford = balance != null && balance >= perk.costTokens;
  const short = balance == null ? null : Math.max(0, perk.costTokens - balance);
  const low = !soldOut && perk.remaining <= 3;
  const live = !soldOut && canAfford;
  const rotates = countdown(perk.rotatesAt, now);

  const stubNote = soldOut ? "Gone" : canAfford ? "Redeem" : short != null ? `Need ${short}` : "Join first";

  return (
    <button
      type="button"
      className={s.ticket}
      onClick={() => onOpen(perk)}
      disabled={soldOut}
      aria-label={`${perk.title} from ${perk.partner}, ${perk.costTokens} tokens, ${soldOut ? "sold out" : `${perk.remaining} left`}${
        !soldOut && !canAfford && short ? `, you need ${short} more` : ""
      }`}
      style={{ opacity: soldOut ? 0.55 : 1, boxShadow: live ? "0 0 0 1px rgba(228,255,58,0.35), var(--shadow-card)" : undefined }}
    >
      <div style={{ position: "relative", padding: "14px 14px 14px 16px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {perk.partner}
        </p>
        <h3 style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1, color: "var(--ink)", overflowWrap: "anywhere" }}>{perk.title}</h3>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
          <span aria-hidden="true" style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: HOLES }, (_, i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: i < Math.min(perk.remaining, HOLES) ? (low ? "var(--hot)" : "var(--ink)") : "transparent",
                  boxShadow: "inset 0 0 0 1.5px var(--surface-3)",
                }}
              />
            ))}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: low ? "var(--hot)" : "var(--muted)" }}>
            {soldOut ? "Sold out" : low ? `Only ${perk.remaining} left` : `${perk.remaining} left`}
          </span>
        </div>
        {rotates ? (
          <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
            <ClockIcon size={14} weight={2.2} />
            {rotates}
          </p>
        ) : null}

        {soldOut ? (
          <span style={{ position: "absolute", right: 10, top: 34 }}>
            <Stamp label="Sold out" color="var(--hot)" size={16} rot={-12} paper={false} />
          </span>
        ) : null}
      </div>

      <div
        className={s.stub}
        style={{
          background: live ? "var(--accent)" : "var(--surface-2)",
          color: live ? "var(--accent-ink)" : "var(--ink)",
          borderLeftColor: live ? "rgba(17,20,10,0.4)" : "var(--surface-3)",
        }}
      >
        <Coin size={26} />
        <span className="num" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
          {perk.costTokens}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>tokens</span>
        <span
          style={{
            marginTop: 4,
            fontSize: 12,
            fontWeight: 800,
            padding: "3px 9px",
            borderRadius: "var(--radius-pill)",
            background: live ? "var(--accent-ink)" : "transparent",
            color: live ? "var(--accent)" : "var(--muted)",
          }}
        >
          {stubNote}
        </span>
      </div>
    </button>
  );
}

export function TicketSkeleton() {
  return <div className={`${s.ticket} ${s.shimmer}`} aria-hidden="true" />;
}
