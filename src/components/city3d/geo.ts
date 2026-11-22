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
  /** papercut parks (world polygons) */
  parks: { name: string; poly: Vec[] }[];
  /** landmark lots: each landmark owns one land cell (claimed by whichever team builds there) */
  landmarks: LandmarkSite[];
  /** paper trees in parks and along streets (static scenery) */
  trees: Tree[];
  /** folded wave marks on open water */
  waves: Vec[];
  /** Zakim bridge deck ends */
  zakim: [Vec, Vec];
}

export type Zone = "downtown" | "backbay" | "fenway" | "cambridge" | "seaport" | "harbor" | "neighborhood";
export type LandmarkKind = "stateHouse" | "customHouse" | "oldNorth" | "citgo" | "fenway" | "greatDome" | "pru" | "hancock";

export interface LandmarkSite {
  kind: LandmarkKind;
  name: string;
  /** land cell this landmark sits on */
  cell: string;
  x: number;
  y: number;
}

export interface Tree {
  x: number;
  y: number;
  kind: "elm" | "cone";
  /** size multiplier */
  s: number;
  /** street tree (hidden when zoomed out) vs park tree */
  street: boolean;
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

  // ---- Papercut scenery (decorative, approximate) ----
  const charlesMid = CHARLES[1];
  const esplanadePath = charlesMid.path.slice(2, 6).map(toW);
  const hw = charlesMid.width / 2;
  const parks = [
    ...PARKS.map((p) => ({ name: p.name, poly: p.path.map(toW) })),
    { name: "Esplanade", poly: [...offsetLine(esplanadePath, -hw + 0.02), ...offsetLine(esplanadePath, -hw - 0.12).reverse()] },
  ];

  // Landmarks: each takes the nearest free land cell so two never share a lot.
  const taken = new Set<string>();
  const landmarks: LandmarkSite[] = [];
  for (const site of LANDMARK_SITES) {
    const p = toWorld(site.lat, site.lng);
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const c of cells) {
      if (taken.has(c.key)) continue;
      const d = Math.hypot(c.x - p[0], c.y - p[1]);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best || bestD > CELL * 2.2) continue;
    taken.add(best.key);
    landmarks.push({ kind: site.kind, name: site.name, cell: best.key, x: best.x, y: best.y });
  }

  // Trees: a loose grid inside each park, plus a sprinkle of street trees on cell corners.
  const trees: Tree[] = [];
  const isLand = (p: Vec) => cellByKey.has(cellKey(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL)));
  for (const park of parks) {
    const xs = park.poly.map((p) => p[0]);
    const ys = park.poly.map((p) => p[1]);
    const step = 0.075;
    let n = 0;
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
        const k = `${park.name}${x.toFixed(3)}${y.toFixed(3)}`;
        const p: Vec = [x + (hash01(k + "x") - 0.5) * step * 0.7, y + (hash01(k + "y") - 0.5) * step * 0.7];
        if (n >= 26 || hash01(k) < 0.25 || !pointInPoly(p, park.poly) || !isLand(p) || taken.has(cellKey(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL)))) continue;
        trees.push({ x: p[0], y: p[1], kind: hash01(k + "k") < 0.75 ? "elm" : "cone", s: 0.8 + hash01(k + "s") * 0.45, street: false });
        n++;
      }
    }
  }
  let streetTrees = 0;
  for (const c of cells) {
    if (streetTrees >= 56 || c.r > 3.4 || hash01(c.key + "t") > 0.14) continue;
    const sx = hash01(c.key + "tx") < 0.5 ? -1 : 1;
    const sy = hash01(c.key + "ty") < 0.5 ? -1 : 1;
    trees.push({ x: c.x + sx * CELL * 0.38, y: c.y + sy * CELL * 0.38, kind: hash01(c.key + "tk") < 0.5 ? "elm" : "cone", s: 0.6 + hash01(c.key + "ts") * 0.3, street: true });
    streetTrees++;
  }

  // Folded wave marks on open water (never on land).
  const waves: Vec[] = [];
  for (let x = -radius; x <= radius && waves.length < 64; x += 0.34) {
    for (let y = -radius; y <= radius && waves.length < 64; y += 0.3) {
      const k = `${x.toFixed(2)}:${y.toFixed(2)}`;
      const p: Vec = [x + (hash01(k + "a") - 0.5) * 0.16, y + (hash01(k + "b") - 0.5) * 0.16];
      if (Math.hypot(p[0], p[1]) > radius * 0.98 || isLand(p) || !water.some((w) => pointInPoly(p, w))) continue;
      waves.push(p);
    }
  }

  const zakim: [Vec, Vec] = [toWorld(42.3652, -71.0612), toWorld(42.3716, -71.0646)];

  cached = { cells, cellByKey, water, lines, stationCells, sprawlOrder, radius, labels, parks, landmarks, trees, waves, zakim };
  return cached;
}

