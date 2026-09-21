import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';import {AudioMock,deferred} from './support/fan-audio-mock.mjs';
import {createDrawerMotion,advanceDrawer,CABINET} from '../src/prototype/drawers.js';
const out=new URL('../.vite/drawer-audio.mjs',import.meta.url),dir=new URL('../../docs/redesign/session-38-drawer-audio/',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('../src/prototype/drawerSound.js',import.meta.url))],bundle:true,platform:'node',format:'esm',outfile:fileURLToPath(out)});
const {createDrawerAudio}=await import(out.href),results=[];
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
function fixture(){const c=new AudioMock();c.state='running';let now=0;const s={preferences:{muted:false,volume:.4},hidden:false,direct:false,reduced:false},motion=Array.from({length:3},()=>createDrawerMotion()),targets=[false,false,false];
 const owner=createDrawerAudio(()=>s,()=>c,()=>now);owner.mount();
 const step=(dt=1/60)=>{now+=dt*1000;c.advance(now/1000);motion.forEach((m,id)=>{const prior=m.value;advanceDrawer(m,targets[id],s.reduced,dt);owner.present(id,m,prior,dt,s.reduced);});};
 return {c,s,motion,owner,targets,step,accept(id=0,target=!targets[id],ready=Promise.resolve(true)){targets[id]=target;owner.accept(id,target,ready)},run(n=24){for(let i=0;i<n;i++)step()},live:()=>c.sources.filter(v=>v.connected),loops:()=>c.sources.filter(v=>v.connected&&v.loop),contacts:()=>c.sources.filter(v=>!v.loop)};
}
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name)}
await check('mount/restored/idle silence; actual .38s endpoint only, one cue, bounded nodes/buffers',()=>{
 const f=fixture();f.run(30);assert.equal(f.c.sources.length,0);f.motion[1]=createDrawerMotion(true);f.targets[1]=true;f.run();assert.equal(f.c.sources.length,0);
 f.accept();assert.equal(f.c.sources.length,0);f.step();assert.equal(f.loops().length,1);f.run(21);assert.equal(f.contacts().length,0);f.step();assert.equal(f.motion[0].value,1);assert.equal(f.contacts().length,1);assert.ok(Math.abs(f.contacts()[0].started-((30+24+23)/60))<1e-8);f.run();assert.equal(f.live().length,0);assert.equal(f.c.buffers.length,2);f.owner.dispose();
});
await check('partial reversal reuses slide, no false endpoint; tiny travel yields tiny stop',()=>{
 const f=fixture();f.accept();f.step(.001);const loop=f.loops()[0],distance=f.motion[0].value;f.accept(0,false);f.step();assert.equal(f.loops()[0],loop);assert.equal(f.contacts().length,0);f.run();assert.equal(f.contacts().length,1);const p=f.contacts()[0].next.gain;assert.ok(p.history[1].value<=.16*.4*distance+1e-9);assert.equal(f.motion[0].value,0);f.owner.dispose();
});
await check('rapid toggles and simultaneous drawers retain maximum 1 slide + 1 endpoint per drawer',()=>{
 const f=fixture();for(let id=0;id<3;id++)f.accept(id);f.run(2);assert.equal(f.loops().length,3);
 for(let j=0;j<60;j++){f.accept(j%3);f.step();assert.ok(f.loops().length<=3);assert.ok(f.live().length<=6);assert.equal(f.contacts().length,0)}
 f.run();assert.equal(f.contacts().length,3);assert.equal(f.c.buffers.length,2);
 for(const n of f.c.nodes)if(n.gain)assert.ok(n.gain.maxQueue<=2);f.owner.dispose();f.owner.dispose();assert.equal(f.live().length,0);assert.equal(f.c.suspends+f.c.closes,0);
});
await check('coalesced actions with zero rendered movement make no sound',()=>{const f=fixture();f.accept();f.accept();f.run();assert.equal(f.c.sources.length,0);f.owner.dispose()});
await check('latest volume applies; mute and zero consume motion rather than replay on return',()=>{
 for(const kind of ['muted','volume']){const f=fixture();f.accept();f.run(2);f.s.preferences.volume=.7;f.owner.sync();assert.ok(f.loops()[0].next.gain.history.at(-1).value>0);f.s.preferences[kind]=kind==='muted'?true:0;f.owner.sync();assert.equal(f.live().length,0);f.s.preferences={muted:false,volume:.4};f.run();assert.equal(f.contacts().length,0);assert.equal(f.c.sources.length,1);f.accept(0,false);f.run();assert.equal(f.contacts().length,1);f.owner.dispose()}
});
await check('delayed unlock only plays remaining current movement; ended, reversed and old generation drop',async()=>{
 const f=fixture();f.c.state='suspended';const d=deferred();f.accept(0,true,d.promise);f.run(8);assert.equal(f.c.sources.length,0);f.c.state='running';d.resolve(true);await tick();assert.equal(f.loops().length,1);assert.ok(f.loops()[0].started>=8/60-1e-8);f.run();assert.equal(f.contacts().length,1);f.owner.dispose();
 for(const mode of ['ended','reverse','unmount','hidden','mute','direct','reduced']){const a=fixture();a.c.state='suspended';const pending=deferred();a.accept(0,true,pending.promise);a.run(2);if(mode==='ended')a.run();if(mode==='reverse')a.accept(0,false,new Promise(()=>{}));if(mode==='unmount')a.owner.dispose();if(mode==='hidden')a.owner.pageHidden(true);if(mode==='mute'){a.s.preferences.muted=true;a.owner.sync()}if(mode==='direct'||mode==='reduced'){a.s[mode]=true;a.owner.sync()}a.c.state='running';pending.resolve(true);await tick();assert.equal(a.c.sources.length,0,mode);a.owner.dispose()}
});
await check('hidden/pagehide/direct/reduced/context suspension stop and consume; restoration has no replay',()=>{
 for(const kind of ['hidden','pagehide','direct','reduced','context']){const f=fixture();f.accept();f.run(2);if(kind==='pagehide')f.owner.pageHidden(true);else if(kind==='context')f.c.state='suspended';else f.s[kind]=true;f.owner.sync();assert.equal(f.live().length,0,kind);f.s.hidden=f.s.direct=f.s.reduced=false;f.c.state='running';f.owner.pageHidden(false);f.run();assert.equal(f.contacts().length,0,kind);f.owner.dispose()}
});
await check('instant reduced transition, unmount/remount and failed Web Audio remain silent and do not break mechanics',()=>{
 const f=fixture();f.accept();f.s.reduced=true;f.step();assert.equal(f.motion[0].value,1);assert.equal(f.c.sources.length,0);f.s.reduced=false;f.owner.dispose();f.owner.mount();f.run();assert.equal(f.c.sources.length,0);f.c.createBuffer=()=>{throw Error('audio failure')};f.accept(0,false);f.run();assert.equal(f.motion[0].value,0);assert.equal(f.live().length,0);f.owner.dispose();
});
fs.writeFileSync(new URL('audio-checks.json',dir),JSON.stringify({kind:'actual drawer integration and audio graph with mocked Web Audio/clock',checks:results,travel:CABINET.travel,duration:CABINET.duration},null,2)+'\n');
