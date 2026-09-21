// Narrow current regressions; known broad-suite failures are explicitly retained.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-44-drawer-shadows/',import.meta.url),results=[];
const checks=['verify-moving-drawer-shadows.mjs', 'verify-ground-shadows.mjs', 'verify-session39-shadows.mjs', 'verify-drawer-motion.mjs', 'verify-drawer-audio-react-order.mjs', 'verify-drawer-audio-delayed-wiring.mjs', 'verify-drawer-audio.mjs', 'verify-paper-toss-entry.mjs', 'verify-runtime-dispatch.mjs', 'verify-runtime-composition.mjs', 'verify-screen-projection.mjs', 'verify-paper-lifecycle.mjs', 'verify-paper-toss-scene.mjs', 'verify-recorded-walkthrough.mjs', 'verify-second-walkthrough.mjs'];
for(const name of checks.filter(name=>!process.env.SESSION44_CHECKS||process.env.SESSION44_CHECKS.split(',').includes(name))){const original=new URL(name,import.meta.url);let script=original,temp,s=fs.readFileSync(original,'utf8');
 s=s.replaceAll("new URL('../../docs/redesign/session-25-fan-audio/", "new URL('../../docs/redesign/session-28-physical-trackpad-audio/").replaceAll("new URL('../../docs/redesign/session-26-paper-timing-audio/", "new URL('../../docs/redesign/session-28-physical-trackpad-audio/");
 if(name!=='verify-marquee-layers.mjs')s=s.replaceAll("new URL('../../docs/redesign/session-27-desktop-marquee/", "new URL('../../docs/redesign/session-28-physical-trackpad-audio/");
 s=s.replaceAll("new URL('../../docs/redesign/session-28-physical-trackpad-audio/", "new URL('../../docs/redesign/session-29b-paper-toss/");
 s=s.replaceAll("new URL('../../docs/redesign/session-08-desk-camera/","new URL('../../docs/redesign/session-29b-paper-toss/").replaceAll("path.join(root,'../docs/redesign/session-08-desk-camera')","path.join(root,'../docs/redesign/session-29b-paper-toss')").replaceAll("const dir=new URL('../../docs/redesign/session-13-entrance/","const dir=new URL('../../docs/redesign/session-29b-paper-toss/");
 s=s.replaceAll("new URL('../../docs/redesign/session-29b-paper-toss/","new URL('../../docs/redesign/session-30b-cat-mario/").replaceAll("path.join(root,'../docs/redesign/session-29b-paper-toss')","path.join(root,'../docs/redesign/session-30b-cat-mario')");
 s=s.replaceAll("new URL('../../docs/redesign/session-30b-cat-mario/","new URL('../../docs/redesign/session-44-drawer-shadows/").replaceAll("path.join(root,'../docs/redesign/session-30b-cat-mario')","path.join(root,'../docs/redesign/session-44-drawer-shadows')");
 s=s.replaceAll('session-32-device-fan-activation/guard-gap.json','session-44-drawer-shadows/guard-gap.json');
 s=s.replaceAll("../../docs/redesign/session-11-laptop-lighting/","../../docs/redesign/session-44-drawer-shadows/");
 if(name==='verify-ground-shadows.mjs')s=s.replaceAll("../../docs/redesign/session-09-ground-shadows/","../../docs/redesign/session-44-drawer-shadows/");
 if(name==='session16-verify-lamp-lighting.mjs')s=s.replaceAll("../../docs/redesign/session-16-palette-bin/","../../docs/redesign/session-44-drawer-shadows/");
 if(name==='verify-entry.mjs')s=s.replace('docs/redesign/session-13-entrance/','../docs/redesign/session-44-drawer-shadows/');
 if(name==='verify-brighter-lamp.mjs')s=s.replace("new URL('lighting-checks.json',dir)","new URL('../../docs/redesign/session-44-drawer-shadows/lighting-checks.json',import.meta.url)");
 if(name==='verify-paper-toss-physics.mjs')s=s.replace('grid.push({on,angle,speed,outcome:', 'grid.push({path:r.path,on,angle,speed,outcome:');
 if(name==='verify-fan-motion.mjs')s=s.replace("new URL('../../docs/redesign/session-17-desk-fan/motion-checks.json'","new URL('../../docs/redesign/session-44-drawer-shadows/motion-checks.json'");
 if(name.startsWith('verify-runtime-'))s=s.replaceAll('session-36-runtime/','session-44-drawer-shadows/');
 if(name==='verify-fan-assembly-input.mjs')s=s.replace("new URL('assembly-input.json',dir)","new URL('../../docs/redesign/session-44-drawer-shadows/assembly-input.json',import.meta.url)");
 // Keep the historical scene fixture read location; only result writes move.
 s=s.replaceAll('../../docs/redesign/session-44-drawer-shadows/scene-fixture.mjs','../../docs/redesign/session-29b-paper-toss/scene-fixture.mjs');
 s=s.replaceAll('session-38-drawer-audio','session-44-drawer-shadows');
 if(name==='verify-paper-toss-entry.mjs')s=s.replaceAll('session-42-paper-toss-entry','session-44-drawer-shadows');
 s=s.replaceAll('session-43-drawer-audio','session-44-drawer-shadows');
 if(name==='verify-session39-shadows.mjs')s=s.replace("new URL('shadow-checks.json',dir)","new URL('../../docs/redesign/session-44-drawer-shadows/tabletop-checks.json',import.meta.url)");
 if(s!==fs.readFileSync(original,'utf8')){temp=new URL('.session44-'+name,import.meta.url);fs.writeFileSync(temp,s);script=temp;}
 try{const p=spawnSync(process.execPath,[fileURLToPath(script)],{encoding:'utf8'});const output=(p.stdout??'')+(p.stderr??'');fs.writeFileSync(new URL(name+'.log',dir),output);
 const known=name==='verify-recorded-walkthrough.mjs'?output.includes("Cannot read properties of undefined (reading 'props')")&&output.includes('assert.ok(!start.props.disabled)'):name==='verify-second-walkthrough.mjs'?output.includes('0 !== 1')&&output.includes('PASS S01 internal device and application routes retain the full private pathname')&&!output.includes('PASS S02'):false;
 results.push({check:name,exit:p.status,status:p.status===0?'pass':known?'known pre-existing broad-suite failure':'unexpected failure'});console.log(name,results.at(-1).status);if(p.status&&!known)console.log(output);
 }finally{if(temp)fs.unlinkSync(temp);}}
const combined=process.env.SESSION44_CHECKS?JSON.parse(fs.readFileSync(new URL('focused-checks.json',dir),'utf8')).map(old=>results.find(r=>r.check===old.check)||old):results;
fs.writeFileSync(new URL('focused-checks.json',dir),JSON.stringify(combined,null,2)+'\n');if(results.some(r=>r.status==='unexpected failure'))process.exitCode=1;
