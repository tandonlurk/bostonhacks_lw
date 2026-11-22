// Origami Boston illustration kit (docs/design.md section 4).
// Each piece is a small inline SVG built from flat folded facets: a lit face, a shaded face and a crease line,
// so everything reads as folded card stock rather than vector clip art. All pieces:
//   - sit on a baseline at the bottom of their viewBox (stack them in a row to build a street),
//   - are decorative (aria-hidden) unless `title` is passed,
//   - accept `tint` to recolor the main paper (e.g. a team line color) and `height` to scale.
// Shared by Ride (route card), Hunt (map scenery), City (building faces), Me/Perks (stamps, headers).
import type { CSSProperties, ReactNode } from "react";

export interface OrigamiProps {
  height?: number;
  tint?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/* ---------- color helpers ---------- */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mix `hex` toward white (amt > 0) or toward warm ink (amt < 0). */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = rgb(hex);
  const to = amt >= 0 ? [255, 250, 240] : [42, 30, 18];
  const t = Math.abs(amt);
  const c = [r, g, b].map((v, i) => Math.round(v + (to[i] - v) * t));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}
/** Lit / mid / shadow faces for one paper color. */
export function faces(hex: string) {
  return { lit: shade(hex, 0.22), mid: hex, dark: shade(hex, -0.28), crease: shade(hex, -0.45) };
}

const EDGE = "rgba(92,66,32,0.28)";

function Frame({ w, h, height = 64, title, className, style, children }: { w: number; h: number; height?: number; title?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      height={height}
      width={(height * w) / h}
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Folded box: front face + side face + roof. Building block for most structures. */
function Box({ x, y, w, h, d = 8, color }: { x: number; y: number; w: number; h: number; d?: number; color: string }) {
  const f = faces(color);
  return (
    <g stroke={EDGE} strokeWidth={0.5} strokeLinejoin="round">
      <polygon points={`${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`} fill={f.lit} />
      <polygon points={`${x + w},${y} ${x + w + d},${y - d * 0.5} ${x + w + d},${y + h - d * 0.5} ${x + w},${y + h}`} fill={f.dark} />
      <polygon points={`${x},${y} ${x + d},${y - d * 0.5} ${x + w + d},${y - d * 0.5} ${x + w},${y}`} fill={f.mid} />
    </g>
  );
}

function Windows({ x, y, cols, rows, gx, gy, w = 3, h = 4, color = "#3b3227", opacity = 0.55 }: { x: number; y: number; cols: number; rows: number; gx: number; gy: number; w?: number; h?: number; color?: string; opacity?: number }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(<rect key={`${r}-${c}`} x={x + c * gx} y={y + r * gy} width={w} height={h} fill={color} opacity={opacity} rx={0.4} />);
  return <g>{out}</g>;
}

/* ====================================================================== */
/* Boston archetypes                                                       */
/* ====================================================================== */

/** Back Bay / South End brownstone with a bow-front bay and stoop. */
export function Brownstone({ tint = "#a45a3c", ...p }: OrigamiProps) {
  const f = faces(tint);
  return (
    <Frame w={44} h={70} {...p}>
      <Box x={4} y={14} w={30} h={56} d={8} color={tint} />
      {/* bow-front bay: three folded facets */}
      <polygon points="8,24 13,21 13,58 8,60" fill={f.dark} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="13,21 25,21 25,58 13,58" fill={f.lit} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="25,21 30,24 30,60 25,58" fill={f.mid} stroke={EDGE} strokeWidth={0.5} />
      <Windows x={15.5} y={25} cols={2} rows={3} gx={5} gy={11} w={2.6} h={6} />
      {/* cornice */}
      <rect x={3} y={12} width={32} height={3} fill={f.crease} opacity={0.85} />
      {/* stoop */}
      <polygon points="30,70 30,64 36,62 40,70" fill={shade(tint, 0.35)} stroke={EDGE} strokeWidth={0.5} />
      <rect x={31} y={52} width={3} height={10} fill="#3b3227" opacity={0.6} />
    </Frame>
  );
}

/** Dorchester / Somerville triple-decker with stacked porches. */
export function TripleDecker({ tint = "#7f9bb0", ...p }: OrigamiProps) {
  const f = faces(tint);
  return (
    <Frame w={46} h={70} {...p}>
      <Box x={6} y={22} w={28} h={48} d={8} color={tint} />
      {/* gable roof folded along the ridge */}
      <polygon points="4,23 20,8 20,23" fill={shade("#6b5a49", 0.1)} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="20,8 36,23 20,23" fill={shade("#6b5a49", -0.15)} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="20,8 28,4 44,19 36,23" fill={shade("#6b5a49", -0.3)} stroke={EDGE} strokeWidth={0.5} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={6} y={30 + i * 14} width={28} height={1.6} fill={f.crease} opacity={0.6} />
          <rect x={6} y={36 + i * 14} width={28} height={1} fill="#fffaf0" opacity={0.7} />
        </g>
      ))}
      <Windows x={10} y={25} cols={3} rows={3} gx={8} gy={14} w={3} h={5} />
    </Frame>
  );
}

