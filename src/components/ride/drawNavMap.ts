// Canvas painter for the tilted navigation map. Pure functions: everything comes in through args.
import type { Vehicle } from "@/contracts";
import { LINE_IDS, TEAM_ROUTE_IDS, type TeamRouteId } from "@/contracts/routes";
import { LINES, STATIONS, type GeoStation } from "@/components/map/mbta-geo";
import { clipSegment, type Projected, type View } from "./navCamera";
import { densify, type LatLng } from "./geo";

export interface MapColors {
  bg: string;
  /** Cream card stock (labels, station rings). */
  paper: string;
  ground: string;
  grid: string;
  water: string;
  /** Darker cut edge under the water layer. */
  waterEdge: string;
  /** Contact shadow under paper strips. */
  shadow: string;
  ink: string;
  muted: string;
  dot: string;
  team: Record<TeamRouteId, string>;
}

export interface DrawOptions {
  width: number;
  height: number;
  colors: MapColors;
  font: string;
  team: TeamRouteId | null;
  vehicles: Vehicle[];
  accuracy: number;
  /** Heading relative to the camera's "up" in degrees, null hides the cone. */
  coneAngle: number | null;
  nearestId: string | null;
  /** Station labels above this y (CSS px) would hide under the floating top card. */
  labelMinY: number;
  /** Station labels below this y (CSS px) are skipped so they don't fight the floating controls. */
  labelMaxY: number;
  /** 0..1 pulse phase for subtle ambient motion (vehicle glow). */
  phase: number;
}

// ---------- Static geometry, densified once ----------
const LINE_GEOM: Record<TeamRouteId, LatLng[][]> = Object.fromEntries(
  LINE_IDS.map((t) => [t, LINES[t].map((branch) => densify(branch.filter((id) => STATIONS[id]).map((id) => STATIONS[id]), 90))]),
) as Record<TeamRouteId, LatLng[][]>;

const ALL_STATIONS: GeoStation[] = Object.values(STATIONS);

// Rough water hints (not survey-accurate): the Charles River basin and the inner harbor channel.
const WATER: { widthM: number; pts: LatLng[] }[] = [
  {
    widthM: 230,
    pts: densify(
      [
        { lat: 42.3665, lng: -71.1525 },
        { lat: 42.3712, lng: -71.1365 },
        { lat: 42.3685, lng: -71.1215 },
        { lat: 42.3628, lng: -71.1175 },
        { lat: 42.3545, lng: -71.1135 },
        { lat: 42.3525, lng: -71.1065 },
      ],
      120,
    ),
  },
  {
    widthM: 520,
    pts: densify(
      [
        { lat: 42.3525, lng: -71.1065 },
        { lat: 42.3545, lng: -71.095 },
        { lat: 42.3562, lng: -71.0845 },
        { lat: 42.3593, lng: -71.0752 },
        { lat: 42.3628, lng: -71.0705 },
        { lat: 42.3675, lng: -71.0675 },
        { lat: 42.3712, lng: -71.0615 },
        { lat: 42.3725, lng: -71.0565 },
      ],
      120,
    ),
  },
  {
    widthM: 700,
    pts: densify(
      [
        { lat: 42.3745, lng: -71.0545 },
        { lat: 42.3685, lng: -71.0478 },
        { lat: 42.3628, lng: -71.0448 },
        { lat: 42.3565, lng: -71.0385 },
        { lat: 42.3495, lng: -71.0255 },
        { lat: 42.3415, lng: -71.0085 },
        { lat: 42.3335, lng: -70.9905 },
      ],
      120,
    ),
  },
];

const FAR_F = 16_000;
const SIDE_X = 14_000;

type G = [number, number];

