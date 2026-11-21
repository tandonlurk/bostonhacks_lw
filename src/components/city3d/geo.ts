// Static geometry for the 3D city: a "fisheye" world plane centred on downtown Boston, a coarse grid of
// land cells (water carved out for the Charles, Mystic and the Harbor) and per-team station/line data.
// Everything here is pure and computed once per page load (see getCityGeo).
import { TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import { LINES, STATIONS } from "@/components/map/projection";

/** Downtown Crossing: the compression centre. */
const LAT0 = 42.3555;
const LNG0 = -71.0602;
const KM_PER_LAT = 110.57;
const KM_PER_LNG = 111.32 * Math.cos((LAT0 * Math.PI) / 180);
/** Fisheye knee in km: distances beyond this get squeezed so Riverside and Braintree still fit on a phone. */
const KNEE = 5.2;

/** Grid cell edge in world units (compressed km). */
export const CELL = 0.3;

export type Vec = [number, number];

/** lat/lng -> world plane (x east, y north), radially compressed around downtown. */
export function toWorld(lat: number, lng: number): Vec {
  const x = (lng - LNG0) * KM_PER_LNG;
  const y = (lat - LAT0) * KM_PER_LAT;
  const r = Math.hypot(x, y);
  if (r < 1e-9) return [0, 0];
  const k = 1 / (1 + r / KNEE);
  return [x * k, y * k];
}

// ---------- Water (hand-traced, approximate; enough to read as Boston at a glance) ----------
type LatLng = [number, number];

const CHARLES: { path: LatLng[]; width: number }[] = [
  {
    width: 0.3,
    path: [
      [42.3636, -71.19],
      [42.3672, -71.165],
      [42.3712, -71.142],
      [42.3702, -71.1235],
      [42.3646, -71.1185],
      [42.3566, -71.1162],
    ],
  },
  {
    width: 0.62,
    path: [
      [42.3566, -71.1162],
      [42.3522, -71.1085],
      [42.3546, -71.0955],
      [42.3575, -71.0845],
      [42.3606, -71.0745],
      [42.3655, -71.0655],
      [42.3705, -71.0585],
    ],
  },
];

const MYSTIC: { path: LatLng[]; width: number } = {
  width: 0.34,
  path: [
    [42.4085, -71.1055],
    [42.3985, -71.0825],
    [42.3875, -71.0665],
    [42.3815, -71.0525],
    [42.3768, -71.0425],
  ],
};

/** Inner harbor between the North End / Charlestown and East Boston. */
const INNER_HARBOR: LatLng[] = [
  [42.3745, -71.0575],
  [42.3775, -71.0455],
  [42.3712, -71.0395],
  [42.3625, -71.0405],
  [42.3535, -71.0335],
  [42.3505, -71.0425],
  [42.3555, -71.0505],
  [42.3615, -71.0505],
  [42.3675, -71.0525],
];

/** Outer harbor, Dorchester Bay and Quincy Bay, out to the eastern edge. */
const OUTER_HARBOR: LatLng[] = [
  [42.3525, -71.0345],
  [42.3448, -71.0212],
  [42.3382, -71.0108],
  [42.3292, -71.0225],
  [42.3205, -71.0332],
  [42.3138, -71.0398],
  [42.3075, -71.0462],
  [42.2985, -71.0448],
  [42.2895, -71.0335],
  [42.2805, -71.0232],
  [42.2702, -71.0108],
  [42.2585, -70.9925],
  [42.2455, -70.9745],
  [42.225, -70.95],
  [42.225, -70.85],
  [42.45, -70.85],
  [42.45, -70.965],
  [42.4185, -70.9715],
  [42.3955, -70.9795],
  [42.3805, -70.9885],
  [42.3685, -70.9935],
  [42.3575, -71.0045],
  [42.3535, -71.0205],
];

function bufferPolyline(path: Vec[], halfWidth: number): Vec[] {
  // Offset each vertex along the averaged normal; good enough for gentle river bends.
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push([path[i][0] + nx * halfWidth, path[i][1] + ny * halfWidth]);
    right.push([path[i][0] - nx * halfWidth, path[i][1] - ny * halfWidth]);
  }
  return [...left, ...right.reverse()];
}

