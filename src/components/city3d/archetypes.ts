// Boston building archetypes folded from paper solids. Neighborhood (zone) picks the style, tier picks how
// built-up it is: cottages -> triple-deckers / brownstones -> mid-rise -> towers -> skyline with a team flag.
// Landmarks (State House, Custom House, Citgo, Fenway, Great Dome, Pru, Hancock, Old North) take over the
// lot they sit on and fly the color of whichever team builds there. All scenery is decorative.
import type { TeamRouteId } from "@/contracts/routes";
import { getCityGeo, type LandmarkKind, type Tree, type Vec, type Zone } from "./geo";
import { f, isoFor, type Iso } from "./iso";
import { FLOOR, type Building } from "./model";
import { CLAPBOARD, PAPER, TEAM_HEX } from "./palette";
import { box, dome, extrude, frustum, gable, pyramid, renderSolids, type Mark, type P3, type Shape, type Solid } from "./solids";

export interface SceneItem {
  key: string;
  depth: number;
  team: TeamRouteId | null;
  shapes: Shape[];
  /** screen point at the top of the building, for tags and flags */
  roof: Vec;
  kind: "bld" | "tree" | "street-tree" | "scenery";
  /** whole floors (buildings only), drives the unfold animation */
  floors?: number;
}

interface Parts {
  solids: Solid[];
  marks: Mark[];
  top: P3;
  /** pole base for a team pennant */
  flag?: P3;
}

const WIN_DARK = { color: PAPER.window, dash: "1.5 1.7", w: 1.1, op: 0.42 };
const WIN_BRICK = { color: "#fbf3e2", dash: "1.4 1.8", w: 1, op: 0.55 };
const WIN_GLASS = { color: "#fffaf0", w: 0.55, op: 0.6 };

const pick = <T,>(arr: readonly T[], seed: number) => arr[Math.floor(seed * arr.length) % arr.length];

/** Cornice ring that carries the (exact team color) flat roof. */
const cornice = (x: number, y: number, hx: number, hy: number, z: number, roof: string) => box(x, y, hx * 1.08, hy * 1.08, z - 0.012, z + 0.014, PAPER.cream, roof, true);

function crane(x: number, y: number, h: number, a: number): Mark[] {
  const top: P3 = [x, y, h];
  return [
    { a: [x, y, 0], b: top, color: PAPER.crane, w: 1.3 },
    { a: [x - a * 0.6, y, h], b: [x + a * 2.6, y, h], color: PAPER.crane, w: 1.1 },
    { a: [x, y, h + FLOOR * 0.9], b: [x + a * 2.4, y, h], color: "#8a6a24", w: 0.5 },
    { a: [x, y, h + FLOOR * 0.9], b: [x - a * 0.6, y, h], color: "#8a6a24", w: 0.5 },
    { a: [x + a * 2, y, h], b: [x + a * 2, y, h - FLOOR * 2.2], color: "#6a5d4c", w: 0.4 },
  ];
}

function waterTank(x: number, y: number, z: number, a: number): Solid[] {
  return [frustum(x, y, a * 0.16, a * 0.16, z + FLOOR * 0.15, z + FLOOR * 0.75, "#a98b62", 6), pyramid(x, y, a * 0.15, a * 0.15, z + FLOOR * 0.75, FLOOR * 0.35, "#6b5a49")];
}

// ---------- extra variants (more variety inside each neighborhood and tier) ----------
// A second hash of the lot seed decides whether a lot uses one of these instead of the zone's classic
// archetype, so the skyline mixes brownstones with Victorians, garages, rotundas, twin towers and so on.

const CONCRETE = "#cfc6b6";
const STUCCO = "#e8dcc4";
const COPPER = "#6f9e8a";
const AWNINGS = ["#2f6b45", "#b4532f", "#2f5d7c", "#c9962b"];

const RESIDENTIAL_LOW = ["cape", "duplex", "corner", "church", "classic", "classic"] as const;
const CITY_LOW = ["corner", "rowPair", "classic", "classic"] as const;
const MID_RES = ["victorian", "warehouse", "firehouse", "classic", "classic"] as const;
const MID_CITY = ["rowPair", "warehouse", "classic", "classic"] as const;
const T3_ALL = ["lshape", "garage", "stepped", "loft", "classic", "classic"] as const;
const T3_CIVIC = ["rotunda", "lshape", "stepped", "garage", "classic"] as const;
const TOWER_BY_ZONE: Record<Zone, readonly string[]> = {
  downtown: ["crown", "twin", "cylinder", "classic"],
  backbay: ["tapered", "cylinder", "podium", "classic"],
  seaport: ["tapered", "twin", "podium", "classic"],
  cambridge: ["podium", "cylinder", "classic"],
  fenway: ["podium", "crown", "classic"],
  harbor: ["podium", "cylinder", "classic"],
  neighborhood: ["podium", "crown", "cylinder", "classic"],
};