/** Strokes a ground polyline with perspective-correct width, batching segments of similar width. */
function strokeGround(
  ctx: CanvasRenderingContext2D,
  view: View,
  pts: G[],
  widthM: number,
  alpha: number,
  minPx: number,
  maxPx = Infinity,
  cap: CanvasLineCap = "round",
) {
  // Translucent passes use butt caps and coarse buckets: overlapping round caps at every batch break
  // would otherwise show up as beads of doubled alpha along the line.
  ctx.lineCap = cap;
  let open = false;
  let bucket = -1;
  let last: Projected | null = null;
  const flush = () => {
    if (open) ctx.stroke();
    open = false;
    bucket = -1;
  };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if ((a[1] > FAR_F && b[1] > FAR_F) || (Math.abs(a[0]) > SIDE_X && Math.abs(b[0]) > SIDE_X)) {
      flush();
      last = null;
      continue;
    }
    const seg = clipSegment(a, b, view.fNear + 1);
    if (!seg) {
      flush();
      last = null;
      continue;
    }
    const pa = view.project(seg[0][0], seg[0][1]);
    const pb = view.project(seg[1][0], seg[1][1]);
    if (!pa || !pb) {
      flush();
      last = null;
      continue;
    }
    const k = (pa.k + pb.k) / 2;
    const w = Math.min(maxPx, Math.max(minPx, widthM * k));
    const al = alpha * view.fade(k);
    const nb = cap === "round" ? Math.round(w * 2) + 1000 * Math.round(al * 24) : Math.round(Math.log(w) / Math.log(1.1)) + 1000 * Math.round(al * 8);
    const contiguous = last !== null && seg[0] === a;
    if (nb !== bucket) {
      flush();
      ctx.beginPath();
      ctx.lineWidth = w;
      ctx.globalAlpha = al;
      ctx.moveTo(pa.x, pa.y);
      open = true;
      bucket = nb;
    } else if (!contiguous) {
      ctx.moveTo(pa.x, pa.y);
    }
    ctx.lineTo(pb.x, pb.y);
    last = pb;
  }
  flush();
}

function toGround(view: View, pts: LatLng[]): G[] {
  return pts.map((p) => view.ground(p.lat, p.lng));
}

function drawGrid(ctx: CanvasRenderingContext2D, view: View, colors: MapColors) {
  const { cam } = view;
  const S = 170; // meters between "streets"
  const R = 5200;
  const cosLat = Math.cos((cam.lat * Math.PI) / 180);
  // World-anchored offsets so the grid slides under the rider instead of moving with them.
  const eCam = (cam.lng + 71.06) * 111_320 * cosLat;
  const nCam = (cam.lat - 42.35) * 111_320;
  const offE = ((eCam % S) + S) % S;
  const offN = ((nCam % S) + S) % S;
  const b = (cam.bearing * Math.PI) / 180;
  const sb = Math.sin(b);
  const cb = Math.cos(b);
  const rot = (e: number, n: number): G => [e * cb - n * sb, e * sb + n * cb];

  ctx.strokeStyle = colors.grid;
  for (const major of [false, true]) {
    ctx.beginPath();
    ctx.lineWidth = major ? 1.4 : 1;
    ctx.globalAlpha = major ? 0.16 : 0.08;
    for (let i = -Math.ceil(R / S); i <= Math.ceil(R / S); i++) {
      const idx = (((i + Math.floor(eCam / S)) % 4) + 4) % 4;
      const idy = (((i + Math.floor(nCam / S)) % 4) + 4) % 4;
      const lines: [G, G, boolean][] = [
        [rot(i * S - offE, -R), rot(i * S - offE, R), idx === 0],
        [rot(-R, i * S - offN), rot(R, i * S - offN), idy === 0],
      ];
      for (const [a, c, isMajor] of lines) {
        if (isMajor !== major) continue;
        const seg = clipSegment(a, c, view.fNear + 1);
        if (!seg) continue;
        const pa = view.project(seg[0][0], seg[0][1]);
        const pb = view.project(seg[1][0], seg[1][1]);
        if (!pa || !pb) continue;
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
    }
    ctx.stroke();
  }
}

/** Each line is a strip of colored card stock laid on the map: contact shadow, cream cut edge, color. */
function drawLines(ctx: CanvasRenderingContext2D, view: View, colors: MapColors, team: TeamRouteId | null) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const order = TEAM_ROUTE_IDS.filter((t) => t !== team).concat(team ? [team] : []);
  // Silver isn't a team but is still drawn, under everything else.
  const all: TeamRouteId[] = ["Silver" as TeamRouteId, ...order.filter((t) => t !== "Silver")];
  for (const t of all) {
    const mine = t === team;
    const dim = team && !mine ? 0.75 : 1;
    const w = mine ? 26 : 18;
    for (const branch of LINE_GEOM[t] ?? []) {
      const g = toGround(view, branch);
      ctx.save();
      ctx.translate(0, mine ? 2.5 : 1.5);
      ctx.strokeStyle = colors.shadow;
      strokeGround(ctx, view, g, w, 0.9 * dim, 2.6, 13);
      ctx.restore();
      ctx.strokeStyle = colors.paper;
      strokeGround(ctx, view, g, w + 8, dim, 3, 15);
      ctx.strokeStyle = colors.team[t];
      strokeGround(ctx, view, g, w, dim, 1.6, 10);
    }
  }
  ctx.globalAlpha = 1;
}

