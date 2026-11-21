import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require } from '../../../scripts/sim/register-ts.mjs';
const { huntFor, completeClue } = require('@/server/hunts/index.ts');
const { simulationControl } = require('@/server/sim/index.ts');
const { registerMemoryRider, getRiderStats } = require('@/server/points/index.ts');

test('physical drafts stay hidden/rejected; virtual quests require explicit demo and award once per rider', async () => {
  await simulationControl('reset');
  assert.deepEqual((await huntFor('place-bucen')).clues, []);
  await assert.rejects(completeClue('r1','bucen-name'),error=>error.code==='clue_unverified');
  await assert.rejects(huntFor('unknown'),error=>error.code==='hunt_not_found');
  await simulationControl('start');
  registerMemoryRider({riderId:'r1',displayName:'One',homeTeamRouteId:'Red'});
  registerMemoryRider({riderId:'r2',displayName:'Two',homeTeamRouteId:'Blue'});
  const clues=(await huntFor('place-bucen')).clues;
  assert.equal(clues.length,2);assert.ok(clues.every(c=>c.id.startsWith('demo:')&&!c.verified));
  await assert.rejects(completeClue('r1','bucen-name'),error=>error.code==='clue_unverified');
  const results=await Promise.all(Array.from({length:20},()=>completeClue('r1',clues[0].id)));
  assert.equal(results.filter(r=>!r.alreadyDone).length,1);
  assert.equal((await getRiderStats('r1')).points,10);
  assert.equal((await getRiderStats('r1')).tokens,1);
  assert.equal((await completeClue('r2',clues[0].id)).pointsAwarded,10);
  await simulationControl('stop');
  await assert.rejects(completeClue('r1',clues[1].id),error=>error.code==='demo_not_running');
  await assert.rejects(completeClue('r1','invented'),error=>error.code==='clue_not_found');
  await simulationControl('reset');
});

test('Postgres completion row and award commit together', {skip:!process.env.TCITY_TEST_DATABASE_URL}, async()=>{
  process.env.DATABASE_URL=process.env.TCITY_TEST_DATABASE_URL;
  const {getSql}=require('@/server/db.ts');const sql=getSql();
  try {
    await simulationControl('start');
    await sql`insert into riders (id,display_name,home_team_route_id) values ('hunt_test','Test','Green') on conflict do nothing`;
    const results=await Promise.all(Array.from({length:10},()=>completeClue('hunt_test','demo:place-bucen:station')));
    assert.equal(results.reduce((n,r)=>n+r.pointsAwarded,0),10);
    const [row]=await sql`select count(*)::int as count from hunt_completions where rider_id='hunt_test'`;
    assert.equal(row.count,1);
    assert.equal((await getRiderStats('hunt_test')).tokens,1);
  } finally {await simulationControl('reset');await sql`delete from riders where id='hunt_test'`;await sql.end();delete process.env.DATABASE_URL;}
});
