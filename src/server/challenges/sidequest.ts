// Silver Line side quest (owner: A, #115). Silver is a line, not a team: riding it for a few
// verified minutes in one ride earns a once-a-day bonus for the rider's own team.
import type { PlayableTeamId, SideQuest } from "@/contracts";
import { awardBonus } from "@/server/rides/points-bridge";
import { getCompletions, recordPass, removePass } from "./store";

export const SILVER_QUEST = {
  id: "silver-line",
  title: "Silver Line side quest",
  prompt: "Work the Silver Line into a trip: ride it for 3+ minutes. Points go to your own team.",
  points: 25,
  targetMinutes: 3,
} as const;

/** Quest rounds are UTC days, stored next to photo challenge rounds. */
export const silverRoundId = (now = Date.now()) => `silver-${new Date(now).toISOString().slice(0, 10)}`;

function view(done: boolean, pointsAwarded: number, progressMinutes?: number): SideQuest {
  const { id, title, prompt, points, targetMinutes } = SILVER_QUEST;
  return {
    id,
    title,
    prompt,
    points,
    done,
    pointsAwarded,
    progressMinutes: done ? targetMinutes : Math.min(progressMinutes ?? 0, targetMinutes),
    targetMinutes,
  };
}

/** Today's status for a rider (anonymous riders see it as not done). */
export async function silverQuestStatus(riderId?: string | null, progressMinutes?: number): Promise<SideQuest> {
  if (!riderId) return view(false, 0, progressMinutes);
  const c = (await getCompletions(riderId, silverRoundId())).get(SILVER_QUEST.id);
  return view(Boolean(c), c?.points ?? 0, progressMinutes);
}

/**
 * Called while a rider is on a Silver Line vehicle. Completes the quest once they have ridden
 * `targetMinutes` verified minutes on this ride. Returns the quest view and points newly awarded.
 */
export async function progressSilverQuest(
  riderId: string,
  homeTeam: PlayableTeamId,
  minutesOnSilver: number,
): Promise<{ quest: SideQuest; awarded: number }> {
  const roundId = silverRoundId();
  const existing = (await getCompletions(riderId, roundId)).get(SILVER_QUEST.id);
  if (existing) return { quest: view(true, existing.points), awarded: 0 };
  if (minutesOnSilver < SILVER_QUEST.targetMinutes) return { quest: view(false, 0, minutesOnSilver), awarded: 0 };

  const completion = { challengeId: SILVER_QUEST.id, score: 1, points: SILVER_QUEST.points };
  if (!(await recordPass(riderId, roundId, completion))) {
    return { quest: view(true, SILVER_QUEST.points), awarded: 0 }; // lost a race with another sample
  }
  try {
    const res = await awardBonus({
      riderId,
      teamRouteId: homeTeam,
      type: "challenge",
      amount: SILVER_QUEST.points,
      ref: `silver:${riderId}:${roundId.slice("silver-".length)}`,
    });
    return { quest: view(true, res.pointsAwarded), awarded: res.pointsAwarded };
  } catch (err) {
    console.error("[sidequest] award failed; will retry", String(err));
    await removePass(riderId, roundId, SILVER_QUEST.id).catch(() => {});
    return { quest: view(false, 0, minutesOnSilver), awarded: 0 };
  }
}
