// Static geometry for the Hunt delay map: projected stations, line branches, transfers, termini and label hints.
// Built once from the shared MBTA geometry (src/components/map) in a fixed "world" space 1000 units wide.
import { LINE_IDS, type TeamRouteId } from "@/contracts/routes";
import { BOSTON_BOUNDS, CORE_BOUNDS, LINES, STATIONS, makeProjector, type Bounds } from "@/components/map/projection";

export const WORLD = makeProjector(BOSTON_BOUNDS, 1000);

/** Downtown framing for the first paint: a touch wider than CORE_BOUNDS so BU and Kendall are in view. */
export const START_BOUNDS: Bounds = { ...CORE_BOUNDS, minLng: -71.102, maxLng: -71.038, minLat: 42.338, maxLat: 42.368 };

export const GLOW: Record<TeamRouteId, string> = {
  Red: "var(--glow-red)",
  Orange: "var(--glow-orange)",
  Blue: "var(--glow-blue)",
  Green: "var(--glow-green)",
  Silver: "var(--glow-silver)",
};

export const SHORT: Record<TeamRouteId, string> = { Red: "RL", Orange: "OL", Blue: "BL", Green: "GL", Silver: "SL" };

export type Importance = 1 | 2 | 3;
export type LabelSide = "r" | "l" | "t" | "b" | "tr" | "tl" | "br" | "bl";

export interface MapStation {
  id: string;
  name: string;
  x: number;
  y: number;
  teams: TeamRouteId[];
  transfer: boolean;
  terminus: TeamRouteId | null;
  importance: Importance;
  side: LabelSide;
  /** Bus-rapid-transit stops (Silver Line SL4/SL5 numeric ids) draw as small ticks. */
  minor: boolean;
  /** Unit vector pointing away from the line at a terminus (where the badge goes). */
  out: { dx: number; dy: number } | null;
}

export interface MapBranch {
  team: TeamRouteId;
  d: string;
}

// Hynes Convention Center is missing from the shared snapshot; it is the Green trunk link between Copley and Kenmore.
const HYNES = { id: "place-hymnl", name: "Hynes", lat: 42.347888, lng: -71.087903 };

/** Short display names so labels fit like the official map. */
const DISPLAY: Record<string, string> = {
  "place-dwnxg": "Downtown Crossing",
  "place-gover": "Government Center",
  "place-bucen": "BU Central",
  "place-buest": "BU East",
  "place-mdftf": "Medford/Tufts",
  "place-unsqu": "Union Square",
  "place-knncl": "Kendall/MIT",
  "place-chmnl": "Charles/MGH",
};

/** Hand-placed label sides for the crowded downtown so names do not collide. */
const SIDES: Record<string, LabelSide> = {
  "place-pktrm": "l",
  "place-dwnxg": "br",
  "place-state": "r",
  "place-gover": "tl",
  "place-haecl": "r",
  "place-north": "tr",
  "place-sstat": "br",
  "place-chmnl": "t",
  "place-knncl": "t",
  "place-boyls": "b",
  "place-armnl": "t",
  "place-coecl": "t",
  "place-bbsta": "br",
  "place-kencl": "b",
  "place-hymnl": "t",
  "place-aqucl": "r",
  "place-bomnl": "t",
  "place-chncl": "r",
  "place-tumnl": "r",
  "place-aport": "r",
  "place-mvbcl": "r",
  "place-lech": "tl",
  "place-spmnl": "l",
  "place-ccmnl": "r",
  "place-wtcst": "b",
  "place-crtst": "t",
  "place-prmnl": "l",
  "place-symcl": "l",
  "place-masta": "r",
  "place-bucen": "t",
  "place-babck": "t",
  "place-harsq": "l",
  "place-cntsq": "t",
  "place-brdwy": "r",
  "place-andrw": "r",
  "place-jfk": "r",
};

/** Stations that read as landmarks on the official map even without a transfer. */
const KEY = new Set([
  "place-harsq",
  "place-cntsq",
  "place-knncl",
  "place-chmnl",
  "place-boyls",
  "place-armnl",
  "place-coecl",
  "place-hymnl",
  "place-bbsta",
  "place-aqucl",
  "place-aport",
  "place-bucen",
  "place-buest",
  "place-fenwy",
  "place-symcl",
  "place-prmnl",
  "place-chncl",
  "place-tumnl",
  "place-masta",
  "place-rugg",
  "place-jfk",
  "place-brdwy",
  "place-andrw",
  "place-mvbcl",
  "place-lech",
  "place-spmnl",
  "place-ccmnl",
  "place-crtst",
  "place-wtcst",
  "place-mfa",
  "place-lngmd",
  "place-jaksn",
  "place-qnctr",
  "place-davis",
  "place-portr",
  "place-sull",
]);

