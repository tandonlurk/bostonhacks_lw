import { test } from 'node:test';
import assert from 'node:assert/strict';
import { require } from '../../../scripts/sim/register-ts.mjs';
const {createBounty,actOnBounty,listBounties}=require('@/server/bounties/index.ts');
const {registerMemoryRider,awardPoints}=require('@/server/points/index.ts');
const {tokenWallet}=require('@/server/tokens/index.ts');
const {memoryGame}=require('@/server/points/state.ts');
const request=(riderId,requestId,extra={})=>({riderId,requestId,kind:'bounty',title:'A little Boston detour',body:'Share a place to explore after the ride.',rewardTokens:5,...extra});
async function fund(id,tokens=20){registerMemoryRider({riderId:id,displayName:id,homeTeamRouteId:'Green'});if(tokens)await awardPoints({riderId:id,teamRouteId:'Green',type:'landmark',amount:tokens*10,ref:`${id}:fund`});}
const wallet=async id=>(await tokenWallet(id)).balance;

test('bounty escrow is conserved through retries, claim race, delivery and cancellation',async()=>{
  for(const id of ['board_author','board_one','board_two'])await fund(id);
  const attempts=await Promise.all(Array.from({length:12},()=>createBounty(request('board_author','create-once'))));
  assert.equal(new Set(attempts.map(a=>a.post.id)).size,1);assert.equal(await wallet('board_author'),15);
  const post=attempts[0].post;assert.equal(post.authorName,'board_author');
  await assert.rejects(actOnBounty(post.id,'board_author','claim'),e=>e.code==='self_claim');
  const claims=await Promise.allSettled(['board_one','board_two'].map(id=>actOnBounty(post.id,id,'claim')));
  assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);
  const claimant=claims.find(r=>r.status==='fulfilled').value.post.claimantId;
  await assert.rejects(actOnBounty(post.id,claimant,'complete'),e=>e.code==='not_author');
  await Promise.all(Array.from({length:10},()=>actOnBounty(post.id,'board_author','complete')));
  assert.equal(await wallet(claimant),25);assert.equal(await wallet('board_author'),15);
  await assert.rejects(actOnBounty(post.id,'board_author','cancel'),e=>e.code==='post_unavailable');
  const cancelled=(await createBounty(request('board_author','cancel-once'))).post;
  await actOnBounty(cancelled.id,'board_two','claim');
  await Promise.all(Array.from({length:10},()=>actOnBounty(cancelled.id,'board_author','cancel')));
  assert.equal(await wallet('board_author'),15);assert.ok(!(await listBounties()).posts.some(p=>p.id===cancelled.id));
});

test('offer holds buyer funds, releases safely, and pays only after author confirmation',async()=>{
  for(const id of ['offer_seller','offer_buyer'])await fund(id);
  const post=(await createBounty(request('offer_seller','offer-one',{kind:'offer',rewardTokens:7}))).post;
  assert.equal(await wallet('offer_seller'),20);
  await Promise.all(Array.from({length:10},()=>actOnBounty(post.id,'offer_buyer','claim')));
  assert.equal(await wallet('offer_buyer'),13);
  await Promise.all(Array.from({length:10},()=>actOnBounty(post.id,'offer_buyer','release')));
  assert.equal(await wallet('offer_buyer'),20);
  await actOnBounty(post.id,'offer_buyer','claim');
  await actOnBounty(post.id,'offer_seller','complete');await actOnBounty(post.id,'offer_seller','complete');
  assert.equal(await wallet('offer_buyer'),13);assert.equal(await wallet('offer_seller'),27);
  const second=(await createBounty(request('offer_seller','offer-two',{kind:'offer',rewardTokens:3}))).post;
  await actOnBounty(second.id,'offer_buyer','claim');await actOnBounty(second.id,'offer_seller','cancel');
  assert.equal(await wallet('offer_buyer'),13);
});

