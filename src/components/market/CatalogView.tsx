"use client";

import type { Perk } from "@/contracts";
import { PerkIcon } from "@/components/icons";
import { Tape } from "@/components/paper/Paper";
import { PerkTicket, TicketSkeleton } from "./PerkTicket";
import s from "./market.module.css";

interface Props {
  perks: Perk[];
  loading: boolean;
  balance: number | null;
  joined: boolean;
  now: number | null;
  onOpen: (perk: Perk) => void;
}

export function CatalogView({ perks, loading, balance, joined, now, onOpen }: Props) {
  if (loading && !perks.length) {
    return (
      <section aria-label="Perk catalog" aria-busy="true" className={s.tickets}>
        <TicketSkeleton />
        <TicketSkeleton />
        <TicketSkeleton />
      </section>
    );
  }

  if (!perks.length) {
    return (
      <section
        aria-label="Perk catalog"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "56px 24px", textAlign: "center" }}
      >
        <div className="paper paper--tilt-l" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 20px 20px", maxWidth: 320 }}>
          <Tape />
          <span style={{ color: "var(--muted)" }}>
            <PerkIcon size={40} weight={1.8} />
          </span>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>The coupon book is empty</p>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280 }}>
            Partners restock when the catalog rotates. Keep riding so you&apos;re ready when it drops.
          </p>
        </div>
      </section>
    );
  }

  const sorted = [...perks].sort((a, b) => {
    const sa = a.remaining <= 0 ? 1 : 0;
    const sb = b.remaining <= 0 ? 1 : 0;
    return sa - sb || a.costTokens - b.costTokens;
  });
  const affordable = perks.filter((p) => p.remaining > 0 && balance != null && balance >= p.costTokens).length;

  return (
    <section aria-label="Perk catalog">
      <p style={{ padding: "6px 16px 0", fontSize: 13.5, color: "var(--muted)" }}>
        {joined ? (
          <>
            You can grab{" "}
            <span className="num" style={{ color: "var(--accent)", fontWeight: 800, fontSize: 15 }}>
              {affordable}
            </span>{" "}
            of {perks.length} perks right now.
          </>
        ) : (
          "Join a line to earn CitiTokens and unlock these."
        )}
      </p>
      <div className={s.tickets}>
        {sorted.map((p) => (
          <PerkTicket key={p.id} perk={p} balance={balance} now={now} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
