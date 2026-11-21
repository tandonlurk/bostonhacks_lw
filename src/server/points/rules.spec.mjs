import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Run TS server modules with the scaffold's compiler, without adding a test dependency.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(specifier, parent, ...rest) {
  return resolve.call(this, specifier.startsWith('@/') ? path.join(process.cwd(), 'src', specifier.slice(2)) : specifier, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const { planAward, awardResult, streakDays } = require('./rules.ts');
const { awardPoints, registerMemoryRider, leaderboard, districts, getRiderStats } = require('./index.ts');
const { memoryGame } = require('./state.ts');
const { districtFor } = require('../districts/index.ts');
const now = new Date('2026-11-21T19:00:00.000Z');
const input = (ref = 'ride:1', overrides = {}) => ({ riderId: 'r1', teamRouteId: 'Green', type: 'ride_stop', amount: 1, ref, ...overrides });
const add = (events, item, at = now) => { const next = planAward(item, events, at); const result = awardResult(events, next, item.riderId); events.push(...next); return result; };
beforeEach(() => {
  if (!process.env.DATABASE_URL) { const state = memoryGame(); state.events.length = 0; state.tokens.length = 0; state.riders.clear(); }
});

test('first verified stop credits stop, first ride and day-one streak to ridden team', () => {
  const events = [];
  assert.deepEqual(add(events, input()), { pointsAwarded: 8, tokensAwarded: 0 });
  assert.deepEqual(events.map(e => [e.type, e.amount, e.teamRouteId]), [['ride_stop', 1, 'Green'], ['first_ride', 5, 'Green'], ['streak', 2, 'Green']]);
});
test('duplicate ref awards zero; another line does not repeat daily bonuses', () => {
  const events = []; add(events, input());
  assert.deepEqual(add(events, input()), { pointsAwarded: 0, tokensAwarded: 0 });
  assert.equal(add(events, input('ride:2', { teamRouteId: 'Red' })).pointsAwarded, 1);
});
test('daily streak grows, caps at ten, and resets after missed day', () => {
  const events = [];
  for (let day = 1; day <= 7; day++) {
    const date = new Date(`2026-11-${String(day).padStart(2, '0')}T19:00:00Z`);
    const result = add(events, input(`ride:${day}`), date);
    assert.equal(result.pointsAwarded, 6 + Math.min(2 * day, 10));
  }
  assert.equal(add(events, input('after-gap'), new Date('2026-11-09T19:00:00Z')).pointsAwarded, 8);
});
test('UTC midnight starts a new day and streak expires after a missed full day', () => {
  const events = []; add(events, input(), new Date('2026-11-20T23:59:00Z'));
  assert.equal(add(events, input('next'), new Date('2026-11-21T00:01:00Z')).pointsAwarded, 10);
  assert.equal(streakDays(events, new Date('2026-11-22T12:00:00Z')), 2);
  assert.equal(streakDays(events, new Date('2026-11-23T00:00:00Z')), 0);
});
test('reject invalid teams, types, identities, refs and amounts', () => {
  for (const override of [{ teamRouteId: 'Green-B' }, { type: 'fake' }, { ref: '' }, { riderId: '' }, ...[-1, 0, 0.5, Infinity, NaN, 10001].map(amount => ({ amount }))]) {
    assert.throws(() => planAward(input('x', override), [], now), /Provide a rider/);
  }
});
test('rolling cap is per rider across lines; cap-blocked refs cannot earn on retry', () => {
  const events = [];
  assert.equal(add(events, input('bulk', { amount: 59 })).pointsAwarded, 60);
  assert.equal(add(events, input('over', { teamRouteId: 'Red' })).pointsAwarded, 0);
  assert.equal(add(events, input('other', { riderId: 'r2' })).pointsAwarded, 8);
  assert.equal(add(events, input('over'), new Date(now.getTime() + 3600001)).pointsAwarded, 0);
  assert.equal(add(events, input('fresh'), new Date(now.getTime() + 3600000)).pointsAwarded, 1);
});
test('hunt points and configured landmark amounts are independent of ride cap', () => {
  const events = []; add(events, input('cap', { amount: 60 }));
  assert.deepEqual(add(events, input('hunt', { type: 'hunt', amount: 999 })), { pointsAwarded: 10, tokensAwarded: 1 });
  assert.equal(add(events, input('landmark', { type: 'landmark', amount: 15 })).pointsAwarded, 15);
});
test('token accrual carries point remainder between awards and across spent tokens', async () => {
  const events = [];
  assert.equal(add(events, input('nine', { type: 'landmark', amount: 9 })).tokensAwarded, 0);
  assert.equal(add(events, input('one', { type: 'landmark', amount: 1 })).tokensAwarded, 1);
  if (process.env.DATABASE_URL) return;
  registerMemoryRider({ riderId: 'r1', displayName: 'One', homeTeamRouteId: 'Red' });
  await awardPoints(input('twenty', { type: 'landmark', amount: 20 }));
  memoryGame().tokens.push({ riderId: 'r1', delta: -2, reason: 'redeem', ref: 'redeem:1', createdAt: now.toISOString() });
  assert.equal((await awardPoints(input('ten', { type: 'landmark', amount: 10 }))).tokensAwarded, 1);
  assert.equal((await getRiderStats('r1')).tokens, 1);
});
test('lot thresholds exact, point totals conserved beyond twelve full lots', () => {
  for (const [points, tier] of [[0,0],[19,0],[20,1],[59,1],[60,2],[139,2],[140,3],[299,3],[300,4],[599,4],[600,5]]) {
    assert.equal(districtFor('Green', points).lots[0].tier, tier);
  }
  for (const points of [0, 1, 600, 7219, 10000]) {
    const district = districtFor('Green', points);
    assert.equal(district.lots.reduce((sum, l) => sum + l.points, 0), points);
    assert.ok(district.lots.every(l => l.tier >= 0 && l.tier <= 5));
  }
});
test('concurrent memory retry gives one award; projections count distinct riders', async () => {
  if (process.env.DATABASE_URL) return;
  registerMemoryRider({ riderId: 'r1', displayName: 'One', homeTeamRouteId: 'Red' });
  registerMemoryRider({ riderId: 'r2', displayName: 'Two', homeTeamRouteId: 'Blue' });
  const results = await Promise.all(Array.from({ length: 20 }, () => awardPoints(input())));
  assert.equal(results.reduce((sum, r) => sum + r.pointsAwarded, 0), 8);
  await awardPoints(input('r2-ride', { riderId: 'r2' }));
  const green = (await leaderboard()).teams.find(t => t.teamRouteId === 'Green');
  assert.deepEqual(green, { teamRouteId: 'Green', points: 16, rank: 1, riders: 2 });
  assert.equal((await districts()).find(d => d.teamRouteId === 'Green').totalPoints, 16);
  await assert.rejects(awardPoints(input('unknown', { riderId: 'missing' })), /Create a rider/);
});

test('Postgres awards are atomic under concurrent retries and persistence failure', { skip: !process.env.TCITY_TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TCITY_TEST_DATABASE_URL;
  const { getSql } = require('../db.ts');
  const sql = getSql();
  const id = `test_${Date.now()}`;
  try {
    await sql`insert into riders (id,display_name,home_team_route_id) values (${id},'Scoring test','Green')`;
    const results = await Promise.all(Array.from({ length: 20 }, () => awardPoints(input(`${id}:ride`, { riderId: id }))));
    assert.equal(results.reduce((sum, result) => sum + result.pointsAwarded, 0), 8);
    await awardPoints(input(`${id}:landmark`, { riderId: id, type: 'landmark', amount: 15 }));
    assert.deepEqual(await getRiderStats(id), { points: 23, tokens: 2, streakDays: 1 });
    const rows = await sql`select sum(points)::int as total from district_lots where team_route_id='Green'`;
    const totals = await sql`select sum(amount)::int as total from point_events where team_route_id='Green'`;
    assert.equal(rows[0].total, totals[0].total);
    await sql.unsafe(`create or replace function tcity_test_token_failure() returns trigger language plpgsql as $$ begin if NEW.ref = 'points:rollback-test' then raise exception 'injected persistence failure'; end if; return NEW; end $$`);
    await sql.unsafe('create trigger tcity_test_token_failure before insert on token_ledger for each row execute function tcity_test_token_failure()');
    await assert.rejects(awardPoints(input('rollback-test', { riderId: id, type: 'landmark', amount: 10 })), /injected persistence failure/);
    const failed = await sql`select count(*)::int as count from point_events where ref='rollback-test'`;
    assert.equal(failed[0].count, 0);
    assert.equal((await getRiderStats(id)).points, 23);
  } finally {
    await sql.unsafe('drop trigger if exists tcity_test_token_failure on token_ledger');
    await sql.unsafe('drop function if exists tcity_test_token_failure()');
    await sql`delete from riders where id=${id}`;
    await sql.end();
    delete process.env.DATABASE_URL;
  }
});

test('crew, hotspot and graded challenge points preserve amounts outside the ride cap', () => {
  const events = [];
  add(events, input('cap:ride', { amount: 60 }));
  for (const [type,amount] of [['co_ride',2],['hotspot_meet',50],['challenge',15]]) {
    assert.equal(add(events,input(`social:${type}`,{type,amount})).pointsAwarded,amount);
    assert.equal(add(events,input(`social:${type}`,{type,amount})).pointsAwarded,0);
  }
});