function variant(zone: Zone, tier: number, x: number, y: number, a: number, H: number, seed: number, roof: string): Parts | null {
  const v = (seed * 9.7317 + tier * 0.3711) % 1;
  const cityish = zone === "downtown" || zone === "backbay" || zone === "seaport";
  const kind =
    tier <= 1
      ? pick(cityish ? CITY_LOW : RESIDENTIAL_LOW, v)
      : tier === 2
        ? pick(cityish ? MID_CITY : MID_RES, v)
        : tier === 3
          ? pick(zone === "cambridge" || zone === "downtown" ? T3_CIVIC : T3_ALL, v)
          : pick(TOWER_BY_ZONE[zone], v);
  if (kind === "classic") return null;
  const s: Solid[] = [];
  const m: Mark[] = [];
  const clap = pick(CLAPBOARD, (seed * 3.17) % 1);
  const sky = tier >= 5;

  switch (kind) {
    case "cape": {
      // Cape Cod: low and wide, steep roof, one dormer.
      const h = Math.max(H * 0.8, FLOOR * 0.9);
      s.push(box(x, y, a * 0.85, a * 0.55, 0, h, clap, clap, false, { win: WIN_DARK, crease: true }));
      s.push(gable(x, y, a * 0.9, a * 0.6, h, FLOOR * 0.9, roof, clap, true));
      s.push(box(x + a * 0.2, y - a * 0.28, a * 0.16, a * 0.14, h, h + FLOOR * 0.45, clap), gable(x + a * 0.2, y - a * 0.28, a * 0.18, a * 0.16, h + FLOOR * 0.45, FLOOR * 0.25, roof, clap, false));
      s.push(box(x - a * 0.55, y + a * 0.25, a * 0.08, a * 0.08, h, h + FLOOR * 1.1, PAPER.brick));
      return { solids: s, marks: m, top: [x, y, h + FLOOR * 0.9] };
    }
    case "duplex": {
      // Two-family side-by-side: two gables, two paint colors.
      const clap2 = pick(CLAPBOARD, (seed * 5.91) % 1);
      const h = Math.max(H, FLOOR * 1.4);
      s.push(box(x - a * 0.4, y, a * 0.4, a * 0.7, 0, h, clap, clap, false, { win: WIN_DARK, crease: true }), gable(x - a * 0.4, y, a * 0.43, a * 0.74, h, FLOOR * 0.65, roof, clap, false));
      s.push(box(x + a * 0.4, y, a * 0.4, a * 0.7, 0, h * 0.92, clap2, clap2, false, { win: WIN_DARK }), gable(x + a * 0.4, y, a * 0.43, a * 0.74, h * 0.92, FLOOR * 0.6, roof, clap2, false));
      return { solids: s, marks: m, top: [x, y, h + FLOOR * 0.65] };
    }
    case "corner": {
      // Corner store: flat roof in team color, colored awning stripe, rooftop sign.
      const h = Math.max(H, FLOOR * 1.2);
      const aw = pick(AWNINGS, (seed * 7.7) % 1);
      s.push(box(x, y, a * 0.82, a * 0.82, 0, h, STUCCO, roof, true, { win: tier ? WIN_DARK : undefined, crease: true }));
      m.push({ a: [x - a * 0.82, y - a * 0.84, FLOOR * 0.75], b: [x + a * 0.82, y - a * 0.84, FLOOR * 0.75], color: aw, w: 2.4, n: [0, -1, 0] });
      m.push({ a: [x - a * 0.84, y - a * 0.82, FLOOR * 0.75], b: [x - a * 0.84, y + a * 0.82, FLOOR * 0.75], color: aw, w: 2.4, n: [-1, 0, 0] });
      s.push(box(x, y + a * 0.3, a * 0.4, a * 0.04, h, h + FLOOR * 0.4, "#fbf6ec"));
      return { solids: s, marks: m, top: [x, y, h + FLOOR * 0.4] };
    }
    case "church": {
      // Small white-clapboard meeting house with a steeple.
      const h = Math.max(H, FLOOR * 1.5);
      s.push(box(x, y + a * 0.15, a * 0.5, a * 0.7, 0, h, "#f6f0e4", "#f6f0e4", false, { win: WIN_DARK, crease: true }), gable(x, y + a * 0.15, a * 0.54, a * 0.74, h, FLOOR * 0.8, roof, "#f6f0e4", false));
      const st = h + FLOOR * 1.4;
      s.push(box(x, y - a * 0.65, a * 0.2, a * 0.2, 0, st, "#fbf6ec", "#fbf6ec", false, { crease: true }), pyramid(x, y - a * 0.65, a * 0.2, a * 0.2, st, FLOOR * 1.6, "#fbf6ec"));
      return { solids: s, marks: m, top: [x, y - a * 0.65, st + FLOOR * 1.6] };
    }
    case "rowPair": {
      // Two narrow row houses of different heights with mansard caps.
      const w1 = pick([PAPER.brick, PAPER.brownstone], v);
      const w2 = pick([PAPER.brownstone, PAPER.brick, STUCCO], (seed * 4.3) % 1);
      const h2 = H * 0.82;
      s.push(box(x - a * 0.42, y, a * 0.4, a * 0.8, 0, H, w1, w1, false, { win: WIN_BRICK, crease: true }), pyramid(x - a * 0.42, y, a * 0.42, a * 0.82, H, FLOOR * 0.45, PAPER.slate, 0.55, roof));
      s.push(box(x + a * 0.42, y, a * 0.4, a * 0.8, 0, h2, w2, w2, false, { win: WIN_BRICK, crease: true }), pyramid(x + a * 0.42, y, a * 0.42, a * 0.82, h2, FLOOR * 0.45, PAPER.slate, 0.55, roof));
      return { solids: s, marks: m, top: [x, y, H + FLOOR * 0.45] };
    }
    case "victorian": {
      // Queen Anne: hipped roof plus a round corner turret with a cone cap.
      s.push(box(x, y, a * 0.72, a * 0.72, 0, H, clap, clap, false, { win: WIN_DARK, crease: true }), pyramid(x, y, a * 0.76, a * 0.76, H, FLOOR * 0.8, PAPER.slate, 0.2, roof));
      const tx = x - a * 0.62;
      const ty = y - a * 0.62;
      s.push(frustum(tx, ty, a * 0.24, a * 0.24, 0, H + FLOOR * 0.5, clap, 8), frustum(tx, ty, a * 0.28, 0, H + FLOOR * 0.5, H + FLOOR * 1.6, roof, 8));
      return { solids: s, marks: m, top: [tx, ty, H + FLOOR * 1.6] };
    }
    case "warehouse": {
      // Brick warehouse with a sawtooth roof.
      const h = H * 0.85;
      s.push(box(x, y, a * 0.92, a * 0.8, 0, h, PAPER.brick, PAPER.brick, true, { win: WIN_BRICK, crease: true }));
      for (const k of [-0.6, 0, 0.6]) s.push(gable(x + a * k, y, a * 0.3, a * 0.78, h, FLOOR * 0.45, k === 0 ? roof : PAPER.slate, PAPER.brick, false));
      return { solids: s, marks: m, top: [x, y, h + FLOOR * 0.45] };
    }
    case "firehouse": {
      // Brick firehouse with a tall hose-drying tower.
      s.push(box(x + a * 0.15, y, a * 0.7, a * 0.8, 0, H, PAPER.brick, roof, true, { win: WIN_BRICK, crease: true }));
      m.push({ a: [x - a * 0.4, y - a * 0.82, FLOOR * 0.1], b: [x + a * 0.7, y - a * 0.82, FLOOR * 0.1], color: "#da291c", w: 1.2, n: [0, -1, 0] });
      const tt = H + FLOOR * 1.8;
      s.push(box(x - a * 0.65, y + a * 0.4, a * 0.22, a * 0.22, 0, tt, PAPER.brick, PAPER.brick, false, { crease: true }), pyramid(x - a * 0.65, y + a * 0.4, a * 0.25, a * 0.25, tt, FLOOR * 0.5, roof));
      return { solids: s, marks: m, top: [x - a * 0.65, y + a * 0.4, tt + FLOOR * 0.5] };
    }
    case "lshape": {
      // L-shaped courtyard block.
      const w = pick([PAPER.brick, PAPER.stone, STUCCO], v);
      s.push(extrude([[x - a * 0.9, y - a * 0.9], [x + a * 0.9, y - a * 0.9], [x + a * 0.9, y - a * 0.2], [x - a * 0.2, y - a * 0.2], [x - a * 0.2, y + a * 0.9], [x - a * 0.9, y + a * 0.9]], 0, H, w, roof, true, { win: w === PAPER.brick ? WIN_BRICK : WIN_DARK, crease: true }));
      s.push(...waterTank(x - a * 0.55, y + a * 0.5, H, a));
      return { solids: s, marks: m, top: [x, y, H] };
    }
    case "garage": {
      // Concrete parking garage: open floors as white stripes.
      const h = H * 0.75;
      s.push(box(x, y, a * 0.9, a * 0.85, 0, h, CONCRETE, roof, true, { crease: true }));
      for (let z = FLOOR * 0.55; z < h; z += FLOOR * 0.9) {
        m.push({ a: [x - a * 0.9, y - a * 0.86, z], b: [x + a * 0.9, y - a * 0.86, z], color: "#5a4e40", w: 1.5, n: [0, -1, 0] });
        m.push({ a: [x - a * 0.91, y - a * 0.85, z], b: [x - a * 0.91, y + a * 0.85, z], color: "#5a4e40", w: 1.5, n: [-1, 0, 0] });
        m.push({ a: [x + a * 0.91, y + a * 0.85, z], b: [x + a * 0.91, y - a * 0.85, z], color: "#5a4e40", w: 1.5, n: [1, 0, 0] });
        m.push({ a: [x + a * 0.9, y + a * 0.86, z], b: [x - a * 0.9, y + a * 0.86, z], color: "#5a4e40", w: 1.5, n: [0, 1, 0] });
      }
      return { solids: s, marks: m, top: [x, y, h] };
    }
    case "stepped": {
      // Wedding-cake setback block.
      const w = pick([PAPER.stone, STUCCO, PAPER.brownstone], v);
      s.push(box(x, y, a * 0.9, a * 0.9, 0, H * 0.55, w, w, false, { win: WIN_DARK, crease: true }));
      s.push(box(x, y, a * 0.65, a * 0.65, H * 0.55, H * 0.85, w, w, false, { win: WIN_DARK, crease: true }));
      s.push(box(x, y, a * 0.4, a * 0.4, H * 0.85, H, PAPER.cream, roof, true));
      return { solids: s, marks: m, top: [x, y, H] };
    }
    case "loft": {
      // Tall brick loft with arched-window rhythm and a water tank.
      s.push(box(x, y, a * 0.75, a * 0.9, 0, H, PAPER.brownstone, PAPER.brownstone, true, { win: WIN_BRICK, crease: true }), cornice(x, y, a * 0.75, a * 0.9, H, roof));
      s.push(...waterTank(x + a * 0.3, y - a * 0.35, H, a));
      return { solids: s, marks: m, top: [x, y, H] };
    }
    case "rotunda": {
      // Round library / hall with a green copper dome.
      const r = a * 0.78;
      s.push(frustum(x, y, r, r, 0, H * 0.8, PAPER.stone, 12));
      for (const k of [0, 1, 2, 3, 4]) {
        const ang = -Math.PI / 2 + (k - 2) * 0.32;
        m.push({ a: [x + Math.cos(ang) * r * 1.01, y + Math.sin(ang) * r * 1.01, FLOOR * 0.2], b: [x + Math.cos(ang) * r * 1.01, y + Math.sin(ang) * r * 1.01, H * 0.75], color: "#fffaf0", w: 0.9 });
      }
      s.push(...dome(x, y, r * 0.75, H * 0.8, COPPER, PAPER.stone));
      const dt = H * 0.8 + r * 0.75 * 0.55 * 2.25;
      return { solids: s, marks: m, top: [x, y, dt] };
    }
    case "crown": {
      // Art-deco tower: shaft, two setbacks, pyramid crown in team color.
      s.push(box(x, y, a * 0.72, a * 0.72, 0, H * 0.7, PAPER.stone, PAPER.stone, false, { win: WIN_DARK, crease: true }));
      s.push(box(x, y, a * 0.55, a * 0.55, H * 0.7, H * 0.9, PAPER.stone, PAPER.stone, false, { win: WIN_DARK, crease: true }));
      s.push(box(x, y, a * 0.38, a * 0.38, H * 0.9, H, PAPER.cream, PAPER.cream, false, { crease: true }));
      s.push(pyramid(x, y, a * 0.4, a * 0.4, H, FLOOR * 1.8, roof));
      const top = H + FLOOR * 1.8;
      return { solids: s, marks: m, top: [x, y, top + (sky ? FLOOR * 1.2 : 0)], flag: sky ? [x, y, top] : undefined };
    }
    case "twin": {
      // Twin glass towers joined by a sky bridge.
      const g = pick([PAPER.glass, PAPER.glassLight], v);
      const h2 = H * 0.86;
      s.push(box(x - a * 0.48, y, a * 0.36, a * 0.5, 0, H, g, roof, true, { win: WIN_GLASS, crease: true }));
      s.push(box(x + a * 0.48, y, a * 0.36, a * 0.5, 0, h2, g, roof, true, { win: WIN_GLASS, crease: true }));
      s.push(box(x, y, a * 0.14, a * 0.22, h2 * 0.6, h2 * 0.6 + FLOOR * 0.8, PAPER.cream));
      return { solids: s, marks: m, top: [x - a * 0.48, y, H], flag: sky ? [x - a * 0.48, y, H] : undefined };
    }
    case "cylinder": {
      // Round glass tower (Harbor Towers / Millennium-ish).
      const g = pick([PAPER.glassLight, PAPER.glass, CONCRETE], v);
      s.push(frustum(x, y, a * 0.62, a * 0.62, 0, H, g, 12));
      s.push(frustum(x, y, a * 0.66, a * 0.66, H, H + FLOOR * 0.2, roof, 12));
      for (let z = FLOOR; z < H; z += FLOOR * 1.6) {
        m.push({ a: [x - a * 0.62, y, z], b: [x, y - a * 0.62, z], color: "#fffaf0", w: 0.7 });
        m.push({ a: [x, y - a * 0.62, z], b: [x + a * 0.62, y, z], color: "#fffaf0", w: 0.7 });
      }
      return { solids: s, marks: m, top: [x, y, H + FLOOR * 0.2], flag: sky ? [x, y, H + FLOOR * 0.2] : undefined };
    }
    case "tapered": {
      // Tapered glass needle with a crease.
      s.push(frustum(x, y, a * 0.75, a * 0.42, 0, H, PAPER.glass, 4));
      s.push(frustum(x, y, a * 0.42, 0, H, H + FLOOR * 1.4, roof, 4));
      return { solids: s, marks: m, top: [x, y, H + FLOOR * 1.4], flag: sky ? [x, y, H + FLOOR * 1.4] : undefined };
    }
    case "podium": {
      // Wide stone podium with a slim slab tower and a mechanical penthouse.
      s.push(box(x, y, a * 0.95, a * 0.9, 0, FLOOR * 2, PAPER.stone, PAPER.stone, true, { win: WIN_DARK, crease: true }));
      s.push(box(x + a * 0.2, y, a * 0.45, a * 0.7, FLOOR * 2, H, PAPER.glassLight, PAPER.glassLight, false, { win: WIN_GLASS, crease: true }));
      s.push(box(x + a * 0.2, y, a * 0.25, a * 0.35, H, H + FLOOR * 0.7, CONCRETE, roof, true));
      return { solids: s, marks: m, top: [x + a * 0.2, y, H + FLOOR * 0.7], flag: sky ? [x + a * 0.2, y, H + FLOOR * 0.7] : undefined };
    }
  }
  return null;
}

