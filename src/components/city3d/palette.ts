// Daylight paper palette for the origami city. Line colors are copies of the contract tokens
// (src/styles/tokens.css --line-* / --glow-*) so SVG faces can be shaded in JS while the view turns.
// Shading uses the shared origami kit's shade() so the city folds the same way as every other piece of art.
import type { TeamRouteId } from "@/contracts/routes";
import { shade } from "@/components/paper/origami";

/** `base` is the exact contract line color (roofs, flags, ribbons); `ink` is its text-safe twin on cream. */
export const TEAM_HEX: Record<TeamRouteId, { base: string; ink: string }> = {
  Red: { base: "#da291c", ink: "#b8231a" },
  Orange: { base: "#ed8b00", ink: "#a85a00" },
  Blue: { base: "#003da5", ink: "#003da5" },
  Green: { base: "#00843d", ink: "#00703a" },
  Silver: { base: "#7c878e", ink: "#55606a" },
};

/** Text on a solid line-color swatch (white fails on Orange and Silver). Mirrors LineChip. */
export const TEAM_ON: Record<TeamRouteId, string> = {
  Red: "#ffffff",
  Orange: "#14181c",
  Blue: "#ffffff",
  Green: "#ffffff",
  Silver: "#14181c",
};

export const TEAM_SHORT: Record<TeamRouteId, string> = { Red: "RL", Orange: "OL", Blue: "BL", Green: "GL", Silver: "SL" };

/** Paper stock for buildings and terrain (all decorative; text never sits on these). */
export const PAPER = {
  land: "#f6efe1",
  landEdge: "#d9c9ab",
  landShadow: "rgba(74,52,22,0.16)",
  park: "#a9c98f",
  parkEdge: "#7fa66a",
  water: "#a9cde0",
  waterDeep: "#7fa9c6",
  waterLine: "#eef6f9",
  brick: "#b4532f",
  brownstone: "#9a5b43",
  stone: "#d8cbb3",
  cream: "#efe6d4",
  glass: "#8fa7b8",
  glassLight: "#a9c0cc",
  slate: "#6b5a49",
  gold: "#e3b347",
  patina: "#6f9e8a",
  monster: "#2f6b45",
  field: "#8dbb6c",
  crane: "#c9962b",
  neutralRoof: "#c9b9a0",
  trunk: "#7a5a3a",
  edge: "rgba(92,66,32,0.3)",
  window: "#3b3227",
} as const;

/** Clapboard pastels for triple-deckers and cottages. */
export const CLAPBOARD = ["#8fa9bf", "#c9b27c", "#a7b98f", "#d9a38f", "#b9a6c9", "#e2d3a6", "#9fbfb4"];

const toneCache = new Map<string, string>();

/**
 * Paper color for a face given its Lambert term (-1..1) under the fixed view-space sun.
 * Lit walls lighten, shaded walls fold toward warm ink, like the kit's lit/mid/dark faces.
 */
export function tone(hex: string, lambert: number): string {
  const amt = Math.round(Math.max(-0.34, Math.min(0.26, 0.5 * lambert - 0.15)) * 50) / 50;
  const k = `${hex}|${amt}`;
  let c = toneCache.get(k);
  if (!c) {
    c = amt === 0 ? hex : shade(hex, amt);
    toneCache.set(k, c);
  }
  return c;
}
