// The one place the ride engine touches B's scoring code (CONTRACTS.md section 6).
// awardPoints: one call per credited station, type "ride_stop", amount 1. B adds the daily
// first-ride and streak bonuses itself and enforces the hourly cap; a repeated ref awards zero.
export { awardPoints, getRiderStats, registerMemoryRider } from "@/server/points";