function pointInPoly(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segDist(p: Vec, a: Vec, b: Vec): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// ---------- Grid ----------
export interface Cell {
  key: string;
  i: number;
  j: number;
  /** centre in world units */
  x: number;
  y: number;
  /** distance from downtown in world units */
  r: number;
}

export interface CityGeo {
  /** land cells only */
  cells: Cell[];
  cellByKey: Map<string, Cell>;
  /** water polygons in world units */
  water: Vec[][];
  /** each team's branches as world polylines */
  lines: Record<TeamRouteId, Vec[][]>;
  /** cell key -> teams with a station in that cell */
  stationCells: Map<string, TeamRouteId[]>;
  /** per team: land cells within reach of its line, nearest first (sprawl candidates) */
  sprawlOrder: Record<TeamRouteId, string[]>;
  /** world radius that encloses all land */
  radius: number;
  labels: { text: string; x: number; y: number }[];
}

const cellKey = (i: number, j: number) => `${i}:${j}`;
const cellCentre = (i: number, j: number): Vec => [(i + 0.5) * CELL, (j + 0.5) * CELL];

const NEIGHBORHOODS: { text: string; lat: number; lng: number }[] = [
  { text: "CAMBRIDGE", lat: 42.372, lng: -71.108 },
  { text: "SOMERVILLE", lat: 42.392, lng: -71.098 },
  { text: "MALDEN", lat: 42.428, lng: -71.068 },
  { text: "REVERE", lat: 42.412, lng: -71.0 },
  { text: "EAST BOSTON", lat: 42.381, lng: -71.025 },
  { text: "SEAPORT", lat: 42.348, lng: -71.04 },
  { text: "DORCHESTER", lat: 42.302, lng: -71.068 },
  { text: "QUINCY", lat: 42.248, lng: -71.018 },
  { text: "JAMAICA PLAIN", lat: 42.31, lng: -71.112 },
  { text: "FENWAY", lat: 42.343, lng: -71.103 },
  { text: "BROOKLINE", lat: 42.332, lng: -71.135 },
  { text: "NEWTON", lat: 42.332, lng: -71.205 },
  { text: "CHARLES RIVER", lat: 42.3585, lng: -71.0805 },
];

let cached: CityGeo | null = null;

export function getCityGeo(): CityGeo {
  if (cached) return cached;

  const toW = ([lat, lng]: LatLng) => toWorld(lat, lng);
  const water: Vec[][] = [
    ...CHARLES.map((c) => bufferPolyline(c.path.map(toW), c.width / 2)),
    bufferPolyline(MYSTIC.path.map(toW), MYSTIC.width / 2),
    INNER_HARBOR.map(toW),
    OUTER_HARBOR.map(toW),
  ];
  const isWater = (p: Vec) => water.some((poly) => pointInPoly(p, poly));

  const lines = {} as Record<TeamRouteId, Vec[][]>;
  for (const team of TEAM_ROUTE_IDS) {
    lines[team] = LINES[team].map((branch) =>
      branch.filter((id) => STATIONS[id]).map((id) => toWorld(STATIONS[id].lat, STATIONS[id].lng)),
    );
  }
  const lineDist = (team: TeamRouteId, p: Vec) => {
    let best = Infinity;
    for (const br of lines[team]) for (let k = 1; k < br.length; k++) best = Math.min(best, segDist(p, br[k - 1], br[k]));
    return best;
  };

  // Land: a core disc around downtown plus a corridor along every line, minus water.
  let maxR = 0;
  for (const team of TEAM_ROUTE_IDS) for (const br of lines[team]) for (const p of br) maxR = Math.max(maxR, Math.hypot(p[0], p[1]));
  const span = Math.ceil((maxR + CELL * 4) / CELL);
  const CORE = 2.1;
  const CORRIDOR = CELL * 3.2;

  const cells: Cell[] = [];
  const cellByKey = new Map<string, Cell>();
  const distByTeam = new Map<string, Partial<Record<TeamRouteId, number>>>();
  let radius = 0;
  for (let i = -span; i < span; i++) {
    for (let j = -span; j < span; j++) {
      const c = cellCentre(i, j);
      const r = Math.hypot(c[0], c[1]);
      if (r > maxR + CELL * 3) continue;
      const dists: Partial<Record<TeamRouteId, number>> = {};
      let nearest = Infinity;
      for (const team of TEAM_ROUTE_IDS) {
        const d = lineDist(team, c);
        dists[team] = d;
        nearest = Math.min(nearest, d);
      }
      const inCore = r < CORE - 0.25 * Math.sin(Math.atan2(c[1], c[0]) * 3);
      if (!(inCore || nearest < CORRIDOR)) continue;
      if (isWater(c)) continue;
      const cell: Cell = { key: cellKey(i, j), i, j, x: c[0], y: c[1], r };
      cells.push(cell);
      cellByKey.set(cell.key, cell);
      distByTeam.set(cell.key, dists);
      radius = Math.max(radius, r + CELL);
    }
  }

  // Stations snap to the nearest land cell.
  const stationCells = new Map<string, TeamRouteId[]>();
  for (const s of Object.values(STATIONS)) {
    const p = toWorld(s.lat, s.lng);
    const i = Math.floor(p[0] / CELL);
    const j = Math.floor(p[1] / CELL);
    let key = cellKey(i, j);
    if (!cellByKey.has(key)) {
      let best: Cell | null = null;
      let bestD = Infinity;
      for (const c of cells) {
        const d = Math.hypot(c.x - p[0], c.y - p[1]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (!best || bestD > CELL * 2) continue;
      key = best.key;
    }
    const teams = stationCells.get(key) ?? [];
    for (const t of s.teams) if (!teams.includes(t)) teams.push(t);
    stationCells.set(key, teams);
  }

  const sprawlOrder = {} as Record<TeamRouteId, string[]>;
  for (const team of TEAM_ROUTE_IDS) {
    sprawlOrder[team] = cells
      .filter((c) => (distByTeam.get(c.key)?.[team] ?? Infinity) < CELL * 2.6)
      .sort((a, b) => {
        const da = distByTeam.get(a.key)![team]! + a.r * 0.04;
        const db = distByTeam.get(b.key)![team]! + b.r * 0.04;
        return da - db;
      })
      .map((c) => c.key);
  }

  const labels = NEIGHBORHOODS.map((n) => {
    const [x, y] = toWorld(n.lat, n.lng);
    return { text: n.text, x, y };
  });

  cached = { cells, cellByKey, water, lines, stationCells, sprawlOrder, radius, labels };
  return cached;
}

/** Deterministic 0..1 hash for per-building variety. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
