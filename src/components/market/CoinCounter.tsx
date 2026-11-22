"use client";

import { useState } from "react";
import { Coin } from "./bits";
import s from "./market.module.css";

/** CitiToken balance as a small paper wallet slip. Bumps whenever the number changes. */
export function CoinCounter({ balance, held }: { balance: number | null; held: number }) {
  // Re-key the number on change so the bump animation replays (no effect needed).
  const [prev, setPrev] = useState(balance);
  const [bumps, setBumps] = useState(0);
  if (prev !== balance) {
    setPrev(balance);
    if (prev != null && balance != null) setBumps((b) => b + 1);
  }

  return (
    <div
      className="paper paper--stack"
      aria-label={balance == null ? "CitiToken balance unavailable" : `${balance} CitiTokens${held ? `, ${held} held in your posts` : ""}`}
      role="status"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px 8px 8px",
        borderRadius: 6,
      }}
    >
      <span key={bumps} className={bumps ? s.bump : undefined} style={{ display: "grid" }}>
        <Coin size={36} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)" }}>
          {balance ?? "--"}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginTop: 3 }}>
          {held > 0 ? `${held} on the board` : "CitiTokens"}
        </span>
      </span>
    </div>
  );
}
