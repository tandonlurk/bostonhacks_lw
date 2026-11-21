"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Hotspot, Vehicle } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { PlusIcon } from "@/components/icons";
import { BOSTON_BOUNDS } from "@/components/map/projection";
import { GAME_META, HEAT, heatLevel } from "./gameMeta";
import { FrameIcon, MinusIcon } from "./huntIcons";
import { layoutFor, sizesFor, type PlacedBadge, type Sizes } from "./mapLayout";
import {
  DRAW_ORDER,
  GLOW,
  MAP_BRANCHES,
  MAP_STATIONS,
  SHORT,
  START_BOUNDS,
  STATION_BY_ID,
  WORLD,
  boundsToWorld,
  projectLatLng,
  type MapStation,
} from "./mapModel";
import type { StationGames } from "./placeholderGames";
import { prefersReducedMotion, usePanZoom, type View } from "./usePanZoom";

interface TransitMapProps {
  hotspots?: Hotspot[];
  hotspotRoute?: Hotspot | null;
  delayedTeams: TeamRouteId[];
  /** stopId -> slowShare (0-1) from the delay heatmap. */
  heat: Map<string, number>;
  games: Map<string, StationGames>;
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (stopId: string) => void;
  /** Screen space covered by floating chrome, so framing keeps the network visible. */
  insetTop: number;
  insetBottom: number;
}

