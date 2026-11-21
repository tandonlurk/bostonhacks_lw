// STUB (T01): returns fixtures until the owner replaces it.
// Owner: A (T02). Contract: docs/CONTRACTS.md.
import { routesFixture } from "@/contracts/fixtures";
import { handle, json } from "@/server/http";

export const GET = handle(async () => json(routesFixture));