// Line ends (badges like the official map). The Silver branches end at bus stops, so only the named ones are listed.
const TERMINI: [string, TeamRouteId][] = [
  ["place-alfcl", "Red"],
  ["place-asmnl", "Red"],
  ["place-brntn", "Red"],
  ["place-ogmnl", "Orange"],
  ["place-forhl", "Orange"],
  ["place-wondl", "Blue"],
  ["place-bomnl", "Blue"],
  ["place-mdftf", "Green"],
  ["place-unsqu", "Green"],
  ["place-hsmnl", "Green"],
  ["place-river", "Green"],
  ["place-lake", "Green"],
  ["place-clmnl", "Green"],
  ["place-chels", "Silver"],
  ["place-nubn", "Silver"],
];

function project(lat: number, lng: number) {
  const { x, y } = WORLD.project(lat, lng);
  return { x: +x.toFixed(1), y: +y.toFixed(1) };
}

function build() {
  const stations = new Map<string, MapStation>();
  const terminusOf = new Map(TERMINI);

  const add = (id: string, name: string, lat: number, lng: number, team: TeamRouteId) => {
    const existing = stations.get(id);
    if (existing) {
      if (!existing.teams.includes(team)) existing.teams.push(team);
      return;
    }
    const { x, y } = project(lat, lng);
    stations.set(id, {
      id,
      name: DISPLAY[id] ?? name,
      x,
      y,
      teams: [team],
      transfer: false,
      terminus: terminusOf.get(id) ?? null,
      importance: 1,
      side: SIDES[id] ?? "r",
      minor: !id.startsWith("place-"),
      out: null,
    });
  };

  const branches: MapBranch[] = [];
  const ends: [string, string][] = [];
  for (const team of LINE_IDS) {
    for (const branch of LINES[team]) {
      const geo = branch.map((id) => STATIONS[id]).filter(Boolean);
      const pts = geo.map((s) => {
        add(s.id, s.name, s.lat, s.lng, team);
        return project(s.lat, s.lng);
      });
      if (pts.length > 1) {
        branches.push({ team, d: pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join("") });
        ends.push([geo[0].id, geo[1].id], [geo[geo.length - 1].id, geo[geo.length - 2].id]);
      }
    }
  }
  for (const [id, nb] of ends) {
    const s = stations.get(id);
    const n = stations.get(nb);
    if (!s || !n || !s.terminus || s.out) continue;
    const len = Math.hypot(s.x - n.x, s.y - n.y) || 1;
    s.out = { dx: (s.x - n.x) / len, dy: (s.y - n.y) / len };
  }

  // Green trunk: Copley -> Hynes -> Kenmore.
  add(HYNES.id, HYNES.name, HYNES.lat, HYNES.lng, "Green");
  const link = ["place-coecl", HYNES.id, "place-kencl"].map((id) => stations.get(id)).filter(Boolean) as MapStation[];
  if (link.length === 3) branches.push({ team: "Green", d: link.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join("") });

  for (const s of stations.values()) {
    s.transfer = s.teams.length > 1 || s.id === "place-kencl" || s.id === "place-jfk";
    s.importance = s.transfer || s.terminus ? 3 : KEY.has(s.id) ? 2 : 1;
  }

  return { stations: [...stations.values()], branches };
}

const MODEL = build();
export const MAP_STATIONS = MODEL.stations;
export const MAP_BRANCHES = MODEL.branches;
export const STATION_BY_ID = new Map(MAP_STATIONS.map((s) => [s.id, s]));

/** Draw order: Silver (thin BRT) at the bottom, then Green, Blue, Orange, Red like the official map. */
export const DRAW_ORDER: TeamRouteId[] = ["Silver", "Green", "Blue", "Orange", "Red"];

export function boundsToWorld(b: Bounds) {
  const a = WORLD.project(b.maxLat, b.minLng);
  const c = WORLD.project(b.minLat, b.maxLng);
  return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
}

export function projectLatLng(lat: number, lng: number) {
  return WORLD.project(lat, lng);
}