const TERMINUS_TEXT: Record<TeamRouteId, string> = { Red: "#fff", Orange: "#14181c", Blue: "#fff", Green: "#fff", Silver: "#14181c" };
const TERMINUS_FILL: Record<TeamRouteId, string> = {
  Red: "var(--line-red)",
  Orange: "var(--line-orange)",
  Blue: "var(--line-blue)",
  Green: "var(--line-green)",
  Silver: "var(--line-silver)",
};
const WORLD_SIZE = { w: WORLD.width, h: WORLD.height };
const FULL = boundsToWorld(BOSTON_BOUNDS);
const START = boundsToWorld(START_BOUNDS);
const HIT_RADIUS = 24;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function TransitMap({ hotspots = [], hotspotRoute, delayedTeams, heat, games, vehicles, selectedId, onSelect, insetTop, insetBottom }: TransitMapProps) {
  const layoutRef = useRef<{ badges: PlacedBadge[]; sizes: Sizes }>({ badges: [], sizes: sizesFor(1) });

  const onTap = useCallback(
    (sx: number, sy: number, v: View) => {
      const { badges } = layoutRef.current;
      // Badges first: they are the big targets.
      for (const b of badges) {
        const s = STATION_BY_ID.get(b.id);
        if (!s) continue;
        const cx = s.x * v.k + v.x;
        const cy = s.y * v.k + v.y + b.dy;
        if (Math.abs(sx - cx) <= b.w / 2 + 4 && Math.abs(sy - cy) <= Math.max(22, b.h / 2 + 4)) {
          onSelect(b.id);
          return;
        }
      }
      let best: MapStation | null = null;
      let bestD = HIT_RADIUS;
      for (const s of MAP_STATIONS) {
        if (s.minor) continue;
        const d = Math.hypot(s.x * v.k + v.x - sx, s.y * v.k + v.y - sy) - (games.has(s.id) ? 6 : 0);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      if (best) onSelect(best.id);
    },
    [games, onSelect],
  );

  const { svgRef, groupRef, ready, fit, focus, zoomAt, getView, getSize, zoom } = usePanZoom({ minK: 0.3, maxK: 9, world: WORLD_SIZE, onTap });

  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const sizes = useMemo(() => sizesFor(zoom), [zoom]);
  const layout = useMemo(() => layoutFor(zoom, sizes, games, selectedId), [zoom, sizes, games, selectedId]);

  useEffect(() => {
    layoutRef.current = { badges: layout.badges, sizes };
  }, [layout.badges, sizes]);

  // First frame: downtown core.
  useEffect(() => {
    if (ready) fit(START, { top: insetTop, bottom: insetBottom, side: 8 });
    // Only on first measure; later inset changes shouldn't yank the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Fly to the selected station, parking it above the sheet.
  useEffect(() => {
    if (!selectedId) return;
    const s = STATION_BY_ID.get(selectedId);
    if (!s) return;
    focus(s.x, s.y, Math.max(getView().k, 2.6), 0.26);
  }, [selectedId, focus, getView]);

  const zoomCenter = (f: number) => {
    const { w, h } = getSize();
    zoomAt(f, w / 2, h / 2, true);
  };

  const delayed = useMemo(() => new Set(delayedTeams), [delayedTeams]);
  const anyDelay = delayed.size > 0;
  const inv = 1 / zoom;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      <svg
        ref={svgRef}
        role="application"
        aria-label="Transit map. Drag to pan, pinch or scroll to zoom, double tap to zoom in. Stations with mini-games are listed below the map."
        width="100%"
        height="100%"
        style={{ display: "block", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", cursor: "grab" }}
      >
        <defs>
          <pattern id="hunt-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="0.9" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <g ref={groupRef} style={{ visibility: ready ? "visible" : "hidden" }}>
          <rect x={-FULL.w} y={-FULL.h} width={FULL.w * 3} height={FULL.h * 3} fill="url(#hunt-dots)" />
          <StaticLines inv={inv} sizes={sizes} delayed={delayed} anyDelay={anyDelay} />
          {anyDelay ? <DelayCrawl inv={inv} sizes={sizes} delayed={delayed} animate={!reduced} /> : null}
          {hotspotRoute && <path d={hotspotRoute.path.map(id=>STATION_BY_ID.get(id)).filter((p):p is MapStation=>!!p).map((p,i)=>`${i?"L":"M"}${p.x},${p.y}`).join(" ")} stroke="var(--accent)" strokeWidth={6*inv} fill="none" strokeDasharray={`${9*inv} ${6*inv}`} strokeLinecap="round" opacity={0.9}/>}
          <Stations inv={inv} sizes={sizes} heat={heat} games={games} delayed={delayed} anyDelay={anyDelay} zoom={zoom} />
          {zoom >= 0.7 ? <Vehicles inv={inv} vehicles={vehicles} /> : null}
          <Termini inv={inv} />
          <Labels inv={inv} sizes={sizes} labels={layout.labels} />
          <Badges inv={inv} sizes={sizes} badges={layout.badges} games={games} selectedId={selectedId} />
          {hotspots.map(h=>{const point=projectLatLng(h.lat,h.lng);return <g key={h.id} role="button" tabIndex={0} aria-label={`${h.name} hotspot, ${h.multiplier} times meeting bonus`} onClick={()=>onSelect(h.stationId)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(h.stationId);}}} transform={`translate(${point.x},${point.y}) scale(${inv})`} style={{cursor:"pointer"}}><circle r={22} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2}/><text textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={800} fill="var(--accent)">{h.multiplier}×</text></g>;})}
          {selectedId ? <Selection inv={inv} id={selectedId} /> : null}
        </g>
      </svg>

      {/* Vignette keeps floating chrome legible over bright lines. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(var(--bg) 0, transparent calc(var(--banner-space) + 120px)), linear-gradient(transparent 70%, rgba(7,9,13,0.85) 100%)",
        }}
      />

      <div
        className="glass"
        style={{
          position: "absolute",
          right: 12,
          top: `calc(env(safe-area-inset-top, 0px) + var(--banner-space) + ${insetTop - 4}px)`,
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "var(--shadow-float)",
        }}
      >
        <MapButton label="Zoom in" onClick={() => zoomCenter(1.8)}>
          <PlusIcon size={20} />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomCenter(1 / 1.8)}>
          <MinusIcon size={20} />
        </MapButton>
        <MapButton
          label="Show the whole network"
          onClick={() => {
            const v = getView();
            const { h } = getSize();
            // Toggle between the full network and the downtown core.
            const full = v.k < 0.6 * (h / FULL.h) + 0.2;
            fit(full ? START : FULL, { top: insetTop, bottom: insetBottom, side: 8 }, true);
          }}
        >
          <FrameIcon size={20} />
        </MapButton>
      </div>
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ display: "grid", placeItems: "center", width: 44, height: 44, border: "none", background: "transparent", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}

const StaticLines = memo(function StaticLines({
  inv,
  sizes,
  delayed,
  anyDelay,
}: {
  inv: number;
  sizes: Sizes;
  delayed: Set<TeamRouteId>;
  anyDelay: boolean;
}) {
  const ordered = DRAW_ORDER.flatMap((team) => MAP_BRANCHES.filter((b) => b.team === team));
  const width = (team: TeamRouteId) => (team === "Silver" ? sizes.line * 0.55 : sizes.line) * inv;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {ordered.map((b, i) => (
        <path key={`c${i}`} d={b.d} stroke="var(--bg)" strokeWidth={width(b.team) + 3 * inv} />
      ))}
      {ordered.map((b, i) => {
        const hot = delayed.has(b.team);
        return (
          <g key={`l${i}`} opacity={anyDelay && !hot ? 0.5 : 1}>
            {hot ? <path d={b.d} stroke={GLOW[b.team]} strokeOpacity={0.22} strokeWidth={width(b.team) * 2.6} /> : null}
            <path d={b.d} stroke={GLOW[b.team]} strokeWidth={width(b.team)} />
          </g>
        );
      })}
    </g>
  );
});

/** Hot-pink dashes crawling along delayed lines. */
function DelayCrawl({ inv, sizes, delayed, animate }: { inv: number; sizes: Sizes; delayed: Set<TeamRouteId>; animate: boolean }) {
  const dash = 5 * inv;
  const gap = 11 * inv;
  const period = dash + gap;
  return (
    <g fill="none" strokeLinecap="round" pointerEvents="none">
      {MAP_BRANCHES.filter((b) => delayed.has(b.team)).map((b, i) => (
        <path
          key={i}
          d={b.d}
          stroke="var(--hot)"
          strokeWidth={Math.max(1.6, sizes.line * 0.36) * inv}
          strokeDasharray={`${dash} ${gap}`}
        >
          {animate ? <animate attributeName="stroke-dashoffset" from="0" to={-period} dur="1.1s" repeatCount="indefinite" /> : null}
        </path>
      ))}
    </g>
  );
}

const Stations = memo(function Stations({
  inv,
  sizes,
  heat,
  games,
  delayed,
  anyDelay,
  zoom,
}: {
  inv: number;
  sizes: Sizes;
  heat: Map<string, number>;
  games: Map<string, StationGames>;
  delayed: Set<TeamRouteId>;
  anyDelay: boolean;
  zoom: number;
}) {
  return (
    <g>
      {MAP_STATIONS.map((s) => {
        if (s.minor && zoom < 2) return null;
        const share = heat.get(s.id);
        const level = share == null ? null : heatLevel(share);
        const fill = level ? HEAT[level].color : "#fff";
        const r = (s.minor ? sizes.stop * 0.7 : s.transfer ? sizes.transfer : sizes.stop) * inv;
        const g = games.get(s.id);
        const onDelayed = s.teams.some((t) => delayed.has(t));
        const dim = anyDelay && !onDelayed && !g && !level;
        return (
          <g key={s.id} opacity={dim ? 0.55 : 1}>
            {level && level !== "ok" ? (
              <circle cx={s.x} cy={s.y} r={r * 2.4} fill={HEAT[level].color} opacity={0.22} />
            ) : null}
            {g?.live ? (
              <circle
                cx={s.x}
                cy={s.y}
                r={r * 1.5}
                fill="none"
                stroke="var(--hot)"
                strokeWidth={1.5 * inv}
                style={{ animation: "pulse-ring 2.2s var(--ease-out) infinite", transformBox: "fill-box", transformOrigin: "center" }}
              />
            ) : null}
            <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke="#0b0d12" strokeWidth={(s.transfer ? 2 : 1.3) * inv} />
            {s.transfer ? <circle cx={s.x} cy={s.y} r={r + 1.6 * inv} fill="none" stroke="#fff" strokeWidth={1.1 * inv} /> : null}
          </g>
        );
      })}
    </g>
  );
});

function Vehicles({ inv, vehicles }: { inv: number; vehicles: Vehicle[] }) {
  return (
    <g pointerEvents="none">
      {vehicles.map((v) => {
        const p = projectLatLng(v.lat, v.lng);
        const rot = v.bearing ?? 0;
        return (
          <g key={v.id} transform={`translate(${p.x} ${p.y}) rotate(${rot}) scale(${inv})`}>
            <circle r={6.5} fill={GLOW[v.teamRouteId]} stroke="#0b0d12" strokeWidth={1.5} />
            {v.bearing != null ? <path d="M0,-4.2 L2.6,1.6 L0,0.4 L-2.6,1.6 Z" fill="#0b0d12" /> : <circle r={2} fill="#0b0d12" />}
          </g>
        );
      })}
    </g>
  );
}

function Termini({ inv }: { inv: number }) {
  return (
    <g pointerEvents="none">
      {MAP_STATIONS.filter((s) => s.terminus && s.out).map((s) => {
        const team = s.terminus!;
        const ox = s.out!.dx * 13;
        const oy = s.out!.dy * 13;
        return (
          <g key={s.id} transform={`translate(${s.x} ${s.y}) scale(${inv}) translate(${ox} ${oy})`}>
            <circle r={9.5} fill={TERMINUS_FILL[team]} stroke="#fff" strokeWidth={1.6} />
            <text
              textAnchor="middle"
              y={3.4}
              fontSize={9}
              fontWeight={800}
              fill={TERMINUS_TEXT[team]}
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
            >
              {SHORT[team]}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Labels({ inv, sizes, labels }: { inv: number; sizes: Sizes; labels: ReturnType<typeof layoutFor>["labels"] }) {
  return (
    <g pointerEvents="none" style={{ fontFamily: "var(--font-body)" }}>
      {labels.map((l) => {
        const s = STATION_BY_ID.get(l.id)!;
        const fs = l.strong ? sizes.font + 0.5 : sizes.font;
        return (
          <text
            key={l.id}
            x={s.x + l.dx * inv}
            y={s.y + l.dy * inv}
            textAnchor={l.anchor}
            fontSize={fs * inv}
            fontWeight={l.strong ? 750 : 600}
            fill={l.strong ? "var(--ink)" : "rgba(244,245,242,0.78)"}
            stroke="var(--bg)"
            strokeWidth={3.2 * inv}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {l.text}
          </text>
        );
      })}
    </g>
  );
}

function Badges({
  inv,
  sizes,
  badges,
  games,
  selectedId,
}: {
  inv: number;
  sizes: Sizes;
  badges: PlacedBadge[];
  games: Map<string, StationGames>;
  selectedId: string | null;
}) {
  const icon = sizes.badgeIcon;
  const step = icon + 4;
  return (
    <g pointerEvents="none">
      {badges.map((b) => {
        const s = STATION_BY_ID.get(b.id)!;
        const g = games.get(b.id)!;
        const shown = g.games.slice(0, 3);
        const extra = g.games.length - shown.length;
        const selected = b.id === selectedId;
        const border = selected ? "var(--accent)" : g.live ? "var(--hot)" : "rgba(255,255,255,0.28)";
        return (
          <g key={b.id} transform={`translate(${s.x} ${s.y}) scale(${inv}) translate(0 ${b.dy})`} style={{ animation: "fade-in 240ms" }}>
            <path d={`M-5,${b.h / 2 - 1} L0,${b.h / 2 + 5} L5,${b.h / 2 - 1} Z`} fill={border} />
            <rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx={b.h / 2} fill="#12161d" stroke={border} strokeWidth={1.6} />
            {shown.map((game, i) => {
              const { Icon, color } = GAME_META[game.kind];
              const x = -b.w / 2 + 5 + i * step + 2;
              return <Icon key={game.id} x={x} y={-icon / 2} size={icon} weight={2.3} color={color} />;
            })}
            {extra > 0 ? (
              <text x={b.w / 2 - 10} y={3.5} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--muted)">
                +{extra}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function Selection({ inv, id }: { inv: number; id: string }) {
  const s = STATION_BY_ID.get(id);
  if (!s) return null;
  return (
    <g transform={`translate(${s.x} ${s.y}) scale(${inv})`} pointerEvents="none">
      <circle r={16} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
      <circle
        r={16}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        style={{ animation: "pulse-ring 1.6s var(--ease-out) infinite", transformBox: "fill-box", transformOrigin: "center" }}
      />
    </g>
  );
}
