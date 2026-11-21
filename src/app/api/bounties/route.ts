import type { CreateBountyRequest } from "@/contracts";
import { listBounties, createBounty } from "@/server/bounties";
import { apiError, clientIp, handle, json, rateLimit, readJson } from "@/server/http";
import { ScoringError } from "@/server/points/rules";
export const GET = handle(async (req: Request) => {
  rateLimit(`board:read:${clientIp(req)}`, 120, 60000);
  return json(await listBounties(), { headers: { "Cache-Control": "no-store" } });
});
export const POST = handle(async (req: Request) => {
  rateLimit(`board:create:${clientIp(req)}`, 20, 60000);
  const body = await readJson<CreateBountyRequest>(req);
  try { return json(await createBounty(body)); }
  catch (error) { if (error instanceof ScoringError) return apiError(error.status, error.code, error.message); throw error; }
});
