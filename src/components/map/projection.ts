// Shared lat/lng -> SVG projection for every T-City map (ride, hunt, city).
// Equirectangular with a cos(lat) correction: accurate enough at city scale, no tile server needed.
import type { TeamRouteId } from "@/contracts/routes";
import { LINES, STATIONS, type GeoStation } from "./mbta-geo";

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Rapid-transit core, Alewife to Braintree and Riverside to Wonderland. */
export const BOSTON_BOUNDS: Bounds = { minLat: 42.205, maxLat: 42.44, minLng: -71.26, maxLng: -70.985 };
/** Tighter downtown view (Kenmore to Airport, North Station to Nubian). */
export const CORE_BOUNDS: Bounds = { minLat: 42.325, maxLat: 42.375, minLng: -71.11, maxLng: -71.02 };

const LAT_SCALE = Math.cos((42.35 * Math.PI) / 180);

export interface Projector {
  width: number;
  height: number;
  project: (lat: number, lng: number) => { x: number; y: number };
}

/** Builds a projector whose viewBox is `width` wide and as tall as the bounds' true aspect ratio. */
export function makeProjector(bounds: Bounds = BOSTON_BOUNDS, width = 1000): Projector {
  const spanX = (bounds.maxLng - bounds.minLng) * LAT_SCALE;
  const spanY = bounds.maxLat - bounds.minLat;
  const height = Math.round((width * spanY) / spanX);
  return {
    width,
    height,
    project(lat, lng) {
      return {
        x: (((lng - bounds.minLng) * LAT_SCALE) / spanX) * width,
        y: (1 - (lat - bounds.minLat) / spanY) * height,
      };
    },
  };
}

/** SVG path data for every branch of a line, e.g. <path d={linePaths(p, "Red").join(" ")} />. */
export function linePaths(p: Projector, team: TeamRouteId): string[] {
  return LINES[team].map((branch) =>
    branch
      .map((id, i) => {
        const s = STATIONS[id];
        const { x, y } = p.project(s.lat, s.lng);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" "),
  );
}

/** All stations served by a team (deduplicated across branches). */
export function stationsFor(team: TeamRouteId): GeoStation[] {
  const ids = new Set(LINES[team].flat());
  return [...ids].map((id) => STATIONS[id]);
}

/** Nearest known station to a coordinate (for "you are near X"). */
export function nearestStation(lat: number, lng: number): GeoStation | null {
  let best: GeoStation | null = null;
  let bestD = Infinity;
  for (const s of Object.values(STATIONS)) {
    const d = (s.lat - lat) ** 2 + ((s.lng - lng) * LAT_SCALE) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export { LINES, STATIONS };
export type { GeoStation };