/** Massachusetts State House: red brick with the gold dome and lantern. */
export function StateHouse({ tint = "#b4532f", ...p }: OrigamiProps) {
  return (
    <Frame w={70} h={66} {...p}>
      <Box x={6} y={36} w={54} h={30} d={8} color={tint} />
      <Box x={20} y={28} w={26} h={10} d={6} color="#efe6d4" />
      {/* columns */}
      {[23, 28, 33, 38, 43].map((x) => (
        <rect key={x} x={x} y={38} width={1.6} height={14} fill="#fffaf0" opacity={0.9} />
      ))}
      {/* gold dome: two facets + crease */}
      <path d="M21 28 C21 14 45 14 45 28 Z" fill="#e3b347" stroke={EDGE} strokeWidth={0.5} />
      <path d="M33 14.5 C40 15 45 20 45 28 L33 28 Z" fill="#b88a26" />
      <rect x={31.6} y={8} width={3} height={6} fill="#e3b347" stroke={EDGE} strokeWidth={0.4} />
      <circle cx={33.1} cy={7} r={1.6} fill="#c9962b" />
      <Windows x={10} y={44} cols={3} rows={2} gx={4} gy={9} w={2.2} h={4} />
      <Windows x={49} y={44} cols={2} rows={2} gx={4} gy={9} w={2.2} h={4} />
    </Frame>
  );
}

/** Custom House Tower: tall clock tower on a pedestal. */
export function CustomHouse({ tint = "#d8cbb3", ...p }: OrigamiProps) {
  return (
    <Frame w={40} h={96} {...p}>
      <Box x={4} y={70} w={28} h={26} d={6} color={tint} />
      <Box x={10} y={18} w={16} h={54} d={5} color={tint} />
      <polygon points="10,18 18,4 26,18" fill={shade(tint, -0.08)} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="18,4 23,1.5 31,15.5 26,18" fill={shade(tint, -0.3)} stroke={EDGE} strokeWidth={0.5} />
      <circle cx={18} cy={26} r={4} fill="#fffaf0" stroke="#3b3227" strokeWidth={0.6} />
      <path d="M18 26 L18 23.4 M18 26 L20 27" stroke="#3b3227" strokeWidth={0.6} strokeLinecap="round" />
      <Windows x={13} y={36} cols={2} rows={5} gx={6} gy={7} w={2.4} h={4} />
    </Frame>
  );
}

/** Old North Church: white steeple on a brick base. */
export function OldNorth({ tint = "#a9583a", ...p }: OrigamiProps) {
  return (
    <Frame w={36} h={92} {...p}>
      <Box x={6} y={56} w={22} h={36} d={6} color={tint} />
      <Box x={11} y={36} w={12} h={20} d={4} color="#efe6d4" />
      <polygon points="11,36 17,12 23,36" fill="#fbf6ec" stroke={EDGE} strokeWidth={0.5} />
      <polygon points="17,12 21,10 27,34 23,36" fill="#d9ccb4" stroke={EDGE} strokeWidth={0.5} />
      <line x1={17} y1={12} x2={17} y2={4} stroke="#6a5d4c" strokeWidth={0.8} />
      <rect x={14.5} y={42} width={5} height={7} rx={2.5} fill="#3b3227" opacity={0.5} />
      <rect x={14} y={74} width={6} height={18} rx={3} fill="#3b3227" opacity={0.5} />
    </Frame>
  );
}

