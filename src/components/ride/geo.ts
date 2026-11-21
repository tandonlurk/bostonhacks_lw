// Small geo helpers for the ride screen: local meter offsets, densified polylines, demo drift path.
import { STATIONS, type GeoStation } from "@/components/map/mbta-geo";

export interface LatLng {
  lat: number;
  lng: number;
}

const M_PER_DEG = 111_320;

export function distanceM(a: LatLng, b: LatLng): number {
  const cos = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dx = (b.lng - a.lng) * M_PER_DEG * cos;
  const dy = (b.lat - a.lat) * M_PER_DEG;
  return Math.hypot(dx, dy);
}

/** Compass bearing in degrees (0 = north, 90 = east) from a to b. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const cos = Math.cos((a.lat * Math.PI) / 180);
  const dx = (b.lng - a.lng) * cos;
  const dy = b.lat - a.lat;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

/** Inserts points so no segment is longer than `stepM` (keeps per-segment perspective widths honest). */
export function densify(points: LatLng[], stepM: number): LatLng[] {
  if (points.length < 2) return points;
  const out: LatLng[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.max(1, Math.ceil(distanceM(a, b) / stepM));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
    }
  }
  return out;
}

const PLACES = Object.values(STATIONS).filter((s) => s.id.startsWith("place-"));

/** Nearest rapid-transit station (parent "place-" ids only, so no bus-stop names like "Tremont St @ ..."). */
export function nearestPlace(p: LatLng): GeoStation | null {
  let best: GeoStation | null = null;
  let bestD = Infinity;
  for (const s of PLACES) {
    const d = distanceM(p, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function formatDistance(m: number): string {
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

// ---------- Demo drift (mock mode or no GPS): Park Street out the Green Line B branch and back ----------
const s = (id: string) => ({ lat: STATIONS[id].lat, lng: STATIONS[id].lng });
const DEMO_STOPS: LatLng[] = [
  s("place-pktrm"),
  s("place-boyls"),
  s("place-armnl"),
  s("place-coecl"),
  { lat: 42.347888, lng: -71.087903 }, // Hynes Convention Center (not in the drawing snapshot)
  s("place-kencl"),
  s("place-bland"),
  s("place-buest"),
  s("place-bucen"),
  s("place-amory"),
  s("place-babck"),
];
export const DEMO_HOME: LatLng = DEMO_STOPS[0];

const DEMO_PATH = densify(DEMO_STOPS, 40);
const DEMO_CUM: number[] = DEMO_PATH.reduce<number[]>((acc, p, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + distanceM(DEMO_PATH[i - 1], p));
  return acc;
}, []);
const DEMO_LEN = DEMO_CUM[DEMO_CUM.length - 1];

/** Position + heading `travelled` meters along a ping-pong walk of the demo path. */
export function demoAt(travelled: number): LatLng & { heading: number } {
  const loop = ((travelled % (2 * DEMO_LEN)) + 2 * DEMO_LEN) % (2 * DEMO_LEN);
  const forward = loop <= DEMO_LEN;
  const d = forward ? loop : 2 * DEMO_LEN - loop;
  let i = 1;
  while (i < DEMO_CUM.length - 1 && DEMO_CUM[i] < d) i++;
  const a = DEMO_PATH[i - 1];
  const b = DEMO_PATH[i];
  const seg = DEMO_CUM[i] - DEMO_CUM[i - 1] || 1;
  const t = Math.min(1, Math.max(0, (d - DEMO_CUM[i - 1]) / seg));
  const heading = forward ? bearingDeg(a, b) : bearingDeg(b, a);
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, heading };
}
