"use client";

import { useState } from "react";
import type { Perk } from "@/contracts";
import { redeemPerk } from "@/hooks/usePerks";
import { QrCode } from "./QrCode";

interface RedeemSheetProps {
  perk: Perk;
  riderId: string | null;
  onClose: () => void;
  onRedeemed: () => void;
}

export function RedeemSheet({ perk, riderId, onClose, onRedeemed }: RedeemSheetProps) {
  const [status, setStatus] = useState<"confirm" | "redeeming" | "done" | "error">("confirm");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!riderId) {
      setStatus("error");
      setError("Join from the Ride tab first.");
      return;
    }
    setStatus("redeeming");
    try {
      const res = await redeemPerk(riderId, perk.id);
      setCode(res.redemptionCode);
      setStatus("done");
      onRedeemed();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't redeem that perk.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Redeem ${perk.title}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 30,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--surface)",
          borderTopLeftRadius: "var(--radius-sheet)",
          borderTopRightRadius: "var(--radius-sheet)",
          padding: "var(--space-5) var(--space-4)",
          paddingBottom: "calc(var(--space-5) + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <strong style={{ fontSize: 17 }}>{perk.title}</strong>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{perk.partner}</p>

        {status === "confirm" ? (
          <>
            <p style={{ fontSize: 14 }}>Spend {perk.costTokens} CitiTokens on this perk?</p>
            <button type="button" onClick={confirm} style={primaryBtn}>
              Confirm redeem
            </button>
          </>
        ) : null}

        {status === "redeeming" ? <p style={{ fontSize: 14 }}>Redeeming…</p> : null}

        {status === "done" && code ? (
          <>
            <p style={{ fontSize: 14, color: "var(--line-green)", fontWeight: 600 }}>Redeemed! Show this at the partner:</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-2)",
                border: "2px dashed var(--border)",
                borderRadius: "var(--radius-card)",
                padding: "var(--space-4)",
              }}
            >
              <QrCode value={code} />
              <p
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                {code}
              </p>
            </div>
          </>
        ) : null}

        {status === "error" ? <p style={{ fontSize: 14, color: "var(--line-red)" }}>{error}</p> : null}

        <button type="button" onClick={onClose} style={ghostBtn}>
          {status === "done" ? "Done" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

const baseBtn: React.CSSProperties = {
  minHeight: "var(--tap-min)",
  borderRadius: "var(--radius-card)",
  border: "none",
  fontWeight: 700,
  fontSize: 15,
};
const primaryBtn: React.CSSProperties = { ...baseBtn, background: "var(--ink)", color: "var(--paper)" };
const ghostBtn: React.CSSProperties = { ...baseBtn, background: "none", color: "var(--ink)", border: "1px solid var(--border)" };
