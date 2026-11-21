import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require } from '../../../../scripts/sim/register-ts.mjs';

// Test processes never inherit an application's production database connection.
delete process.env.DATABASE_URL;
const { startTrivia, submitTrivia, knownGameStations } = require('@/server/hunts/trivia/index.ts');
const { question } = require('@/server/hunts/trivia/catalog.ts');
const { registerMemoryRider, getRiderStats } = require('@/server/points/index.ts');
const { memoryGame } = require('@/server/points/state.ts');
const { setSimulatedDelay } = require('@/server/delay/index.ts');
const alerts = require('@/server/mbta/alerts.ts');
const GREEN = 'place-bucen';
const BLUE = 'place-aqucl';
const answersFor = (round, correct = 3) => round.questions.map((q, i) => i < correct ? question(q.id).answer : null);
const hasCode = code => error => error.code === code;

function setup(t) {
  t.mock.method(alerts, 'getAlerts', async () => []); // no real trains or Wi-Fi required
  const state = memoryGame();
  state.riders.clear(); state.events.length = 0; state.tokens.length = 0;
  globalThis.__tcityTrivia?.clear();
  globalThis.__tcityDelayMem?.clear();
  for (const riderId of ['trivia_one', 'trivia_two']) registerMemoryRider({ riderId, displayName: riderId, homeTeamRouteId: 'Red' });
}

test('server chooses questions and grades choices, never trusting client scores or award amounts', async t => {
  setup(t); await setSimulatedDelay('Green', true);
  const round = await startTrivia('trivia_one', GREEN);
  assert.equal(round.questions.length, 3);
  assert.equal(new Set(round.questions.map(q => q.id)).size, 3);
  assert.equal(round.rewardAvailable, true);
  assert.equal(round.maxPoints, 15);
  assert.ok(round.questions.every(q => !('answer' in q) && q.options.includes(question(q.id).answer)));
  const result = await submitTrivia('trivia_one', round.roundId, answersFor(round, 1), { score: 3, pointsAwarded: 999, amount: 999 });
  assert.equal(result.correct, 1); assert.equal(result.pointsAwarded, 5); assert.equal(result.tokensAwarded, 0);
  assert.equal((await getRiderStats('trivia_one')).points, 5);
  assert.deepEqual(result.correctAnswers, round.questions.map(q => question(q.id).answer));
});

test('invalid answer shapes and invented choices reject without consuming the round or points', async t => {
  setup(t); await setSimulatedDelay('Green', true);
  const round = await startTrivia('trivia_one', GREEN);
  for (const answers of [{ score: 3 }, [], [null], [null, null, null, null], [999, null, null], ['invented choice', null, null]]) {
    await assert.rejects(submitTrivia('trivia_one', round.roundId, answers), hasCode('invalid_answers'));
  }
  assert.equal((await getRiderStats('trivia_one')).points, 0);
  assert.equal((await submitTrivia('trivia_one', round.roundId, answersFor(round))).pointsAwarded, 15);
});

test('concurrent same-round submissions grant exactly one reward and preserve the stored score on retries', async t => {
  setup(t); await setSimulatedDelay('Green', true);
  const round = await startTrivia('trivia_one', GREEN);
  const results = await Promise.all(Array.from({ length: 30 }, () => submitTrivia('trivia_one', round.roundId, answersFor(round))));
  assert.equal(results.reduce((sum, result) => sum + result.pointsAwarded, 0), 15);
  assert.equal(results.reduce((sum, result) => sum + result.tokensAwarded, 0), 1);
  assert.equal(results.filter(result => result.alreadyDone).length, 29);
  assert.ok(results.every(result => result.correct === 3));
  const replay = await submitTrivia('trivia_one', round.roundId, [null, null, null]);
  assert.equal(replay.correct, 3); assert.equal(replay.pointsAwarded, 0); assert.equal(replay.tokensAwarded, 0); assert.equal(replay.alreadyDone, true);
  assert.equal((await getRiderStats('trivia_one')).points, 15);
});

