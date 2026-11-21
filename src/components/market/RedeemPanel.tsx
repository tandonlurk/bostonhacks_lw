"use client";

// Restyled redeem flow (same behavior as components/RedeemSheet): confirm -> POST /api/perks/redeem -> QR + code.
// Lives inside the shared bottom Sheet so it matches the rest of the overhaul.
import Link from "next/link";
import { useState } from "react";
import type { Perk, RedeemPerkResponse } from "@/contracts";
import { redeemPerk } from "@/hooks/usePerks";
import { QrCode } from "@/components/QrCode";
import { CheckIcon, RideIcon } from "@/components/icons";
import { Coin } from "./bits";
import s from "./market.module.css";

interface Props {
  perk: Perk;
  riderId: string | null;
  balance: number | null;
  onClose: () => void;
  onRedeemed: (res: RedeemPerkResponse) => void;
}

export function RedeemPanel({ perk, riderId, balance, onClose, onRedeemed }: Props) {
  const [status, setStatus] = useState<"confirm" | "redeeming" | "done" | "error">("confirm");
  const [code, setCode] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const short = balance == null ? 0 : Math.max(0, perk.costTokens - balance);

  async function confirm() {
    if (!riderId) return;
    setStatus("redeeming");
    setError(null);
    try {
      const res = await redeemPerk(riderId, perk.id);
      setCode(res.redemptionCode);
      setLeft(res.tokensLeft);
      setStatus("done");
      onRedeemed(res);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't redeem that perk.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
          {perk.partner}
        </p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>{perk.title}</p>
      </div>

      {!riderId ? (
        <JoinPrompt text="Join a line on the Ride tab to start earning CitiTokens, then come back to redeem." onClose={onClose} />
      ) : status === "done" && code ? (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "20px 16px 18px",
              borderRadius: 22,
              background: "#fbfaf4",
              color: "#11140a",
              boxShadow: "0 0 0 4px rgba(228,255,58,0.35)",
              animation: "fade-in 300ms",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: "#1d7a3e" }}>
              <CheckIcon size={18} weight={2.8} />
              Redeemed. Show this at the counter
            </span>
            <QrCode value={code} size={196} />
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{code}</p>
          </div>
          {left != null ? (
            <p style={{ textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
              <span className="num" style={{ color: "var(--accent)", fontWeight: 800 }}>
                {left}
              </span>{" "}
              CitiTokens left
            </p>
          ) : null}
          <button type="button" onClick={onClose} className={s.inkBtn} style={secondaryBtn}>
            Done
          </button>
        </>
      ) : short > 0 ? (
        <>
          <Ledger balance={balance} cost={perk.costTokens} />
          <p style={{ fontSize: 15, lineHeight: 1.4 }}>
            You need{" "}
            <span className="num" style={{ fontWeight: 800, color: "var(--hot)" }}>
              {short} more
            </span>{" "}
            tokens. Ride, win a hunt, or take a bounty on the Board.
          </p>
          <Link href="/" className={s.inkBtn} style={primaryBtn}>
            <RideIcon size={20} />
            Go ride
          </Link>
        </>
      ) : (
        <>
          <Ledger balance={balance} cost={perk.costTokens} />
          {status === "error" ? (
            <p role="alert" style={{ fontSize: 14, color: "var(--hot)", fontWeight: 600 }}>
              {error}
            </p>
          ) : null}
          <button type="button" onClick={confirm} disabled={status === "redeeming"} className={s.inkBtn} style={primaryBtn}>
            {status === "redeeming" ? (
              <>
                <span style={{ display: "grid", animation: "spin-slow 900ms linear infinite" }}>
                  <Coin size={22} />
                </span>
                Punching your ticket
              </>
            ) : (
              <>
                {status === "error" ? "Try again" : `Redeem for ${perk.costTokens}`}
                <Coin size={22} />
              </>
            )}
          </button>
          <button type="button" onClick={onClose} className={s.inkBtn} style={secondaryBtn}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

function Ledger({ balance, cost }: { balance: number | null; cost: number }) {
  const after = balance == null ? null : balance - cost;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr auto 1fr",
        alignItems: "center",
        gap: 6,
        padding: "14px 12px",
        borderRadius: 18,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      <LedgerCell label="Balance" value={balance ?? "--"} />
      <span style={op}>-</span>
      <LedgerCell label="Cost" value={cost} />
      <span style={op}>=</span>
      <LedgerCell label="After" value={after ?? "--"} accent={after != null && after >= 0} hot={after != null && after < 0} />
    </div>
  );
}

function LedgerCell({ label, value, accent, hot }: { label: string; value: number | string; accent?: boolean; hot?: boolean }) {
  return (
    <div>
      <p className="num" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: hot ? "var(--hot)" : accent ? "var(--accent)" : "var(--ink)" }}>
        {value}
      </p>
      <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginTop: 4 }}>
        {label}
      </p>
    </div>
  );
}

export function JoinPrompt({ text, onClose }: { text: string; onClose?: () => void }) {
  return (
    <>
      <p style={{ fontSize: 15, lineHeight: 1.45, color: "var(--muted)" }}>{text}</p>
      <Link href="/" className={s.inkBtn} style={primaryBtn} onClick={onClose}>
        <RideIcon size={20} />
        Join on the Ride tab
      </Link>
    </>
  );
}

const op: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--muted)" };

const primaryBtn: React.CSSProperties = {
  minHeight: 54,
  borderRadius: "var(--radius-pill)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-display)",
  fontSize: 16.5,
  boxShadow: "0 10px 30px rgba(228,255,58,0.22)",
};

const secondaryBtn: React.CSSProperties = {
  minHeight: 50,
  borderRadius: "var(--radius-pill)",
  background: "var(--surface-2)",
  color: "var(--ink)",
};
