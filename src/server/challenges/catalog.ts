// Delay photo challenges: catalog, rounds and scoring (owner: A, T26). Pure; no I/O.
// Prompts are generic objects findable near any station or street. Never a claim about a specific
// physical station (AGENTS.md section 7), and never people, faces, license plates or private things.
import type { DelayResponse, TeamRouteId } from "@/contracts";

export interface CatalogChallenge {
  id: string;
  /** shown to the player */
  prompt: string;
  /** max points (10-20 by difficulty) */
  points: number;
  /** what counts, for the grader */
  grading: string;
}

const NO_PEOPLE = "No people should be the subject.";

export const CATALOG: readonly CatalogChallenge[] = [
  { id: "ch_map", prompt: "Find and photograph a transit or neighborhood map.", points: 15, grading: "A printed or posted transit map, system map or neighborhood map (on a wall, sign or board)." },
  { id: "ch_color", prompt: "Snap something the color of your team's line.", points: 10, grading: "An object whose main color clearly matches the requested color." },
  { id: "ch_art", prompt: "Photograph a mural, sculpture or other piece of public art.", points: 20, grading: "A mural, sculpture, mosaic, installation or other public art. " + NO_PEOPLE },
  { id: "ch_bike", prompt: "Snap a bike rack or a bike-share dock.", points: 15, grading: "A bike rack or bike-share docking station, with or without bikes." },
  { id: "ch_clock", prompt: "Find a clock: on a wall, a tower or a sign.", points: 15, grading: "A real analog or digital clock in the physical world (wall, tower, sign), not a phone or computer clock." },
  { id: "ch_plant", prompt: "Photograph a tree, plant or flower.", points: 10, grading: "A real tree, plant, flower or other greenery." },
  { id: "ch_tsign", prompt: "Find the round MBTA \"T\" logo on a sign.", points: 15, grading: "The MBTA logo: a black capital T in a white circle, on a sign, pole or entrance." },
  { id: "ch_bus", prompt: "Snap a bus, parked or passing (no faces or license plates up close).", points: 15, grading: "A bus (city, shuttle or school bus). " + NO_PEOPLE },
  { id: "ch_number", prompt: "Photograph a street or route sign that has a number on it.", points: 15, grading: "A street, route, platform or directional sign with a visible number. Not a license plate or a home address." },
  { id: "ch_bench", prompt: "Find a bench and photograph it.", points: 10, grading: "A bench of any kind (park, platform, bus stop). " + NO_PEOPLE },
  { id: "ch_water", prompt: "Photograph a fountain, a river or any water you can find.", points: 15, grading: "Visible water: a fountain, river, harbor, pond, puddle or drinking fountain." },
  { id: "ch_animal", prompt: "Find an animal: a statue, a bird, a squirrel or a pet (ask the owner first; no people in the shot).", points: 20, grading: "An animal or an animal statue, sculpture or picture on public display. " + NO_PEOPLE },
  { id: "ch_reflection", prompt: "Capture a reflection in a window, a puddle or a shiny surface.", points: 20, grading: "A visible reflection of the surroundings in glass, water, metal or another shiny surface. " + NO_PEOPLE },
  { id: "ch_arrow", prompt: "Find an arrow on a sign or painted on the ground.", points: 10, grading: "An arrow on a sign, a wall, a floor or a road marking." },
  { id: "ch_letter", prompt: "Spot a big letter T somewhere that isn't an MBTA sign.", points: 15, grading: "A clearly visible letter T on a storefront, poster or sign that is not the MBTA logo." },
];

/** Challenges shown per delay round. */
export const PER_ROUND = 4;

const COLOR_WORDS: Record<TeamRouteId, string> = {
  Red: "red",
  Orange: "orange",
  Blue: "blue",
  Green: "green",
  Silver: "silver or gray",
};

/** FNV-1a 32-bit. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One round per delay window, the same for everyone: `delay-<startedAt UTC minute>`.
 * null when no delay is active.
 */
export function roundIdFor(delay: Pick<DelayResponse, "active" | "startedAt">): string | null {
  if (!delay.active || !delay.startedAt) return null;
  const t = Date.parse(delay.startedAt);
  const minute = Number.isFinite(t)
    ? new Date(t).toISOString().slice(0, 16)
    : delay.startedAt.replace(/[^0-9A-Za-z:-]/g, "").slice(0, 32);
  return `delay-${minute}`;
}

/** Deterministic pick of PER_ROUND distinct challenges for a round (seeded shuffle). */
export function pickChallenges(roundId: string, n = PER_ROUND): CatalogChallenge[] {
  const next = rng(hash32(roundId));
  const pool = [...CATALOG];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/** Player-facing prompt, personalized where it helps (team color). */
export function promptFor(c: CatalogChallenge, team?: TeamRouteId | null): string {
  if (c.id === "ch_color" && team) return `Snap something ${COLOR_WORDS[team]}, the color of your team's line.`;
  return c.prompt;
}

/** What the grader is told the player must show. */
export function gradingTaskFor(c: CatalogChallenge, team?: TeamRouteId | null): string {
  if (c.id === "ch_color") {
    const color = team ? COLOR_WORDS[team] : "red, orange, blue, green or silver";
    return `Photograph something ${color}. ${c.grading}`;
  }
  return `${c.prompt} ${c.grading}`;
}

/** Points for a passed grade: round(max x score), at least 1. Zero when not passed. */
export function pointsFor(maxPoints: number, score: number | null, passed: boolean | null): number {
  if (!passed || score === null || !Number.isFinite(score)) return 0;
  return Math.max(1, Math.round(maxPoints * Math.max(0, Math.min(1, score))));
}

/** Offline grader used only while the demo simulator runs and Gemini is unavailable. Clearly labeled. */
export const DEMO_SCORE = 0.75;
export function demoGrade(): { enabled: true; passed: true; score: number; reason: string; demo: true } {
  return {
    enabled: true,
    passed: true,
    score: DEMO_SCORE,
    reason: "Nice find! Scored 75%.",
    demo: true,
  };
}
