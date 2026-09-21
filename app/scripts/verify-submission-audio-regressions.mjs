import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../docs/redesign/submission-controls/',import.meta.url));
const results=[];
for(const name of ['verify-fan-audio.mjs','verify-paper-audio.mjs','verify-drawer-audio.mjs','verify-trackpad-audio.mjs','verify-paper-toss-audio.mjs']){
 const destination=path.join(evidence,name.replace('.mjs',''));fs.mkdirSync(destination,{recursive:true});
 // Preserve historical evidence: redirect only report writes, leaving every original assertion intact.
 const prelude=`import fs from 'node:fs';import {fileURLToPath} from 'node:url';const original=fs.writeFileSync;fs.writeFileSync=(p,...args)=>{const value=p instanceof URL?fileURLToPath(p):String(p);if(value.includes('docs/redesign/session-'))p=${JSON.stringify(destination)}+'/'+value.split('/').at(-1);return original.call(fs,p,...args)};`;
 const run=spawnSync(process.execPath,['--experimental-vm-modules','--import','data:text/javascript,'+encodeURIComponent(prelude),path.join(root,'scripts',name)],{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(evidence,name+'.log'),(run.stdout||'')+(run.stderr||''));
 results.push({check:name,exit:run.status});console.log(name,run.status);if(run.status)console.log(run.stdout,run.stderr);
}
fs.writeFileSync(path.join(evidence,'audio-regressions.json'),JSON.stringify(results,null,2)+'\n');
if(results.some(r=>r.exit!==0))process.exitCode=1;
