// Google-Maps-navigation-style camera: a pinhole camera hovering behind and above the rider, pitched
// down at `tilt`, rotated so the rider's heading points "up" the screen. Ground points are in meters
// relative to the rider: x = to the right, f = forward. Straight lines on the ground stay straight
// after projection, so we only project vertices and clip segments against the near plane.

export interface CameraState {
  lat: number;
  lng: number;
  /** Degrees clockwise from north that points up the screen. */
  bearing: number;
  /** Pitch in radians (0 = top-down, ~1 = steep nav view). */
  tilt: number;
  /** Camera distance from the rider in meters (bigger = more zoomed out, gentler perspective). */
  dist: number;
  /** Pixels per meter at the rider. */
  zoom: number;
  /** Screen anchor of the rider in CSS px. */
  cx: number;
  cy: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Pixels per meter at this depth. */
  k: number;
}

const M_PER_DEG = 111_320;
/** Nothing closer to the camera than this (meters of depth) is drawn. */
export const NEAR_DEPTH = 120;

export interface View {
  cam: CameraState;
  /** World lat/lng to ground meters [x, f]. */
  ground: (lat: number, lng: number) => [number, number];
  /** Ground meters to screen, or null when behind the near plane. */
  project: (x: number, f: number) => Projected | null;
  /** Smallest forward distance still in front of the near plane. */
  fNear: number;
  /** Depth -> 0..1 fade so the far field dissolves into fog. */
  fade: (k: number) => number;
}

export function makeView(cam: CameraState): View {
  const cosLat = Math.cos((cam.lat * Math.PI) / 180);
  const b = (cam.bearing * Math.PI) / 180;
  const sb = Math.sin(b);
  const cb = Math.cos(b);
  const st = Math.sin(cam.tilt);
  const ct = Math.cos(cam.tilt);
  const focal = cam.zoom * cam.dist;

  return {
    cam,
    fNear: (NEAR_DEPTH - cam.dist) / ct,
    ground(lat, lng) {
      const e = (lng - cam.lng) * M_PER_DEG * cosLat;
      const n = (lat - cam.lat) * M_PER_DEG;
      return [e * cb - n * sb, e * sb + n * cb];
    },
    project(x, f) {
      const depth = cam.dist + f * ct;
      if (depth < NEAR_DEPTH) return null;
      return { x: cam.cx + (focal * x) / depth, y: cam.cy - (focal * f * st) / depth, k: focal / depth };
    },
    fade(k) {
      const rel = k / cam.zoom; // 1 at the rider, -> 0 toward the horizon
      return Math.max(0, Math.min(1, (rel - 0.18) / 0.5));
    },
  };
}

/** Clips a ground segment to f >= fNear. Returns null when fully behind the camera. */
export function clipSegment(
  a: [number, number],
  b: [number, number],
  fNear: number,
): [[number, number], [number, number]] | null {
  const ina = a[1] >= fNear;
  const inb = b[1] >= fNear;
  if (ina && inb) return [a, b];
  if (!ina && !inb) return null;
  const t = (fNear - a[1]) / (b[1] - a[1]);
  const p: [number, number] = [a[0] + (b[0] - a[0]) * t, fNear];
  return ina ? [a, p] : [p, b];
}

/** Shortest signed angular difference b - a in degrees, in (-180, 180]. */
export function angleDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}
