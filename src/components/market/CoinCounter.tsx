"use client";

import { useState } from "react";
import { Coin } from "./bits";
import s from "./market.module.css";

/** Chunky CitiToken balance pill. Bumps whenever the number changes. */
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
      className="glass"
      aria-label={balance == null ? "CitiToken balance unavailable" : `${balance} CitiTokens${held ? `, ${held} held in your posts` : ""}`}
      role="status"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 14px 6px 6px",
        borderRadius: "var(--radius-pill)",
        boxShadow: "0 0 0 1px rgba(228,255,58,0.18), 0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <span key={bumps} className={bumps ? s.bump : undefined} style={{ display: "grid", perspective: 200 }}>
        <Coin size={38} spin />
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)" }}>
          {balance ?? "--"}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginTop: 3 }}>
          {held > 0 ? `${held} on the board` : "CitiTokens"}
        </span>
      </span>
    </div>
  );
}
