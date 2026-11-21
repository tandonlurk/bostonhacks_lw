// Usage: node scripts/sim/smoke.mjs http://localhost:3002 --reset
// Writes demo data. --reset clears simulated awards; real rider awards remain.
// Creates one QA rider to verify the real join/points/wallet integration.
import assert from 'node:assert/strict';
const base=new URL(process.argv[2]??'http://localhost:3002');
const reset=process.argv.includes('--reset');
const admin=process.env.ADMIN_TOKEN?{'x-admin-token':process.env.ADMIN_TOKEN}:{};
async function request(path,body){
 const response=await fetch(new URL(path,base),{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...admin},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok)throw Error(`${path}: ${response.status} ${data.error?.message??'request failed'}`);
 return data;
}
console.log(`Game smoke: ${base.origin}`);
let started=false;
try{
 assert.equal((await request('/api/health')).ok,true);
 if(reset)await request('/api/demo/sim',{action:'reset'});
 const riderId=(await request('/api/riders',{displayName:'QA demo smoke',homeTeamRouteId:'Green'})).riderId;
 const initial=await request('/api/demo/sim',{action:'start'});started=true;assert.equal(initial.running,true);assert.ok(initial.riders>=25);
 const before=await request('/api/districts');
 assert.equal(before.length,5);assert.ok(before.every(d=>d.lots.some(l=>l.tier>=1)));
 await request('/api/delay/simulate',{teamRouteId:'Green',active:true});
 const delay=await request('/api/delay?teamRouteId=Green');assert.equal(delay.active,true);assert.equal(delay.source,'simulated');
 const hunt=await request('/api/hunts?stopId=place-bucen');const virtual=hunt.clues.filter(c=>c.id.startsWith('demo:'));assert.equal(virtual.length,2);
 for(const clue of virtual){
  const input={riderId,clueId:clue.id};assert.equal((await request('/api/hunts/complete',input)).pointsAwarded,10);
  assert.deepEqual(await request('/api/hunts/complete',input),{pointsAwarded:0,tokensAwarded:0,alreadyDone:true});
 }
 const landmark=(await request('/api/landmarks'))[0];
 const claim={riderId,landmarkId:landmark.id,lat:landmark.lat,lng:landmark.lng};
 assert.equal((await request('/api/landmarks/claim',claim)).pointsAwarded,landmark.bonusPoints);
 assert.deepEqual(await request('/api/landmarks/claim',claim),{pointsAwarded:0,alreadyClaimed:true});
 const scoped=await request('/api/landmarks?riderId='+encodeURIComponent(riderId));assert.equal(scoped.find(l=>l.id===landmark.id).claimed,true);
 const wallet=await request('/api/tokens?riderId='+encodeURIComponent(riderId));assert.equal(wallet.balance,3);
 const perks=await request('/api/perks');const perk=perks.filter(p=>p.remaining>0&&p.costTokens<=wallet.balance).sort((a,b)=>a.costTokens-b.costTokens)[0];assert.ok(perk,'A demo perk must be affordable after two clues and a landmark');
 const redeemed=await request('/api/perks/redeem',{riderId,perkId:perk.id});assert.match(redeemed.redemptionCode,/^TCITY-DEMO-/);assert.equal(redeemed.tokensLeft,wallet.balance-perk.costTokens);
 const afterWallet=await request('/api/tokens?riderId='+encodeURIComponent(riderId));assert.equal(afterWallet.balance,redeemed.tokensLeft);
 assert.equal((await request('/api/perks')).find(p=>p.id===perk.id).remaining,perk.remaining-1);
 const rider=await request('/api/riders/'+encodeURIComponent(riderId));assert.equal(rider.points,35);assert.equal(rider.tokens,afterWallet.balance);
 const teams=(await request('/api/leaderboard')).teams;const districts=await request('/api/districts');
 for(const district of districts){assert.equal(district.totalPoints,teams.find(t=>t.teamRouteId===district.teamRouteId).points);assert.equal(district.totalPoints,district.lots.reduce((sum,l)=>sum+l.points,0));}
 console.log(`PASS: city growth -> simulated delay -> two virtual hunts -> landmark -> ${wallet.balance} tokens -> mock redemption -> matching rider profile`);
 console.log('PASS: duplicate rewards are zero; district/leaderboard/lot totals agree.');
}finally{
 if(started){await request('/api/delay/simulate',{teamRouteId:'Green',active:false});await request('/api/demo/sim',{action:reset?'reset':'stop'});}
}
