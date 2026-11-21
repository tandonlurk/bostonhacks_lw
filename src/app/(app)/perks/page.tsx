"use client";

import { useState } from "react";
import type { Perk } from "@/contracts";
import { useRider } from "@/hooks/useRider";
import { useTokens } from "@/hooks/useTokens";
import { usePerks } from "@/hooks/usePerks";
import { TokenWallet } from "@/components/TokenWallet";
import { PerkCard } from "@/components/PerkCard";
import { RedeemSheet } from "@/components/RedeemSheet";
import { EmptyState } from "@/components/EmptyState";

export default function PerksPage() {
  const { rider } = useRider();
  const { data: tokens, loading: tokensLoading, refresh: refreshTokens } = useTokens(rider?.riderId ?? null);
  const { data: perks, loading: perksLoading, refresh: refreshPerks } = usePerks();
  const [redeeming, setRedeeming] = useState<Perk | null>(null);

  const balance = tokens?.balance ?? (tokensLoading ? null : 0);

  return (
    <div style={{ padding: "var(--space-4)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Perks</h1>
        <TokenWallet balance={balance} />
      </header>

      {perksLoading && !perks.length ? <EmptyState title="Loading perks…" /> : null}
      {!perksLoading && !perks.length ? (
        <EmptyState title="No perks available right now" body="Check back after the catalog rotates." />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {perks.map((perk) => (
          <PerkCard key={perk.id} perk={perk} balance={balance} onRedeem={setRedeeming} />
        ))}
      </div>

      {redeeming ? (
        <RedeemSheet
          perk={redeeming}
          riderId={rider?.riderId ?? null}
          onClose={() => setRedeeming(null)}
          onRedeemed={() => {
            refreshTokens();
            refreshPerks();
          }}
        />
      ) : null}
    </div>
  );
}
