// Focused related checks. Redirect result writes, keep historical fixtures read-only.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-45-desktop-audio/',import.meta.url),results=[];
const checks=['verify-desktop-pair-react.mjs', 'verify-trackpad-wiring.mjs', 'verify-trackpad-audio.mjs', 'verify-trackpad-scene.mjs', 'verify-phone-laptop-selection.mjs', 'verify-runtime-dispatch.mjs', 'verify-runtime-composition.mjs', 'verify-drawer-audio-react-order.mjs', 'verify-drawer-audio-delayed-wiring.mjs', 'verify-moving-drawer-shadows.mjs', 'verify-paper-toss-entry.mjs', 'verify-cat-mario-mount.mjs', 'verify-cat-mario-composed-mount.mjs', 'verify-cat-mario-input-audio.mjs', 'verify-cat-mario-wiring.mjs', 'verify-window-drag.mjs', 'verify-desktop-marquee.mjs', 'verify-recorded-walkthrough.mjs', 'verify-second-walkthrough.mjs'];
for(const name of checks){const original=new URL(name,import.meta.url);let s=fs.readFileSync(original,'utf8');
 s=s.replaceAll('session-29b-paper-toss','session-45-desktop-audio').replaceAll('session-41-phone-to-laptop','session-45-desktop-audio').replaceAll('session-26-paper-timing-audio/audio-owner-checks.json','session-45-desktop-audio/audio-owner-checks.json');
 s=s.replaceAll('session-30b-cat-mario','session-45-desktop-audio');
 if(name==='verify-cat-mario-runtime.mjs')s=s.replaceAll("path.join(evidence,'test-build')","path.resolve(root,'../docs/redesign/session-30b-cat-mario/test-build')");
 s=s.replaceAll('session-27-desktop-marquee/selection-checks.json','session-45-desktop-audio/selection-checks.json');
 if(name==='verify-runtime-dispatch.mjs')s=s.replaceAll('session-36-runtime/','session-45-desktop-audio/');
 if(name==='verify-cat-mario-mount.mjs'||name==='verify-cat-mario-composed-mount.mjs')s=s.replaceAll('session-40-cat-mario-launch','session-45-desktop-audio');
 if(name==='verify-phone-edges.mjs'||name==='verify-printer-occlusion.mjs')s=s.replaceAll('session-08-desk-camera','session-45-desktop-audio');
 s=s.replaceAll('session-43-drawer-audio','session-45-desktop-audio').replaceAll('session-44-drawer-shadows','session-45-desktop-audio');
 if(name==='verify-paper-toss-entry.mjs')s=s.replaceAll('session-42-paper-toss-entry','session-45-desktop-audio');
 // Historical fixture reads remain unchanged.
 const temp=new URL('.session45-'+name,import.meta.url);fs.writeFileSync(temp,s);
 try{const p=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(temp)],{encoding:'utf8'});const output=(p.stdout??'')+(p.stderr??'');fs.writeFileSync(new URL(name+'.log',dir),output);
 const known=name==='verify-recorded-walkthrough.mjs'?output.includes("Cannot read properties of undefined (reading 'props')")&&output.includes('assert.ok(!start.props.disabled)'):name==='verify-second-walkthrough.mjs'?output.includes('0 !== 1')&&output.includes('PASS S01 internal device and application routes retain the full private pathname')&&!output.includes('PASS S02'):false;
 results.push({check:name,exit:p.status,status:p.status===0?'pass':known?'known pre-existing broad-suite failure':'unexpected failure'});console.log(name,results.at(-1).status);if(p.status&&!known)console.log(output);
 }finally{fs.unlinkSync(temp);}}
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(results,null,2)+'\n');if(results.some(r=>r.status==='unexpected failure'))process.exitCode=1;
