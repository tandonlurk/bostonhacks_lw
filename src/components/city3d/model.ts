// Turns team scores into a skyline: which grid cell each team owns and how tall each building is.
// Pure function of the scores, so it only re-runs when points actually change.
import { TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import { CELL, getCityGeo, hash01 } from "./geo";

export interface TeamStat {
  team: TeamRouteId;
  points: number;
  rank: number;
  riders: number;
  districtName: string;
  /** lot tiers 0-5 from /api/districts, best first */
  tiers: number[];
}

export interface Building {
  key: string;
  team: TeamRouteId;
  x: number;
  y: number;
  /** footprint edge in world units */
  w: number;
  /** target height in floors */
  floors: number;
  seed: number;
  /** sits on a station (vs sprawl) */
  station: boolean;
}

/** World units per floor. */
export const FLOOR = 0.085;
const MAX_FLOORS = 22;
/** Most cells a team can sprawl into beyond its stations at full strength. */
const MAX_SPRAWL = 22;
/** Points at which a team counts as "fully built" in absolute terms. */
const FULL_POINTS = 2500;

export function buildCity(stats: TeamStat[]): Building[] {
  const geo = getCityGeo();
  const pts = Object.fromEntries(TEAM_ROUTE_IDS.map((t) => [t, 0])) as Record<TeamRouteId, number>;
  for (const s of stats) pts[s.team] = Math.max(0, s.points);
  const max = Math.max(0, ...Object.values(pts));
  const order = [...TEAM_ROUTE_IDS].sort((a, b) => pts[b] - pts[a]);
  const rankIdx = (t: TeamRouteId) => order.indexOf(t);

  // abs: how built-up the city is overall; rel: how this team compares to the leader (cubed for contrast).
  const abs = Math.min(1, Math.log10(1 + max) / Math.log10(1 + FULL_POINTS));
  const strength = (t: TeamRouteId) => {
    const rel = max > 0 ? pts[t] / max : 0;
    return abs * (0.18 + 0.82 * rel ** 3);
  };

  const owner = new Map<string, { team: TeamRouteId; station: boolean }>();
  for (const [key, teams] of geo.stationCells) {
    const best = [...teams].sort((a, b) => rankIdx(a) - rankIdx(b))[0];
    owner.set(key, { team: best, station: true });
  }
  for (const team of order) {
    let extra = Math.round(MAX_SPRAWL * strength(team));
    for (const key of geo.sprawlOrder[team]) {
      if (extra <= 0) break;
      if (owner.has(key)) continue;
      owner.set(key, { team, station: false });
      extra--;
    }
  }

  const buildings: Building[] = [];
  for (const [key, { team, station }] of owner) {
    const cell = geo.cellByKey.get(key);
    if (!cell) continue;
    const seed = hash01(key);
    const s = strength(team);
    // Downtown towers, suburban mid-rises.
    const centrality = Math.max(0, 1 - cell.r / 4.2);
    const base = 1 + s * 11 * (0.3 + 0.7 * centrality ** 1.5);
    const jitter = 0.6 + seed * 0.8;
    const floors = Math.min(MAX_FLOORS, Math.max(1, base * jitter * (station ? 1 : 0.62)));
    buildings.push({
      key,
      team,
      x: cell.x + (hash01(key + "x") - 0.5) * CELL * 0.08,
      y: cell.y + (hash01(key + "y") - 0.5) * CELL * 0.08,
      w: CELL * (station ? 0.5 : 0.42) * (0.85 + 0.3 * hash01(key + "w")),
      floors,
      seed,
      station,
    });
  }

  // Lot tiers from the districts API crown each team's most central buildings.
  for (const stat of stats) {
    const mine = buildings.filter((b) => b.team === stat.team).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    stat.tiers.forEach((tier, i) => {
      if (mine[i] && tier > 0) mine[i].floors = Math.min(MAX_FLOORS, mine[i].floors + tier * 0.8 * abs);
    });
  }

  return buildings;
}
