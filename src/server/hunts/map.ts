import type { HuntMapResponse, StationGameInfo } from "@/contracts";
import hunts from "../../../data/hunts.json";
import landmarks from "../../../data/landmarks.json";
import { gameDelay } from "@/server/hunts/game-delay";
import { isSimulationRunning } from "@/server/sim";
import { knownGameStations } from "./trivia";

export async function stationGames(): Promise<HuntMapResponse> {
  const [delay, simulated] = await Promise.all([gameDelay(), isSimulationRunning()]);
  return knownGameStations().map(station => {
    const delayed = delay.active && station.lines.some(t => delay.teamRouteIds.includes(t));
    const games: StationGameInfo[] = [{id:`${station.stopId}:trivia`,kind:"trivia",title:"T trivia blitz",rewardPoints:delayed?15:0,rewardTokens:0}];
    const hunt = hunts.find(h => h.stopId===station.stopId);
    if (hunt && (simulated || hunt.clues.some(c=>c.verified))) games.push({id:`${station.stopId}:clue`,kind:"clue",title:simulated?"Virtual station quest":"Station hunt",rewardPoints:10,rewardTokens:0});
    if (delayed) games.push({id:`${station.stopId}:challenge`,kind:"challenge",title:"Delay photo challenge",rewardPoints:20,rewardTokens:0});
    for (const l of landmarks.filter(l=>l.stopId===station.stopId)) games.push({id:`${station.stopId}:landmark:${l.id}`,kind:"landmark",title:l.name,rewardPoints:l.bonusPoints,rewardTokens:0});
    return {stopId:station.stopId,name:station.name,teamRouteId:station.lines[0],delayed,games};
  });
}
