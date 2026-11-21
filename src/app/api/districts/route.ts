import { handle, json } from "@/server/http";
import { districts } from "@/server/points";
import { advanceSimulation } from "@/server/sim";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await advanceSimulation();
  return json(await districts(), { headers: { "Cache-Control": "no-store" } });
});
