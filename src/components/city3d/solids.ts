// A tiny folded-paper solid kit for the isometric city. Buildings are made of convex solids (extruded
// footprints, roofs, faceted domes); each face is projected, back-face culled and shaded under a fixed
// view-space sun, so every building reads as card stock: a lit wall, a shaded wall, a crease between them.
import type { Vec } from "./geo";
import { HS, TILT, f, type Iso } from "./iso";
import { FLOOR } from "./model";
import { PAPER, tone } from "./palette";

export type P3 = [number, number, number];

export interface Face {
  pts: P3[];
  color: string;
  /** keep the exact color (team roofs) instead of shading it */
  flat?: boolean;
  /** explicit outward normal (decals sitting on another face) */
  n?: P3;
}

export interface Solid {
  faces: Face[];
  /** centre of the footprint, for painter's ordering */
  cx: number;
  cy: number;
  z0: number;
  /** window rows on vertical walls */
  win?: { color: string; dash?: string; w: number; op: number };
  /** light crease down the front vertical corner */
  crease?: boolean;
  z1?: number;
  corners?: Vec[];
}

export interface Mark {
  a: P3;
  b: P3;
  color: string;
  w: number;
  /** only draw when a face with this normal is visible */
  n?: P3;
}

/** Drawable output: SVG path data plus paint. */
export interface Shape {
  d: string;
  fill?: string;
  stroke?: string;
  w?: number;
  op?: number;
  dash?: string;
}

// ---------- primitives ----------

/** Extrude a convex footprint (counter-clockwise or clockwise) from z0 to z1. */
export function extrude(foot: Vec[], z0: number, z1: number, wall: string, top: string = wall, topFlat = false, extra?: Partial<Solid>): Solid {
  const faces: Face[] = [];
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i];
    const b = foot[(i + 1) % foot.length];
    faces.push({ pts: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], color: wall });
  }
  faces.push({ pts: foot.map(([x, y]): P3 => [x, y, z1]), color: top, flat: topFlat });
  const cx = foot.reduce((s, p) => s + p[0], 0) / foot.length;
  const cy = foot.reduce((s, p) => s + p[1], 0) / foot.length;
  return { faces, cx, cy, z0, z1, corners: foot, ...extra };
}

export const rect = (x: number, y: number, hx: number, hy: number): Vec[] => [
  [x - hx, y - hy],
  [x + hx, y - hy],
  [x + hx, y + hy],
  [x - hx, y + hy],
];

/** Axis-aligned box centred on (x, y). */
export function box(x: number, y: number, hx: number, hy: number, z0: number, z1: number, wall: string, top?: string, topFlat = false, extra?: Partial<Solid>): Solid {
  return extrude(rect(x, y, hx, hy), z0, z1, wall, top ?? wall, topFlat, extra);
}

/** Gable roof with the ridge along x (alongX) or y. */
export function gable(x: number, y: number, hx: number, hy: number, z0: number, rise: number, roof: string, wall: string, alongX = true): Solid {
  const faces: Face[] = [];
  const z1 = z0 + rise;
  if (alongX) {
    faces.push({ pts: [[x - hx, y - hy, z0], [x + hx, y - hy, z0], [x + hx, y, z1], [x - hx, y, z1]], color: roof });
    faces.push({ pts: [[x + hx, y + hy, z0], [x - hx, y + hy, z0], [x - hx, y, z1], [x + hx, y, z1]], color: roof });
    faces.push({ pts: [[x - hx, y + hy, z0], [x - hx, y - hy, z0], [x - hx, y, z1]], color: wall });
    faces.push({ pts: [[x + hx, y - hy, z0], [x + hx, y + hy, z0], [x + hx, y, z1]], color: wall });
  } else {
    faces.push({ pts: [[x - hx, y + hy, z0], [x - hx, y - hy, z0], [x, y - hy, z1], [x, y + hy, z1]], color: roof });
    faces.push({ pts: [[x + hx, y - hy, z0], [x + hx, y + hy, z0], [x, y + hy, z1], [x, y - hy, z1]], color: roof });
    faces.push({ pts: [[x - hx, y - hy, z0], [x + hx, y - hy, z0], [x, y - hy, z1]], color: wall });
    faces.push({ pts: [[x + hx, y + hy, z0], [x - hx, y + hy, z0], [x, y + hy, z1]], color: wall });
  }
  return { faces, cx: x, cy: y, z0, z1 };
}