/** Regular (non-landmark) building for a zone and tier. */
function archetype(zone: Zone, tier: number, x: number, y: number, a: number, H: number, seed: number, roof: string): Parts {
  const alt = variant(zone, tier, x, y, a, H, seed, roof);
  if (alt) return alt;
  const s: Solid[] = [];
  const m: Mark[] = [];
  const clap = pick(CLAPBOARD, seed);
  const along = seed < 0.5;

  if (tier <= 1) {
    if (zone === "downtown" || zone === "backbay") {
      // Beacon Hill brick row house with a chimney.
      s.push(box(x, y, a * 0.75, a * 0.7, 0, H, PAPER.brick, roof, true, { win: tier ? WIN_BRICK : undefined, crease: true }));
      s.push(box(x + a * 0.45, y + a * 0.35, a * 0.1, a * 0.1, H, H + FLOOR * 0.45, PAPER.brownstone));
      return { solids: s, marks: m, top: [x, y, H] };
    }
    // Clapboard cottage / house with a folded gable roof.
    const hx = tier ? a * 0.7 : a * 0.62;
    const hy = tier ? a * 0.82 : a * 0.55;
    s.push(box(x, y, hx, hy, 0, H, clap, clap, false, { win: tier ? WIN_DARK : undefined, crease: true }));
    s.push(gable(x, y, hx * 1.06, hy * 1.06, H, FLOOR * 0.7, roof, clap, along));
    return { solids: s, marks: m, top: [x, y, H + FLOOR * 0.7] };
  }

  if (tier === 2) {
    if (zone === "backbay" || zone === "fenway" || zone === "downtown") {
      // Brownstone with a bow-front bay and a slate mansard.
      const wall = seed < 0.6 ? PAPER.brownstone : PAPER.brick;
      s.push(box(x, y, a * 0.8, a * 0.8, 0, H, wall, wall, false, { win: WIN_BRICK, crease: true }));
      s.push(extrude([[x - a * 0.5, y - a * 0.8], [x - a * 0.3, y - a * 1.02], [x + a * 0.3, y - a * 1.02], [x + a * 0.5, y - a * 0.8]], FLOOR * 0.3, H * 0.9, wall));
      s.push(pyramid(x, y, a * 0.84, a * 0.84, H, FLOOR * 0.55, PAPER.slate, 0.62, roof));
      return { solids: s, marks: m, top: [x, y, H + FLOOR * 0.55] };
    }
    // Triple-decker: tall narrow clapboard house, stacked porches on the front.
    s.push(box(x, y, a * 0.62, a * 0.9, 0, H, clap, clap, false, { win: WIN_DARK, crease: true }));
    s.push(gable(x, y, a * 0.66, a * 0.94, H, FLOOR * 0.75, roof, clap, false));
    for (let k = 0; k < Math.min(3, Math.floor(H / FLOOR)); k++) {
      const z = (k + 0.18) * FLOOR;
      m.push({ a: [x - a * 0.62, y - a * 0.91, z], b: [x + a * 0.62, y - a * 0.91, z], color: "#fffaf0", w: 1.1, n: [0, -1, 0] });
    }
    return { solids: s, marks: m, top: [x, y, H + FLOOR * 0.75] };
  }

  if (tier === 3) {
    switch (zone) {
      case "downtown":
        s.push(box(x, y, a * 0.85, a * 0.85, 0, H, PAPER.stone, PAPER.stone, false, { win: WIN_DARK, crease: true }), cornice(x, y, a * 0.85, a * 0.85, H, roof));
        return { solids: s, marks: m, top: [x, y, H] };
      case "backbay":
        s.push(box(x, y, a * 0.8, a * 0.7, 0, H, PAPER.glass, PAPER.glass, false, { win: WIN_GLASS, crease: true }), cornice(x, y, a * 0.8, a * 0.7, H, roof));
        return { solids: s, marks: m, top: [x, y, H] };
      case "fenway":
        s.push(box(x, y, a * 0.9, a * 0.7, 0, H, PAPER.brick, PAPER.brick, false, { win: WIN_BRICK, crease: true }), pyramid(x, y, a * 0.94, a * 0.74, H, FLOOR * 0.7, roof, 0.3));
        return { solids: s, marks: m, top: [x, y, H + FLOOR * 0.7] };
      case "cambridge": {
        // Brick academic hall with a white cupola.
        const rise = FLOOR * 0.8;
        s.push(box(x, y, a * 0.9, a * 0.65, 0, H, PAPER.brick, PAPER.brick, false, { win: WIN_BRICK, crease: true }), pyramid(x, y, a * 0.94, a * 0.68, H, rise, PAPER.slate, 0.25));
        s.push(box(x, y, a * 0.16, a * 0.16, H + rise, H + rise + FLOOR * 0.5, PAPER.cream), pyramid(x, y, a * 0.18, a * 0.18, H + rise + FLOOR * 0.5, FLOOR * 0.5, roof));
        return { solids: s, marks: m, top: [x, y, H + rise + FLOOR] };
      }
      case "seaport":
        s.push(box(x, y, a * 0.95, a * 0.8, 0, H, PAPER.glassLight, PAPER.glassLight, false, { win: WIN_GLASS, crease: true }), cornice(x, y, a * 0.95, a * 0.8, H, roof));
        m.push(...crane(x + a * 1.25, y - a * 1.05, H * 1.15 + FLOOR, a));
        return { solids: s, marks: m, top: [x, y, H] };
      default:
        s.push(box(x, y, a * 0.85, a * 0.75, 0, H, PAPER.brick, PAPER.brick, false, { win: WIN_BRICK, crease: true }), cornice(x, y, a * 0.85, a * 0.75, H, roof));
        s.push(...waterTank(x + a * 0.45, y + a * 0.35, H, a));
        return { solids: s, marks: m, top: [x, y, H] };
    }
  }

  // Tier 4-5: towers. Tier 5 adds a spire / antenna and a team pennant.
  const sky = tier >= 5;
  let top: P3 = [x, y, H];
  switch (zone) {
    case "downtown": {
      const h1 = H * 0.5;
      const h2 = H * 0.82;
      s.push(box(x, y, a * 0.86, a * 0.86, 0, h1, PAPER.stone, roof, true, { win: WIN_DARK, crease: true }));
      s.push(box(x, y, a * 0.66, a * 0.66, h1, h2, PAPER.stone, roof, true, { win: WIN_DARK, crease: true }));
      s.push(box(x, y, a * 0.46, a * 0.46, h2, H, PAPER.cream, roof, true, { win: WIN_DARK, crease: true }));
      if (sky) {
        s.push(pyramid(x, y, a * 0.46, a * 0.46, H, FLOOR * 1.4, roof));
        top = [x, y, H + FLOOR * 1.4];
      }
      break;
    }
    case "backbay": {
      // Hancock-style glass slab with a crease down its face.
      s.push(box(x, y, a * 0.5, a * 0.92, 0, H, PAPER.glass, roof, true, { win: WIN_GLASS, crease: true }));
      m.push({ a: [x - a * 0.505, y, 0], b: [x - a * 0.505, y, H], color: "#fffaf0", w: 0.6, n: [-1, 0, 0] });
      m.push({ a: [x + a * 0.505, y, 0], b: [x + a * 0.505, y, H], color: "#fffaf0", w: 0.6, n: [1, 0, 0] });
      break;
    }
    case "fenway":
      s.push(box(x, y, a * 0.92, a * 0.82, 0, H * 0.35, PAPER.brick, PAPER.brick, false, { win: WIN_BRICK, crease: true }));
      s.push(box(x, y, a * 0.62, a * 0.62, H * 0.35, H, PAPER.glassLight, roof, true, { win: WIN_GLASS, crease: true }));
      break;
    case "cambridge":
      s.push(box(x, y, a * 0.95, a * 0.85, 0, H, PAPER.glassLight, PAPER.glassLight, false, { win: WIN_GLASS, crease: true }));
      s.push(box(x, y, a * 0.5, a * 0.4, H, H + FLOOR * 0.6, PAPER.cream, roof, true));
      top = [x, y, H + FLOOR * 0.6];
      break;
    case "seaport":
      s.push(box(x, y, a * 0.7, a * 0.7, 0, H, PAPER.glass, PAPER.glass, false, { win: WIN_GLASS, crease: true }), cornice(x, y, a * 0.7, a * 0.7, H, roof));
      m.push(...crane(x + a * 1.2, y - a * 1.1, H * 0.85, a));
      break;
    default:
      s.push(box(x, y, a * 0.76, a * 0.76, 0, H, PAPER.brick, PAPER.brick, false, { win: WIN_BRICK, crease: true }), cornice(x, y, a * 0.76, a * 0.76, H, roof));
      s.push(...waterTank(x - a * 0.35, y + a * 0.3, H, a));
  }
  if (sky && zone !== "downtown") {
    m.push({ a: [x, y, top[2]], b: [x, y, top[2] + FLOOR * 1.6], color: "#6a5d4c", w: 0.9 });
    top = [x, y, top[2] + FLOOR * 1.6];
  }
  return { solids: s, marks: m, top, flag: sky ? [x + a * 0.3, y - a * 0.3, sky && zone !== "downtown" ? top[2] - FLOOR * 1.6 : H] : undefined };
}

