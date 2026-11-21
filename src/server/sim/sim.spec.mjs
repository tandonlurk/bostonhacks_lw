import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require } from '../../../scripts/sim/register-ts.mjs';
const { simulationControl, advanceSimulation, TICK_MS } = require('@/server/sim/index.ts');
const { awardPoints, registerMemoryRider, leaderboard, getRiderStats } = require('@/server/points/index.ts');
const { memoryGame } = require('@/server/points/state.ts');

test('start is idempotent, polls advance each tick once, stop freezes, reset preserves human awards', async t => {
  const state = memoryGame(); state.events.length=0; state.tokens.length=0; state.riders.clear();
  registerMemoryRider({riderId:'human',displayName:'Real rider',homeTeamRouteId:'Green'});
  await awardPoints({riderId:'human',teamRouteId:'Green',type:'landmark',amount:15,ref:'human:landmark'});
  const start = Date.now();
  t.mock.method(Date,'now',()=>start);
  assert.deepEqual(await simulationControl('start'),{running:true,riders:25});
  assert.equal((await leaderboard()).teams.find(t=>t.teamRouteId==='Red').points,40);
  assert.deepEqual(await simulationControl('start'),{running:true,riders:25});
  assert.equal((await leaderboard()).teams.find(t=>t.teamRouteId==='Red').points,40);
  Date.now.mock.mockImplementation(()=>start+TICK_MS+1);
  await Promise.all([advanceSimulation(),advanceSimulation()]);
  assert.equal((await leaderboard()).teams.find(t=>t.teamRouteId==='Red').points,45);
  await simulationControl('stop');
  Date.now.mock.mockImplementation(()=>start+TICK_MS*10);
  await advanceSimulation();
  assert.equal((await leaderboard()).teams.find(t=>t.teamRouteId==='Red').points,45);
  assert.deepEqual(await simulationControl('reset'),{running:false,riders:0});
  assert.deepEqual(await getRiderStats('human'),{points:15,tokens:1,streakDays:0});
  assert.equal((await leaderboard()).teams.find(t=>t.teamRouteId==='Red').points,0);
  await assert.rejects(simulationControl('invalid'),/Choose start/);
});

test('Postgres concurrent starts and reset retain human ledger', {skip:!process.env.TCITY_TEST_DATABASE_URL}, async () => {
  process.env.DATABASE_URL=process.env.TCITY_TEST_DATABASE_URL;
  const {getSql}=require('@/server/db.ts');const sql=getSql();
  try {
    await simulationControl('reset');
    await sql`insert into riders (id,display_name,home_team_route_id) values ('sim_test_human','Human','Green') on conflict do nothing`;
    await awardPoints({riderId:'sim_test_human',teamRouteId:'Green',type:'landmark',amount:15,ref:'sim_test_human:landmark'});
    await Promise.all([simulationControl('start'),simulationControl('start')]);
    const [row]=await sql`select sum(amount)::int as points from point_events where rider_id='rdr_sim_red_0'`;
    assert.equal(row.points,8);
    await simulationControl('reset');
    assert.equal((await getRiderStats('sim_test_human')).points,15);
    const [count]=await sql`select count(*)::int as count from point_events where rider_id like 'rdr_sim_%'`;
    assert.equal(count.count,0);
  } finally {await sql`delete from riders where id='sim_test_human'`;await sql.end();delete process.env.DATABASE_URL;}
});
