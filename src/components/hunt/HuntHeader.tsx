"use client";

import Link from "next/link";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CoinIcon } from "@/components/icons";
import { LayersIcon } from "./huntIcons";
import { SHORT } from "./mapModel";

interface HuntHeaderProps {
  delayedTeams: TeamRouteId[];
  liveStations: number;
  balance: number | null;
  legendOpen: boolean;
  onToggleLegend: () => void;
}

/** Floating glass header: title, delay status pill, token wallet (links to Perks) and legend toggle. */
export function HuntHeader({ delayedTeams, liveStations, balance, legendOpen, onToggleLegend }: HuntHeaderProps) {
  const live = delayedTeams.length > 0;
  return (
    <header
      className="glass"
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 10px)",
        left: 12,
        right: 12,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 8px 8px 16px",
        borderRadius: 24,
        boxShadow: "var(--shadow-float)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>Hunt</h1>
        <p
          role="status"
          style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, fontSize: 12, fontWeight: 650, whiteSpace: "nowrap" }}
        >
          <span aria-hidden="true" style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: live ? "var(--hot)" : "var(--accent)" }} />
            {live ? (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "var(--hot)",
                  animation: "pulse-ring 1.6s var(--ease-out) infinite",
                }}
              />
            ) : null}
          </span>
          {live ? (
            <span style={{ color: "var(--hot)", overflow: "hidden", textOverflow: "ellipsis" }}>
              {delayedTeams.length === 1 ? `${TEAMS[delayedTeams[0]].name} delay` : `Delays on ${delayedTeams.map((t) => SHORT[t]).join(" + ")}`} · {liveStations} game stops
            </span>
          ) : (
            <span style={{ color: "var(--muted)" }}>All clear · practice games open</span>
          )}
        </p>
      </div>

      <Link
        href="/perks"
        aria-label={balance == null ? "Token wallet, open perks" : `${balance} CitiTokens, open perks`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 44,
          padding: "0 14px 0 10px",
          borderRadius: "var(--radius-pill)",
          background: "var(--surface-2)",
          border: "1px solid var(--glass-border)",
          color: "var(--accent)",
          flexShrink: 0,
        }}
      >
        <CoinIcon size={20} weight={2.2} />
        <span className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
          {balance ?? "–"}
        </span>
      </Link>

      <button
        type="button"
        aria-label={legendOpen ? "Hide map legend" : "Show map legend"}
        aria-expanded={legendOpen}
        aria-controls="hunt-legend"
        onClick={onToggleLegend}
        style={{
          display: "grid",
          placeItems: "center",
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: "50%",
          border: "1px solid var(--glass-border)",
          background: legendOpen ? "var(--ink)" : "var(--surface-2)",
          color: legendOpen ? "var(--bg)" : "var(--ink)",
          transition: "background 160ms, color 160ms",
        }}
      >
        <LayersIcon size={21} />
      </button>
    </header>
  );
}
