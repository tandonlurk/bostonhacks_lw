// STUB (T01): returns fixtures until the owner replaces it.
// Owner: B (T09). Contract: docs/CONTRACTS.md.
import { completeHuntFixture } from "@/contracts/fixtures";
import { handle, json, readJson } from "@/server/http";

export const POST = handle(async (req: Request) => {
  await readJson(req);
  return json(completeHuntFixture);
});