test('offer reservation cycles have unique ledger refs and conserve refunds after cancellation',async()=>{
  await fund('cycle_seller',10);await fund('cycle_buyer',20);await fund('cycle_other',20);
  const post=(await createBounty(request('cycle_seller','cycle-offer',{kind:'offer',rewardTokens:7}))).post;
  const before=memoryGame().tokens.length;
  for(let i=0;i<5;i++){
    await actOnBounty(post.id,'cycle_buyer','claim');
    await Promise.all(Array.from({length:4},()=>actOnBounty(post.id,'cycle_buyer','release')));
    assert.equal(await wallet('cycle_buyer'),20);
  }
  await actOnBounty(post.id,'cycle_other','claim');
  await assert.rejects(actOnBounty(post.id,'cycle_buyer','release'),e=>e.code==='not_claimant');
  await Promise.all(Array.from({length:8},()=>actOnBounty(post.id,'cycle_seller','cancel')));
  assert.equal(await wallet('cycle_seller'),10);assert.equal(await wallet('cycle_buyer'),20);assert.equal(await wallet('cycle_other'),20);
  const movements=memoryGame().tokens.slice(before);assert.equal(movements.length,12);
  assert.equal(new Set(movements.map(t=>t.ref)).size,movements.length);
  assert.equal(movements.reduce((sum,t)=>sum+t.delta,0),0);
});

test('invalid or unfunded posts and unauthorized actions never mutate tokens',async()=>{
  await fund('board_broke',0);await fund('board_owner',10);await fund('board_outsider',0);
  await assert.rejects(createBounty(request('board_broke','no-funds')),e=>e.code==='insufficient_tokens');
  await assert.rejects(createBounty(request('board_owner','bad-amount',{rewardTokens:-1})),e=>e.code==='invalid_post');
  await assert.rejects(createBounty(request('board_owner','no-want',{kind:'trade',have:'A perk'})),e=>e.code==='invalid_post');
  await assert.rejects(createBounty(request('board_owner','no-title',{title:' '})),e=>e.code==='invalid_post');
  const post=(await createBounty(request('board_owner','safe'))).post;
  const before=memoryGame().tokens.length;
  await assert.rejects(actOnBounty(post.id,'board_outsider','cancel'),e=>e.code==='not_author');
  await assert.rejects(actOnBounty(post.id,'board_outsider','complete'),e=>e.code==='not_author');
  assert.equal(memoryGame().tokens.length,before);assert.equal(await wallet('board_owner'),5);
  const offer=(await createBounty(request('board_owner','expensive-offer',{kind:'offer',rewardTokens:9}))).post;
  await assert.rejects(actOnBounty(offer.id,'board_outsider','claim'),e=>e.code==='insufficient_tokens');
  assert.equal((await listBounties()).posts.find(p=>p.id===offer.id).status,'open');
});

test('simulator riders cannot fund or claim shared board posts',async()=>{
  await fund('normal_board_rider',10);
  registerMemoryRider({riderId:'sim_board_rider',displayName:'Sim rider',homeTeamRouteId:'Green',isSimulated:true});
  await awardPoints({riderId:'sim_board_rider',teamRouteId:'Green',type:'landmark',amount:100,ref:'sim_board_rider:fund'});
  const before=memoryGame().tokens.length;
  await assert.rejects(createBounty(request('sim_board_rider','sim-post')),e=>e.code==='invalid_post');
  assert.equal(memoryGame().tokens.length,before);
  const post=(await createBounty(request('normal_board_rider','normal-offer',{kind:'offer',rewardTokens:3}))).post;
  await assert.rejects(actOnBounty(post.id,'sim_board_rider','claim'),e=>e.code==='invalid_post');
  assert.equal(await wallet('sim_board_rider'),10);
  assert.equal((await listBounties()).posts.find(p=>p.id===post.id).status,'open');
});

