// Challenge submissions (owner: A, T26). Postgres `challenge_submissions` when DATABASE_URL is set,
// else in-memory. Only passed grades are stored; failed grades can be retried.
import { getSql, hasDb } from "@/server/db";

export interface Completion {
  challengeId: string;
  score: number;
  points: number;
}

const g = globalThis as unknown as { __tcityChallengeMem?: Map<string, Map<string, Completion>> };
const mem = () => (g.__tcityChallengeMem ??= new Map());
const memKey = (riderId: string, roundId: string) => `${riderId}|${roundId}`;

/** This rider's completed challenges in a round, by challenge id. */
export async function getCompletions(riderId: string, roundId: string): Promise<Map<string, Completion>> {
  if (hasDb()) {
    const rows = await getSql()<{ challenge_id: string; score: number | null; points: number }[]>`
      select challenge_id, score, points from challenge_submissions
      where rider_id = ${riderId} and round_id = ${roundId} and passed`;
    return new Map(rows.map((r) => [r.challenge_id, { challengeId: r.challenge_id, score: r.score ?? 0, points: r.points }]));
  }
  return new Map(mem().get(memKey(riderId, roundId)) ?? []);
}

/** Record a pass. Returns false if this challenge was already completed in this round (race). */
export async function recordPass(riderId: string, roundId: string, c: Completion): Promise<boolean> {
  if (hasDb()) {
    const rows = await getSql()`
      insert into challenge_submissions (rider_id, round_id, challenge_id, passed, score, points)
      values (${riderId}, ${roundId}, ${c.challengeId}, true, ${c.score}, ${c.points})
      on conflict (rider_id, round_id, challenge_id) do nothing
      returning challenge_id`;
    return rows.length > 0;
  }
  const key = memKey(riderId, roundId);
  const done = mem().get(key) ?? new Map<string, Completion>();
  if (done.has(c.challengeId)) return false;
  done.set(c.challengeId, c);
  mem().set(key, done);
  return true;
}

/** Undo a recorded pass (used when awarding the points failed, so the rider can retry). */
export async function removePass(riderId: string, roundId: string, challengeId: string): Promise<void> {
  if (hasDb()) {
    await getSql()`
      delete from challenge_submissions
      where rider_id = ${riderId} and round_id = ${roundId} and challenge_id = ${challengeId}`;
    return;
  }
  mem().get(memKey(riderId, roundId))?.delete(challengeId);
}