/** Zakim bridge: folded paper towers with fan cables. */
export function Zakim({ tint = "#f2ece0", ...p }: OrigamiProps) {
  const cables: ReactNode[] = [];
  for (const [tx, dir] of [
    [30, -1],
    [30, 1],
    [90, -1],
    [90, 1],
  ] as const) {
    for (let i = 1; i <= 6; i++) cables.push(<line key={`${tx}-${dir}-${i}`} x1={tx} y1={8 + i * 2} x2={tx + dir * i * 4.6} y2={44} stroke="#8a7d6a" strokeWidth={0.45} />);
  }
  return (
    <Frame w={120} h={54} {...p}>
      {cables}
      {[30, 90].map((x) => (
        <g key={x}>
          <polygon points={`${x - 4},50 ${x - 0.8},4 ${x},4 ${x - 1},50`} fill={shade(tint, -0.08)} stroke={EDGE} strokeWidth={0.5} />
          <polygon points={`${x + 4},50 ${x + 0.8},4 ${x},4 ${x + 1},50`} fill={shade(tint, -0.25)} stroke={EDGE} strokeWidth={0.5} />
        </g>
      ))}
      <polygon points="0,44 120,44 120,48 0,48" fill={shade(tint, -0.15)} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="0,48 120,48 118,50 2,50" fill={shade(tint, -0.4)} />
    </Frame>
  );
}

/** The Citgo sign over Kenmore: folded triangle mark on a rooftop frame. */
export function Citgo(p: OrigamiProps) {
  return (
    <Frame w={40} h={50} {...p}>
      <Box x={4} y={34} w={28} h={16} d={5} color="#c9b9a0" />
      <rect x={6} y={8} width={26} height={22} fill="#fbf6ec" stroke={EDGE} strokeWidth={0.5} />
      <polygon points="32,8 36,6 36,28 32,30" fill="#d9ccb4" stroke={EDGE} strokeWidth={0.5} />
      <polygon points="19,10 28,26 10,26" fill="#da291c" />
      <polygon points="19,10 28,26 19,22" fill="#a91f15" />
      <line x1={10} y1={30} x2={10} y2={34} stroke="#6a5d4c" strokeWidth={0.8} />
      <line x1={28} y1={30} x2={28} y2={34} stroke="#6a5d4c" strokeWidth={0.8} />
    </Frame>
  );
}

/** Back Bay glass towers (Pru + Hancock silhouette): tall folded slabs. */
export function BackBayTowers({ tint = "#8fa7b8", ...p }: OrigamiProps) {
  return (
    <Frame w={60} h={110} {...p}>
      <Box x={4} y={22} w={20} h={88} d={7} color={shade(tint, -0.05)} />
      <rect x={10} y={14} width={8} height={8} fill={shade(tint, -0.2)} stroke={EDGE} strokeWidth={0.5} />
      <line x1={14} y1={14} x2={14} y2={2} stroke="#6a5d4c" strokeWidth={0.8} />
      {/* Hancock: thin rhomboid slab with a crease down the middle */}
      <polygon points="32,6 46,10 46,110 32,110" fill={shade(tint, 0.3)} stroke={EDGE} strokeWidth={0.5} />
      <polygon points="46,10 54,6 54,106 46,110" fill={shade(tint, -0.2)} stroke={EDGE} strokeWidth={0.5} />
      <line x1={39} y1={8} x2={39} y2={110} stroke="#fffaf0" strokeWidth={0.6} opacity={0.7} />
      <Windows x={7} y={28} cols={3} rows={10} gx={5} gy={8} w={2} h={3} opacity={0.35} />
    </Frame>
  );
}

/** Fenway: green-wall ballpark corner with a light tower. */
export function Fenway(p: OrigamiProps) {
  return (
    <Frame w={64} h={60} {...p}>
      <Box x={4} y={30} w={48} h={30} d={8} color="#2f6b45" />
      <rect x={10} y={36} width={20} height={6} fill="#fbf6ec" opacity={0.85} />
      <rect x={34} y={36} width={12} height={6} fill="#fbf6ec" opacity={0.85} />
      <line x1={56} y1={30} x2={56} y2={4} stroke="#6a5d4c" strokeWidth={1.2} />
      <rect x={50} y={2} width={12} height={6} fill="#efe6d4" stroke={EDGE} strokeWidth={0.5} />
      <Windows x={51.5} y={3.2} cols={4} rows={1} gx={2.6} gy={0} w={1.6} h={3.4} color="#e3b347" opacity={0.9} />
    </Frame>
  );
}

