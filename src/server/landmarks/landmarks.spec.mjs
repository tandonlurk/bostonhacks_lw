import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require } from '../../../scripts/sim/register-ts.mjs';
const { landmarksNear, claimLandmark }=require('@/server/landmarks/index.ts');
const {registerMemoryRider,getRiderStats}=require('@/server/points/index.ts');

test('nearby filter and geofence reject bad data; claim awards once and scopes claimed to rider',async()=>{
 registerMemoryRider({riderId:'landmark_r1',displayName:'One',homeTeamRouteId:'Green'});
 const all=await landmarksNear();assert.equal(all.length,18);
 const place=all.find(l=>l.id==='boston-public-library');
 const nearby=await landmarksNear({lat:place.lat,lng:place.lng,radiusM:1});assert.equal(nearby.length,1);
 for(const options of [{lat:NaN,lng:0},{lat:91,lng:0},{lat:1},{radiusM:0},{radiusM:Infinity}]) await assert.rejects(landmarksNear(options));
 await assert.rejects(claimLandmark('landmark_r1',place.id,0,0),e=>e.code==='outside_geofence');
 await assert.rejects(claimLandmark('landmark_r1',place.id,NaN,0),e=>e.code==='invalid_location');
 const results=await Promise.all(Array.from({length:20},()=>claimLandmark('landmark_r1',place.id,place.lat,place.lng)));
 assert.equal(results.reduce((sum,r)=>sum+r.pointsAwarded,0),15);
 assert.equal(results.filter(r=>!r.alreadyClaimed).length,1);
 assert.equal((await getRiderStats('landmark_r1')).tokens,1);
 assert.equal((await landmarksNear({riderId:'landmark_r1'})).find(l=>l.id===place.id).claimed,true);
 assert.equal((await landmarksNear({riderId:'another'})).find(l=>l.id===place.id).claimed,false);
});
test('Postgres claim row and point award remain unique under concurrent retries',{skip:!process.env.TCITY_TEST_DATABASE_URL},async()=>{
 process.env.DATABASE_URL=process.env.TCITY_TEST_DATABASE_URL;const {getSql}=require('@/server/db.ts');const sql=getSql();
 try{
  await sql`insert into riders (id,display_name,home_team_route_id) values ('landmark_test','Test','Green')`;
  const place=(await landmarksNear())[0];
  const results=await Promise.all(Array.from({length:10},()=>claimLandmark('landmark_test',place.id,place.lat,place.lng)));
  assert.equal(results.reduce((sum,r)=>sum+r.pointsAwarded,0),15);
  const [row]=await sql`select count(*)::int as count from landmark_claims where rider_id='landmark_test'`;assert.equal(row.count,1);
 }finally{await sql`delete from riders where id='landmark_test'`;await sql.end();delete process.env.DATABASE_URL;}
});