test('different rounds at the same station share one daily reward allowance, including concurrent submits', async t => {
  setup(t); await setSimulatedDelay('Green', true);
  const rounds = await Promise.all(Array.from({ length: 12 }, () => startTrivia('trivia_one', GREEN)));
  const results = await Promise.all(rounds.map(round => submitTrivia('trivia_one', round.roundId, answersFor(round))));
  assert.equal(results.reduce((sum, result) => sum + result.pointsAwarded, 0), 15);
  assert.equal(results.filter(result => !result.alreadyDone).length, 1);
  assert.equal((await startTrivia('trivia_one', GREEN)).rewardAvailable, false);
  const otherRider = await startTrivia('trivia_two', GREEN);
  assert.equal(otherRider.rewardAvailable, true);
  assert.equal((await submitTrivia('trivia_two', otherRider.roundId, answersFor(otherRider))).pointsAwarded, 15);
});

test('a zero-score attempt leaves the daily allowance available for another round', async t => {
  setup(t); await setSimulatedDelay('Green', true);
  const failed = await startTrivia('trivia_one', GREEN);
  const score = await submitTrivia('trivia_one', failed.roundId, [null, null, null]);
  assert.equal(score.correct, 0); assert.equal(score.pointsAwarded, 0);
  const retry = await startTrivia('trivia_one', GREEN);
  assert.equal(retry.rewardAvailable, true);
  assert.equal((await submitTrivia('trivia_one', retry.roundId, answersFor(retry))).pointsAwarded, 15);
});

test('clear stations are practice only, unrelated-line delays do not reward, and a clearing delay stops rewards', async t => {
  setup(t);
  const clear = await startTrivia('trivia_one', GREEN);
  assert.equal(clear.rewardAvailable, false);
  assert.equal((await submitTrivia('trivia_one', clear.roundId, answersFor(clear))).pointsAwarded, 0);
  await setSimulatedDelay('Green', true);
  const blue = await startTrivia('trivia_one', BLUE);
  assert.equal(blue.rewardAvailable, false);
  assert.equal((await submitTrivia('trivia_one', blue.roundId, answersFor(blue))).pointsAwarded, 0);
  const active = await startTrivia('trivia_one', GREEN);
  assert.equal(active.rewardAvailable, true);
  await setSimulatedDelay('Green', false);
  assert.equal((await submitTrivia('trivia_one', active.roundId, answersFor(active))).pointsAwarded, 0);
  await setSimulatedDelay('Green', true);
  const rewarded = await startTrivia('trivia_one', GREEN);
  assert.equal(rewarded.rewardAvailable, true);
  assert.equal((await submitTrivia('trivia_one', rewarded.roundId, answersFor(rewarded))).pointsAwarded, 15);
});

test('a rider cannot submit someone else’s round; unknown stations and expired rounds reject', async t => {
  setup(t); await setSimulatedDelay('Green', true);
  const round = await startTrivia('trivia_one', GREEN);
  await assert.rejects(submitTrivia('trivia_two', round.roundId, answersFor(round)), hasCode('round_not_found'));
  await assert.rejects(startTrivia('missing', GREEN), hasCode('rider_not_found'));
  await assert.rejects(startTrivia('trivia_one', 'invented-station'), hasCode('station_not_found'));
  await assert.rejects(startTrivia('', GREEN), hasCode('invalid_round'));
  await assert.rejects(submitTrivia('trivia_one', '', []), hasCode('invalid_round'));
  await assert.rejects(submitTrivia('trivia_one', 'missing', []), hasCode('round_not_found'));
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(round.expiresAt) });
  await assert.rejects(submitTrivia('trivia_one', round.roundId, answersFor(round)), hasCode('round_expired'));
  assert.equal((await getRiderStats('trivia_one')).points, 0);
});