// ---------- Scenery and neighborhoods (decorative, approximate; never a factual claim) ----------

const PARKS: { name: string; path: LatLng[] }[] = [
  {
    name: "Boston Common",
    path: [
      [42.3571, -71.07],
      [42.3584, -71.0636],
      [42.3553, -71.0618],
      [42.3526, -71.0655],
      [42.3537, -71.069],
    ],
  },
  {
    name: "Public Garden",
    path: [
      [42.356, -71.0727],
      [42.3572, -71.0702],
      [42.354, -71.0692],
      [42.3529, -71.0716],
    ],
  },
  {
    name: "Back Bay Fens",
    path: [
      [42.3462, -71.0972],
      [42.3424, -71.0918],
      [42.3394, -71.0944],
      [42.3438, -71.1004],
    ],
  },
  {
    name: "Franklin Park",
    path: Array.from({ length: 7 }, (_, i): LatLng => {
      const a = (i / 7) * Math.PI * 2;
      return [42.305 + Math.sin(a) * 0.0055, -71.09 + Math.cos(a) * 0.0075];
    }),
  },
];

const LANDMARK_SITES: { kind: LandmarkKind; name: string; lat: number; lng: number }[] = [
  { kind: "stateHouse", name: "State House", lat: 42.3588, lng: -71.0638 },
  { kind: "customHouse", name: "Custom House", lat: 42.3592, lng: -71.0536 },
  { kind: "hancock", name: "Hancock Tower", lat: 42.3493, lng: -71.0753 },
  { kind: "pru", name: "Prudential", lat: 42.3471, lng: -71.0825 },
  { kind: "citgo", name: "Citgo sign", lat: 42.3489, lng: -71.0952 },
  { kind: "fenway", name: "Fenway Park", lat: 42.3467, lng: -71.0972 },
  { kind: "greatDome", name: "Great Dome", lat: 42.3596, lng: -71.0921 },
  { kind: "oldNorth", name: "Old North", lat: 42.3663, lng: -71.0544 },
];

const ZONE_SITES: { zone: Zone; lat: number; lng: number; r: number }[] = [
  { zone: "downtown", lat: 42.3575, lng: -71.06, r: 0.62 },
  { zone: "backbay", lat: 42.3478, lng: -71.0775, r: 0.52 },
  { zone: "fenway", lat: 42.345, lng: -71.1, r: 0.46 },
  { zone: "fenway", lat: 42.351, lng: -71.115, r: 0.42 },
  { zone: "cambridge", lat: 42.3625, lng: -71.09, r: 0.5 },
  { zone: "cambridge", lat: 42.3705, lng: -71.112, r: 0.5 },
  { zone: "seaport", lat: 42.349, lng: -71.042, r: 0.5 },
  { zone: "harbor", lat: 42.376, lng: -71.033, r: 0.55 },
  { zone: "harbor", lat: 42.41, lng: -70.998, r: 0.55 },
];

let zoneWorld: { zone: Zone; p: Vec; r: number }[] | null = null;

/** Which Boston neighborhood style a world point builds in. */
export function zoneAt(x: number, y: number): Zone {
  zoneWorld ??= ZONE_SITES.map((z) => ({ zone: z.zone, p: toWorld(z.lat, z.lng), r: z.r }));
  let best: Zone = "neighborhood";
  let bestK = 1;
  for (const z of zoneWorld) {
    const k = Math.hypot(x - z.p[0], y - z.p[1]) / z.r;
    if (k < bestK) {
      bestK = k;
      best = z.zone;
    }
  }
  return best;
}

function offsetLine(path: Vec[], d: number): Vec[] {
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] + (-dy / len) * d, p[1] + (dx / len) * d];
  });
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
