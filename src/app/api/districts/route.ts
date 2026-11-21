// STUB (T01): returns fixtures until the owner replaces it.
// Owner: B (T05). Contract: docs/CONTRACTS.md.
import { districtsFixture } from "@/contracts/fixtures";
import { handle, json } from "@/server/http";

export const GET = handle(async () => json(districtsFixture));
