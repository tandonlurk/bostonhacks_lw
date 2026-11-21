import type { CompleteHuntRequest } from "@/contracts";
import { apiError, handle, json, readJson } from "@/server/http";
import { completeClue } from "@/server/hunts";
import { ScoringError } from "@/server/points/rules";
export const POST = handle(async (req: Request) => {
  const body = await readJson<CompleteHuntRequest>(req);
  try { return json(await completeClue(body?.riderId,body?.clueId)); }
  catch (error) { if (error instanceof ScoringError) return apiError(error.status,error.code,error.message); throw error; }
});
