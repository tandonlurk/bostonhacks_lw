// Visual vocabulary shared by the map, legend and sheets: mini-game kinds and heat buckets.
import { CameraIcon, PuzzleIcon, StarIcon, TriviaIcon, type IconProps } from "@/components/icons";
import type { GameKind } from "./placeholderGames";

export const GAME_META: Record<GameKind, { label: string; blurb: string; color: string; Icon: (p: IconProps) => React.ReactElement }> = {
  clue: { label: "Station hunt", blurb: "Find-it clues on the platform", color: "#3f7a00", Icon: PuzzleIcon },
  trivia: { label: "Trivia", blurb: "3 quick questions, 12s each", color: "#7cc4ff", Icon: TriviaIcon },
  photo: { label: "Photo snap", blurb: "Snap the thing, AI checks it", color: "#d6338f", Icon: CameraIcon },
  landmark: { label: "Landmark", blurb: "Check in nearby for a bonus", color: "#a87900", Icon: StarIcon },
  challenge: { label: "Photo challenge", blurb: "Delay scavenger hunt, AI graded", color: "#ff3d7f", Icon: CameraIcon },
};

export const GAME_ORDER: GameKind[] = ["clue", "trivia", "photo", "challenge", "landmark"];

export type HeatLevel = "ok" | "slow" | "crawl";

export const HEAT: Record<HeatLevel, { color: string; label: string; range: string }> = {
  ok: { color: "#1fd17a", label: "Moving", range: "under 15% slow" },
  slow: { color: "#c27a00", label: "Sluggish", range: "15 to 35% slow" },
  crawl: { color: "#ff4d3d", label: "Crawling", range: "over 35% slow" },
};

export function heatLevel(slowShare: number): HeatLevel {
  if (slowShare < 0.15) return "ok";
  if (slowShare < 0.35) return "slow";
  return "crawl";
}
