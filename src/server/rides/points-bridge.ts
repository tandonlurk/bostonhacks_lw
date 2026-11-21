// The one place the ride engine touches B's scoring code (CONTRACTS.md section 6).
// awardPoints: one call per credited station, type "ride_stop", amount 1. B adds the daily
// first-ride and streak bonuses itself and enforces the hourly cap; a repeated ref awards zero.
export { awardPoints, getRiderStats, registerMemoryRider } from "@/server/points";

import type { AwardPointsInput, AwardPointsResult } from "@/contracts";
import { awardPoints as award } from "@/server/points";

/**
 * #96 bonus awards (co_ride, hotspot_meet, challenge). Until B's rules.ts accepts these types,
 * fall back to "landmark" (also uncapped and amount-driven) so points still land.
 */
export async function awardBonus(input: AwardPointsInput): Promise<AwardPointsResult> {
  try {
    return await award(input);
  } catch (err) {
    if ((err as { code?: string })?.code !== "invalid_award" || input.type === "landmark") throw err;
    return award({ ...input, type: "landmark" });
  }
}
