// Offline: node scripts/sim/playback.mjs. Real cached MBTA shape; simulated GPS/train.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { require } from './register-ts.mjs';
const { step, emptyState } = require('../../src/server/rides/engine.ts');
const { awardPoints, registerMemoryRider, getRiderStats, districts } = require('../../src/server/points/index.ts');
const { getSql, hasDb } = require('../../src/server/db.ts');
const track = JSON.parse(fs.readFileSync(new URL('../../data/demo-green-b.json', import.meta.url), 'utf8'));
const riderId = `rdr_sim_playback_${randomUUID()}`;
if (hasDb()) await getSql()`insert into riders (id,display_name,home_team_route_id,is_simulated) values (${riderId},'Demo playback','Green',true)`;
else registerMemoryRider({ riderId, displayName: 'Demo playback', homeTeamRouteId: 'Green', isSimulated: true });
const started = Date.now();
let session = { id: `ses_sim_${randomUUID()}`, riderId, status: 'searching', vehicleId: null, routeId: null, teamRouteId: null,
  directionId: null, stopsCredited: 0, pointsAwarded: 0, startedAt: new Date(started).toISOString(), endedAt: null, manual: false, state: emptyState() };
const stationVertices = track.stops.map(stop => track.coordinates.reduce((best, coord, i, coords) =>
  (coord[0]-stop.lat)**2+(coord[1]-stop.lng)**2 < (coords[best][0]-stop.lat)**2+(coords[best][1]-stop.lng)**2 ? i : best, 0));
const stopOrder = track.stops.map(s => s.id);
for (let i = 0; i < track.coordinates.length; i++) {
  const [lat,lng] = track.coordinates[i];
  const now = started + i * 10000;
  let reached = 0;
  stationVertices.forEach((vertex, index) => { if (vertex <= i) reached = index; });
  const stopped = i === stationVertices[reached];
  const stopId = stopOrder[Math.min(stopped ? reached : reached + 1, stopOrder.length - 1)];
  const vehicle = { id:'SIM-GREEN-B',routeId:'Green-B',teamRouteId:'Green',directionId:1,lat,lng,bearing:90,speed:stopped?0:6,
    currentStatus:stopped?'STOPPED_AT':'IN_TRANSIT_TO',stopId,stopSequence:reached+1,label:'Simulated Green B',
    platformStopId:null,tripId:'SIM-TRIP',reportedAt:new Date(now).toISOString() };
  const sample = { lat,lng,accuracy:10,speed:vehicle.speed,t:now };
  const result = step(session,sample,{vehicles:[vehicle],stopOrder:()=>stopOrder,stationCoords:id=>track.stops.find(s=>s.id===id)??null,now});
  session = result.session;
  for (const credit of result.credits) {
    const award = await awardPoints({riderId,teamRouteId:'Green',type:'ride_stop',amount:1,ref:`${session.id}:stop:${credit.stationId}`});
    session.pointsAwarded += award.pointsAwarded;
  }
  console.log(JSON.stringify({simulated:true,lat,lng,state:session.status,stopsCredited:session.stopsCredited,pointsAwarded:session.pointsAwarded,message:result.message}));
}
assert.equal(session.status,'on_vehicle');
assert.ok(session.stopsCredited>=2,'Replay must verify a moving ride and credit at least two stations');
console.log(JSON.stringify({simulated:true,summary:await getRiderStats(riderId),district:(await districts()).find(d=>d.teamRouteId==='Green').totalPoints}));
if (hasDb()) await getSql().end();
