// The one place the ride engine touches B's scoring code (CONTRACTS.md section 6).
// TODO(A): once B exports `awardPoints` and `getRiderStats` from "@/server/points",
// replace the placeholder bodies below with re-exports.
import type { AwardPointsInput, AwardPointsResult } from "@/contracts";
import { riderStopTotals } from "./store";

export interface RiderStats {
  points: number;
  tokens: number;
  streakDays: number;
}

/** Placeholder until B's ledger lands: 1 point per stop, not persisted beyond the session row. */
export async function awardPoints(input: AwardPointsInput): Promise<AwardPointsResult> {
  return { pointsAwarded: input.amount, tokensAwarded: 0 };
}

export async function getRiderStats(riderId: string): Promise<RiderStats> {
  const { points } = await riderStopTotals(riderId);
  return { points, tokens: Math.floor(points / 10), streakDays: 0 };
}
