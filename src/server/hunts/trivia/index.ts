import { randomUUID } from "node:crypto";
import type { SubmitTriviaResponse, TriviaRound, TeamRouteId } from "@/contracts";
import { MBTA_ROUTES, toTeamRouteId } from "@/contracts";
import snapshot from "@/server/mbta/static-stops.json";
import { getSql, hasDb } from "@/server/db";
import { gameDelay } from "@/server/hunts/game-delay";
import { awardPoints, awardPointsInTransaction, GAME_LOCK, pointEvents } from "@/server/points";
import { memoryGame } from "@/server/points/state";
import { ScoringError } from "@/server/points/rules";
import { QUESTIONS, question } from "./catalog";

type Round = { id: string; riderId: string; stopId: string; questionIds: string[]; createdAt: string; expiresAt: string; result?: SubmitTriviaResponse; pending?: Promise<SubmitTriviaResponse> };
const shared = globalThis as unknown as { __tcityTrivia?: Map<string, Round> };
const rounds = () => shared.__tcityTrivia ??= new Map();
const stations = snapshot.stations as Record<string, {name: string; lat: number; lng: number}>;
const stationLines = new Map<string, Set<TeamRouteId>>();
for (const [routeDirection, ids] of Object.entries(snapshot.orders)) {
  const route = routeDirection.split(":")[0];
  if (!MBTA_ROUTES.some(r => r.id === route)) continue;
  const line = toTeamRouteId(route);
  if (!line) continue;
  for (const id of ids) { const lines = stationLines.get(id) ?? new Set(); lines.add(line); stationLines.set(id, lines); }
}
export function knownGameStations() { return [...stationLines].map(([stopId, lines]) => ({stopId, ...stations[stopId], lines: [...lines]})); }
function checkRiderId(riderId: unknown): asserts riderId is string {
  if (typeof riderId !== "string" || !riderId.trim() || riderId.length > 200) throw new ScoringError("invalid_round", "Choose a rider first.");
}
async function homeTeam(riderId: string): Promise<TeamRouteId> {
  if (!hasDb()) { const rider = memoryGame().riders.get(riderId); if (rider) return rider.homeTeamRouteId; }
  else { const [r] = await getSql()`select home_team_route_id from riders where id=${riderId}`; if (r) return r.home_team_route_id; }
  throw new ScoringError("rider_not_found", "Join a line before playing for points.", 404);
}
async function rewarding(stopId: string): Promise<boolean> {
  const delay = await gameDelay();
  return delay.active && delay.teamRouteIds.some(t => stationLines.get(stopId)?.has(t));
}
const rewardRef = (riderId: string, stopId: string, day: string) => `trivia:${riderId}:${stopId}:${day}`;
function shuffle<T>(values: readonly T[]): T[] {
  return values.map(value => ({ value, sort: randomUUID() })).sort((a, b) => a.sort.localeCompare(b.sort)).map(x => x.value);
}
export async function startTrivia(riderId: string, stopId: string): Promise<TriviaRound> {
  checkRiderId(riderId); await homeTeam(riderId);
  if (typeof stopId !== "string" || !stationLines.has(stopId)) throw new ScoringError("station_not_found", "Choose a station on the map.", 404);
  const now = new Date();
  const row: Round = { id: randomUUID(), riderId, stopId, questionIds: shuffle(QUESTIONS).slice(0,3).map(q => q.id), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 600000).toISOString() };
  if (hasDb()) await getSql()`insert into trivia_rounds (id,rider_id,stop_id,question_ids,created_at,expires_at) values (${row.id},${riderId},${stopId},${getSql().json(row.questionIds)},${row.createdAt},${row.expiresAt})`;
  else {
    for (const [id, round] of rounds()) if (Date.parse(round.expiresAt) < Date.now() - 600000) rounds().delete(id);
    rounds().set(row.id, row);
  }
  const ref = rewardRef(riderId, stopId, row.createdAt.slice(0,10));
  const prior = (await pointEvents()).some(e => e.ref === ref);
  return { roundId: row.id, stopId, expiresAt: row.expiresAt, maxPoints: 15, rewardAvailable: !prior && await rewarding(stopId), questions: row.questionIds.map(id => { const q=question(id); return {id,prompt:q.prompt,options:shuffle(q.options)}; }) };
}
function grade(row: Round, answers: unknown): SubmitTriviaResponse {
  if (!Array.isArray(answers) || answers.length !== 3 || answers.some((a,i) => a !== null && (typeof a !== "string" || !question(row.questionIds[i]).options.some(o => o === a)))) throw new ScoringError("invalid_answers", "Send one answer or a timeout for each question.");
  const correctAnswers = row.questionIds.map(id => question(id).answer);
  return { correct: correctAnswers.filter((answer,i) => answers[i] === answer).length, total: 3, pointsAwarded: 0, tokensAwarded: 0, alreadyDone: false, correctAnswers };
}
const replay = (r: SubmitTriviaResponse): SubmitTriviaResponse => ({...r, pointsAwarded:0, tokensAwarded:0, alreadyDone:true});
function validateRound(row: Round | undefined, riderId: string): asserts row is Round {
  if (!row || row.riderId !== riderId) throw new ScoringError("round_not_found", "That round could not be found. Start a new one.", 404);
  if (Date.parse(row.expiresAt) <= Date.now()) throw new ScoringError("round_expired", "This round expired. Start a new one.", 409);
}
export async function submitTrivia(riderId: string, roundId: string, answers: unknown): Promise<SubmitTriviaResponse> {
  checkRiderId(riderId);
  if (typeof roundId !== "string" || !roundId || roundId.length > 200) throw new ScoringError("invalid_round", "Start a round first.");
  const team = await homeTeam(riderId);
  // Resolve pooled reads before GAME_LOCK: concurrent transactions must not exhaust the pool.
  const delay = await gameDelay();
  const eligible = (stopId: string) => delay.active && delay.teamRouteIds.some(t => stationLines.get(stopId)?.has(t));
  const awardDay = new Date().toISOString().slice(0,10);
  if (!hasDb()) {
    const row = rounds().get(roundId); validateRound(row, riderId);
    if (row.result) return replay(row.result);
    if (row.pending) return replay(await row.pending);
    const result = grade(row, answers);
    row.pending = (async () => {
      if (result.correct && eligible(row.stopId)) {
        const ref=rewardRef(riderId,row.stopId,awardDay);
        const before=memoryGame().events.some(e => e.ref===ref);
        const earned=await awardPoints({riderId,teamRouteId:team,type:"challenge",amount:result.correct*5,ref});
        Object.assign(result, earned, {alreadyDone:before});
      }
      row.result=result; return result;
    })();
    try { return await row.pending; } finally { row.pending=undefined; }
  }
  return await getSql().begin(async sql => {
    await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
    const [stored] = await sql`select * from trivia_rounds where id=${roundId} and rider_id=${riderId} for update`;
    const row: Round | undefined = stored ? {id:stored.id,riderId,stopId:stored.stop_id,questionIds:stored.question_ids,createdAt:new Date(stored.created_at).toISOString(),expiresAt:new Date(stored.expires_at).toISOString()} : undefined;
    validateRound(row,riderId);
    if (stored.submitted_at) return { correct:stored.correct,total:3,pointsAwarded:0,tokensAwarded:0,alreadyDone:true,correctAnswers:row.questionIds.map(id=>question(id).answer) };
    const result=grade(row,answers);
    if (result.correct && eligible(row.stopId)) {
      const ref=rewardRef(riderId,row.stopId,awardDay);
      const prior=await sql`select ref from point_events where ref=${ref}`;
      Object.assign(result, await awardPointsInTransaction({riderId,teamRouteId:team,type:"challenge",amount:result.correct*5,ref},sql), {alreadyDone:prior.length>0});
    }
    await sql`update trivia_rounds set submitted_at=now(),answers=${sql.json(answers as (string|null)[])},correct=${result.correct},points_awarded=${result.pointsAwarded},tokens_awarded=${result.tokensAwarded} where id=${roundId}`;
    return result;
  });
}
