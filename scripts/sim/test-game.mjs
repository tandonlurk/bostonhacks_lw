// Optional TCITY_TEST_DATABASE_URL must point to an isolated, migrated test DB.
// Serial execution keeps simulator reset tests from racing other DB test files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const lanes=['points','districts','hunts','landmarks','perks','tokens','sim','bounties'];
function find(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?find(path.join(dir,entry.name)):entry.name.endsWith('.spec.mjs')?[path.join(dir,entry.name)]:[]);
}
const specs=lanes.flatMap(lane=>find(path.join(root,'src/server',lane))).sort();
const env={...process.env};delete env.DATABASE_URL; // Never inherit an application's live DB for memory tests.
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...specs],{cwd:root,stdio:'inherit',env});
process.exitCode=result.status??1;
