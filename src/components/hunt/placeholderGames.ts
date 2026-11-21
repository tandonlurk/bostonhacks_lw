// PLACEHOLDER until B ships GET /api/hunts/map (issue #93)
// Deterministic per-station mini-game lists so the Hunt map always has something to show. Shape mirrors the
// proposed contract: [{ stopId, games: [{ id, kind, title, rewardPoints, rewardTokens }] }]. Rewards here are
// previews only; nothing in this file awards points.
import type { Landmark } from "@/contracts";
import type { TeamRouteId } from "@/contracts/routes";
import { MAP_STATIONS } from "./mapModel";

export type GameKind = "clue" | "trivia" | "photo" | "landmark";

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

const TITLES: Record<Exclude<GameKind, "landmark">, string[]> = {
  clue: ["Station hunt", "Platform clue trail", "Find the hidden sign"],
  trivia: ["T trivia blitz", "Name that stop", "Line lore quiz"],
  photo: ["Snap the sign", "Tile mosaic snap", "Platform selfie"],
};

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
  const h = hash(stopId);
  const pick = (kind: Exclude<GameKind, "landmark">, salt: number) => {
    const pool = TITLES[kind];
    return pool[(h >>> salt) % pool.length];
  };
  // Every station has a clue hunt; trivia and photo show up on roughly 2 of 3 stations each, never both missing.
  const games: StationGame[] = [{ id: `${stopId}:clue`, kind: "clue", title: pick("clue", 3), rewardPoints: 10, rewardTokens: 1 }];
  const trivia = h % 3 !== 0;
  const photo = (h >>> 5) % 3 !== 0 || !trivia;
  if (trivia) games.push({ id: `${stopId}:trivia`, kind: "trivia", title: pick("trivia", 7), rewardPoints: 15, rewardTokens: 2 });
  if (photo) games.push({ id: `${stopId}:photo`, kind: "photo", title: pick("photo", 11), rewardPoints: 12, rewardTokens: 1 });
  if (landmark) {
    games.push({
      id: `${stopId}:landmark:${landmark.id}`,
      kind: "landmark",
      title: landmark.name,
      rewardPoints: landmark.bonusPoints,
      rewardTokens: 0,
    });
  }
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
