import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-46-entry/',import.meta.url),results=[];
for(const name of ['verify-entry.mjs','verify-entry-lifecycle.mjs','verify-entry-camera.mjs','verify-escape-navigation.mjs','verify-phone-escape.mjs','verify-runtime-composition.mjs']){
 const source=fs.readFileSync(new URL(name,import.meta.url),'utf8').replaceAll('session-13-entrance/','session-46-entry/');
 const temp=new URL('.session46-'+name,import.meta.url);fs.writeFileSync(temp,source);
 try {const p=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(temp)],{encoding:'utf8'});fs.writeFileSync(new URL(name+'.log',dir),(p.stdout||'')+(p.stderr||''));results.push({check:name,exit:p.status});console.log(name,p.status);if(p.status)console.log(p.stdout,p.stderr);}finally{fs.unlinkSync(temp)}
}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2));if(results.some(x=>x.exit))process.exitCode=1;