/** Landmark lots. `t` is the tier of whoever holds the lot (2 when unclaimed). */
function landmark(kind: LandmarkKind, t: number, x: number, y: number, a: number, roof: string, claimed: boolean): Parts {
  const s: Solid[] = [];
  const m: Mark[] = [];
  const flagOk = claimed && t >= 3;
  switch (kind) {
    case "stateHouse": {
      const hb = FLOOR * (1.5 + 0.35 * t);
      const r = a * 0.42;
      s.push(box(x, y, a * 1.15, a * 0.75, 0, hb, PAPER.brick, roof, true, { win: WIN_BRICK, crease: true }));
      s.push(box(x, y - a * 0.92, a * 0.45, a * 0.17, 0, hb * 0.92, PAPER.cream, PAPER.cream));
      for (const dx of [-0.32, -0.1, 0.12, 0.34]) m.push({ a: [x + a * dx, y - a * 1.095, 0], b: [x + a * dx, y - a * 1.095, hb * 0.85], color: "#fffaf0", w: 0.8, n: [0, -1, 0] });
      s.push(...dome(x, y, r, hb, PAPER.gold));
      const dt = hb + r * 0.55 * 2.25;
      s.push(box(x, y, a * 0.07, a * 0.07, dt, dt + FLOOR * 0.45, PAPER.cream));
      return { solids: s, marks: m, top: [x, y, dt + FLOOR * 0.45], flag: flagOk ? [x, y, dt + FLOOR * 0.45] : undefined };
    }
    case "customHouse": {
      const hb = FLOOR * 1.8;
      const ht = FLOOR * (4.5 + 2.4 * t);
      s.push(box(x, y, a * 0.95, a * 0.95, 0, hb, PAPER.stone, PAPER.stone, false, { crease: true }));
      const tower = box(x, y, a * 0.48, a * 0.48, hb, ht, PAPER.stone, PAPER.stone, false, { win: WIN_DARK, crease: true });
      const zc = ht - FLOOR * 0.75;
      const q = a * 0.2;
      const e = a * 0.485;
      tower.faces.push(
        { pts: [[x - q, y - e, zc - FLOOR * 0.35], [x + q, y - e, zc - FLOOR * 0.35], [x + q, y - e, zc + FLOOR * 0.35], [x - q, y - e, zc + FLOOR * 0.35]], color: "#fffaf0", flat: true, n: [0, -1, 0] },
        { pts: [[x + q, y + e, zc - FLOOR * 0.35], [x - q, y + e, zc - FLOOR * 0.35], [x - q, y + e, zc + FLOOR * 0.35], [x + q, y + e, zc + FLOOR * 0.35]], color: "#fffaf0", flat: true, n: [0, 1, 0] },
        { pts: [[x - e, y + q, zc - FLOOR * 0.35], [x - e, y - q, zc - FLOOR * 0.35], [x - e, y - q, zc + FLOOR * 0.35], [x - e, y + q, zc + FLOOR * 0.35]], color: "#fffaf0", flat: true, n: [-1, 0, 0] },
        { pts: [[x + e, y - q, zc - FLOOR * 0.35], [x + e, y + q, zc - FLOOR * 0.35], [x + e, y + q, zc + FLOOR * 0.35], [x + e, y - q, zc + FLOOR * 0.35]], color: "#fffaf0", flat: true, n: [1, 0, 0] },
      );
      s.push(tower, pyramid(x, y, a * 0.52, a * 0.52, ht, FLOOR * 1.5, claimed ? roof : PAPER.patina));
      return { solids: s, marks: m, top: [x, y, ht + FLOOR * 1.5], flag: flagOk ? [x, y, ht + FLOOR * 1.5] : undefined };
    }
    case "oldNorth": {
      const hb = FLOOR * 2;
      const ht = FLOOR * (3.4 + 0.5 * t);
      s.push(box(x, y + a * 0.2, a * 0.6, a * 0.75, 0, hb, PAPER.brick, PAPER.brick, false, { win: WIN_BRICK }), gable(x, y + a * 0.2, a * 0.64, a * 0.79, hb, FLOOR * 0.7, roof, PAPER.brick, false));
      s.push(box(x, y - a * 0.75, a * 0.3, a * 0.3, 0, ht, PAPER.cream, PAPER.cream, false, { crease: true }), pyramid(x, y - a * 0.75, a * 0.3, a * 0.3, ht, FLOOR * (2.2 + 0.4 * t), "#fbf6ec"));
      const top = ht + FLOOR * (2.2 + 0.4 * t);
      return { solids: s, marks: m, top: [x, y - a * 0.75, top], flag: flagOk && t >= 4 ? [x, y - a * 0.75, top] : undefined };
    }
    case "citgo": {
      const hc = FLOOR * (2.5 + 0.8 * t);
      const z0 = hc + FLOOR * 0.35;
      const z1 = z0 + FLOOR * 2.3;
      s.push(box(x, y, a * 0.8, a * 0.7, 0, hc, PAPER.brick, roof, true, { win: WIN_BRICK, crease: true }));
      const sign = box(x, y, a * 0.78, a * 0.05, z0, z1, "#fbf6ec", "#fbf6ec");
      const yf = y - a * 0.052;
      const yb = y + a * 0.052;
      sign.faces.push(
        { pts: [[x - a * 0.45, yf, z0 + FLOOR * 0.35], [x + a * 0.45, yf, z0 + FLOOR * 0.35], [x, yf, z1 - FLOOR * 0.3]], color: "#da291c", flat: true, n: [0, -1, 0] },
        { pts: [[x + a * 0.45, yb, z0 + FLOOR * 0.35], [x - a * 0.45, yb, z0 + FLOOR * 0.35], [x, yb, z1 - FLOOR * 0.3]], color: "#da291c", flat: true, n: [0, 1, 0] },
      );
      s.push(sign);
      m.push({ a: [x - a * 0.5, y, hc], b: [x - a * 0.5, y, z0], color: "#6a5d4c", w: 0.8 }, { a: [x + a * 0.5, y, hc], b: [x + a * 0.5, y, z0], color: "#6a5d4c", w: 0.8 });
      return { solids: s, marks: m, top: [x, y, z1], flag: flagOk ? [x + a * 0.6, y + a * 0.4, hc] : undefined };
    }
    case "fenway": {
      const hw = FLOOR * (1 + 0.25 * t);
      const park = box(x, y, a * 1.2, a * 1.0, 0, hw, PAPER.monster, PAPER.field, true, { crease: true });
      const zt = hw + 0.002;
      park.faces.push({ pts: [[x - a * 0.55, y - a * 0.55, zt], [x - a * 0.05, y - a * 0.55, zt], [x - a * 0.05, y - a * 0.05, zt], [x - a * 0.55, y - a * 0.05, zt]], color: "#d9b98a", flat: true, n: [0, 0, 1] });
      s.push(park);
      const lt = hw + FLOOR * (2.6 + 0.3 * t);
      for (const [dx, dy] of [
        [-1.1, 0.9],
        [1.1, 0.9],
        [1.1, -0.9],
      ]) {
        m.push({ a: [x + a * dx, y + a * dy, hw], b: [x + a * dx, y + a * dy, lt], color: "#6a5d4c", w: 0.9 });
        m.push({ a: [x + a * dx - a * 0.12, y + a * dy, lt], b: [x + a * dx + a * 0.12, y + a * dy, lt], color: "#fbf3e2", w: 2.2 });
      }
      return { solids: s, marks: m, top: [x, y, lt], flag: flagOk ? [x - a * 1.1, y + a * 0.9, lt] : undefined };
    }
    case "greatDome": {
      const hb = FLOOR * (1.8 + 0.3 * t);
      const r = a * 0.5;
      s.push(box(x, y, a * 1.15, a * 0.72, 0, hb, PAPER.stone, roof, true, { win: WIN_DARK, crease: true }));
      for (const dx of [-0.4, -0.2, 0, 0.2, 0.4]) m.push({ a: [x + a * dx, y - a * 0.725, FLOOR * 0.2], b: [x + a * dx, y - a * 0.725, hb * 0.9], color: "#fffaf0", w: 0.9, n: [0, -1, 0] });
      s.push(...dome(x, y, r, hb, "#d2cbbd", PAPER.stone));
      const dt = hb + r * 0.55 * 2.25;
      return { solids: s, marks: m, top: [x, y, dt], flag: flagOk ? [x, y, dt] : undefined };
    }
    case "pru": {
      const h = FLOOR * (4 + 3 * t);
      s.push(box(x, y, a * 1.0, a * 0.85, 0, FLOOR * 1.2, PAPER.stone, PAPER.stone, false, { crease: true }));
      s.push(box(x, y, a * 0.55, a * 0.55, FLOOR * 1.2, h, "#bdb6a8", roof, true, { win: WIN_DARK, crease: true }));
      m.push({ a: [x, y, h], b: [x, y, h + FLOOR * 1.8], color: "#6a5d4c", w: 0.9 });
      return { solids: s, marks: m, top: [x, y, h + FLOOR * 1.8], flag: flagOk ? [x + a * 0.3, y - a * 0.3, h] : undefined };
    }
    case "hancock": {
      const h = FLOOR * (4 + 3.2 * t);
      s.push(extrude([[x - a * 0.78, y - a * 0.22], [x + a * 0.42, y - a * 0.62], [x + a * 0.78, y + a * 0.22], [x - a * 0.42, y + a * 0.62]], 0, h, PAPER.glass, roof, true, { win: WIN_GLASS, crease: true }));
      return { solids: s, marks: m, top: [x, y, h], flag: flagOk ? [x, y, h] : undefined };
    }
  }
}

