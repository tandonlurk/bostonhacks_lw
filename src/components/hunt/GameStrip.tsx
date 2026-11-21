"use client";

import { ChevronIcon } from "@/components/icons";
import { GAME_META, GAME_ORDER, HEAT, heatLevel } from "./gameMeta";
import { GLOW, STATION_BY_ID, type MapStation } from "./mapModel";
import type { StationGames } from "./placeholderGames";

interface GameStripProps {
  live: boolean;
  stations: StationGames[];
  heat: Map<string, number>;
  onPick: (stopId: string) => void;
}

/**
 * Bottom carousel above the nav. During a delay: the live game stations as swipeable cards (also the keyboard /
 * screen-reader path into the map). When all clear: a calm card that previews what unlocks plus practice stops.
 */
export function GameStrip({ live, stations, heat, onPick }: GameStripProps) {
  return (
    <section
      aria-label={live ? "Stations with live mini-games" : "Practice mini-games"}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "calc(var(--nav-clearance) - 4px)",
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      {live ? null : <AllClear />}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: "4px 12px 6px",
          scrollPaddingInline: 12,
          pointerEvents: "auto",
          scrollbarWidth: "none",
        }}
      >
        {stations.map((g) => {
          const s = STATION_BY_ID.get(g.stopId);
          return s ? <StationCard key={g.stopId} s={s} g={g} share={heat.get(g.stopId)} onPick={onPick} /> : null;
        })}
      </div>
    </section>
  );
}

function StationCard({ s, g, share, onPick }: { s: MapStation; g: StationGames; share: number | undefined; onPick: (id: string) => void }) {
  const best = g.games.reduce((m, x) => Math.max(m, x.rewardPoints), 0);
  const level = share == null ? null : heatLevel(share);
  return (
    <button
      type="button"
      onClick={() => onPick(s.id)}
      aria-label={`${s.name}: ${g.games.length} mini-games, up to ${best} points${g.live ? ", live during delay" : ", practice"}`}
      className="glass"
      style={{
        flex: "0 0 auto",
        width: 176,
        minHeight: 88,
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
        padding: "10px 12px 10px 14px",
        borderRadius: 20,
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
        borderColor: g.live ? "rgba(255,61,127,0.45)" : "var(--glass-border)",
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, borderRadius: 2, display: "flex", flexDirection: "column" }}>
        {s.teams.map((t) => (
          <span key={t} style={{ flex: 1, background: GLOW[t] }} />
        ))}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ flex: 1, minWidth: 0, fontWeight: 750, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
        {level ? <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: HEAT[level].color, flexShrink: 0 }} /> : null}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {g.games.map((game) => {
          const { Icon, color } = GAME_META[game.kind];
          return (
            <span key={game.id} style={{ color, display: "inline-flex" }}>
              <Icon size={19} weight={2.2} />
            </span>
          );
        })}
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 13, fontWeight: 800, color: g.live ? "var(--accent)" : "var(--muted)" }}>
          +{best}
        </span>
        <ChevronIcon size={14} weight={2.4} style={{ color: "var(--muted)" }} />
      </span>
    </button>
  );
}

function AllClear() {
  return (
    <div
      className="glass"
      style={{
        margin: "0 12px 8px",
        padding: "12px 14px",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        gap: 12,
        pointerEvents: "auto",
        animation: "fade-in 240ms var(--ease-out)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, lineHeight: 1.15 }}>All clear.</p>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Mini-games unlock along a line when it slows down. Warm up below.</p>
      </div>
      <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(2, 22px)", gap: 6 }}>
        {GAME_ORDER.map((k) => {
          const { Icon, color } = GAME_META[k];
          return (
            <span key={k} style={{ color, display: "inline-flex", opacity: 0.9 }}>
              <Icon size={22} weight={2.1} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