/** Pyramid / hip roof / spire over a rectangle (apex can be truncated with `topScale`). */
export function pyramid(x: number, y: number, hx: number, hy: number, z0: number, rise: number, color: string, topScale = 0, topColor = color): Solid {
  const base = rect(x, y, hx, hy);
  const z1 = z0 + rise;
  if (topScale <= 0) {
    const faces: Face[] = base.map((a, i) => {
      const b = base[(i + 1) % 4];
      return { pts: [[a[0], a[1], z0], [b[0], b[1], z0], [x, y, z1]], color };
    });
    return { faces, cx: x, cy: y, z0, z1 };
  }
  return frustumPoly(base, rect(x, y, hx * topScale, hy * topScale), z0, z1, color, x, y, topColor);
}

function frustumPoly(bottom: Vec[], top: Vec[], z0: number, z1: number, color: string, cx: number, cy: number, topColor = color): Solid {
  const faces: Face[] = [];
  for (let i = 0; i < bottom.length; i++) {
    const j = (i + 1) % bottom.length;
    faces.push({ pts: [[bottom[i][0], bottom[i][1], z0], [bottom[j][0], bottom[j][1], z0], [top[j][0], top[j][1], z1], [top[i][0], top[i][1], z1]], color });
  }
  faces.push({ pts: top.map(([px, py]): P3 => [px, py, z1]), color: topColor, flat: topColor !== color });
  return { faces, cx, cy, z0, z1 };
}

const ring = (x: number, y: number, r: number, n: number): Vec[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });

/** Faceted (octagonal) frustum: drums, domes, water tanks. */
export function frustum(x: number, y: number, r0: number, r1: number, z0: number, z1: number, color: string, n = 8): Solid {
  return frustumPoly(ring(x, y, r0, n), ring(x, y, Math.max(r1, 1e-4), n), z0, z1, color, x, y);
}

/** Faceted paper dome: a drum plus three folded bands. Returns solids bottom-up. */
export function dome(x: number, y: number, r: number, z0: number, color: string, drum: string = PAPER.cream): Solid[] {
  const dz = r * 0.55;
  return [
    frustum(x, y, r * 1.05, r * 1.05, z0, z0 + dz * 0.6, drum),
    frustum(x, y, r, r * 0.86, z0 + dz * 0.6, z0 + dz * 1.3, color),
    frustum(x, y, r * 0.86, r * 0.5, z0 + dz * 1.3, z0 + dz * 1.9, color),
    frustum(x, y, r * 0.5, r * 0.08, z0 + dz * 1.9, z0 + dz * 2.25, color),
  ];
}

// ---------- rendering ----------

// Sun in view space (rx, ry, z): upper left, slightly in front.
const L = (() => {
  const v = [-0.62, -0.3, 0.55];
  const m = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / m);
})();

function newell(pts: P3[]): P3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [nx, ny, nz];
}

/** Rotate a world normal into view space; returns [rx, ry, z]. */
function viewNormal(iso: Iso, n: P3): P3 {
  return [n[0] * iso.c - n[1] * iso.s, n[0] * iso.s + n[1] * iso.c, n[2]];
}

const visible = (v: P3) => -HS * v[1] + TILT * v[2] > 1e-6;

function lambert(v: P3): number {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return (v[0] * L[0] + v[1] * L[1] + v[2] * L[2]) / m;
}

const EDGE = PAPER.edge;

function centroid(s: Solid): P3 {
  let x = 0;
  let y = 0;
  let z = 0;
  let n = 0;
  for (const face of s.faces) {
    if (face.n) continue;
    for (const p of face.pts) {
      x += p[0];
      y += p[1];
      z += p[2];
      n++;
    }
  }
  return [x / n, y / n, z / n];
}

