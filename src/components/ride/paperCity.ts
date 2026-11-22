// 3D paper relief for the Ride map: a folded-map sheet texture, low extruded paper city blocks in the
// street grid around the rider, and origami Boston landmarks standing at their real spots (same set as
// the City tab). Everything is decorative and world-anchored, so it slides and turns with the camera.
import type { TeamRouteId } from "@/contracts/routes";
import { LINES, STATIONS } from "@/components/map/mbta-geo";
import { clipSegment, type View } from "./navCamera";
import type { LatLng } from "./geo";

const M = 111_320;
const LAT0 = 42.35;
const LNG0 = -71.06;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);

/** World meters (east, north) from a fixed Boston origin. */
const toEN = (lat: number, lng: number): [number, number] => [(lng - LNG0) * M * COS0, (lat - LAT0) * M];
const toLL = (e: number, n: number): LatLng => ({ lat: LAT0 + n / M, lng: LNG0 + e / (M * COS0) });

function hash(a: number, b: number): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- obstacle field: keep blocks off the T lines and the water ----------
const LINE_PTS: [number, number][] = [];
for (const t of Object.keys(LINES) as TeamRouteId[]) {
  for (const branch of LINES[t]) {
    const pts = branch.map((id) => STATIONS[id]).filter(Boolean);
    for (let i = 1; i < pts.length; i++) {
      const a = toEN(pts[i - 1].lat, pts[i - 1].lng);
      const b = toEN(pts[i].lat, pts[i].lng);
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 60));
      for (let k = 0; k <= n; k++) LINE_PTS.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
  }
}

let WATER_PTS: { e: number; n: number; r: number }[] = [];
/** Called once by drawNavMap with its water polylines (meters wide). */
export function setWater(water: { widthM: number; pts: LatLng[] }[]) {
  if (WATER_PTS.length) return;
  WATER_PTS = water.flatMap((w) => w.pts.map((p) => ({ ...xy(p), r: w.widthM / 2 + 70 })));
}
const xy = (p: LatLng) => {
  const [e, n] = toEN(p.lat, p.lng);
  return { e, n };
};

const blocked = new Map<number, boolean>();
function isBlocked(i: number, j: number, S: number): boolean {
  const key = i * 100_003 + j;
  let v = blocked.get(key);
  if (v === undefined) {
    const e = (i + 0.5) * S;
    const n = (j + 0.5) * S;
    v = LINE_PTS.some(([x, y]) => Math.abs(x - e) < 115 && Math.abs(y - n) < 115) || WATER_PTS.some((w) => Math.hypot(w.e - e, w.n - n) < w.r);
    if (blocked.size > 20_000) blocked.clear();
    blocked.set(key, v);
  }
  return v;
}

