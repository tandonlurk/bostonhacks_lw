"use client";

// Hunt map: a layered-paper transit network on a kraft table (docs/design.md section 6).
//
// Render budget (what runs when):
//   - Pan / pinch / wheel: usePanZoom writes one transform attribute per animation frame. No React.
//   - Zoom bucket change: onBucket writes --inv / --st / --lw / data-lod onto the <svg>. Markers keep their screen
//     size and detail tiers appear via CSS. No React.
//   - Input settles after a bucket change: React re-renders only the zoom-dependent layers (labels + quest notes).
//     Paper geography, scenery, route strips, stations, termini and vehicles are memoized with zoom-free props, so
//     they are skipped.
//   - Looping map animations (delay crawl, live pulses) are stop-motion (CSS steps), so a live delay repaints the map
//     ~8 times a second instead of 60.
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { Hotspot, Vehicle } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { PlusIcon } from "@/components/icons";
import { BOSTON_BOUNDS } from "@/components/map/projection";
import { PaperFlag, shade } from "@/components/paper/origami";
import { GAME_META, HEAT, heatLevel } from "./gameMeta";
import { FrameIcon, MinusIcon } from "./huntIcons";
import { MapBase, MapNames, MapScenery } from "./MapScenery";
import { layoutFor, lineWidthFor, lodFor, sizesFor, type PlacedBadge, type PlacedLabel, type Sizes } from "./mapLayout";
import {
  DRAW_ORDER,
  LINE_FILL,
  LINE_HEX,
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
import { usePanZoom, type View } from "./usePanZoom";
import css from "./map.module.css";

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

/** Text on a line-colored tag (white fails 4.5:1 on Orange and Silver). */
const ON_LINE: Record<TeamRouteId, string> = { Red: "#fffaf0", Orange: "#2a241d", Blue: "#fffaf0", Green: "#fffaf0", Silver: "#2a241d" };
const EDGE: Record<TeamRouteId, string> = {
  Red: shade(LINE_HEX.Red, -0.3),
  Orange: shade(LINE_HEX.Orange, -0.3),
  Blue: shade(LINE_HEX.Blue, -0.3),
  Green: shade(LINE_HEX.Green, -0.3),
  Silver: shade(LINE_HEX.Silver, -0.3),
};
const ACCENT_HEX = "#2f6b45";
const HOT_HEX = "#c8325a";
const CREAM = "#fffaf0";
const INK = "#2a241d";
const PAPER_EDGE = "rgba(92,66,32,0.38)";
const SHADOW = "rgba(74,52,22,0.24)";

const WORLD_SIZE = { w: WORLD.width, h: WORLD.height };
const FULL = boundsToWorld(BOSTON_BOUNDS);
const START = boundsToWorld(START_BOUNDS);
const HIT_RADIUS = 24;
const HOTSPOT_HIT = 26;
const EMPTY_HOTSPOTS: Hotspot[] = [];

/** Writes the zoom-dependent CSS variables + detail tier straight onto the <svg> (see map.module.css). */
function tuneForZoom(b: number, svg: SVGSVGElement) {
  const lw = lineWidthFor(b);
  svg.style.setProperty("--inv", (1 / b).toFixed(5));
  svg.style.setProperty("--st", (lw / 4.6 / b).toFixed(5));
  svg.style.setProperty("--lw", `${lw.toFixed(2)}px`);
  svg.dataset.lod = String(lodFor(b));
}

export function TransitMap({
  hotspots = EMPTY_HOTSPOTS,
  hotspotRoute,
  delayedTeams,
  heat,
  games,
  vehicles,
  selectedId,
  onSelect,
  insetTop,
  insetBottom,
}: TransitMapProps) {
  const layoutRef = useRef<{ badges: PlacedBadge[]; hotspots: Hotspot[] }>({ badges: [], hotspots: [] });

  const onTap = useCallback(
    (sx: number, sy: number, v: View) => {
      const { badges, hotspots: spots } = layoutRef.current;
      // Hotspot flags first (they sit on top), then quest notes, then the nearest station.
      for (const h of spots) {
        const p = projectLatLng(h.lat, h.lng);
        if (Math.hypot(p.x * v.k + v.x + 4 - sx, p.y * v.k + v.y - 14 - sy) <= HOTSPOT_HIT) {
          onSelect(h.stationId);
          return;
        }
      }
      for (const b of badges) {
        const s = STATION_BY_ID.get(b.id);
        if (!s) continue;
        const cx = s.x * v.k + v.x;
        const cy = s.y * v.k + v.y + b.dy;
        if (Math.abs(sx - cx) <= Math.max(22, b.w / 2 + 4) && Math.abs(sy - cy) <= Math.max(22, b.h / 2 + 4)) {
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

  const { svgRef, groupRef, ready, fit, focus, zoomAt, getView, getSize, zoom } = usePanZoom({
    minK: 0.3,
    maxK: 9,
    world: WORLD_SIZE,
    onTap,
    onBucket: tuneForZoom,
  });

  const sizes = useMemo(() => sizesFor(zoom), [zoom]);
  const layout = useMemo(() => layoutFor(zoom, sizes, games, selectedId), [zoom, sizes, games, selectedId]);

  useEffect(() => {
    layoutRef.current = { badges: layout.badges, hotspots };
  }, [layout.badges, hotspots]);

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

  const delayKey = delayedTeams.join(",");
  const delayed = useMemo(() => new Set(delayKey ? (delayKey.split(",") as TeamRouteId[]) : []), [delayKey]);
  const anyDelay = delayed.size > 0;
  const hasBadge = !!selectedId && layout.badges.some((b) => b.id === selectedId);

  return (
    <div className={css.wrap}>
      <svg
        ref={svgRef}
        className={css.svg}
        role="application"
        tabIndex={0}
        aria-label="Transit map. Drag to pan, pinch or scroll to zoom, double tap to zoom in. With the keyboard, arrow keys pan and plus or minus zoom. Stations with mini-games are listed below the map."
      >
        <g ref={groupRef} style={{ visibility: ready ? "visible" : "hidden" }}>
          <MapBase />
          <MapScenery />
          <Strips delayed={delayed} anyDelay={anyDelay} />
          {anyDelay ? <DelayCrawl delayed={delayed} /> : null}
          {hotspotRoute ? <HotspotRoute route={hotspotRoute} /> : null}
          <Stations heat={heat} games={games} delayed={delayed} anyDelay={anyDelay} />
          <Vehicles vehicles={vehicles} />
          <Termini />
          <MapNames />
          <Labels sizes={sizes} labels={layout.labels} />
          {selectedId ? <Selection id={selectedId} flag={!hasBadge} /> : null}
          <Badges sizes={sizes} badges={layout.badges} games={games} selectedId={selectedId} />
          <Hotspots hotspots={hotspots} onSelect={onSelect} />
        </g>
      </svg>

      {/* Fades keep the floating paper chrome legible over busy map areas. */}
      <div aria-hidden="true" className={css.fade} />

      <div className={`paper ${css.controls}`} style={{ top: `calc(env(safe-area-inset-top, 0px) + var(--banner-space) + ${insetTop - 4}px)` }}>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomCenter(1.8)}>
          <PlusIcon size={20} />
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomCenter(1 / 1.8)}>
          <MinusIcon size={20} />
        </button>
        <button
          type="button"
          aria-label="Show the whole network"
          title="Show the whole network"
          onClick={() => {
            const v = getView();
            const { h } = getSize();
            // Toggle between the full network and the downtown core.
            const full = v.k < 0.6 * (h / FULL.h) + 0.2;
            fit(full ? START : FULL, { top: insetTop, bottom: insetBottom, side: 8 }, true);
          }}
        >
          <FrameIcon size={20} />
        </button>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Zoom-free layers (memoized: never re-render while zooming)              */
/* ====================================================================== */

const ORDERED_BRANCHES = DRAW_ORDER.flatMap((team) => MAP_BRANCHES.filter((b) => b.team === team));

/** Each route is a raised strip of colored paper: contact shadow, darker cut edge, exact line color face, crease. */
const Strips = memo(function Strips({ delayed, anyDelay }: { delayed: Set<TeamRouteId>; anyDelay: boolean }) {
  return (
    <g pointerEvents="none">
      {ORDERED_BRANCHES.map((b, i) => {
        const hot = delayed.has(b.team);
        const vars = { "--w": b.team === "Silver" ? "calc(var(--lw) * 0.6)" : "var(--lw)" } as React.CSSProperties;
        return (
          <g key={i} style={vars} opacity={anyDelay && !hot ? 0.45 : 1}>
            <g className={css.dropSm}>
              <path className={`${css.strip} ${css.stripShadow}`} d={b.d} vectorEffect="non-scaling-stroke" />
            </g>
            {hot ? <path className={`${css.strip} ${css.stripGlow}`} d={b.d} vectorEffect="non-scaling-stroke" /> : null}
            <path className={`${css.strip} ${css.stripEdge}`} d={b.d} stroke={EDGE[b.team]} vectorEffect="non-scaling-stroke" />
            <path className={`${css.strip} ${css.stripFace}`} d={b.d} stroke={LINE_FILL[b.team]} vectorEffect="non-scaling-stroke" />
            <g className={css.creaseUp}>
              <path className={`${css.strip} ${css.stripCrease}`} d={b.d} vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        );
      })}
    </g>
  );
});

/** Hot-pink dashes crawling (stop-motion) along delayed lines. Pattern, not just color, marks the delay. */
const DelayCrawl = memo(function DelayCrawl({ delayed }: { delayed: Set<TeamRouteId> }) {
  return (
    <g pointerEvents="none">
      {MAP_BRANCHES.filter((b) => delayed.has(b.team)).map((b, i) => (
        <path key={i} className={css.crawl} d={b.d} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
});

const HotspotRoute = memo(function HotspotRoute({ route }: { route: Hotspot }) {
  const d = route.path
    .map((id) => STATION_BY_ID.get(id))
    .filter((p): p is MapStation => !!p)
    .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
    .join(" ");
  return <path className={css.route} d={d} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
});

/** Detail tier for a station dot (lod classes are revealed by data-lod on the svg). */
function stationTier(s: MapStation, featured: boolean) {
  if (featured || s.importance === 3) return undefined;
  if (s.minor) return css.lod3;
  return s.importance === 2 ? css.lod1 : css.lod2;
}

/**
 * Stations are punched paper rings: a cream ring with an ink edge and a hole showing the table (heat fills the hole).
 * Transfers are a double ring. Drawn at a base size inside a CSS-scaled group (--st), so zoom never re-renders them.
 */
const Stations = memo(function Stations({
  heat,
  games,
  delayed,
  anyDelay,
}: {
  heat: Map<string, number>;
  games: Map<string, StationGames>;
  delayed: Set<TeamRouteId>;
  anyDelay: boolean;
}) {
  return (
    <g pointerEvents="none">
      {MAP_STATIONS.map((s) => {
        const share = heat.get(s.id);
        const level = share == null ? null : heatLevel(share);
        const g = games.get(s.id);
        const onDelayed = s.teams.some((t) => delayed.has(t));
        const dim = anyDelay && !onDelayed && !g && !level;
        const r = s.minor ? 2 : s.transfer ? 5.2 : 3.1;
        const hr = s.transfer ? 1.7 : 1.3;
        const hole = level ? HEAT[level].color : "var(--map-hole)";
        return (
          <g
            key={s.id}
            transform={`translate(${s.x} ${s.y})`}
            className={stationTier(s, !!g || (!!level && level !== "ok"))}
            opacity={dim ? 0.55 : 1}
          >
            <g className={css.st}>
              {level && level !== "ok" ? <circle r={r * 2.3} fill={HEAT[level].color} opacity={0.24} /> : null}
              {g?.live ? <circle className={css.pulse} r={r * 1.6} fill="none" stroke="var(--hot)" strokeWidth={1.4} /> : null}
              <circle cx={0.6} cy={1} r={r} fill={SHADOW} />
              <circle r={r} fill={CREAM} stroke={INK} strokeWidth={s.transfer ? 1.5 : s.minor ? 0.8 : 1.1} />
              {s.transfer ? <circle r={r - 1.9} fill="none" stroke={INK} strokeWidth={0.8} /> : null}
              {s.minor ? null : (
                <>
                  <circle r={hr} fill={hole} />
                  {/* the hole's top lip casts a crescent shadow */}
                  <path d={`M${-hr},0 A${hr},${hr} 0 0 1 ${hr},0 Z`} fill="rgba(42,30,18,0.26)" />
                </>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
});

/** Live trains as small paper tokens in the line color with a folded direction arrow. */
const Vehicles = memo(function Vehicles({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <g pointerEvents="none" className={css.lod1}>
      {vehicles.map((v) => {
        const p = projectLatLng(v.lat, v.lng);
        const rot = v.bearing ?? 0;
        return (
          <g key={v.id} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <g className={css.inv}>
              <g transform={`rotate(${rot})`}>
                <circle cx={0.8} cy={1.4} r={6.5} fill={SHADOW} />
                <circle r={6.5} fill={LINE_FILL[v.teamRouteId]} stroke={CREAM} strokeWidth={1.8} />
                {v.bearing != null ? (
                  <path d="M0,-4.2 L2.6,1.6 L0,0.4 L-2.6,1.6 Z" fill={ON_LINE[v.teamRouteId]} />
                ) : (
                  <circle r={2} fill={ON_LINE[v.teamRouteId]} />
                )}
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});

/** Line-end tags (RL, OL, ...) like the official map, as small folded paper tags. */
const Termini = memo(function Termini() {
  return (
    <g pointerEvents="none">
      {MAP_STATIONS.filter((s) => s.terminus && s.out).map((s) => {
        const team = s.terminus!;
        const ox = s.out!.dx * 14;
        const oy = s.out!.dy * 14;
        return (
          <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
            <g className={css.inv}>
              <g transform={`translate(${ox.toFixed(1)} ${oy.toFixed(1)})`}>
                <rect x={-9.7} y={-6.1} width={21} height={15} rx={2.5} fill={SHADOW} />
                <rect x={-10.5} y={-7.5} width={21} height={15} rx={2.5} fill={LINE_FILL[team]} stroke={EDGE[team]} strokeWidth={0.8} />
                <path d="M4.5,-7.5 L10.5,-7.5 L10.5,-1.5 Z" fill="rgba(255,250,240,0.35)" />
                <text
                  textAnchor="middle"
                  y={3.4}
                  fontSize={9}
                  fontWeight={800}
                  fill={ON_LINE[team]}
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
                >
                  {SHORT[team]}
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});

/* ====================================================================== */
/* Zoom-dependent layers (re-render once per settled zoom bucket)          */
/* ====================================================================== */

const Labels = memo(function Labels({ sizes, labels }: { sizes: Sizes; labels: PlacedLabel[] }) {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {labels.map((l) => {
        const s = STATION_BY_ID.get(l.id)!;
        const fs = l.strong ? sizes.font + 0.5 : sizes.font;
        return (
          <g key={l.id} transform={`translate(${s.x} ${s.y})`}>
            <text
              className={`${css.inv} ${css.label}`}
              x={l.dx}
              y={l.dy}
              textAnchor={l.anchor}
              fontSize={fs}
              fontWeight={l.strong ? 750 : 600}
              fill={l.strong ? INK : "#4a4034"}
            >
              {l.text}
            </text>
          </g>
        );
      })}
    </g>
  );
});

/**
 * Quest notes: pinned paper notes above game stations. Live ones carry a folded hot flag (shape, not just color);
 * practice ones a brick push pin. The selected note lifts, grows and casts a longer shadow.
 */
const Badges = memo(function Badges({
  sizes,
  badges,
  games,
  selectedId,
}: {
  sizes: Sizes;
  badges: PlacedBadge[];
  games: Map<string, StationGames>;
  selectedId: string | null;
}) {
  const icon = sizes.badgeIcon;
  const step = icon + 4;
  return (
    <g pointerEvents="none" aria-hidden="true">
      {badges.map((b) => {
        const s = STATION_BY_ID.get(b.id)!;
        const g = games.get(b.id)!;
        const shown = g.games.slice(0, 3);
        const extra = g.games.length - shown.length;
        const selected = b.id === selectedId;
        const x0 = -b.w / 2;
        const y0 = -b.h / 2;
        const edge = selected ? INK : PAPER_EDGE;
        return (
          <g key={b.id} transform={`translate(${s.x} ${s.y})`}>
            <g className={css.inv}>
              <g transform={`translate(0 ${b.dy})`}>
                <g className={`${css.note} ${selected ? css.noteSelected : ""}`}>
                  {selected ? <rect x={x0 + 3} y={y0 + 7} width={b.w} height={b.h} rx={3} fill="rgba(74,52,22,0.16)" /> : null}
                  <rect x={x0 + 1.2} y={y0 + 2.4} width={b.w} height={b.h} rx={3} fill={SHADOW} />
                  <path d={`M-5,${b.h / 2 - 1} L0,${b.h / 2 + 6} L5,${b.h / 2 - 1} Z`} fill={CREAM} stroke={edge} strokeWidth={1} />
                  <rect x={x0} y={y0} width={b.w} height={b.h} rx={3} fill={CREAM} stroke={edge} strokeWidth={selected ? 1.8 : 1} />
                  <rect x={-4} y={b.h / 2 - 2} width={8} height={2.4} fill={CREAM} />
                  {/* dog-ear */}
                  <path d={`M${b.w / 2 - 7},${y0} L${b.w / 2},${y0 + 7} L${b.w / 2 - 7},${y0 + 7} Z`} fill="#e6d9bf" stroke={PAPER_EDGE} strokeWidth={0.6} />
                  {shown.map((game, i) => {
                    const { Icon, color } = GAME_META[game.kind];
                    const x = x0 + 5 + i * step + 2;
                    return <Icon key={game.id} x={x} y={-icon / 2} size={icon} weight={2.3} color={color} />;
                  })}
                  {extra > 0 ? (
                    <text x={b.w / 2 - 10} y={3.5} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--muted)">
                      +{extra}
                    </text>
                  ) : null}
                  {g.live ? (
                    <g transform={`translate(${x0 - 1} ${y0 - 12})`}>
                      <PaperFlag height={15} tint={HOT_HEX} />
                    </g>
                  ) : (
                    <circle cx={0} cy={y0 + 0.5} r={2.4} fill="var(--brick)" stroke="rgba(42,30,18,0.35)" strokeWidth={0.6} />
                  )}
                </g>
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});

/** Selected station: a lifted paper ring with a stop-motion pulse, plus a planted folded flag if it has no note. */
function Selection({ id, flag }: { id: string; flag: boolean }) {
  const s = STATION_BY_ID.get(id);
  if (!s) return null;
  return (
    <g transform={`translate(${s.x} ${s.y})`} pointerEvents="none" aria-hidden="true">
      <g className={css.inv}>
        <circle cx={1.2} cy={2.4} r={15} fill="none" stroke={SHADOW} strokeWidth={4} />
        <circle r={15} fill="none" stroke={CREAM} strokeWidth={4.5} />
        <circle r={15} fill="none" stroke={INK} strokeWidth={1.6} />
        <circle className={css.pulse} r={15} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {flag ? (
          <g transform="translate(8.5 -40)">
            <ellipse cx={4} cy={28} rx={6} ry={2} fill={SHADOW} />
            <PaperFlag height={30} tint={ACCENT_HEX} />
          </g>
        ) : null}
      </g>
    </g>
  );
}

/** Hotspots: folded green flags planted on the map with a paper tag showing the meeting multiplier. */
const Hotspots = memo(function Hotspots({ hotspots, onSelect }: { hotspots: Hotspot[]; onSelect: (stopId: string) => void }) {
  return (
    <g>
      {hotspots.map((h) => {
        const p = projectLatLng(h.lat, h.lng);
        return (
          <g
            key={h.id}
            role="button"
            tabIndex={0}
            className={css.hotspot}
            aria-label={`${h.name} hotspot, ${h.multiplier} times meeting bonus`}
            onClick={() => onSelect(h.stationId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onSelect(h.stationId);
              }
            }}
            transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
          >
            <g className={css.inv}>
              {/* Invisible 44px+ target and the keyboard focus ring. */}
              <circle cx={4} cy={-14} r={HOTSPOT_HIT} fill="transparent" />
              <circle className={css.focusRing} cx={4} cy={-14} r={HOTSPOT_HIT - 2} />
              <ellipse cx={3} cy={0} rx={7} ry={2.4} fill={SHADOW} />
              <g transform="translate(-4 -29)">
                <PaperFlag height={30} tint={ACCENT_HEX} />
              </g>
              <g transform="translate(5 -18)">
                <rect x={1} y={1.6} width={26} height={16} rx={2.5} fill={SHADOW} />
                <rect width={26} height={16} rx={2.5} fill={CREAM} stroke={PAPER_EDGE} strokeWidth={1} />
                <text x={13} y={11.8} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK} style={{ fontFamily: "var(--font-display)" }}>
                  {h.multiplier}×
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});
