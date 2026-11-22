// Hand-rolled isometric camera: rotate the world plane by theta, squash it, lift heights straight up.
// Produces plain strings/numbers for the SVG layers; no 3D library involved.
// The view only ever rests at four quarter turns, so everything static is computed once per turn and cached.
import type { TeamRouteId } from "@/contracts/routes";
import { CELL, getCityGeo, type Vec } from "./geo";
import { FLOOR } from "./model";

/** px per world unit at camera scale 1 */
export const S = 72;
export const TILT = 0.62;
export const HS = 0.95;
/** thickness of the land card in px */
export const SLAB = 7;
/** default view: north points up-right, Alewife at the top, Braintree at the bottom */
export const THETA0 = -Math.PI / 4;

export const thetaOf = (rot: number) => THETA0 + (rot * Math.PI) / 2;

export interface Iso {
  c: number;
  s: number;
  pt: (x: number, y: number, h?: number) => Vec;
  depth: (x: number, y: number) => number;
}

export function makeIso(theta: number): Iso {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    c,
    s,
    pt(x, y, h = 0) {
      const rx = x * c - y * s;
      const ry = x * s + y * c;
      return [rx * S, -ry * S * TILT - h * S * HS];
    },
    depth: (x, y) => x * s + y * c,
  };
}

const isoCache = new Map<number, Iso>();
/** Cached projector for a quarter-turn index (0-3). */
export function isoFor(rot: number): Iso {
  const k = ((rot % 4) + 4) % 4;
  let iso = isoCache.get(k);
  if (!iso) {
    iso = makeIso(thetaOf(k));
    isoCache.set(k, iso);
  }
  return iso;
}

export const f = (n: number) => n.toFixed(1);
export const poly = (pts: Vec[]) => pts.map((p) => `${f(p[0])},${f(p[1])}`).join(" ");
export const pathOf = (pts: Vec[], dx = 0, dy = 0) => `M${pts.map((p) => `${f(p[0] + dx)},${f(p[1] + dy)}`).join("L")}Z`;

/** Fixed SVG frame large enough for any rotation, centred on downtown. */
export function sceneFrame() {
  const R = getCityGeo().radius + 0.2;
  const width = Math.ceil(2 * R * S);
  const top = Math.ceil(R * S * TILT + 22 * FLOOR * S * HS + 60);
  const height = Math.ceil(top + R * S * TILT + SLAB + 30);
  return { width, height, minX: -width / 2, minY: -top };
}

// ---------- Ground: kraft table, folded land card, layered paper water, papercut parks ----------
export interface GroundGeometry {
  land: string;
  /** cut edge of the land card (the land shape pushed down by SLAB) */
  slab: string;
  /** soft contact shadow on the table */
  shadow: string;
  /** faint pencil street grid, clipped to the land */
  streets: string;
  water: string[];
  /** folded wave chevrons, one path */
  waves: string;
  parks: { name: string; d: string; edge: string }[];
  lines: { team: TeamRouteId; d: string }[];
  labels: { text: string; x: number; y: number; water: boolean }[];
}

/** Land merged into row runs so the plate is ~60 quads, not ~1000 tiles. */
function landRuns(): { x0: number; x1: number; y0: number; y1: number }[] {
  const rows = new Map<number, number[]>();
  for (const c of getCityGeo().cells) {
    const row = rows.get(c.j) ?? [];
    row.push(c.i);
    rows.set(c.j, row);
  }
  const runs: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const [j, is] of rows) {
    is.sort((a, b) => a - b);
    let start = is[0];
    for (let k = 1; k <= is.length; k++) {
      if (k === is.length || is[k] !== is[k - 1] + 1) {
        runs.push({ x0: start * CELL, x1: (is[k - 1] + 1) * CELL, y0: j * CELL, y1: (j + 1) * CELL });
        start = is[k];
      }
    }
  }
  return runs;
}

let runsCache: ReturnType<typeof landRuns> | null = null;
const groundCache = new Map<number, GroundGeometry>();

export function groundFor(rot: number): GroundGeometry {
  const k = ((rot % 4) + 4) % 4;
  let g = groundCache.get(k);
  if (!g) {
    g = groundGeometry(isoFor(k));
    groundCache.set(k, g);
  }
  return g;
}

function groundGeometry(iso: Iso): GroundGeometry {
  const geo = getCityGeo();
  runsCache ??= landRuns();
  const land: string[] = [];
  const slab: string[] = [];
  const shadow: string[] = [];
  for (const r of runsCache) {
    // Tiny overlap hides hairline seams between runs.
    const e = 0.004;
    const q: Vec[] = [iso.pt(r.x0 - e, r.y0 - e), iso.pt(r.x1 + e, r.y0 - e), iso.pt(r.x1 + e, r.y1 + e), iso.pt(r.x0 - e, r.y1 + e)];
    land.push(pathOf(q));
    slab.push(pathOf(q, 0, SLAB));
    shadow.push(pathOf(q, 5, SLAB + 6));
  }
  const water = geo.water.map((w) => pathOf(w.map(([x, y]) => iso.pt(x, y)), 0, SLAB * 0.8));
  const waves = geo.waves
    .map(([x, y]) => {
      const [px, py] = iso.pt(x, y);
      const yy = py + SLAB * 0.8;
      return `M${f(px - 6)},${f(yy + 1.5)}L${f(px - 3)},${f(yy - 1.5)}L${f(px)},${f(yy + 1.5)}L${f(px + 3)},${f(yy - 1.5)}L${f(px + 6)},${f(yy + 1.5)}`;
    })
    .join("");
  const parks = geo.parks.map((p) => {
    const pts = p.poly.map(([x, y]) => iso.pt(x, y));
    return { name: p.name, d: pathOf(pts, 0, -1.5), edge: pathOf(pts, 0, 0.5) };
  });
  const lines = (Object.keys(geo.lines) as TeamRouteId[]).map((team) => ({
    team,
    d: geo.lines[team].map((br) => br.map(([x, y], i) => `${i ? "L" : "M"}${poly([iso.pt(x, y)])}`).join("")).join(" "),
  }));
  const streets: string[] = [];
  const R = geo.radius;
  for (let v = -Math.floor(R / CELL) * CELL; v <= R; v += CELL) {
    streets.push(`M${poly([iso.pt(v, -R)])}L${poly([iso.pt(v, R)])}M${poly([iso.pt(-R, v)])}L${poly([iso.pt(R, v)])}`);
  }
  const labels = geo.labels.map((l) => {
    const [x, y] = iso.pt(l.x, l.y);
    return { text: l.text, x, y, water: /RIVER|HARBOR/.test(l.text) };
  });
  return { land: land.join(""), slab: slab.join(""), shadow: shadow.join(""), streets: streets.join(""), water, waves, parks, lines, labels };
}