/** MIT / Cambridge dome. */
export function GreatDome({ tint = "#e6dccb", ...p }: OrigamiProps) {
  return (
    <Frame w={64} h={56} {...p}>
      <Box x={4} y={30} w={52} h={26} d={8} color={tint} />
      {[12, 20, 28, 36, 44].map((x) => (
        <rect key={x} x={x} y={33} width={2} height={18} fill="#fffaf0" opacity={0.9} />
      ))}
      <path d="M16 30 C16 12 44 12 44 30 Z" fill={shade(tint, 0.1)} stroke={EDGE} strokeWidth={0.5} />
      <path d="M30 13 C38 14 44 20 44 30 L30 30 Z" fill={shade(tint, -0.2)} />
    </Frame>
  );
}

/** Seaport glass block with a crane. */
export function SeaportCrane({ tint = "#7c878e", ...p }: OrigamiProps) {
  return (
    <Frame w={66} h={80} {...p}>
      <Box x={4} y={38} w={26} h={42} d={7} color={shade(tint, 0.2)} />
      <Windows x={7} y={42} cols={4} rows={6} gx={6} gy={6} w={3.5} h={3} opacity={0.3} />
      <polygon points="44,80 46,10 48,80" fill="#c9962b" stroke={EDGE} strokeWidth={0.5} />
      <polygon points="30,12 64,12 64,15 30,15" fill="#e3b347" stroke={EDGE} strokeWidth={0.5} />
      <line x1={60} y1={15} x2={60} y2={30} stroke="#6a5d4c" strokeWidth={0.6} />
      <rect x={58} y={30} width={4} height={3} fill="#6a5d4c" />
    </Frame>
  );
}

/** Faceted origami tree (two-tone cone). */
export function PaperTree({ tint = "#4f8a5b", height = 28, ...p }: OrigamiProps) {
  const f = faces(tint);
  return (
    <Frame w={20} h={32} height={height} {...p}>
      <rect x={9} y={24} width={2} height={8} fill="#7a5a3a" />
      <polygon points="10,2 1,26 10,22" fill={f.lit} stroke={EDGE} strokeWidth={0.4} />
      <polygon points="10,2 19,26 10,22" fill={f.dark} stroke={EDGE} strokeWidth={0.4} />
    </Frame>
  );
}

/** Round origami tree (Common elm): stacked folded octagon. */
export function PaperElm({ tint = "#5f9a5e", height = 30, ...p }: OrigamiProps) {
  const f = faces(tint);
  return (
    <Frame w={26} h={32} height={height} {...p}>
      <rect x={12} y={22} width={2.2} height={10} fill="#7a5a3a" />
      <polygon points="13,2 21,6 24,14 21,22 13,25 5,22 2,14 5,6" fill={f.lit} stroke={EDGE} strokeWidth={0.4} />
      <polygon points="13,2 21,6 24,14 21,22 13,25" fill={f.dark} opacity={0.85} />
      <line x1={13} y1={2} x2={13} y2={25} stroke={f.crease} strokeWidth={0.4} opacity={0.6} />
    </Frame>
  );
}

/** Folded paper cloud. */
export function PaperCloud({ height = 18, ...p }: OrigamiProps) {
  return (
    <Frame w={40} h={18} height={height} {...p}>
      <polygon points="4,16 10,8 18,10 24,3 32,8 36,16" fill="#fffaf0" stroke={EDGE} strokeWidth={0.4} />
      <polygon points="18,10 24,3 32,8 36,16 22,16" fill="#efe6d4" />
    </Frame>
  );
}

/** Harbor wave strip (repeating folded triangles). */
export function PaperWaves({ height = 10, tint = "#2f5d7c", ...p }: OrigamiProps & { count?: number }) {
  const f = faces(tint);
  const tri: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    tri.push(<polygon key={`a${i}`} points={`${i * 10},10 ${i * 10 + 5},2 ${i * 10 + 5},10`} fill={f.lit} />);
    tri.push(<polygon key={`b${i}`} points={`${i * 10 + 5},2 ${i * 10 + 10},10 ${i * 10 + 5},10`} fill={f.mid} />);
  }
  return (
    <Frame w={80} h={10} height={height} {...p}>
      {tri}
    </Frame>
  );
}

