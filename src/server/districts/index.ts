import { TEAMS, TEAM_ROUTE_IDS } from "@/contracts";
import type { District, LotTier, TeamRouteId } from "@/contracts";
import { LOT_THRESHOLDS } from "@/server/points/rules";
import type { PointEvent } from "@/server/points/state";

export function districtFor(team: TeamRouteId, totalPoints: number): District {
  // Grow one lot at a time to give the demo an early visible tier-up.
  const fullLots = Math.floor(totalPoints / 600);
  const count = Math.max(12, fullLots + (totalPoints % 600 > 0 ? 1 : 0));
  const kinds = ["tower", "lab", "house", "park", "shop", "dock"];
  return {
    teamRouteId: team, name: TEAMS[team].districtName, totalPoints,
    lots: Array.from({ length: count }, (_, i) => {
      const points = Math.max(0, Math.min(600, totalPoints - i * 600));
      return { id: `${team}-${i}`, tier: LOT_THRESHOLDS.filter(t => points >= t).length as LotTier,
        points, x: i % 4, y: Math.floor(i / 4), kind: kinds[i % kinds.length] };
    }),
  };
}
export function projectDistricts(events: Pick<PointEvent, "teamRouteId" | "amount">[]): District[] {
  return TEAM_ROUTE_IDS.map(team => districtFor(team, events.filter(e => e.teamRouteId === team).reduce((sum, e) => sum + e.amount, 0)));
}
