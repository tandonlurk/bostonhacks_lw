"use client";

import Link from "next/link";
import type { Perk } from "@/contracts";
import { ChevronIcon, CoinIcon, PerkIcon } from "@/components/icons";
import { eyebrow } from "./styles";

/** "Spend it" strip in the station sheet: wallet balance plus 1-2 perks the rider can afford right now. */
export function SpendStrip({ balance, perks }: { balance: number | null; perks: Perk[] }) {
  const inStock = perks.filter((p) => p.remaining > 0);
  const affordable = balance == null ? [] : inStock.filter((p) => p.costTokens <= balance).sort((a, b) => b.costTokens - a.costTokens).slice(0, 2);
  const next = balance == null ? null : inStock.filter((p) => p.costTokens > balance).sort((a, b) => a.costTokens - b.costTokens)[0];

  return (
    <section aria-label="Spend your tokens" style={{ marginTop: 18, padding: 14, borderRadius: 22, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ ...eyebrow, flex: 1 }}>Spend it</p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)" }}>
          <CoinIcon size={16} weight={2.2} />
          <span className="num" style={{ fontWeight: 800, color: "var(--ink)" }}>{balance ?? "–"}</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>tokens</span>
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {affordable.map((p) => (
          <PerkRow key={p.id} perk={p} note="You can afford this" />
        ))}
        {affordable.length < 2 && next ? <PerkRow perk={next} note={`${next.costTokens - (balance ?? 0)} more tokens`} locked /> : null}
        {balance == null ? <p style={{ fontSize: 13, color: "var(--muted)" }}>Join from the Ride tab to start earning tokens.</p> : null}
        {balance != null && !inStock.length ? <p style={{ fontSize: 13, color: "var(--muted)" }}>New perks drop soon.</p> : null}
      </div>

      <Link
        href="/perks"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, marginTop: 10, borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-border)", fontWeight: 750, fontSize: 14 }}
      >
        All perks
        <ChevronIcon size={16} weight={2.4} />
      </Link>
    </section>
  );
}

function PerkRow({ perk, note, locked }: { perk: Perk; note: string; locked?: boolean }) {
  return (
    <Link
      href="/perks"
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 10px", borderRadius: 16, background: "var(--surface)", opacity: locked ? 0.7 : 1 }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: locked ? "var(--surface-3)" : "rgba(63,122,0,0.12)", color: locked ? "var(--muted)" : "var(--accent)", flexShrink: 0 }}>
        <PerkIcon size={22} weight={2.1} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 750, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{perk.title}</span>
        <span style={{ display: "block", fontSize: 12, color: locked ? "var(--muted)" : "var(--glow-green)" }}>{note}</span>
      </span>
      <span className="num" style={{ fontWeight: 800, fontSize: 15 }}>
        {perk.costTokens}
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginLeft: 2 }}>tk</span>
      </span>
    </Link>
  );
}
