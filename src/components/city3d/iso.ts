// Hand-rolled isometric camera: rotate the world plane by theta, squash it, lift heights straight up.
// Produces plain strings/numbers for the SVG layer; no 3D library involved.
import type { TeamRouteId } from "@/contracts/routes";
import { CELL, getCityGeo, type Vec } from "./geo";
import { FLOOR, type Building } from "./model";
import { SHADES, mix } from "./palette";

/** px per world unit at camera scale 1 */
export const S = 72;
const TILT = 0.62;
const HS = 0.95;
/** thickness of the land slab in px */
export const SLAB = 9;
/** default view: north points up-right, Alewife at the top, Braintree at the bottom */
export const THETA0 = -Math.PI / 4;

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

const f = (n: number) => n.toFixed(1);
const poly = (pts: Vec[]) => pts.map((p) => `${f(p[0])},${f(p[1])}`).join(" ");
const pathOf = (pts: Vec[], dy = 0) => `M${pts.map((p) => `${f(p[0])},${f(p[1] + dy)}`).join("L")}Z`;

/** Fixed SVG frame large enough for any rotation, centred on downtown. */
export function sceneFrame() {
  const R = getCityGeo().radius + 0.2;
  const width = Math.ceil(2 * R * S);
  const top = Math.ceil(R * S * TILT + 22 * FLOOR * S * HS + 40);
  const height = Math.ceil(top + R * S * TILT + SLAB + 30);
  return { width, height, minX: -width / 2, minY: -top };
}

// ---------- Ground ----------
export interface GroundGeometry {
  land: string;
  slab: string;
  /** faint street grid, clipped to the land in the SVG */
  streets: string;
  water: string[];
  lines: { team: TeamRouteId; d: string }[];
  labels: { text: string; x: number; y: number }[];
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

export function groundGeometry(iso: Iso): GroundGeometry {
  const geo = getCityGeo();
  runsCache ??= landRuns();
  const land: string[] = [];
  const slab: string[] = [];
  for (const r of runsCache) {
    // Tiny overlap hides hairline seams between runs.
    const e = 0.004;
    const q: Vec[] = [
      iso.pt(r.x0 - e, r.y0 - e),
      iso.pt(r.x1 + e, r.y0 - e),
      iso.pt(r.x1 + e, r.y1 + e),
      iso.pt(r.x0 - e, r.y1 + e),
    ];
    land.push(pathOf(q));
    slab.push(pathOf(q, SLAB));
  }
  const water = geo.water.map((w) => pathOf(w.map(([x, y]) => iso.pt(x, y)), SLAB * 0.7));
  const lines = (Object.keys(geo.lines) as TeamRouteId[]).map((team) => ({
    team,
    d: geo.lines[team]
      .map((br) => br.map(([x, y], i) => `${i ? "L" : "M"}${poly([iso.pt(x, y)])}`).join(""))
      .join(" "),
  }));
  const streets: string[] = [];
  const R = geo.radius;
  for (let v = -Math.floor(R / CELL) * CELL; v <= R; v += CELL * 2) {
    const a = iso.pt(v, -R);
    const b = iso.pt(v, R);
    const c = iso.pt(-R, v);
    const d = iso.pt(R, v);
    streets.push(`M${poly([a])}L${poly([b])}M${poly([c])}L${poly([d])}`);
  }
  const labels = geo.labels.map((l) => {
    const [x, y] = iso.pt(l.x, l.y);
    return { text: l.text, x, y };
  });
  return { land: land.join(""), slab: slab.join(""), streets: streets.join(""), water, lines, labels };
}

// ---------- Buildings ----------
export interface BuildingGeometry {
  key: string;
  team: TeamRouteId;
  top: string;
  faces: { points: string; fill: string }[];
  windows: string;
  dash: string;
  /** roof centre, for glows and floating numbers */
  roof: Vec;
  height: number;
  station: boolean;
}

const DASHES = ["3 2.2", "2 1.6 4 2.4", "5 2 1.5 2", "1.8 1.8", "4 3 2 1.5"];

export function buildingGeometry(iso: Iso, b: Building, floors: number): BuildingGeometry {
  const h = Math.max(0.02, floors * FLOOR);
  const half = b.w / 2;
  const corners: Vec[] = [
    [b.x - half, b.y - half],
    [b.x + half, b.y - half],
    [b.x + half, b.y + half],
    [b.x - half, b.y + half],
  ];
  const normals: Vec[] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const shades = SHADES[b.team];
  const faces: BuildingGeometry["faces"] = [];
  const win: string[] = [];
  const count = Math.floor(floors);
  for (let k = 0; k < 4; k++) {
    const [nx, ny] = normals[k];
    const nry = nx * iso.s + ny * iso.c;
    if (nry >= -1e-3) continue;
    const nrx = nx * iso.c - ny * iso.s;
    const light = 0.5 - 0.5 * nrx;
    const a = corners[k];
    const z = corners[(k + 1) % 4];
    faces.push({ points: poly([iso.pt(a[0], a[1]), iso.pt(z[0], z[1]), iso.pt(z[0], z[1], h), iso.pt(a[0], a[1], h)]), fill: mix(shades.dark, shades.lit, light) });
    if (count >= 2) {
      const ax = a[0] + (z[0] - a[0]) * 0.16;
      const ay = a[1] + (z[1] - a[1]) * 0.16;
      const zx = a[0] + (z[0] - a[0]) * 0.84;
      const zy = a[1] + (z[1] - a[1]) * 0.84;
      for (let fl = 0; fl < count - 1; fl++) {
        const wh = (fl + 0.55) * FLOOR;
        const p = iso.pt(ax, ay, wh);
        const q = iso.pt(zx, zy, wh);
        win.push(`M${f(p[0])},${f(p[1])}L${f(q[0])},${f(q[1])}`);
      }
    }
  }
  const roof = iso.pt(b.x, b.y, h);
  return {
    key: b.key,
    team: b.team,
    top: poly(corners.map(([x, y]) => iso.pt(x, y, h))),
    faces,
    windows: win.join(""),
    dash: DASHES[Math.floor(b.seed * DASHES.length)],
    roof,
    height: h,
    station: b.station,
  };
}
