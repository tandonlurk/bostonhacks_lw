"use client";

import { ChevronIcon } from "@/components/icons";
import { Stamp, Tape } from "@/components/paper/Paper";
import { PaperFlag, StationArt } from "@/components/paper/origami";
import { GAME_META, GAME_ORDER, HEAT, heatLevel } from "./gameMeta";
import { LINE_FILL, STATION_BY_ID, type MapStation } from "./mapModel";
import type { StationGames } from "./placeholderGames";

interface GameStripProps {
  live: boolean;
  stations: StationGames[];
  heat: Map<string, number>;
  onPick: (stopId: string) => void;
}

/**
 * Bottom carousel above the nav. During a delay: the live game stations as swipeable paper tags (also the keyboard /
 * screen-reader path into the map). When all clear: a taped note that previews what unlocks plus practice stops.
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
          padding: "12px 12px 8px",
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
      aria-label={`${s.name}: ${g.games.length} mini-games, up to ${best} points${g.live ? ", live during delay" : ", practice"}${level ? `, ${HEAT[level].label.toLowerCase()}` : ""}`}
      className="paper"
      style={{
        flex: "0 0 auto",
        width: 184,
        minHeight: 92,
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
        padding: "10px 12px 10px 16px",
        borderRadius: 6,
        textAlign: "left",
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* line-color paper strips glued along the left edge */}
      <span aria-hidden="true" style={{ position: "absolute", left: 4, top: 8, bottom: 8, width: 5, display: "flex", flexDirection: "column", gap: 2 }}>
        {s.teams.map((t) => (
          <span key={t} style={{ flex: 1, borderRadius: 2, background: LINE_FILL[t], boxShadow: "1px 1px 0 rgba(60,40,18,0.25)" }} />
        ))}
      </span>
      {g.live ? (
        <span aria-hidden="true" style={{ position: "absolute", right: 10, top: -12 }}>
          <PaperFlag height={22} tint="#c8325a" />
        </span>
      ) : null}
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", alignItems: "flex-end", height: 26 }}>
          <StationArt name={s.name} height={24} />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-display)", fontWeight: 650, fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {s.name}
        </span>
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
        {level && level !== "ok" ? (
          <span aria-hidden="true" style={{ fontSize: 11, fontWeight: 700, color: HEAT[level].ink }}>
            {HEAT[level].label}
          </span>
        ) : null}
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 14, fontWeight: 700, color: g.live ? "var(--accent)" : "var(--muted)" }}>
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
      className="paper paper--crease paper-unfold"
      style={{
        margin: "8px 12px 6px",
        padding: "14px 14px 12px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 12,
        pointerEvents: "auto",
      }}
    >
      <Tape rotate={-4} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, lineHeight: 1.15 }}>All clear.</span>
          <Stamp color="var(--accent)" rotate={-3}>
            Practice
          </Stamp>
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Mini-games unlock along a line when it slows down. Warm up below.</p>
      </div>
      <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(2, 22px)", gap: 6 }}>
        {GAME_ORDER.map((k) => {
          const { Icon, color } = GAME_META[k];
          return (
            <span key={k} style={{ color, display: "inline-flex" }}>
              <Icon size={22} weight={2.1} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
