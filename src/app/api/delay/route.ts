// STUB (T01): returns fixtures until the owner replaces it.
// Owner: A (T07). Contract: docs/CONTRACTS.md.
import { noDelayFixture } from "@/contracts/fixtures";
import { handle, json } from "@/server/http";

export const GET = handle(async () => json(noDelayFixture));
