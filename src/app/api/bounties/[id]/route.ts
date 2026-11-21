import type { BountyActionRequest } from "@/contracts";
import { actOnBounty } from "@/server/bounties";
import { apiError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { ScoringError } from "@/server/points/rules";
export const POST = handle(async (req: Request, context: { params: Promise<{ id: string }> }) => {
  rateLimit(`board:action:${clientIp(req)}`, 60, 60000);
  const body = await readJson<BountyActionRequest>(req);
  const { id } = await context.params;
  try { return json(await actOnBounty(id, body?.riderId, body?.action)); }
  catch (error) { if (error instanceof ScoringError) return apiError(error.status, error.code, error.message); throw error; }
});