// ---------- flat shapes for flags and trees ----------

function pennant(iso: Iso, p: P3, team: TeamRouteId): Shape[] {
  const [px, py] = iso.pt(p[0], p[1], p[2]);
  const t = py - 11;
  return [
    { d: `M${f(px)},${f(py)}L${f(px)},${f(t)}`, stroke: "#5a4e40", w: 0.9 },
    { d: `M${f(px)},${f(t)}L${f(px + 8)},${f(t + 2.4)}L${f(px)},${f(t + 4.8)}Z`, fill: TEAM_HEX[team].base, stroke: PAPER.edge, w: 0.4 },
    { d: `M${f(px)},${f(t + 2.4)}L${f(px + 8)},${f(t + 2.4)}L${f(px)},${f(t + 4.8)}Z`, fill: "rgba(42,30,18,0.22)" },
  ];
}

function treeShapes(iso: Iso, t: Tree): Shape[] {
  const [px, py] = iso.pt(t.x, t.y);
  const h = 10 * t.s;
  const out: Shape[] = [{ d: `M${f(px - h * 0.42)},${f(py)}a${f(h * 0.42)},${f(h * 0.2)} 0 1 0 ${f(h * 0.84)},0a${f(h * 0.42)},${f(h * 0.2)} 0 1 0 ${f(-h * 0.84)},0Z`, fill: "rgba(74,52,22,0.16)" }];
  out.push({ d: `M${f(px - 0.6)},${f(py)}L${f(px - 0.6)},${f(py - h * 0.45)}L${f(px + 0.6)},${f(py - h * 0.45)}L${f(px + 0.6)},${f(py)}Z`, fill: PAPER.trunk });
  if (t.kind === "cone") {
    const top = py - h * 1.25;
    const b = py - h * 0.3;
    out.push({ d: `M${f(px)},${f(top)}L${f(px - h * 0.4)},${f(b)}L${f(px)},${f(b - h * 0.12)}Z`, fill: "#6f9f5c", stroke: PAPER.edge, w: 0.3 });
    out.push({ d: `M${f(px)},${f(top)}L${f(px + h * 0.4)},${f(b)}L${f(px)},${f(b - h * 0.12)}Z`, fill: "#3f7048", stroke: PAPER.edge, w: 0.3 });
  } else {
    const cy = py - h * 0.78;
    const r = h * 0.46;
    const oct = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      return [px + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92] as Vec;
    });
    out.push({ d: `M${oct.map((p) => `${f(p[0])},${f(p[1])}`).join("L")}Z`, fill: "#7fae68", stroke: PAPER.edge, w: 0.3 });
    out.push({ d: `M${[oct[0], oct[1], oct[2], oct[3], oct[4]].map((p) => `${f(p[0])},${f(p[1])}`).join("L")}Z`, fill: "#4f8a5b" });
  }
  return out;
}

