import { handle, json } from "@/server/http";
import { leaderboard } from "@/server/points";
import { advanceSimulation } from "@/server/sim";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await advanceSimulation();
  return json(await leaderboard(), { headers: { "Cache-Control": "no-store" } });
});
