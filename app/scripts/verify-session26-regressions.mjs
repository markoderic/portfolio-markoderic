// Focused checks; never rewrite historical evidence. No browser invocation.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-26-paper-timing-audio/',import.meta.url),results=[];
const checks=['verify-paper-audio.mjs','verify-paper-motion-audio.mjs','verify-recorded-walkthrough.mjs','verify-second-walkthrough.mjs','verify-fuller-bin.mjs','verify-fan-audio.mjs','verify-fan-audio-wiring.mjs','verify-fan-assembly-input.mjs','verify-fan-motion.mjs','verify-fan-state.mjs','verify-scene-interaction.mjs','verify-desk-input.mjs','verify-phone-escape.mjs','verify-phone-return-camera.mjs','verify-display-depth.mjs','verify-paper-lifecycle.mjs'];
for(const name of checks){const original=new URL(name,import.meta.url);let script=original,temp,s=fs.readFileSync(original,'utf8');
 s=s.replaceAll('session-25-fan-audio/', 'session-26-paper-timing-audio/');
 if(name==='verify-fuller-bin.mjs')s=s.replaceAll('session-23-gray-printer-fuller-bin/', 'session-26-paper-timing-audio/');
 if(name==='verify-fan-motion.mjs')s=s.replaceAll('session-17-desk-fan/','session-26-paper-timing-audio/');
 if(name==='verify-fan-assembly-input.mjs')s=s.replace("new URL('assembly-input.json',dir)","new URL('../../docs/redesign/session-26-paper-timing-audio/assembly-input.json',import.meta.url)");
 if(name==='verify-display-depth.mjs'){
  // These two whole-file Session22 hashes predate authorized fan/paper audio wiring.
  // Keep ancestry/projection assertions; exact new wiring is audited separately.
  s=s.replace("['Prototype.jsx','notch/", "['notch/").replace("'Scene.jsx','screenProjection.js'","'screenProjection.js'");
  s=s.replace("new URL('contrast.json',dir)","new URL('../../docs/redesign/session-26-paper-timing-audio/glass-contrast.json',import.meta.url)");
 }
 if(s!==fs.readFileSync(original,'utf8')){temp=new URL('.session26-'+name,import.meta.url);fs.writeFileSync(temp,s);script=temp;}
 try{const p=spawnSync(process.execPath,[fileURLToPath(script), ...(['verify-recorded-walkthrough.mjs','verify-second-walkthrough.mjs'].includes(name)?['--paper-only']:[])],{encoding:'utf8'});fs.writeFileSync(new URL(name+(['verify-recorded-walkthrough.mjs','verify-second-walkthrough.mjs'].includes(name)?'.paper-only':'')+'.log',dir),(p.stdout??'')+(p.stderr??''));results.push({check:name,exit:p.status,...(['verify-recorded-walkthrough.mjs','verify-second-walkthrough.mjs'].includes(name)?{scope:'affected paper cases only; full suites fail pre-existing entrance assertions, baseline failures recorded separately'}:{})});console.log(name,p.status);if(p.status)console.log(p.stdout,p.stderr);}finally{if(temp)fs.unlinkSync(temp);}
}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.exit!==0))process.exitCode=1;
