import { getDelay } from "@/server/delay";
/** Silver remains a line after leaving the team leaderboard. Include it in game eligibility. */
export async function gameDelay() {
  const [teams,silver] = await Promise.all([getDelay(),getDelay("Silver")]);
  return { ...teams, active: teams.active || silver.active, teamRouteIds: [...new Set([...teams.teamRouteIds,...silver.teamRouteIds])] };
}
