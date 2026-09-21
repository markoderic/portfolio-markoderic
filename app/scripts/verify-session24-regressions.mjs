// Existing focused source checks, with historical evidence kept read-only.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-24-fan-placement-activation/',import.meta.url),results=[];
const checks=['verify-fan-motion.mjs','verify-fan-state.mjs','verify-desk-input.mjs','verify-phone-escape.mjs','verify-phone-return-camera.mjs','verify-display-depth.mjs','verify-paper-lifecycle.mjs','verify-screen-projection.mjs','session16-verify-printer-occlusion.mjs','verify-props-capture.mjs','verify-gray-printer.mjs','verify-fuller-bin.mjs'];
for(const name of checks){const source=new URL(name,import.meta.url);let script=source,temp,s=fs.readFileSync(source,'utf8');
 if(name==='verify-display-depth.mjs')s=s.replace("new URL('contrast.json',dir)","new URL('../../docs/redesign/session-24-fan-placement-activation/glass-contrast.json',import.meta.url)");
 else s=s.replaceAll('session-17-desk-fan/','session-24-fan-placement-activation/').replaceAll('session-16-palette-bin','session-24-fan-placement-activation').replaceAll('session-23-gray-printer-fuller-bin/','session-24-fan-placement-activation/').replaceAll('session-19-production-props/capture-check.json','session-24-fan-placement-activation/capture-check.json');
 if(s!==fs.readFileSync(source,'utf8')){temp=new URL('.session24-'+name,import.meta.url);fs.writeFileSync(temp,s);script=temp;}
 try{const p=spawnSync(process.execPath,[fileURLToPath(script)],{encoding:'utf8'});fs.writeFileSync(new URL(name+'.log',dir),(p.stdout??'')+(p.stderr??''));results.push({check:name,exit:p.status});console.log(name,p.status);}finally{if(temp)fs.unlinkSync(temp);}}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.exit!==0))process.exitCode=1;
