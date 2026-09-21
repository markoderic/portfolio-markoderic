// Reuse focused checks while keeping every earlier evidence package read-only.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-23-gray-printer-fuller-bin/',import.meta.url),results=[];
const checks=['verify-paper-lifecycle.mjs','verify-scene-interaction.mjs','verify-phone-escape.mjs','verify-phone-return-camera.mjs','verify-display-depth.mjs','verify-screen-projection.mjs','session16-verify-printer-occlusion.mjs','session16-verify-ground-shadows.mjs','verify-props-capture.mjs'];
for(const name of checks){
 const source=new URL(name,import.meta.url);let script=source,temp;
 let s=fs.readFileSync(source,'utf8');
 if(name==='verify-display-depth.mjs')s=s.replace("new URL('contrast.json',dir)","new URL('../../docs/redesign/session-23-gray-printer-fuller-bin/glass-contrast.json',import.meta.url)");
 else s=s.replaceAll('session-16-palette-bin','session-23-gray-printer-fuller-bin').replaceAll('session-19-production-props/capture-check.json','session-23-gray-printer-fuller-bin/capture-check.json');
 if(s!==fs.readFileSync(source,'utf8')){temp=new URL('.session23-'+name,import.meta.url);fs.writeFileSync(temp,s);script=temp;}
 try{const p=spawnSync(process.execPath,[fileURLToPath(script)],{encoding:'utf8'});fs.writeFileSync(new URL(name+'.log',dir),(p.stdout??'')+(p.stderr??''));results.push({check:name,exit:p.status});console.log(name,p.status);}
 finally{if(temp)fs.unlinkSync(temp);}
}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.exit!==0))process.exitCode=1;
