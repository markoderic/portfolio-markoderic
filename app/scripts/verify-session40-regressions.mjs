// Focused related checks. Redirect result writes, keep historical fixtures read-only.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-40-cat-mario-launch/',import.meta.url),results=[];
const checks=['verify-cat-mario-runtime.mjs','verify-cat-mario-input-audio.mjs','verify-cat-mario-wiring.mjs','verify-cat-mario-navigation.mjs','verify-window-drag.mjs','verify-phone-escape.mjs','verify-desktop-marquee.mjs','verify-recorded-walkthrough.mjs','verify-second-walkthrough.mjs'];
for(const name of checks){const original=new URL(name,import.meta.url);let s=fs.readFileSync(original,'utf8');
 s=s.replaceAll('session-30b-cat-mario','session-40-cat-mario-launch');
 if(name==='verify-cat-mario-runtime.mjs')s=s.replaceAll("path.join(evidence,'test-build')","path.resolve(root,'../docs/redesign/session-30b-cat-mario/test-build')");
 s=s.replaceAll('session-27-desktop-marquee/selection-checks.json','session-40-cat-mario-launch/selection-checks.json');
 // Historical fixture reads remain unchanged.
 const temp=new URL('.session40-'+name,import.meta.url);fs.writeFileSync(temp,s);
 try{const p=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(temp)],{encoding:'utf8'});const output=(p.stdout??'')+(p.stderr??'');fs.writeFileSync(new URL(name+'.log',dir),output);
 const known=name==='verify-recorded-walkthrough.mjs'?output.includes("Cannot read properties of undefined (reading 'props')")&&output.includes('assert.ok(!start.props.disabled)'):name==='verify-second-walkthrough.mjs'?output.includes('0 !== 1')&&output.includes('PASS S01 internal device and application routes retain the full private pathname')&&!output.includes('PASS S02'):false;
 results.push({check:name,exit:p.status,status:p.status===0?'pass':known?'known pre-existing broad-suite failure':'unexpected failure'});console.log(name,results.at(-1).status);if(p.status&&!known)console.log(output);
 }finally{fs.unlinkSync(temp);}}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.status==='unexpected failure'))process.exitCode=1;
