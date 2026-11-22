// Visual vocabulary shared by the map, legend and sheets: mini-game kinds and heat buckets.
import { CameraIcon, PuzzleIcon, StarIcon, TriviaIcon, type IconProps } from "@/components/icons";
import type { GameKind } from "./placeholderGames";

// Paper-palette inks: every color holds >= 3:1 against cream card stock (icons) and the icon shapes differ, so
// game kinds never rely on color alone.
export const GAME_META: Record<GameKind, { label: string; blurb: string; color: string; Icon: (p: IconProps) => React.ReactElement }> = {
  clue: { label: "Station hunt", blurb: "Find-it clues on the platform", color: "#2f6b45", Icon: PuzzleIcon },
  trivia: { label: "Trivia", blurb: "3 quick questions, 12s each", color: "#2f5d7c", Icon: TriviaIcon },
  photo: { label: "Photo snap", blurb: "Snap the thing, AI checks it", color: "#b4532f", Icon: CameraIcon },
  landmark: { label: "Landmark", blurb: "Check in nearby for a bonus", color: "#85600f", Icon: StarIcon },
  challenge: { label: "Photo challenge", blurb: "Delay scavenger hunt, AI graded", color: "#a8243f", Icon: CameraIcon },
};

export const GAME_ORDER: GameKind[] = ["clue", "trivia", "photo", "challenge", "landmark"];

export type HeatLevel = "ok" | "slow" | "crawl";

/** `color` paints map markers; `ink` is the text-safe twin (>= 4.5:1 on cream). */
export const HEAT: Record<HeatLevel, { color: string; ink: string; label: string; range: string }> = {
  ok: { color: "#4f9a62", ink: "#2f6b45", label: "Moving", range: "under 15% slow" },
  slow: { color: "#d99a2b", ink: "#85600f", label: "Sluggish", range: "15 to 35% slow" },
  crawl: { color: "#c8325a", ink: "#a8243f", label: "Crawling", range: "over 35% slow" },
};

export function heatLevel(slowShare: number): HeatLevel {
  if (slowShare < 0.15) return "ok";
  if (slowShare < 0.35) return "slow";
  return "crawl";
}