/** Origami swan boat (Public Garden). */
export function SwanBoat(p: OrigamiProps) {
  return (
    <Frame w={40} h={26} {...p}>
      <polygon points="2,18 34,18 30,24 6,24" fill="#d9ccb4" stroke={EDGE} strokeWidth={0.5} />
      <polygon points="24,18 30,6 33,4 32,10 34,18" fill="#fffaf0" stroke={EDGE} strokeWidth={0.5} />
      <polygon points="30,6 33,4 36,6" fill="#e3a23a" />
      <polygon points="18,18 26,10 30,18" fill="#efe6d4" stroke={EDGE} strokeWidth={0.4} />
    </Frame>
  );
}

/** Folded paper flag on a pin: quest / hotspot marker. */
export function PaperFlag({ tint = "#b4532f", height = 28, ...p }: OrigamiProps) {
  const f = faces(tint);
  return (
    <Frame w={20} h={30} height={height} {...p}>
      <line x1={4} y1={2} x2={4} y2={29} stroke="#6a5d4c" strokeWidth={1.2} strokeLinecap="round" />
      <polygon points="4,3 18,7 4,12" fill={f.lit} stroke={EDGE} strokeWidth={0.4} />
      <polygon points="4,7.5 18,7 4,12" fill={f.dark} />
      <circle cx={4} cy={2.4} r={1.6} fill={f.crease} />
    </Frame>
  );
}

/** Folded MBTA "T" roundel in paper. */
export function PaperT({ height = 28, tint = "#2a241d", ...p }: OrigamiProps) {
  return (
    <Frame w={30} h={30} height={height} {...p}>
      <circle cx={15} cy={15} r={13} fill="#fffaf0" stroke={tint} strokeWidth={2.4} />
      <path d="M15 2 A13 13 0 0 1 28 15 L15 15 Z" fill="#efe6d4" opacity={0.7} />
      <rect x={7.5} y={8} width={15} height={3.8} fill={tint} />
      <rect x={13.1} y={8} width={3.8} height={14} fill={tint} />
    </Frame>
  );
}

/* ---------- lookup ---------- */

export type LandmarkKind =
  | "brownstone"
  | "tripleDecker"
  | "stateHouse"
  | "customHouse"
  | "oldNorth"
  | "zakim"
  | "citgo"
  | "backBay"
  | "fenway"
  | "greatDome"
  | "seaport"
  | "swanBoat";

export const LANDMARK_ART: Record<LandmarkKind, (p: OrigamiProps) => React.JSX.Element> = {
  brownstone: Brownstone,
  tripleDecker: TripleDecker,
  stateHouse: StateHouse,
  customHouse: CustomHouse,
  oldNorth: OldNorth,
  zakim: Zakim,
  citgo: Citgo,
  backBay: BackBayTowers,
  fenway: Fenway,
  greatDome: GreatDome,
  seaport: SeaportCrane,
  swanBoat: SwanBoat,
};

/**
 * Best-guess origami art for a station by name. Purely decorative scenery (not a factual claim about the
 * station), so a loose keyword match is fine; falls back to neighborhood archetypes.
 */
export function artForStation(name: string): LandmarkKind {
  const n = name.toLowerCase();
  if (/park st|downtown|state|government|bowdoin|beacon/.test(n)) return "stateHouse";
  if (/aquarium|haymarket|wharf/.test(n)) return "customHouse";
  if (/north station|science park|community college|lechmere/.test(n)) return "zakim";
  if (/kenmore/.test(n)) return "citgo";
  if (/fenway|longwood/.test(n)) return "fenway";
  if (/copley|prudential|back bay|hynes|symphony|arlington/.test(n)) return "backBay";
  if (/kendall|mit|central|harvard|porter|davis|alewife/.test(n)) return "greatDome";
  if (/seaport|courthouse|silver|world trade|design center|airport|maverick/.test(n)) return "seaport";
  if (/boylston|public garden/.test(n)) return "swanBoat";
  if (/north end|old north/.test(n)) return "oldNorth";
  if (/jfk|savin|fields|shawmut|ashmont|dorchester|andrew|broadway|quincy|braintree|wollaston|malden|wellington|oak grove|sullivan|assembly/.test(n)) return "tripleDecker";
  return "brownstone";
}

/** Render the art for a station name. */
export function StationArt({ name, ...p }: OrigamiProps & { name: string }) {
  const Art = LANDMARK_ART[artForStation(name)];
  return <Art {...p} />;
}
