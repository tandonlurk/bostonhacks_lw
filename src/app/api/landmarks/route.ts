// STUB (T01): returns fixtures until the owner replaces it.
// Owner: B (T11). Contract: docs/CONTRACTS.md.
import { landmarksFixture } from "@/contracts/fixtures";
import { handle, json } from "@/server/http";

export const GET = handle(async () => json(landmarksFixture));