/** Project, cull and shade solids (painter-sorted inside the group) plus marks into flat shapes. */
export function renderSolids(iso: Iso, solids: Solid[], marks: Mark[] = []): Shape[] {
  const out: Shape[] = [];
  const order = solids
    .map((s) => ({ s, d: Math.round(iso.depth(s.cx, s.cy) * 1e4) }))
    .sort((a, b) => {
      // Anything resting on top of another solid draws after it; otherwise far to near.
      if (a.s.z0 > b.s.z0 && a.s.z0 >= (b.s.z1 ?? b.s.z0) - 1e-6) return 1;
      if (b.s.z0 > a.s.z0 && b.s.z0 >= (a.s.z1 ?? a.s.z0) - 1e-6) return -1;
      return b.d - a.d || a.s.z0 - b.s.z0;
    });
  for (const { s } of order) {
    const c = centroid(s);
    const wins: string[] = [];
    for (const face of s.faces) {
      let n = face.n ?? newell(face.pts);
      if (!face.n) {
        // Orient outward: away from the solid's centroid.
        const fc = face.pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]] as P3, [0, 0, 0] as P3).map((v) => v / face.pts.length);
        if ((fc[0] - c[0]) * n[0] + (fc[1] - c[1]) * n[1] + (fc[2] - c[2]) * n[2] < 0) n = [-n[0], -n[1], -n[2]];
      }
      const v = viewNormal(iso, n);
      if (!visible(v)) continue;
      const pts = face.pts.map((p) => iso.pt(p[0], p[1], p[2]));
      out.push({ d: `M${pts.map((p) => `${f(p[0])},${f(p[1])}`).join("L")}Z`, fill: face.flat ? face.color : tone(face.color, lambert(v)), stroke: EDGE, w: 0.4 });
      // Window rows on tall vertical walls.
      if (s.win && Math.abs(n[2]) < 1e-6 && face.pts.length === 4) {
        const [a, b] = face.pts;
        const z0 = a[2];
        const z1 = face.pts[2][2];
        const rows = Math.min(24, Math.floor((z1 - z0) / FLOOR + 0.25));
        if (rows >= 1) {
          const ax = a[0] + (b[0] - a[0]) * 0.18;
          const ay = a[1] + (b[1] - a[1]) * 0.18;
          const bx = a[0] + (b[0] - a[0]) * 0.82;
          const by = a[1] + (b[1] - a[1]) * 0.82;
          for (let r = 0; r < rows; r++) {
            const z = z0 + (r + 0.55) * FLOOR;
            if (z > z1 - FLOOR * 0.3) break;
            const p = iso.pt(ax, ay, z);
            const q = iso.pt(bx, by, z);
            wins.push(`M${f(p[0])},${f(p[1])}L${f(q[0])},${f(q[1])}`);
          }
        }
      }
    }
    if (wins.length && s.win) out.push({ d: wins.join(""), stroke: s.win.color, w: s.win.w, op: s.win.op, dash: s.win.dash });
    if (s.crease && s.corners && s.z1 !== undefined) {
      // Light catches the front vertical fold.
      let best = s.corners[0];
      for (const p of s.corners) if (iso.depth(p[0], p[1]) < iso.depth(best[0], best[1])) best = p;
      const p = iso.pt(best[0], best[1], s.z0);
      const q = iso.pt(best[0], best[1], s.z1);
      out.push({ d: `M${f(p[0])},${f(p[1])}L${f(q[0])},${f(q[1])}`, stroke: "#fffaf0", w: 0.7, op: 0.75 });
    }
  }
  for (const m of marks) {
    if (m.n && !visible(viewNormal(iso, m.n))) continue;
    const p = iso.pt(m.a[0], m.a[1], m.a[2]);
    const q = iso.pt(m.b[0], m.b[1], m.b[2]);
    out.push({ d: `M${f(p[0])},${f(p[1])}L${f(q[0])},${f(q[1])}`, stroke: m.color, w: m.w });
  }
  return out;
}