test('Postgres bounty races and rollback preserve escrow and payout',{skip:!process.env.TCITY_TEST_DATABASE_URL},async()=>{
 process.env.DATABASE_URL=process.env.TCITY_TEST_DATABASE_URL;
 const {getSql}=require('@/server/db.ts');const sql=getSql();
 try {
  for(const id of ['board_db_author','board_db_one','board_db_two']){
   await sql`insert into riders (id,display_name,home_team_route_id) values (${id},${id},'Green')`;
   await awardPoints({riderId:id,teamRouteId:'Green',type:'landmark',amount:200,ref:`${id}:fund`});
  }
  await sql`insert into riders (id,display_name,home_team_route_id,is_simulated) values ('board_db_sim','Sim','Green',true)`;
  await assert.rejects(createBounty(request('board_db_sim','forbidden-sim')),e=>e.code==='invalid_post');
  const results=await Promise.all(Array.from({length:8},()=>createBounty(request('board_db_author','one-db-request'))));
  const post=results[0].post;assert.equal(new Set(results.map(r=>r.post.id)).size,1);assert.equal(await wallet('board_db_author'),15);
  const claims=await Promise.allSettled(['board_db_one','board_db_two'].map(id=>actOnBounty(post.id,id,'claim')));assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);
  const claimant=claims.find(r=>r.status==='fulfilled').value.post.claimantId;
  await sql.unsafe(`create or replace function tcity_test_board_failure() returns trigger language plpgsql as $$ begin if NEW.reason = 'board:delivery:${post.id}' then raise exception 'injected board failure'; end if; return NEW; end $$`);
  await sql.unsafe('create trigger tcity_test_board_failure before insert on token_ledger for each row execute function tcity_test_board_failure()');
  await assert.rejects(actOnBounty(post.id,'board_db_author','complete'),/injected board failure/);
  assert.equal(await wallet(claimant),20);assert.equal((await listBounties()).posts.find(p=>p.id===post.id).status,'reserved');
  await sql.unsafe('drop trigger tcity_test_board_failure on token_ledger');
  await Promise.all(Array.from({length:8},()=>actOnBounty(post.id,'board_db_author','complete')));assert.equal(await wallet(claimant),25);
  // Exercise actual token_ledger UNIQUE(ref): release/reclaim cycles must create fresh hold/refund refs.
  const offer=(await createBounty(request('board_db_author','db-offer-cycles',{kind:'offer',rewardTokens:3}))).post;
  const startingBalance=await wallet('board_db_one');
  for(let i=0;i<4;i++){
    await Promise.all(Array.from({length:4},()=>actOnBounty(offer.id,'board_db_one','claim')));
    assert.equal(await wallet('board_db_one'),startingBalance-3);
    await Promise.all(Array.from({length:4},()=>actOnBounty(offer.id,'board_db_one','release')));
    assert.equal(await wallet('board_db_one'),startingBalance);
  }
  await actOnBounty(offer.id,'board_db_two','claim');
  await assert.rejects(actOnBounty(offer.id,'board_db_one','release'),e=>e.code==='not_claimant');
  await Promise.all(Array.from({length:4},()=>actOnBounty(offer.id,'board_db_author','cancel')));
  const [offerLedger]=await sql`select count(*)::int as count,coalesce(sum(delta),0)::int as net from token_ledger where reason in (${`board:hold:${offer.id}`},${`board:refund:${offer.id}`})`;
  assert.equal(offerLedger.count,10);assert.equal(offerLedger.net,0);
 } finally {
  await sql.unsafe('drop trigger if exists tcity_test_board_failure on token_ledger');await sql.unsafe('drop function if exists tcity_test_board_failure()');
  await sql`delete from bounty_posts where author_id in ('board_db_author','board_db_one','board_db_two','board_db_sim')`;
  await sql`delete from riders where id in ('board_db_author','board_db_one','board_db_two','board_db_sim')`;await sql.end();delete process.env.DATABASE_URL;
 }
});
