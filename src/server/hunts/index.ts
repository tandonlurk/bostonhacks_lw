import seeds from "../../../data/hunts.json";
import type { HuntResponse, CompleteHuntResponse, TeamRouteId } from "@/contracts";
import { awardCompletion } from "@/server/points";
import { ScoringError } from "@/server/points/rules";
import { isSimulationRunning } from "@/server/sim";

function demoClues(stopId: string, stationName: string) {
  return [
    { id: `demo:${stopId}:station`, text: `Bonus quest: read “${stationName}” here and tap confirm to practice a station discovery. No physical visit is required.`, verified: false },
    { id: `demo:${stopId}:commute`, text: "Bonus quest: think of a place you would like to explore after your ride, then tap confirm. This is a practice quest.", verified: false },
  ];
}
export async function huntFor(stopId: string): Promise<HuntResponse> {
  const hunt = seeds.find(h => h.stopId === stopId);
  if (!hunt) throw new ScoringError("hunt_not_found", "No hunt is available at this station.", 404);
  const clues = hunt.clues.filter(c => c.verified).map(({id,text,verified}) => ({id,text,verified}));
  if (await isSimulationRunning()) clues.push(...demoClues(stopId, hunt.stationName));
  return { huntId: hunt.huntId, stopId, clues };
}
export async function completeClue(riderId: string, clueId: string): Promise<CompleteHuntResponse> {
  if (typeof riderId !== "string" || !riderId.trim() || typeof clueId !== "string" || !clueId.trim())
    throw new ScoringError("invalid_completion", "riderId and clueId are required.");
  const physical = seeds.find(h => h.clues.some(c => c.id === clueId));
  const virtual = seeds.find(h => demoClues(h.stopId, h.stationName).some(c => c.id === clueId));
  const hunt = physical ?? virtual;
  if (!hunt) throw new ScoringError("clue_not_found", "Unknown hunt clue.", 404);
  if (physical && !physical.clues.find(c => c.id === clueId)?.verified)
    throw new ScoringError("clue_unverified", "This physical clue needs in-person verification before it can be completed.", 403);
  if (virtual && !await isSimulationRunning())
    throw new ScoringError("demo_not_running", "This bonus quest isn't available right now.", 403);
  const result = await awardCompletion({ riderId, teamRouteId: hunt.teamRouteId as TeamRouteId, type: "hunt", amount: 10,
    ref: `hunt:${riderId}:${clueId}` }, "hunt", clueId);
  return { ...result, alreadyDone: result.pointsAwarded === 0 };
}