// ---------- folded-map sheet texture ----------
/** Big world-anchored fold panels: alternate panels catch a little light, creases get a shadow + highlight. */
export function drawFolds(ctx: CanvasRenderingContext2D, view: View) {
  const P = 900;
  const [eC, nC] = toEN(view.cam.lat, view.cam.lng);
  const i0 = Math.floor(eC / P);
  const j0 = Math.floor(nC / P);
  const R = 4;
  const g = (e: number, n: number) => {
    const ll = toLL(e, n);
    return view.ground(ll.lat, ll.lng);
  };
  for (let i = i0 - R; i <= i0 + R; i++) {
    for (let j = j0 - R; j <= j0 + R; j++) {
      if ((i + j) % 2 === 0) continue;
      const quad = [g(i * P, j * P), g((i + 1) * P, j * P), g((i + 1) * P, (j + 1) * P), g(i * P, (j + 1) * P)];
      // clip each edge to the near plane, then fill the polygon
      const pts: { x: number; y: number }[] = [];
      for (let q = 0; q < 4; q++) {
        const seg = clipSegment(quad[q], quad[(q + 1) % 4], view.fNear + 1);
        if (!seg) continue;
        for (const s of seg) {
          const p = view.project(s[0], s[1]);
          if (p) pts.push(p);
        }
      }
      if (pts.length < 3) continue;
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = (i * 7 + j * 3) % 4 < 2 ? "rgba(255,252,244,0.32)" : "rgba(140,108,66,0.05)";
      ctx.fill();
    }
  }
  // creases
  ctx.lineCap = "butt";
  for (const [dark, off, w] of [
    [true, 1, 1.6],
    [false, -0.6, 1],
  ] as const) {
    ctx.beginPath();
    ctx.strokeStyle = dark ? "rgba(120,92,56,0.16)" : "rgba(255,253,247,0.7)";
    ctx.lineWidth = w;
    for (let i = i0 - R; i <= i0 + R + 1; i++) {
      for (const [a, b] of [
        [g(i * P, (j0 - R) * P), g(i * P, (j0 + R + 1) * P)],
        [g((i0 - R) * P, i * P - i0 * P + j0 * P), g((i0 + R + 1) * P, i * P - i0 * P + j0 * P)],
      ]) {
        const seg = clipSegment(a, b, view.fNear + 1);
        if (!seg) continue;
        const pa = view.project(seg[0][0], seg[0][1]);
        const pb = view.project(seg[1][0], seg[1][1]);
        if (!pa || !pb) continue;
        ctx.moveTo(pa.x + off, pa.y);
        ctx.lineTo(pb.x + off, pb.y);
      }
    }
    ctx.stroke();
  }
}

// ---------- extruded paper blocks ----------
const WALLS = ["#f4ecdc", "#efe4cf", "#ead9bf", "#e9d2c0", "#dfe3d6", "#e6dccb"];
const ROOFS = ["#fbf6ec", "#f3e9d6", "#e8d8bd", "#d9b9a2", "#c9b9a0", "#d7cfbf"];
const DOWNTOWN = toEN(42.3575, -71.0605);

