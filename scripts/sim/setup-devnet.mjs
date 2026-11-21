// Generates a fresh DEVNET-ONLY demo authority under /private/tmp, never in the repo.
import fs from 'node:fs/promises';
import { Connection,Keypair,LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
const directory='/private/tmp/tcity-devnet-demo';
await fs.mkdir(directory,{recursive:true,mode:0o700});
const keyPath=directory+'/authority.json';
let authority;
try {authority=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await fs.readFile(keyPath,'utf8'))));}
catch(error){if(error.code!=='ENOENT')throw new Error('Cannot read devnet authority file.');authority=Keypair.generate();await fs.writeFile(keyPath,JSON.stringify([...authority.secretKey]),{mode:0o600,flag:'wx'});}
const connection=new Connection('https://api.devnet.solana.com',{commitment:'confirmed',disableRetryOnRateLimit:true,fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(10000)})});
console.log('Devnet-only public authority:',authority.publicKey.toBase58());
try {
 const balance=await connection.getBalance(authority.publicKey);
 if(balance<0.02*LAMPORTS_PER_SOL){
  const signature=await connection.requestAirdrop(authority.publicKey,LAMPORTS_PER_SOL);
  console.log('Devnet faucet transaction:',signature);
  const until=Date.now()+25000;
  while(Date.now()<until){if(await connection.getBalance(authority.publicKey)>0.02*LAMPORTS_PER_SOL)break;await new Promise(r=>setTimeout(r,1500));}
 }
 if(await connection.getBalance(authority.publicKey)<0.02*LAMPORTS_PER_SOL)throw new Error('Devnet faucet funding is not available yet.');
 const configPath=directory+'/config.json';
 let existing;try{existing=JSON.parse(await fs.readFile(configPath,'utf8'));}catch{}
 if(existing?.mint){console.log('Existing devnet mint:',existing.mint);process.exit(0);}
 const mint=await createMint(connection,authority,authority.publicKey,null,0);
 const config={cluster:'devnet',authorityFile:keyPath,mint:mint.toBase58(),recipient:authority.publicKey.toBase58()};
 await fs.writeFile(configPath,JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('Devnet mint:',config.mint);console.log('Public config saved:',configPath);
}catch(error){console.error('Devnet setup could not complete:',String(error.message).replace(/https?:\/\/\S+/g,'[RPC endpoint]'));process.exitCode=1;}
