"use client";

import Link from "next/link";
import type { Perk } from "@/contracts";
import { ChevronIcon, CoinIcon, PerkIcon } from "@/components/icons";
import { Eyebrow, Stamp } from "@/components/paper/Paper";
import { kraftWell, paperCard } from "./styles";

/** "Spend it" strip in the station sheet: wallet balance plus 1-2 perks the rider can afford right now. */
export function SpendStrip({ balance, perks }: { balance: number | null; perks: Perk[] }) {
  const inStock = perks.filter((p) => p.remaining > 0);
  const affordable = balance == null ? [] : inStock.filter((p) => p.costTokens <= balance).sort((a, b) => b.costTokens - a.costTokens).slice(0, 2);
  const next = balance == null ? null : inStock.filter((p) => p.costTokens > balance).sort((a, b) => a.costTokens - b.costTokens)[0];

  return (
    <section aria-label="Spend your tokens" style={{ ...kraftWell, marginTop: 20, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Eyebrow style={{ flex: 1, color: "var(--ink)" }}>Spend it</Eyebrow>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--gold-ink)" }}>
          <CoinIcon size={16} weight={2.2} />
          <span className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>{balance ?? "–"}</span>
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

      <Link href="/perks" className="paper-btn paper-btn--ghost" style={{ display: "flex", width: "100%", gap: 4, marginTop: 10, fontSize: 14 }}>
        All perks
        <ChevronIcon size={16} weight={2.4} />
      </Link>
    </section>
  );
}

function PerkRow({ perk, note, locked }: { perk: Perk; note: string; locked?: boolean }) {
  return (
    <Link href="/perks" style={{ ...paperCard, display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 10px" }}>
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          borderRadius: 6,
          background: locked ? "var(--cream-3)" : "var(--accent-soft)",
          color: locked ? "var(--muted)" : "var(--accent)",
          flexShrink: 0,
        }}
      >
        <PerkIcon size={22} weight={2.1} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{perk.title}</span>
        <span style={{ display: "block", fontSize: 12, color: locked ? "var(--muted)" : "var(--accent)" }}>{note}</span>
      </span>
      {locked ? (
        <span className="num" style={{ fontWeight: 700, fontSize: 15 }}>
          {perk.costTokens}
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginLeft: 2 }}>tk</span>
        </span>
      ) : (
        <Stamp color="var(--accent)" rotate={-5}>
          {perk.costTokens} tk
        </Stamp>
      )}
    </Link>
  );
}
