import type { StartTriviaRequest } from "@/contracts";
import { apiError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { startTrivia } from "@/server/hunts/trivia";
import { ScoringError } from "@/server/points/rules";
export const POST = handle(async (req: Request) => {
  rateLimit(`trivia-start:${clientIp(req)}`,20,60000);
  const body=await readJson<StartTriviaRequest>(req);
  try { return json(await startTrivia(body?.riderId,body?.stopId)); }
  catch(e) { if(e instanceof ScoringError) return apiError(e.status,e.code,e.message); throw e; }
});