function drawStations(ctx: CanvasRenderingContext2D, view: View, colors: MapColors, team: TeamRouteId | null) {
  for (const s of ALL_STATIONS) {
    const [x, f] = view.ground(s.lat, s.lng);
    if (f > FAR_F || Math.abs(x) > SIDE_X) continue;
    const p = view.project(x, f);
    if (!p) continue;
    const a = view.fade(p.k);
    if (a <= 0.02) continue;
    const interchange = s.teams.length > 1;
    const r = Math.min(8, Math.max(2, (interchange ? 17 : 12) * p.k));
    // Paper ring: shadow, cream disc, ink or line-colored rim.
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 1.5, r + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = colors.paper;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, r * (interchange ? 0.5 : 0.4));
    ctx.strokeStyle = interchange ? colors.ink : colors.team[team && s.teams.includes(team) ? team : s.teams[0]];
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawVehicles(ctx: CanvasRenderingContext2D, view: View, colors: MapColors, vehicles: Vehicle[], phase: number) {
  for (const v of vehicles) {
    const [x, f] = view.ground(v.lat, v.lng);
    if (f > FAR_F || Math.abs(x) > SIDE_X) continue;
    const p = view.project(x, f);
    if (!p) continue;
    const a = view.fade(p.k);
    if (a <= 0.02) continue;
    const r = Math.min(9, Math.max(3, 20 * p.k));
    const c = colors.team[v.teamRouteId];
    // Paper token that gently bobs: contact shadow, line-colored disc, cream rim and center.
    const lift = 1.5 + 1.2 * Math.sin(phase * Math.PI * 2);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(p.x, p.y - lift, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.28);
    ctx.strokeStyle = colors.paper;
    ctx.stroke();
    ctx.fillStyle = colors.paper;
    ctx.beginPath();
    ctx.arc(p.x, p.y - lift, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRiderGround(ctx: CanvasRenderingContext2D, view: View, colors: MapColors, accuracy: number, coneAngle: number | null) {
  const center = view.project(0, 0);
  if (!center) return;
  // Accuracy halo lying flat on the ground.
  const r = Math.min(260, Math.max(18, accuracy));
  ctx.beginPath();
  for (let i = 0; i <= 36; i++) {
    const t = (i / 36) * Math.PI * 2;
    const p = view.project(r * Math.cos(t), r * Math.sin(t));
    if (!p) continue;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = colors.dot;
  ctx.globalAlpha = 0.13;
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.dot;
  ctx.stroke();

  if (coneAngle == null) {
    ctx.globalAlpha = 1;
    return;
  }
  // Heading beam: a soft wedge fanning forward, like Google's.
  const len = 170;
  const spread = 34;
  const tip = view.project(len * Math.sin((coneAngle * Math.PI) / 180), len * Math.cos((coneAngle * Math.PI) / 180));
  const radius = tip ? Math.hypot(tip.x - center.x, tip.y - center.y) : 60;
  const grad = ctx.createRadialGradient(center.x, center.y, 4, center.x, center.y, Math.max(20, radius));
  grad.addColorStop(0, colors.dot);
  grad.addColorStop(1, "rgba(47,93,124,0)");
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  for (let i = 0; i <= 12; i++) {
    const deg = coneAngle - spread + (i / 12) * spread * 2;
    const rad = (deg * Math.PI) / 180;
    const p = view.project(len * Math.sin(rad), len * Math.cos(rad));
    if (p) ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLabels(ctx: CanvasRenderingContext2D, view: View, o: DrawOptions) {
  const { colors } = o;
  const zoom = view.cam.zoom;
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
    placed.some((p) => b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y);

  // Reserve the rider dot so labels never sit on it.
  placed.push({ x: view.cam.cx - 26, y: view.cam.cy - 26, w: 52, h: 52 });

  const candidates = ALL_STATIONS.filter((s) => s.id.startsWith("place-"))
    .map((s) => {
      const [x, f] = view.ground(s.lat, s.lng);
      return { s, x, f, d: Math.hypot(x, f) };
    })
    .filter((c) => c.d < 3200 && c.f > view.fNear + 50)
    .sort((a, b) => (a.s.id === o.nearestId ? -1 : b.s.id === o.nearestId ? 1 : a.d - b.d));

  ctx.textBaseline = "middle";
  let count = 0;
  for (const c of candidates) {
    if (count >= 7) break;
    const p = view.project(c.x, c.f);
    if (!p || p.x < 8 || p.x > o.width - 8 || p.y < o.labelMinY || p.y > o.labelMaxY) continue;
    const rel = p.k / zoom;
    if (rel < 0.3) continue;
    const isNearest = c.s.id === o.nearestId;

    if (isNearest) {
      // Place-pin style pill floating above the station.
      const size = 14;
      ctx.font = `700 ${size}px ${o.font}`;
      const tw = ctx.measureText(c.s.name).width;
      const w = tw + 24;
      const h = 30;
      // Standing at the station: hover the pill above the rider's dot instead of on top of it.
      const onRider = Math.hypot(p.x - view.cam.cx, p.y - view.cam.cy) < 40;
      const bx = p.x - w / 2;
      const by = (onRider ? Math.min(p.y, view.cam.cy) - 28 : p.y) - h - 16;
      const box = { x: bx, y: by, w, h: h + 16 };
      if (by < o.labelMinY - 12 || (!onRider && overlaps(box))) continue;
      placed.push(box);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = colors.shadow;
      roundRect(ctx, bx, by + 2, w, h, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.paper;
      roundRect(ctx, bx, by, w, h, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = o.team ? colors.team[o.team] : colors.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, by + h);
      ctx.lineTo(p.x, p.y - 6);
      ctx.stroke();
      ctx.fillStyle = colors.ink;
      ctx.textAlign = "center";
      ctx.fillText(c.s.name, p.x, by + h / 2 + 0.5);
      count++;
      continue;
    }

    const size = Math.round(Math.min(14, Math.max(10.5, 12.5 * Math.sqrt(rel))));
    ctx.font = `600 ${size}px ${o.font}`;
    const tw = ctx.measureText(c.s.name).width;
    const lx = p.x + 9;
    const box = { x: lx - 2, y: p.y - size / 2 - 3, w: tw + 6, h: size + 6 };
    if (box.x + box.w > o.width - 4 || overlaps(box)) continue;
    placed.push(box);
    ctx.textAlign = "left";
    ctx.globalAlpha = Math.min(1, view.fade(p.k) + 0.15);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = colors.paper;
    ctx.strokeText(c.s.name, lx, p.y);
    ctx.fillStyle = rel > 0.75 ? colors.ink : colors.muted;
    ctx.fillText(c.s.name, lx, p.y);
    ctx.globalAlpha = 1;
    count++;
  }
}

export function drawNavMap(ctx: CanvasRenderingContext2D, view: View, o: DrawOptions) {
  const { width: w, height: h, colors } = o;
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, 0, w, h);

  // Warm pool of light on the card stock around the rider, darkening toward the kraft edges.
  const glow = ctx.createRadialGradient(view.cam.cx, view.cam.cy, 0, view.cam.cx, view.cam.cy, Math.max(w, h) * 0.75);
  glow.addColorStop(0, "rgba(255,250,240,0.55)");
  glow.addColorStop(1, "rgba(160,128,84,0.10)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, view, colors);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Harbor water cut from blue card stock: a darker cut edge, then the water sheet.
  const waterG = WATER.map((wt) => ({ widthM: wt.widthM, g: toGround(view, wt.pts) }));
  ctx.strokeStyle = colors.waterEdge;
  for (const wt of waterG) strokeGround(ctx, view, wt.g, wt.widthM + 40, 1, 3, Infinity, "butt");
  ctx.strokeStyle = colors.water;
  for (const wt of waterG) strokeGround(ctx, view, wt.g, wt.widthM, 1, 2, Infinity, "butt");
  ctx.globalAlpha = 1;

  drawLines(ctx, view, colors, o.team);
  drawStations(ctx, view, colors, o.team);
  drawVehicles(ctx, view, colors, o.vehicles, o.phase);
  drawRiderGround(ctx, view, colors, o.accuracy, o.coneAngle);

  // Horizon: the far field fades into the kraft table.
  const fog = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  fog.addColorStop(0, colors.bg);
  fog.addColorStop(0.35, "rgba(233,220,196,0.8)");
  fog.addColorStop(1, "rgba(233,220,196,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, w, h * 0.42);

  drawLabels(ctx, view, o);
}