test('rounds spanning midnight use the reward day, preventing two awards on the same UTC day', async t => {
  setup(t);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-21T23:59:00.000Z') });
  await setSimulatedDelay('Green', true);
  const previousDayRound = await startTrivia('trivia_one', GREEN);
  t.mock.timers.tick(120000);
  assert.equal((await submitTrivia('trivia_one', previousDayRound.roundId, answersFor(previousDayRound))).pointsAwarded, 15);
  const currentDayRound = await startTrivia('trivia_one', GREEN);
  assert.equal(currentDayRound.rewardAvailable, false);
  assert.equal((await submitTrivia('trivia_one', currentDayRound.roundId, answersFor(currentDayRound))).pointsAwarded, 0);
  assert.equal((await getRiderStats('trivia_one')).points, 15);
  t.mock.timers.tick(24 * 60 * 60 * 1000);
  await setSimulatedDelay('Green', true);
  const tomorrow = await startTrivia('trivia_one', GREEN);
  assert.equal(tomorrow.rewardAvailable, true);
  assert.equal((await submitTrivia('trivia_one', tomorrow.roundId, answersFor(tomorrow))).pointsAwarded, 15);
});

test('Silver station trivia is eligible during Silver delays and credits the rider’s existing team', async t => {
  setup(t); await setSimulatedDelay('Silver', true);
  const station = knownGameStations().find(s => s.lines.length === 1 && s.lines[0] === 'Silver');
  assert.ok(station, 'bundled map includes a Silver-only stop');
  const round = await startTrivia('trivia_one', station.stopId);
  assert.equal(round.rewardAvailable, true);
  assert.equal((await submitTrivia('trivia_one', round.roundId, answersFor(round))).pointsAwarded, 15);
  assert.deepEqual(memoryGame().events.map(event => event.teamRouteId), ['Red']);
});

test('Postgres round submissions and points are atomic under a pool-sized concurrency burst', { skip: !process.env.TCITY_TEST_DATABASE_URL, timeout: 30000 }, async t => {
  t.mock.method(alerts, 'getAlerts', async () => []);
  process.env.DATABASE_URL = process.env.TCITY_TEST_DATABASE_URL;
  const { getSql } = require('@/server/db.ts');
  const { awardPointsInTransaction } = require('@/server/points/index.ts');
  const sql = getSql();
  const riderId = `trivia_db_${Date.now()}`;
  try {
    await sql`insert into riders (id,display_name,home_team_route_id) values (${riderId},'Trivia test','Red')`;
    await setSimulatedDelay('Green', true);
    // More concurrent transactions than the five-connection pool catches nested pooled queries
    // while GAME_LOCK is held: the holder must not need a sixth independent connection to finish.
    const rounds = await Promise.all(Array.from({ length: 8 }, () => startTrivia(riderId, GREEN)));
    const results = await Promise.all(rounds.map(round => submitTrivia(riderId, round.roundId, answersFor(round))));
    assert.equal(results.reduce((sum, result) => sum + result.pointsAwarded, 0), 15);
    assert.equal(results.reduce((sum, result) => sum + result.tokensAwarded, 0), 1);
    assert.equal((await getRiderStats(riderId)).points, 15);
    const [stored] = await sql`select count(*)::int as count from trivia_rounds where rider_id=${riderId} and submitted_at is not null`;
    assert.equal(stored.count, rounds.length);
    const [ledger] = await sql`select count(*)::int as count,coalesce(sum(delta),0)::int as tokens from token_ledger where rider_id=${riderId}`;
    assert.equal(ledger.count, 1); assert.equal(ledger.tokens, 1);
    // Calling the new helper inside an existing transaction must participate in rollback,
    // rather than creating and committing an independent award transaction.
    await assert.rejects(sql.begin(async transaction => {
      await awardPointsInTransaction({ riderId, teamRouteId: 'Red', type: 'challenge', amount: 25, ref: `${riderId}:rollback` }, transaction);
      throw new Error('force transaction rollback');
    }), /force transaction rollback/);
    assert.equal((await getRiderStats(riderId)).points, 15);
    const [rolledBack] = await sql`select count(*)::int as count from point_events where ref=${`${riderId}:rollback`}`;
    assert.equal(rolledBack.count, 0);
    assert.equal((await submitTrivia(riderId, rounds[0].roundId, answersFor(rounds[0]))).pointsAwarded, 0);
  } finally {
    await setSimulatedDelay('Green', false);
    await sql`delete from riders where id=${riderId}`;
    await sql.end();
    delete globalThis.__tcitySql;
    delete process.env.DATABASE_URL;
  }
});
