// Static team / route metadata (docs/CONTRACTS.md section 1). Safe to import client-side.

/** Every line we track and draw. Silver is a line but not a team (#115): riding it is a side quest. */
export const LINE_IDS = ["Red", "Orange", "Blue", "Green", "Silver"] as const;
export type LineId = (typeof LINE_IDS)[number];

/**
 * Any line id, Silver included. The name is historical; it stays this wide so per-line maps
 * (colors, labels, map geometry) keep compiling. For teams use TEAM_ROUTE_IDS / isTeamRouteId.
 */
export type TeamRouteId = LineId;

/** The four playable teams (#115). Team pickers, districts, leaderboard and the simulator iterate this. */
const PLAYABLE = ["Red", "Orange", "Blue", "Green"] as const;
export type PlayableTeamId = (typeof PLAYABLE)[number];
/** Typed as line ids so `TEAM_ROUTE_IDS.includes(line)` keeps compiling; values are the 4 teams. */
export const TEAM_ROUTE_IDS: readonly TeamRouteId[] = PLAYABLE;

export interface TeamMeta {
  id: TeamRouteId;
  name: string;
  color: string;
  districtName: string;
}

export const TEAMS: Record<TeamRouteId, TeamMeta> = {
  Red: { id: "Red", name: "Red Line", color: "#DA291C", districtName: "Kendall / Harvard (innovation)" },
  Orange: { id: "Orange", name: "Orange Line", color: "#ED8B00", districtName: "Neighborhoods (JP, South End, Back Bay)" },
  Blue: { id: "Blue", name: "Blue Line", color: "#003DA5", districtName: "Harbor and Airport" },
  Green: { id: "Green", name: "Green Line", color: "#00843D", districtName: "Fenway and Campuses" },
  /** Not a team: kept for line colors and labels. */
  Silver: { id: "Silver", name: "Silver Line", color: "#7C878E", districtName: "Side quest (not a team)" },
};

/** MBTA route ids we track, mapped to their team. */
export const MBTA_ROUTES: { id: string; teamRouteId: TeamRouteId; name: string }[] = [
  { id: "Red", teamRouteId: "Red", name: "Red Line" },
  { id: "Orange", teamRouteId: "Orange", name: "Orange Line" },
  { id: "Blue", teamRouteId: "Blue", name: "Blue Line" },
  { id: "Green-B", teamRouteId: "Green", name: "Green Line B" },
  { id: "Green-C", teamRouteId: "Green", name: "Green Line C" },
  { id: "Green-D", teamRouteId: "Green", name: "Green Line D" },
  { id: "Green-E", teamRouteId: "Green", name: "Green Line E" },
  { id: "741", teamRouteId: "Silver", name: "Silver Line SL1" },
  { id: "742", teamRouteId: "Silver", name: "Silver Line SL2" },
  { id: "743", teamRouteId: "Silver", name: "Silver Line SL3" },
  { id: "746", teamRouteId: "Silver", name: "Silver Line Way" },
  { id: "749", teamRouteId: "Silver", name: "Silver Line SL5" },
  { id: "751", teamRouteId: "Silver", name: "Silver Line SL4" },
];

/** True only for the four playable teams (Silver is a line, not a team). */
export function isTeamRouteId(x: unknown): x is PlayableTeamId {
  return typeof x === "string" && (TEAM_ROUTE_IDS as readonly string[]).includes(x);
}

export function isLineId(x: unknown): x is LineId {
  return typeof x === "string" && (LINE_IDS as readonly string[]).includes(x);
}

/** Map any MBTA route id ("Green-B", "742", "Red") to its line, or null if untracked. */
export function toTeamRouteId(mbtaRouteId: string): LineId | null {
  return MBTA_ROUTES.find((r) => r.id === mbtaRouteId)?.teamRouteId ?? null;
}
export const toLineId = toTeamRouteId;

/** The playable team for an MBTA route, or null for Silver / untracked routes. */
export function toPlayableTeam(mbtaRouteId: string): PlayableTeamId | null {
  const line = toTeamRouteId(mbtaRouteId);
  return isTeamRouteId(line) ? line : null;
}
