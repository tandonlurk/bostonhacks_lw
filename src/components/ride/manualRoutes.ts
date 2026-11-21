// Manual check-in helpers. Riders only ever pick a LINE (never "Green Line B" or "SL2": see
// CONTRACTS.md section 1); the MBTA route id the server needs is inferred from the station.
import type { TeamRouteId } from "@/contracts/routes";
import { LINES } from "@/components/map/mbta-geo";

interface Variant {
  routeId: string;
  stations: Set<string>;
}

const green = LINES.Green;
const trunk = green[0];
const at = (id: string) => trunk.indexOf(id);
const DOWNTOWN = trunk.slice(at("place-gover"), at("place-coecl") + 1);
const NORTH_OF_GOV = trunk.slice(0, at("place-gover"));
const E_SOUTH = trunk.slice(at("place-coecl") + 1);

const silver = LINES.Silver;

/** Order matters: the first variant serving a station wins when several do. */
const VARIANTS: Record<TeamRouteId, Variant[]> = {
  Red: [{ routeId: "Red", stations: new Set(LINES.Red.flat()) }],
  Orange: [{ routeId: "Orange", stations: new Set(LINES.Orange.flat()) }],
  Blue: [{ routeId: "Blue", stations: new Set(LINES.Blue.flat()) }],
  Green: [
    { routeId: "Green-E", stations: new Set([...NORTH_OF_GOV, ...DOWNTOWN, ...E_SOUTH]) },
    { routeId: "Green-B", stations: new Set([...DOWNTOWN, ...green[3]]) },
    { routeId: "Green-C", stations: new Set([...DOWNTOWN, ...green[4]]) },
    { routeId: "Green-D", stations: new Set([...DOWNTOWN, ...green[2], ...green[1], "place-lech", "place-spmnl", "place-north", "place-haecl"]) },
  ],
  Silver: [
    { routeId: "743", stations: new Set(silver[0]) }, // SL3: South Station to Chelsea via the airport
    { routeId: "742", stations: new Set(silver[1]) }, // SL2: Design Center
    { routeId: "741", stations: new Set(silver[2]) }, // SL1: Logan terminals
    { routeId: "749", stations: new Set(silver[3]) }, // SL5: Washington St to Nubian
  ],
};

export function routeIdFor(team: TeamRouteId, stationId: string): string {
  return VARIANTS[team].find((v) => v.stations.has(stationId))?.routeId ?? VARIANTS[team][0].routeId;
}

/** Rider-facing direction labels (direction_id 0 / 1). Line-level only, no branch names. */
export const DIRECTIONS: Record<TeamRouteId, [string, string]> = {
  Red: ["Ashmont / Braintree", "Alewife"],
  Orange: ["Forest Hills", "Oak Grove"],
  Blue: ["Bowdoin", "Wonderland"],
  Green: ["Outbound (westbound)", "Inbound (downtown)"],
  Silver: ["Outbound", "Inbound (downtown)"],
};
