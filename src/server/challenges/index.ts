// Delay photo challenges service (owner: A, T26). Solo scavenger hunt, open only while a delay is
// active (GET /api/delay, all lines). Gemini grades each photo 0-1; a pass awards round(points x score).
import type { ChallengeSubmitResponse, ChallengesResponse, PhotoCheckRequest } from "@/contracts";
import { getDelay } from "@/server/delay";
import { HttpError } from "@/server/http";
import { awardBonus } from "@/server/rides/points-bridge";
import { getRider, type RiderRow } from "@/server/rides/store";
import { isSimulationRunning } from "@/server/sim";
import { gradeChallenge, type ChallengeGrade } from "@/server/vision/gemini";
import { demoGrade, gradingTaskFor, pickChallenges, pointsFor, promptFor, roundIdFor } from "./catalog";
import { silverQuestStatus } from "./sidequest";
import { getCompletions, recordPass, removePass } from "./store";

async function requireRider(riderId: string): Promise<RiderRow> {
  const rider = await getRider(riderId);
  if (!rider) throw new HttpError(404, "rider_not_found", "Rider not found. Join again.");
  return rider;
}

export async function getChallenges(riderId?: string): Promise<ChallengesResponse> {
  const rider = riderId ? await requireRider(riderId) : null;
  const delay = await getDelay();
  const roundId = roundIdFor(delay);
  const sideQuests = [await silverQuestStatus(rider?.id)];
  if (!roundId) return { active: false, delay, roundId: null, challenges: [], sideQuests };
  const done = rider ? await getCompletions(rider.id, roundId) : new Map();
  return {
    active: true,
    delay,
    roundId,
    challenges: pickChallenges(roundId).map((c) => ({
      id: c.id,
      prompt: promptFor(c, rider?.homeTeamRouteId),
      points: c.points,
      done: done.has(c.id),
      pointsAwarded: done.get(c.id)?.points ?? 0,
    })),
    sideQuests,
  };
}

export interface SubmitInput {
  riderId: string;
  challengeId: string;
  imageBase64: string;
  mimeType: PhotoCheckRequest["mimeType"];
}

export async function submitChallenge(input: SubmitInput): Promise<ChallengeSubmitResponse> {
  const rider = await requireRider(input.riderId);
  const roundId = roundIdFor(await getDelay());
  if (!roundId) throw new HttpError(409, "no_delay", "Photo challenges open only while a line is delayed.");
  const challenge = pickChallenges(roundId).find((c) => c.id === input.challengeId);
  if (!challenge) throw new HttpError(404, "challenge_not_found", "That challenge isn't part of this delay. Refresh the list.");

  const prior = (await getCompletions(rider.id, roundId)).get(challenge.id);
  if (prior)
    return { enabled: true, passed: true, score: prior.score, reason: "You already completed this one.", pointsAwarded: 0, alreadyDone: true };

  let grade: ChallengeGrade & { demo?: boolean } = await gradeChallenge(
    gradingTaskFor(challenge, rider.homeTeamRouteId),
    input.imageBase64,
    input.mimeType,
  );
  // No key or Gemini down: the demo simulator gets a clearly labeled offline grade, otherwise nothing is awarded.
  if (!grade.enabled && (await isSimulationRunning())) grade = demoGrade();
  const base = grade.demo ? { demo: true } : {};
  if (!grade.enabled || !grade.passed)
    return { ...base, enabled: grade.enabled, passed: grade.passed, score: grade.score, reason: grade.reason, pointsAwarded: 0, alreadyDone: false };

  const amount = pointsFor(challenge.points, grade.score, grade.passed);
  const score = grade.score ?? 0;
  // Claim first so concurrent passes can't both count; roll back if the award fails so the rider can retry.
  if (!(await recordPass(rider.id, roundId, { challengeId: challenge.id, score, points: amount })))
    return { ...base, enabled: true, passed: true, score, reason: "You already completed this one.", pointsAwarded: 0, alreadyDone: true };
  try {
    await awardBonus({
      riderId: rider.id,
      teamRouteId: rider.homeTeamRouteId,
      type: "challenge",
      amount,
      ref: `challenge:${rider.id}:${roundId}:${challenge.id}`,
    });
  } catch (err) {
    await removePass(rider.id, roundId, challenge.id).catch(() => {});
    throw err;
  }
  return { ...base, enabled: true, passed: true, score, reason: grade.reason, pointsAwarded: amount, alreadyDone: false };
}
