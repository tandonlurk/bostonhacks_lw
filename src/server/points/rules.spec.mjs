import { test } from 'node:test';

// Scoring acceptance specification for T05. These TODOs become executable
// assertions against rules.ts once T01 supplies the TypeScript toolchain.
// Contract: docs/CONTRACTS.md section 6. No production code in this prep PR.
const required = [
  'one verified stop awards exactly one point to the ridden team',
  'first verified ride of the day adds five points exactly once',
  'first daily ride adds two points per streak day, capped at ten',
  'a second ride on another line does not repeat daily bonuses',
  'a missed day resets the streak to one',
  'UTC midnight starts a new scoring day',
  'a duplicate ref returns zero additional points and tokens',
  'concurrent awards with the same ref create only one ledger event',
  'invalid team, type, empty ref, negative, fractional or nonfinite amount is rejected',
  'ride-derived awards cannot exceed sixty points in a rolling hour',
  'a cap-limited award credits only available points without losing retry idempotency',
  'hourly cap is shared across routes for the same rider',
  'another rider has an independent hourly cap',
  'a hunt clue awards ten points once per rider',
  'unverified clues cannot be completed outside an explicit demo fixture',
  'a landmark awards its configured bonus once per rider, default fifteen',
  'non-ride awards do not consume the ride hourly budget',
  'nine earned points followed by one earn one CitiToken in total',
  'spending tokens does not reset the earned-point token remainder',
  'each lot changes tiers at exactly twenty, sixty, 140, 300 and 600 points',
  'district total equals the sum of its lot points and tiers stay within zero to five',
  'leaderboard aggregates actual awarded points and distinct contributing riders',
  'failed persistence rolls back point, token, rider and district updates together',
];
for (const title of required) test.todo(title);
