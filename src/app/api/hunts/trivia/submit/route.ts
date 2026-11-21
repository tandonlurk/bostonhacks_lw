import type { SubmitTriviaRequest } from "@/contracts";
import { apiError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { submitTrivia } from "@/server/hunts/trivia";
import { ScoringError } from "@/server/points/rules";
export const POST = handle(async (req: Request) => {
  rateLimit(`trivia-submit:${clientIp(req)}`,30,60000);
  const body=await readJson<SubmitTriviaRequest>(req);
  try { return json(await submitTrivia(body?.riderId,body?.roundId,body?.answers)); }
  catch(e) { if(e instanceof ScoringError) return apiError(e.status,e.code,e.message); throw e; }
});
