import { handle, json } from "@/server/http";
import { isSimulationRunning } from "@/server/sim";
export const GET=handle(async()=>json({running:await isSimulationRunning()},{headers:{"Cache-Control":"no-store"}}));
