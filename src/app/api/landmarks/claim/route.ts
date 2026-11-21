import type { ClaimLandmarkRequest } from "@/contracts";
import { apiError, handle, json, readJson } from "@/server/http";
import { claimLandmark } from "@/server/landmarks";
import { ScoringError } from "@/server/points/rules";
export const POST = handle(async (req: Request) => {
  const body = await readJson<ClaimLandmarkRequest>(req);
  try { return json(await claimLandmark(body?.riderId,body?.landmarkId,body?.lat,body?.lng)); }
  catch (error) { if (error instanceof ScoringError) return apiError(error.status,error.code,error.message); throw error; }
});
