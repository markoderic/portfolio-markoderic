// Re-run game owners without overwriting Session 30B's historical evidence.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-33-fan-continuity/',import.meta.url),results=[];
for(const name of ['runtime','input-audio','wiring','navigation']){
 const original=new URL(`verify-cat-mario-${name}.mjs`,import.meta.url),temp=new URL(`.session33-game-${name}.mjs`,import.meta.url);let source=fs.readFileSync(original,'utf8');
 source=source.replace("fs.writeFileSync(path.join(evidence,'runtime-results.json')","fs.writeFileSync(path.join(root,'../docs/redesign/session-33-fan-continuity/runtime-results.json')").replace("../../docs/redesign/session-30b-cat-mario/input-audio-results.json","../../docs/redesign/session-33-fan-continuity/input-audio-results.json").replace("../docs/redesign/session-30b-cat-mario/wiring-results.json","../docs/redesign/session-33-fan-continuity/wiring-results.json");fs.writeFileSync(temp,source);
 try{const p=spawnSync(process.execPath,[...(name==='runtime'?['--experimental-vm-modules']:[]),fileURLToPath(temp)],{encoding:'utf8'});fs.writeFileSync(new URL(`cat-mario-${name}.log`,dir),(p.stdout||'')+(p.stderr||''));results.push({name,exit:p.status});console.log(name,p.status===0?'pass':'FAIL');}finally{fs.unlinkSync(temp);}
}
fs.writeFileSync(new URL('game-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.exit!==0))process.exitCode=1;
