// Static team / route metadata (docs/CONTRACTS.md section 1). Safe to import client-side.

export const TEAM_ROUTE_IDS = ["Red", "Orange", "Blue", "Green", "Silver"] as const;
export type TeamRouteId = (typeof TEAM_ROUTE_IDS)[number];

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
  Silver: { id: "Silver", name: "Silver Line", color: "#7C878E", districtName: "Seaport" },
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

export function isTeamRouteId(x: unknown): x is TeamRouteId {
  return typeof x === "string" && (TEAM_ROUTE_IDS as readonly string[]).includes(x);
}

/** Map any MBTA route id ("Green-B", "742", "Red") to its team, or null if untracked. */
export function toTeamRouteId(mbtaRouteId: string): TeamRouteId | null {
  return MBTA_ROUTES.find((r) => r.id === mbtaRouteId)?.teamRouteId ?? null;
}