type Q = { x: number; y: number };

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function poly(ctx: CanvasRenderingContext2D, pts: Q[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Low paper blocks in the 170m street grid within ~1.4km. Drawn far-to-near (painter's order). */
export function drawBlocks(ctx: CanvasRenderingContext2D, view: View) {
  const S = 170;
  const RAD = 1400;
  const [eC, nC] = toEN(view.cam.lat, view.cam.lng);
  const ci = Math.floor(eC / S);
  const cj = Math.floor(nC / S);
  const n = Math.ceil(RAD / S);
  const list: { f: number; i: number; j: number; corners: [number, number][]; h: number; wall: string; roof: string; split: boolean }[] = [];
  for (let i = ci - n; i <= ci + n; i++) {
    for (let j = cj - n; j <= cj + n; j++) {
      const r = hash(i, j);
      if (r < 0.22) continue; // empty lots / plazas
      const e0 = i * S;
      const n0 = j * S;
      if (Math.hypot(e0 + S / 2 - eC, n0 + S / 2 - nC) > RAD) continue;
      if (isBlocked(i, j, S)) continue;
      const inset = 34 + r * 10;
      const split = r > 0.62; // two buildings in the block
      const dDown = Math.hypot(e0 - DOWNTOWN[0], n0 - DOWNTOWN[1]);
      const tall = Math.max(0, 1 - dDown / 1800);
      const h = 9 + hash(j, i) * 18 + tall * tall * 70 * hash(i + 7, j - 3);
      const ll = [toLL(e0 + inset, n0 + inset), toLL(e0 + S - inset, n0 + inset), toLL(e0 + S - inset, n0 + S - inset), toLL(e0 + inset, n0 + S - inset)];
      const corners = ll.map((p) => view.ground(p.lat, p.lng));
      const f = (corners[0][1] + corners[2][1]) / 2;
      if (f < view.fNear + 40 || f > 3800) continue;
      list.push({ f, i, j, corners, h, wall: WALLS[Math.floor(r * 97) % WALLS.length], roof: ROOFS[Math.floor(r * 53) % ROOFS.length], split });
    }
  }
  list.sort((a, b) => b.f - a.f);
  for (const b of list) {
    if (b.split) {
      // split the footprint into two boxes of different heights along its longer screen axis
      const [c0, c1, c2, c3] = b.corners;
      const mid = (p: [number, number], q: [number, number], t: number): [number, number] => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      const a = [c0, mid(c0, c1, 0.48), mid(c3, c2, 0.48), c3] as [number, number][];
      const c = [mid(c0, c1, 0.56), c1, c2, mid(c3, c2, 0.56)] as [number, number][];
      const parts = [
        { corners: a, h: b.h },
        { corners: c, h: b.h * (0.55 + hash(b.j, b.i + 3) * 0.7) },
      ].sort((p, q) => (q.corners[0][1] + q.corners[2][1]) - (p.corners[0][1] + p.corners[2][1]));
      for (const p of parts) drawBox(ctx, view, p.corners, p.h, b.wall, b.roof);
    } else drawBox(ctx, view, b.corners, b.h, b.wall, b.roof);
  }
  ctx.globalAlpha = 1;
}

function drawBox(ctx: CanvasRenderingContext2D, view: View, c: [number, number][], h: number, wall: string, roof: string) {
  const base = c.map(([x, f]) => view.project(x, f));
  const top = c.map(([x, f]) => view.project3(x, f, h));
  if (base.some((p) => !p) || top.some((p) => !p)) return;
  const B = base as Q[];
  const T = top as Q[];
  const k = (base[0]!.k + base[2]!.k) / 2;
  const a = view.fade(k);
  if (a < 0.03) return;
  ctx.globalAlpha = a;
  // contact shadow, cast toward screen-right/down
  const sh = Math.min(10, h * k * 0.35);
  poly(ctx, B.map((p) => ({ x: p.x + sh, y: p.y + sh * 0.35 })), "rgba(74,52,22,0.13)");
  // side faces far-to-near; normal from the edge tells lit vs shaded
  const faces = [0, 1, 2, 3].map((q) => {
    const r = (q + 1) % 4;
    const ex = c[r][0] - c[q][0];
    const ef = c[r][1] - c[q][1];
    const len = Math.hypot(ex, ef) || 1;
    // outward normal for a CCW footprint (x right, f forward)
    const nx = ef / len;
    const nf = -ex / len;
    return { q, r, depth: (c[q][1] + c[r][1]) / 2, light: -0.55 * nx - 0.35 * nf };
  });
  // Painter's order: back faces first, the front faces and roof then cover them (the box is convex).
  faces.sort((p, q) => q.depth - p.depth);
  for (const fc of faces) {
    const amt = fc.light > 0 ? 0.25 * fc.light : 0.3 * fc.light;
    poly(ctx, [B[fc.q], B[fc.r], T[fc.r], T[fc.q]], shadeHex(wall, amt));
    // window rows as paper slits
    if (h * k > 14) {
      ctx.strokeStyle = "rgba(59,50,39,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let z = 0.28; z < 0.92; z += 0.22) {
        const p0 = { x: B[fc.q].x + (T[fc.q].x - B[fc.q].x) * z, y: B[fc.q].y + (T[fc.q].y - B[fc.q].y) * z };
        const p1 = { x: B[fc.r].x + (T[fc.r].x - B[fc.r].x) * z, y: B[fc.r].y + (T[fc.r].y - B[fc.r].y) * z };
        ctx.moveTo(p0.x + (p1.x - p0.x) * 0.12, p0.y + (p1.y - p0.y) * 0.12);
        ctx.lineTo(p0.x + (p1.x - p0.x) * 0.88, p0.y + (p1.y - p0.y) * 0.88);
      }
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  poly(ctx, T, roof);
  // crisp cut edge on the roof
  ctx.strokeStyle = "rgba(92,66,32,0.22)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// ---------- origami landmarks (same set as the City tab) ----------
export interface LandmarkSprite {
  img: HTMLImageElement;
  lat: number;
  lng: number;
  /** drawn height in meters (exaggerated, decorative) */
  h: number;
  aspect: number;
}

export interface LandmarkSite {
  kind: "stateHouse" | "customHouse" | "oldNorth" | "zakim" | "citgo" | "fenway" | "greatDome" | "backBay" | "seaport" | "swanBoat" | "brownstone" | "tripleDecker";
  lat: number;
  lng: number;
  h: number;
}

/** Real-ish positions (decorative, not survey data). */
export const LANDMARK_SITES: LandmarkSite[] = [
  { kind: "stateHouse", lat: 42.3588, lng: -71.0638, h: 120 },
  { kind: "customHouse", lat: 42.3592, lng: -71.0533, h: 190 },
  { kind: "oldNorth", lat: 42.3663, lng: -71.0544, h: 140 },
  { kind: "zakim", lat: 42.3687, lng: -71.0628, h: 110 },
  { kind: "citgo", lat: 42.3489, lng: -71.0954, h: 90 },
  { kind: "fenway", lat: 42.3462, lng: -71.0985, h: 90 },
  { kind: "greatDome", lat: 42.3598, lng: -71.0921, h: 100 },
  { kind: "backBay", lat: 42.3482, lng: -71.0795, h: 280 },
  { kind: "seaport", lat: 42.3478, lng: -71.0402, h: 150 },
  { kind: "swanBoat", lat: 42.3541, lng: -71.0702, h: 40 },
  { kind: "brownstone", lat: 42.3513, lng: -71.0868, h: 80 },
  { kind: "brownstone", lat: 42.3432, lng: -71.0735, h: 80 },
  { kind: "tripleDecker", lat: 42.3878, lng: -71.0995, h: 80 },
  { kind: "tripleDecker", lat: 42.3155, lng: -71.0598, h: 80 },
  { kind: "tripleDecker", lat: 42.3005, lng: -71.1135, h: 80 },
];

export function drawLandmarks(ctx: CanvasRenderingContext2D, view: View, sprites: LandmarkSprite[], labelMinY: number) {
  const list = sprites
    .map((s) => {
      const [x, f] = view.ground(s.lat, s.lng);
      return { s, x, f };
    })
    .filter((d) => d.f > view.fNear + 30 && d.f < 9000 && Math.abs(d.x) < 6000)
    .sort((a, b) => b.f - a.f);
  for (const { s, x, f } of list) {
    const base = view.project(x, f);
    // Exaggerated 3x like a pop-up book so landmarks read at nav zoom; capped so near ones don't swamp the screen.
    const top = view.project3(x, f, s.h * 3);
    if (!base || !top) continue;
    const hPx = Math.min(170, base.y - top.y);
    if (hPx < 6) continue;
    const wPx = hPx * s.aspect;
    if (base.x + wPx / 2 < -20 || base.x - wPx / 2 > ctx.canvas.width) continue;
    // fade landmarks that rise into the top cards
    const under = Math.max(0, Math.min(1, (base.y - hPx - (labelMinY - 40)) / 80));
    const a = view.fade(base.k) * (0.35 + 0.65 * under);
    if (a < 0.04) continue;
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = "rgba(74,52,22,0.22)";
    ctx.beginPath();
    ctx.ellipse(base.x + wPx * 0.08, base.y, wPx * 0.55, Math.max(2, wPx * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.drawImage(s.img, base.x - wPx / 2, base.y - hPx, wPx, hPx);
  }
  ctx.globalAlpha = 1;
}

// ---------- paper grain (screen space) ----------
let grain: CanvasPattern | null = null;
export function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (!grain) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (!g) return;
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random();
      const fiber = Math.random() < 0.012 ? 1 : 0;
      img.data[i] = 110;
      img.data[i + 1] = 84;
      img.data[i + 2] = 52;
      img.data[i + 3] = Math.round(v * 16 + fiber * 40);
    }
    g.putImageData(img, 0, 0);
    grain = ctx.createPattern(c, "repeat");
  }
  if (!grain) return;
  ctx.globalAlpha = 1;
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, w, h);
}
