import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Keypair,Transaction} from '@solana/web3.js';
import {require} from '../../../scripts/sim/register-ts.mjs';
const {buildMintJob,submitMintJob,readDevnetConfig,mirrorPendingAwards,DEVNET_RPC}=require('@/server/tokens/devnet.ts');
const {registerMemoryRider,awardPoints,getRiderStats}=require('@/server/points/index.ts');
const {tokenWallet}=require('@/server/tokens/index.ts');
const config={authority:Keypair.generate(),mint:Keypair.generate().publicKey,owner:Keypair.generate().publicKey};
const blockhash=Keypair.generate().publicKey.toBase58();

test('devnet disabled/unconfigured by default; signed mint jobs are unique per ledger ref',()=>{
 delete process.env.SOLANA_DEVNET_ENABLED;assert.equal(readDevnetConfig(),null);
 process.env.SOLANA_DEVNET_ENABLED='1';process.env.SOLANA_DEVNET_AUTHORITY_SECRET='invalid';assert.equal(readDevnetConfig(),null);
 delete process.env.SOLANA_DEVNET_ENABLED;delete process.env.SOLANA_DEVNET_AUTHORITY_SECRET;
 assert.equal(DEVNET_RPC,'https://api.devnet.solana.com');
 const first=buildMintJob(config,'award:1',1,blockhash,100);const second=buildMintJob(config,'award:2',1,blockhash,100);
 assert.notEqual(first.txSignature,second.txSignature);
 const transaction=Transaction.from(Buffer.from(first.signedTransaction,'base64'));assert.equal(transaction.instructions.length,3);assert.ok(transaction.verifySignatures());
 assert.throws(()=>buildMintJob(config,'bad',-1,blockhash,100));
});
test('confirmed/failed/expired jobs never resend; pending retries use identical signed bytes',async()=>{
 const job=buildMintJob(config,'retry-test',2,blockhash,100);const sent=[];
 const transport={status:async()=> 'pending',blockHeight:async()=>50,send:async raw=>sent.push(raw)};
 assert.equal(await submitMintJob(job,transport),'pending');assert.equal(await submitMintJob(job,transport),'pending');assert.deepEqual(sent,[job.signedTransaction,job.signedTransaction]);
 for(const status of ['confirmed','failed'])assert.equal(await submitMintJob(job,{...transport,status:async()=>status}),status);
 assert.equal(await submitMintJob(job,{...transport,blockHeight:async()=>101}),'expired');assert.equal(sent.length,2);
});
test('network failure preserves earned wallet and persisted job; confirmed retry attaches signature once',async()=>{
 registerMemoryRider({riderId:'devnet_mem',displayName:'Demo',homeTeamRouteId:'Green'});
 await awardPoints({riderId:'devnet_mem',teamRouteId:'Green',type:'landmark',amount:10,ref:'devnet_mem:fund'});
 let prepares=0,sends=0,confirmed=false;const bytes=[];
 const transport={prepare:async(ref,amount)=>{prepares++;return buildMintJob(config,ref,amount,blockhash,100);},status:async()=>confirmed?'confirmed':'pending',blockHeight:async()=>50,
  send:async raw=>{sends++;bytes.push(raw);if(sends===1)throw Error('RPC unavailable');confirmed=true;}};
 await mirrorPendingAwards('devnet_mem',transport);assert.equal((await tokenWallet('devnet_mem')).balance,1);assert.equal((await tokenWallet('devnet_mem')).ledger[0].txSignature,undefined);
 await mirrorPendingAwards('devnet_mem',transport);await mirrorPendingAwards('devnet_mem',transport);
 assert.equal(prepares,1);assert.equal(sends,2);assert.equal(bytes[0],bytes[1]);assert.ok((await tokenWallet('devnet_mem')).ledger[0].txSignature);
 assert.deepEqual(await getRiderStats('devnet_mem'),{points:10,tokens:1,streakDays:0});
});
test('Postgres outbox persists before sending and prevents a second prepared transaction',{skip:!process.env.TCITY_TEST_DATABASE_URL},async()=>{
 process.env.DATABASE_URL=process.env.TCITY_TEST_DATABASE_URL;const {getSql}=require('@/server/db.ts');const sql=getSql();
 try{
  await sql`insert into riders (id,display_name,home_team_route_id) values ('devnet_db','Test','Green')`;
  await awardPoints({riderId:'devnet_db',teamRouteId:'Green',type:'landmark',amount:10,ref:'devnet_db:fund'});
  let prepares=0,sends=0,confirmed=false;
  const transport={prepare:async(ref,amount)=>{prepares++;return buildMintJob(config,ref,amount,blockhash,100);},status:async()=>confirmed?'confirmed':'pending',blockHeight:async()=>50,
   send:async()=>{const [row]=await sql`select count(*)::int as count from token_mint_jobs where ref='points:devnet_db:fund'`;assert.equal(row.count,1);sends++;if(sends>1)confirmed=true;}};
  await mirrorPendingAwards('devnet_db',transport);await mirrorPendingAwards('devnet_db',transport);await mirrorPendingAwards('devnet_db',transport);
  assert.equal(prepares,1);assert.equal(sends,2);assert.ok((await tokenWallet('devnet_db')).ledger[0].txSignature);
 }finally{await sql`delete from riders where id='devnet_db'`;await sql.end();delete process.env.DATABASE_URL;}
});
