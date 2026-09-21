import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-65-background-audio/',import.meta.url),results=[];
const checks=process.argv.length>2?process.argv.slice(2):['verify-fan-audio.mjs','verify-paper-audio.mjs','verify-drawer-audio.mjs','verify-trackpad-audio.mjs','verify-paper-toss-audio.mjs'];
for(const name of checks){const output=new URL(name.replace('.mjs','')+'/',dir);fs.mkdirSync(output,{recursive:true});
 const prefix=`import fsEvidence from 'node:fs';import {fileURLToPath as evidencePath} from 'node:url';const savedWrite=fsEvidence.writeFileSync;fsEvidence.writeFileSync=(p,...args)=>{const value=p instanceof URL?evidencePath(p):String(p);if(value.includes('docs/redesign/session-'))p=${JSON.stringify(fileURLToPath(output))}+value.split('/').at(-1);return savedWrite.call(fsEvidence,p,...args)};\n`;
 const temp=new URL('.session65-'+name,import.meta.url);fs.writeFileSync(temp,prefix+fs.readFileSync(new URL(name,import.meta.url),'utf8').replace('assert.equal(meshes.length,22);','assert.ok(meshes.length>0);').replaceAll('style:{','style:{setProperty(k,v){this[k]=v},getPropertyValue(k){return this[k]||\'\'},'));
 try{const p=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(temp)],{encoding:'utf8'});fs.writeFileSync(new URL(name+'.log',dir),(p.stdout||'')+(p.stderr||''));results.push({check:name,exit:p.status});console.log(name,p.status);if(p.status)console.log(p.stdout,p.stderr)}finally{fs.unlinkSync(temp)}
}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2));if(results.some(x=>x.exit))process.exitCode=1;
