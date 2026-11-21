import type { Perk } from "@/contracts";

function formatCountdown(rotatesAt: string): string {
  const ms = new Date(rotatesAt).getTime() - Date.now();
  if (ms <= 0) return "rotating now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `rotates in ${mins}m`;
  return `rotates in ${Math.round(mins / 60)}h`;
}

interface PerkCardProps {
  perk: Perk;
  balance: number | null;
  onRedeem: (perk: Perk) => void;
}

export function PerkCard({ perk, balance, onRedeem }: PerkCardProps) {
  const soldOut = perk.remaining <= 0;
  const canAfford = balance != null && balance >= perk.costTokens;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong>{perk.title}</strong>
        <span style={{ fontWeight: 700 }}>{perk.costTokens} 🪙</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{perk.partner}</p>
      <p style={{ fontSize: 12, color: "var(--muted)" }}>
        {soldOut ? "Sold out" : `${perk.remaining} left`} · {formatCountdown(perk.rotatesAt)}
      </p>
      <button
        type="button"
        onClick={() => onRedeem(perk)}
        disabled={soldOut || !canAfford}
        style={{
          minHeight: "var(--tap-min)",
          borderRadius: "var(--radius-card)",
          border: "none",
          background: "var(--ink)",
          color: "var(--paper)",
          fontWeight: 700,
          opacity: soldOut || !canAfford ? 0.5 : 1,
        }}
      >
        {soldOut ? "Sold out" : canAfford ? "Redeem" : "Not enough tokens"}
      </button>
    </div>
  );
}