// ---------- scene items (memoized so unchanged buildings keep the same object) ----------

const itemCache = new Map<string, SceneItem>();

function cached(key: string, make: () => SceneItem): SceneItem {
  let it = itemCache.get(key);
  if (!it) {
    if (itemCache.size > 3000) itemCache.clear();
    it = make();
    itemCache.set(key, it);
  }
  return it;
}

export function buildingItem(rot: number, b: Building): SceneItem {
  return cached(`b|${rot}|${b.key}|${b.team}|${b.floors}|${b.landmark ?? ""}`, () => {
    const iso = isoFor(rot);
    const a = b.w / 2;
    const roof = TEAM_HEX[b.team].base;
    const parts = b.landmark ? landmark(b.landmark, b.tier, b.x, b.y, CELL_A, roof, true) : archetype(b.zone, b.tier, b.x, b.y, a, b.floors * FLOOR, b.seed, roof);
    const shapes = renderSolids(iso, parts.solids, parts.marks);
    if (parts.flag) shapes.push(...pennant(iso, parts.flag, b.team));
    return { key: b.key, depth: iso.depth(b.x, b.y), team: b.team, shapes, roof: iso.pt(parts.top[0], parts.top[1], parts.top[2]), kind: "bld", floors: b.floors };
  });
}

