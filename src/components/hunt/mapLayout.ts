// Zoom-dependent level of detail for the Hunt map: marker sizes, which labels and game badges fit without colliding.
// Everything is computed in "screen pixels at zoom z" (world * z), which is translation invariant, so it only
// re-runs when the zoom bucket changes.
import type { LabelSide, MapStation } from "./mapModel";
import { MAP_STATIONS } from "./mapModel";
import type { StationGames } from "./placeholderGames";

export interface Sizes {
  line: number;
  casing: number;
  stop: number;
  transfer: number;
  font: number;
  badgeIcon: number;
}

export function sizesFor(z: number): Sizes {
  const line = Math.min(10, Math.max(3, 4.6 * Math.sqrt(z)));
  return {
    line,
    casing: line + 3,
    stop: Math.max(2.2, line * 0.42),
    transfer: Math.max(3.6, line * 0.78),
    font: Math.min(14, Math.max(10, 9.5 + z * 1.2)),
    badgeIcon: 15,
  };
}

export interface PlacedLabel {
  id: string;
  text: string;
  /** Anchor offset in px from the station center. */
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
  strong: boolean;
}

export interface PlacedBadge {
  id: string;
  /** Badge center offset in px from the station (always straight up). */
  dy: number;
  w: number;
  h: number;
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function labelGeometry(side: LabelSide, gap: number, fs: number) {
  const v = gap * 0.55 + fs * 0.45;
  switch (side) {
    case "l":
      return { dx: -gap, dy: 0, anchor: "end" as const };
    case "t":
      return { dx: 0, dy: -(gap + fs * 0.45), anchor: "middle" as const };
    case "b":
      return { dx: 0, dy: gap + fs * 0.5, anchor: "middle" as const };
    case "tr":
      return { dx: gap * 0.7, dy: -v, anchor: "start" as const };
    case "tl":
      return { dx: -gap * 0.7, dy: -v, anchor: "end" as const };
    case "br":
      return { dx: gap * 0.7, dy: v, anchor: "start" as const };
    case "bl":
      return { dx: -gap * 0.7, dy: v, anchor: "end" as const };
    default:
      return { dx: gap, dy: 0, anchor: "start" as const };
  }
}

function sideFromOut(out: { dx: number; dy: number }): LabelSide {
  if (Math.abs(out.dx) > Math.abs(out.dy)) return out.dx > 0 ? "r" : "l";
  return out.dy > 0 ? "b" : "t";
}

/** Minimum zoom at which a station of each importance gets a label. */
const LABEL_MIN_Z = { 1: 2.6, 2: 1.25, 3: 0.55 } as const;

export function layoutFor(
  z: number,
  sizes: Sizes,
  games: Map<string, StationGames>,
  selectedId: string | null,
): { labels: PlacedLabel[]; badges: PlacedBadge[] } {
  const taken: Rect[] = [];
  const badges: PlacedBadge[] = [];
  const labels: PlacedLabel[] = [];
  const iconStep = sizes.badgeIcon + 4;

  const placeLabel = (s: MapStation) => {
    if (s.minor) return;
    if (z < LABEL_MIN_Z[s.importance] && s.id !== selectedId) return;
    const strong = s.importance === 3;
    const fs = strong ? sizes.font + 0.5 : sizes.font;
    const textW = s.name.length * fs * 0.56;
    const radius = s.transfer ? sizes.transfer : sizes.stop;
    let side = s.side;
    let gap = radius + 5;
    let ox = 0;
    let oy = 0;
    if (s.terminus && s.out) {
      // Push the name past the terminus badge.
      ox = s.out.dx * 20;
      oy = s.out.dy * 20;
      side = sideFromOut(s.out);
      gap = 13;
    }
    const geo = labelGeometry(side, gap, fs);
    const dx = geo.dx + ox;
    const dy = geo.dy + oy;
    const ax = s.x * z + dx;
    const ay = s.y * z + dy;
    const x0 = geo.anchor === "start" ? ax : geo.anchor === "end" ? ax - textW : ax - textW / 2;
    const r = { x0: x0 - 2, x1: x0 + textW + 2, y0: ay - fs * 0.5, y1: ay + fs * 0.5 };
    if (taken.some((t) => overlaps(t, r))) return;
    taken.push(r);
    labels.push({ id: s.id, text: s.name, dx, dy: dy + fs * 0.35, anchor: geo.anchor, strong });
  };

  // 1. Transfer and terminus names win: they are how riders orient.
  const major = MAP_STATIONS.filter((s) => s.importance === 3).sort((a, b) => (b.terminus ? 1 : 0) - (a.terminus ? 1 : 0));
  major.forEach(placeLabel);

  // 2. Game badges: selected first, then live by importance, then practice.
  const badgeMinImportance = z < 0.8 ? 3 : z < 1.7 ? 2 : 1;
  const candidates = MAP_STATIONS.filter((s) => {
    const g = games.get(s.id);
    return g && (s.id === selectedId || s.importance >= badgeMinImportance);
  }).sort((a, b) => score(b) - score(a));

  function score(s: MapStation) {
    const g = games.get(s.id);
    return (s.id === selectedId ? 100 : 0) + (g?.live ? 10 : 0) + s.importance * 2 + (g?.games.length ?? 0) * 0.1;
  }

  for (const s of candidates) {
    const g = games.get(s.id)!;
    const n = Math.min(3, g.games.length);
    const w = 10 + n * iconStep + (g.games.length > 3 ? 14 : 0);
    const h = sizes.badgeIcon + 11;
    const lift = (s.transfer ? sizes.transfer : sizes.stop) + 8 + h / 2;
    const cx = s.x * z;
    const cy = s.y * z - lift;
    const r = { x0: cx - w / 2 - 2, x1: cx + w / 2 + 2, y0: cy - h / 2 - 2, y1: cy + h / 2 + 6 };
    if (s.id !== selectedId && taken.some((t) => overlaps(t, r))) continue;
    taken.push(r);
    badges.push({ id: s.id, dy: -lift, w, h });
  }

  // 3. Everything else, by importance, where it fits.
  MAP_STATIONS.filter((s) => s.importance < 3)
    .sort((a, b) => b.importance - a.importance)
    .forEach(placeLabel);

  return { labels, badges };
}
