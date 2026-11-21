// JS copies of the line color tokens (src/styles/tokens.css) so faces can be shaded continuously while the
// camera rotates. Keep in sync with --line-* / --glow-*.
import type { TeamRouteId } from "@/contracts/routes";

export const TEAM_HEX: Record<TeamRouteId, { base: string; glow: string }> = {
  Red: { base: "#da291c", glow: "#ff4d3d" },
  Orange: { base: "#ed8b00", glow: "#ffa62b" },
  Blue: { base: "#003da5", glow: "#3d7bff" },
  Green: { base: "#00843d", glow: "#1fd17a" },
  Silver: { base: "#7c878e", glow: "#b5c0c7" },
};

export const TEAM_LABEL: Record<TeamRouteId, string> = {
  Red: "Red",
  Orange: "Orange",
  Blue: "Blue",
  Green: "Green",
  Silver: "Silver",
};

const NIGHT = "#07090d";
const WHITE = "#ffffff";

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

export interface FaceShades {
  top: string;
  lit: string;
  dark: string;
}

export const SHADES: Record<TeamRouteId, FaceShades> = Object.fromEntries(
  (Object.keys(TEAM_HEX) as TeamRouteId[]).map((t) => {
    const { base, glow } = TEAM_HEX[t];
    return [t, { top: mix(glow, WHITE, 0.08), lit: mix(mix(base, glow, 0.35), NIGHT, 0.5), dark: mix(base, NIGHT, 0.74) }];
  }),
) as Record<TeamRouteId, FaceShades>;