/** Landmark footprint half-size: a full lot regardless of station/sprawl. */
const CELL_A = 0.3 * 0.25;

/** Landmarks nobody has built on yet: neutral paper, modest height. */
export function freeLandmarkItems(rot: number, claimedCells: Set<string>): SceneItem[] {
  return getCityGeo()
    .landmarks.filter((l) => !claimedCells.has(l.cell))
    .map((l) =>
      cached(`l|${rot}|${l.kind}`, () => {
        const iso = isoFor(rot);
        const parts = landmark(l.kind, 2, l.x, l.y, CELL_A, PAPER.neutralRoof, false);
        return { key: `lm-${l.kind}`, depth: iso.depth(l.x, l.y), team: null, shapes: renderSolids(iso, parts.solids, parts.marks), roof: iso.pt(parts.top[0], parts.top[1], parts.top[2]), kind: "scenery" };
      }),
    );
}

const staticCache = new Map<number, SceneItem[]>();

/** Trees and the Zakim: never change with points, computed once per quarter turn. */
export function staticItems(rot: number): SceneItem[] {
  let list = staticCache.get(rot);
  if (list) return list;
  const iso = isoFor(rot);
  const geo = getCityGeo();
  list = geo.trees.map((t, i) => ({
    key: `t${i}`,
    depth: iso.depth(t.x, t.y),
    team: null,
    shapes: treeShapes(iso, t),
    roof: iso.pt(t.x, t.y),
    kind: t.street ? ("street-tree" as const) : ("tree" as const),
  }));

  // Zakim bridge: folded deck, two white towers and fanned cables.
  const [p, q] = geo.zakim;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 0.03;
  const ny = (dx / len) * 0.03;
  const solids: Solid[] = [
    extrude(
      [
        [p[0] + nx, p[1] + ny],
        [q[0] + nx, q[1] + ny],
        [q[0] - nx, q[1] - ny],
        [p[0] - nx, p[1] - ny],
      ],
      0.01,
      0.03,
      "#e6ddcb",
    ),
  ];
  const marks: Mark[] = [];
  const th = FLOOR * 5;
  for (const k of [0.3, 0.7]) {
    const tx = p[0] + dx * k;
    const ty = p[1] + dy * k;
    solids.push(box(tx, ty, 0.012, 0.012, 0.03, th, "#f6f0e4"));
    for (let i = 1; i <= 5; i++) {
      for (const dir of [-1, 1]) {
        const u = k + dir * i * 0.045;
        marks.push({ a: [tx, ty, th - i * FLOOR * 0.35], b: [p[0] + dx * u, p[1] + dy * u, 0.03], color: "#8a7d6a", w: 0.4 });
      }
    }
  }
  const mid: Vec = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  list.push({ key: "zakim", depth: iso.depth(mid[0], mid[1]), team: null, shapes: renderSolids(iso, solids, marks), roof: iso.pt(mid[0], mid[1], th), kind: "scenery" });
  staticCache.set(rot, list);
  return list;
}

/** Labels for landmarks, shown only when zoomed in. */
export function landmarkLabels(rot: number): { text: string; x: number; y: number }[] {
  const iso = isoFor(rot);
  return getCityGeo().landmarks.map((l) => {
    const [x, y] = iso.pt(l.x, l.y);
    return { text: l.name, x, y: y + 12 };
  });
}

