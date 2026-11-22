"use client";

import Link from "next/link";
import { TEAMS, type TeamRouteId } from "@/contracts/routes";
import { CoinIcon } from "@/components/icons";
import { PaperFlag } from "@/components/paper/origami";
import { LayersIcon } from "./huntIcons";
import { SHORT } from "./mapModel";

interface HuntHeaderProps {
  delayedTeams: TeamRouteId[];
  liveStations: number;
  balance: number | null;
  legendOpen: boolean;
  onToggleLegend: () => void;
}

/** Floating card-stock header: title, delay status, token wallet (links to Perks) and legend toggle. */
export function HuntHeader({ delayedTeams, liveStations, balance, legendOpen, onToggleLegend }: HuntHeaderProps) {
  const live = delayedTeams.length > 0;
  return (
    <header
      className="paper paper--stack"
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + var(--banner-space) + 10px)",
        left: 12,
        right: 12,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 8px 8px 12px",
        borderRadius: 10,
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", marginTop: -4 }}>
        <PaperFlag height={34} tint={live ? "#c8325a" : "#2f6b45"} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>Hunt</h1>
        <p role="status" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, fontSize: 12.5, fontWeight: 650, whiteSpace: "nowrap", minWidth: 0 }}>
          {live ? (
            <span style={{ color: "#a8243f", overflow: "hidden", textOverflow: "ellipsis" }}>
              {delayedTeams.length === 1 ? `${TEAMS[delayedTeams[0]].name} delay` : `Delays on ${delayedTeams.map((t) => SHORT[t]).join(" + ")}`} · {liveStations} game stops
            </span>
          ) : (
            <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>All clear · practice games open</span>
          )}
        </p>
      </div>

      <Link
        href="/perks"
        className="paper-btn"
        aria-label={balance == null ? "Token wallet, open perks" : `${balance} CitiTokens, open perks`}
        style={{ gap: 6, height: 44, padding: "0 12px 0 10px", color: "var(--gold-ink)", flexShrink: 0 }}
      >
        <CoinIcon size={20} weight={2.2} />
        <span className="num" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
          {balance ?? "–"}
        </span>
      </Link>

      <button
        type="button"
        className="paper-btn"
        aria-label={legendOpen ? "Hide map legend" : "Show map legend"}
        aria-expanded={legendOpen}
        aria-controls="hunt-legend"
        onClick={onToggleLegend}
        style={{
          width: 44,
          height: 44,
          padding: 0,
          flexShrink: 0,
          ...(legendOpen ? { background: "var(--ink)", color: "var(--cream)", boxShadow: "0 0 0 var(--fold-shadow)", transform: "translateY(2px)" } : null),
        }}
      >
        <LayersIcon size={21} />
      </button>
    </header>
  );
}
