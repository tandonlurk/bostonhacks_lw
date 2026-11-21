// Offline fallback for the server catalog at GET /api/hunts/map.
// Practice trivia and real landmark claims remain browsable while it loads.
import type { Landmark } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { MAP_STATIONS } from "./mapModel";

/** To add a kind (e.g. hotspots): extend this union, add GAME_META in gameMeta.tsx and a case in StationSheet's GameView. */
export type GameKind = "clue" | "trivia" | "photo" | "landmark" | "challenge";

export interface StationGame {
  id: string;
  kind: GameKind;
  title: string;
  rewardPoints: number;
  rewardTokens: number;
}

export interface StationGames {
  stopId: string;
  /** True when the game is live because this station's line is delayed; false for always-on practice stations. */
  live: boolean;
  games: StationGame[];
}

/** A few busy hubs that always carry practice games so the demo is never empty. */
export const PRACTICE_STOPS = ["place-pktrm", "place-sstat", "place-kencl", "place-harsq", "place-north"];

/** Small stable string hash (FNV-1a). */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gamesFor(stopId: string, landmark: Landmark | undefined): StationGame[] {
  // Safe offline catalog: trivia is explicitly practice until the server grants a reward.
  // Physical clues and photo challenges are listed only by the live catalog.
  const games: StationGame[] = [{ id: `${stopId}:trivia`, kind: "trivia", title: "T trivia blitz", rewardPoints: 0, rewardTokens: 0 }];
  if (landmark) games.push({ id: `${stopId}:landmark:${landmark.id}`, kind: "landmark", title: landmark.name, rewardPoints: landmark.bonusPoints, rewardTokens: 0 });
  return games;
}

/**
 * Games per station: every station on a delayed line (live), plus the practice hubs, plus any landmark stop.
 * Returned as a map keyed by stopId for quick lookup while drawing.
 */
export function placeholderGameMap(delayedTeams: TeamRouteId[], landmarks: Landmark[]): Map<string, StationGames> {
  const byStop = new Map<string, Landmark>();
  for (const l of landmarks) byStop.set(l.stopId, l);
  const delayed = new Set(delayedTeams);
  const out = new Map<string, StationGames>();

  for (const s of MAP_STATIONS) {
    if (s.minor) continue;
    const live = s.teams.some((t) => delayed.has(t));
    if (live || PRACTICE_STOPS.includes(s.id) || byStop.has(s.id)) {
      out.set(s.id, { stopId: s.id, live, games: gamesFor(s.id, byStop.get(s.id)) });
    }
  }
  return out;
}

/**
 * Real delay photo challenges (GET /api/challenges, not a placeholder) replace the placeholder photo game at every
 * live station. The challenge round is rider-wide, not per station, so each live station opens the same list.
 */
export function withChallenges(map: Map<string, StationGames>, maxPoints: number | null): Map<string, StationGames> {
  if (maxPoints == null) return map;
  const out = new Map<string, StationGames>();
  for (const [id, sg] of map) {
    if (!sg.live) {
      out.set(id, sg);
      continue;
    }
    const games = sg.games.filter((g) => g.kind !== "photo");
    games.splice(1, 0, { id: `${id}:challenge`, kind: "challenge", title: "Delay photo challenge", rewardPoints: maxPoints, rewardTokens: 0 });
    out.set(id, { ...sg, games });
  }
  return out;
}
