// STUB (T01): returns fixtures until the owner replaces it.
// Owner: A (T04). Contract: docs/CONTRACTS.md.
import { riderFixture } from "@/contracts/fixtures";
import { handle, json } from "@/server/http";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/riders/[id]">) => {
  const { id } = await ctx.params;
  return json({ ...riderFixture, riderId: id });
});
