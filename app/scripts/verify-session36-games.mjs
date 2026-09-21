import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-36-runtime/',import.meta.url),results=[];
for(const name of ['verify-cat-mario-runtime.mjs','verify-cat-mario-input-audio.mjs','verify-cat-mario-wiring.mjs','verify-cat-mario-navigation.mjs','verify-cat-mario-packaging.mjs']){
 const original=new URL(name,import.meta.url),temp=new URL('.session36-'+name,import.meta.url);fs.writeFileSync(temp,fs.readFileSync(original,'utf8').replaceAll('docs/redesign/session-30b-cat-mario','docs/redesign/session-36-runtime').replaceAll("path.join(evidence,'test-build","path.join(root,'../docs/redesign/session-30b-cat-mario/test-build"));
 try{const p=spawnSync(process.execPath,[...(name.includes('-runtime.')?['--experimental-vm-modules']:[]),fileURLToPath(temp)],{encoding:'utf8'});fs.writeFileSync(new URL(name+'.log',dir),p.stdout+p.stderr);results.push({name,exit:p.status});console.log(name,p.status);if(p.status)console.log(p.stdout+p.stderr);}finally{fs.unlinkSync(temp);}
}
fs.writeFileSync(new URL('game-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.exit!==0))process.exitCode=1;
