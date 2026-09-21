import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';import fs from 'node:fs';
import {AudioMock,deferred} from './support/fan-audio-mock.mjs';
const out=new URL('../.vite/fan-audio-test.mjs',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('../src/prototype/fanSound.js',import.meta.url))],bundle:true,format:'esm',platform:'node',outfile:fileURLToPath(out)});
const {createFanAudio}=await import(out.href);
let count=0;const check=async(name,fn)=>{await fn();count++;console.log('PASS '+name);};
function setup(){const context=new AudioMock(),listeners=new Set();let pending;
 const state={on:true,visible:true,switchEligible:true,reduced:false,preferences:{muted:false,volume:.4}};
 const owner=createFanAudio(()=>state,{context:()=>context,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},unlock:async()=>{if(pending)await pending;else context.state='running';for(const fn of listeners)fn();return context.state==='running';}});
 owner.mount();return {context,state,owner,listeners,pending(value){pending=value},unlock(){context.state='running';for(const f of listeners)f();},toggle(value){state.on=value;return owner.toggle(value)},loops(){return context.sources.filter(s=>s.loop&&!s.ended&&s.connected)},clicks(){return context.sources.filter(s=>!s.loop)},finish(){context.advance(context.currentTime+.2)}};
}
await check('Initial on never autoplays; gesture unlock starts existing power without switch, one loop and bounded buffers',()=>{
 const s=setup();s.owner.power(.7);assert.equal(s.context.sources.length,0);s.unlock();assert.equal(s.loops().length,1);assert.equal(s.clicks().length,0);
 for(let i=0;i<2000;i++){s.context.advance(i/60);s.owner.power(.7+.2*Math.sin(i/100));}
 assert.equal(s.context.sources.length,1);assert.equal(s.context.buffers.length,1);
 for(const n of s.context.nodes)for(const p of [n.gain,n.frequency,n.playbackRate])if(p)assert.ok(p.maxQueue<=2);
 s.owner.dispose();assert.ok(s.context.nodes.every(n=>!n.connected));assert.equal(s.context.closes+s.context.suspends,0);
});
await check('Actual power controls motor level/rate/filter; off coasts, reversal reuses source, settled off releases once',async()=>{
 const s=setup();s.unlock();s.owner.power(.8);const motor=s.loops()[0];await s.toggle(false);assert.equal(s.loops()[0],motor);s.context.advance(.1);s.owner.power(.4);
 assert.ok(motor.next.next.gain.events.at(-1).value<.03);assert.equal(motor.playbackRate.events.at(-1).value,.79);
 await s.toggle(true);s.owner.power(.5);assert.equal(s.loops()[0],motor);await s.toggle(false);s.owner.power(0);s.finish();assert.equal(s.loops().length,0);const n=s.context.sources.length;s.owner.power(0);s.owner.sync();assert.equal(s.context.sources.length,n);assert.equal(s.context.peakLoops,1);s.owner.dispose();
});
await check('Mute/zero silence all voices, positive volume retargets; return/unmute creates no historical click or overlapping loop',async()=>{
 const s=setup();s.unlock();s.owner.power(1);await s.toggle(false);await s.toggle(true);const motor=s.loops()[0];
 s.state.preferences.volume=.2;s.owner.sync();assert.equal(s.loops()[0],motor);assert.ok(Math.abs(motor.next.next.gain.events.at(-1).value-.04)<1e-12);
 s.state.preferences.muted=true;s.owner.sync();assert.ok(s.context.sources.filter(v=>v.connected).every(v=>v.stopped!==undefined));
 const clicks=s.clicks().length;s.state.preferences.muted=false;s.owner.sync();assert.equal(s.loops().length,1);s.finish();assert.equal(s.loops().length,1);assert.equal(s.clicks().length,clicks);
 s.state.preferences.volume=0;s.owner.sync();s.finish();assert.equal(s.loops().length,0);s.state.preferences.volume=.4;s.owner.sync();assert.equal(s.loops().length,1);assert.equal(s.context.peakLoops,1);s.owner.dispose();
});
await check('Hidden/direct/pagehide policies stop hum, preserve logical state; static reduced follows logical on',async()=>{
 const s=setup();s.unlock();s.owner.power(1);
 for(const reason of ['hidden','simple','failure','direct']){s.state.visible=false;s.state.switchEligible=false;s.owner.sync();s.finish();assert.equal(s.loops().length,0,reason);assert.equal(s.state.on,true);s.state.visible=true;s.state.switchEligible=true;s.owner.sync();assert.equal(s.loops().length,1);}
 s.owner.pageHidden(true);s.finish();assert.equal(s.loops().length,0);s.owner.pageHidden(false);assert.equal(s.loops().length,1);
 s.state.reduced=true;s.state.visible=false;s.owner.sync();s.finish();await s.toggle(false);assert.equal(s.loops().length,0);assert.equal(s.clicks().length,1);
 s.state.visible=true;await s.toggle(true);assert.equal(s.loops().length,1);await s.toggle(false);s.finish();assert.equal(s.loops().length,0);s.owner.dispose();
});
await check('Pending resume rechecks mute/zero/off/hidden/direct/dispose; no delayed click on unmute or remount',async()=>{
 for(const transition of ['mute','zero','off','hidden','direct','dispose']){const s=setup(),d=deferred();s.pending(d.promise);s.owner.power(1);const p=s.toggle(true);
 if(transition==='mute')s.state.preferences.muted=true;if(transition==='zero')s.state.preferences.volume=0;if(transition==='off')s.state.on=false;
 if(transition==='hidden'||transition==='direct'){s.state.visible=false;s.state.switchEligible=false;}if(transition==='dispose')s.owner.dispose();else s.owner.sync();
 s.context.state='running';d.resolve();await p;assert.equal(s.clicks().length,0,transition);assert.equal(s.loops().length,0,transition);s.owner.dispose();assert.equal(s.listeners.size,0);}
 const s=setup(),d=deferred();s.pending(d.promise);const p=s.toggle(true);s.state.preferences.muted=true;s.owner.sync();s.state.preferences.muted=false;s.owner.sync();s.context.state='running';d.resolve();await p;assert.equal(s.clicks().length,0);s.owner.dispose();
});
await check('Latest deliberate toggle wins async resume; failures/suspended context are quiet and next gesture can retry',async()=>{
 const s=setup(),d=deferred();s.pending(d.promise);const old=s.toggle(true),latest=s.toggle(false);s.context.state='running';d.resolve();await Promise.all([old,latest]);assert.equal(s.clicks().length,0);await s.toggle(true);assert.equal(s.clicks().length,1);
 s.owner.dispose();const t=setup(),fail=deferred();t.pending(fail.promise);const attempt=t.toggle(true);fail.reject(new Error('autoplay denied'));await attempt;assert.equal(t.context.sources.length,0);t.pending(Promise.resolve());await t.toggle(true);assert.equal(t.context.sources.length,0);t.pending(null);await t.toggle(true);assert.equal(t.clicks().length,1);t.owner.dispose();
});
await check('Unmount/remount cancels old completions and disconnects all owned nodes without touching shared context',async()=>{
 const s=setup(),d=deferred();s.pending(d.promise);const old=s.toggle(true);s.owner.dispose();s.owner.mount();s.context.state='running';d.resolve();await old;assert.equal(s.clicks().length,0);
 for(let i=0;i<20;i++){s.owner.power(1);s.state.on=true;s.owner.sync();await s.toggle(false);s.owner.dispose();assert.ok(s.context.nodes.every(n=>!n.connected));assert.equal(s.listeners.size,0);s.owner.mount();}s.owner.dispose();assert.equal(s.context.closes+s.context.suspends,0);
});

await check('Actual DeskFan frame owner feeds its unchanged integrated power and stops publishing when frozen/off settled',async()=>{
 const {mountFan}=await import('./support/fan-scene-fixture.mjs');const powers=[];const f=mountFan({audio:{power:value=>powers.push(value)}});f.run(1);assert.ok(powers.length>50);assert.ok(powers.at(-1)>.94&&powers.at(-1)<1);const n=powers.length;f.render({view:'phone'});f.run(1);assert.ok(powers.length>n);const continuing=powers.length;f.render({direct:true});f.run(1);assert.equal(powers.length,continuing);f.render({direct:false});f.render({view:'desk',on:false});f.run(5);assert.equal(powers.at(-1),0);const stopped=powers.length;f.run(2);assert.equal(powers.length,stopped);
});
await check('Actual shared unlock deduplicates pending resume and leaves printer/lamp context untouched',async()=>{
 const shared=new URL('../.vite/shared-fan-audio-test.mjs',import.meta.url);
 await build({stdin:{contents:"export * from './src/prototype/fanSound';export * from './src/prototype/sound';",resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,format:'esm',platform:'node',outfile:fileURLToPath(shared)});
 const api=await import(shared.href);let context;const d=deferred();globalThis.window={AudioContext:class extends AudioMock{constructor(){super();context=this;this.pending=d.promise;}}};
 const s={on:true,visible:true,switchEligible:true,reduced:false,preferences:{muted:false,volume:.4}},owner=api.createFanAudio(()=>s);owner.mount();owner.power(1);assert.equal(context,undefined);
 const a=api.unlockSound(),b=api.unlockSound();assert.equal(context.resumes,1);s.visible=false;s.switchEligible=false;owner.sync();context.state='running';d.resolve();assert.deepEqual(await Promise.all([a,b]),[true,true]);assert.equal(context.sources.length,0);
 s.visible=true;s.switchEligible=true;owner.sync();assert.equal(context.sources.length,1);await api.playSound('lamp',s.preferences);const lamp=context.sources.at(-1);owner.dispose();assert.equal(lamp.connected,true);assert.equal(context.closes+context.suspends,0);assert.equal(api.getSoundContext(),context);delete globalThis.window;
});

fs.writeFileSync(new URL('../../docs/redesign/session-25-fan-audio/audio-owner-checks.json',import.meta.url),JSON.stringify({groups:count,kind:'bounded AudioContext mock, not native playback',passed:true},null,2)+'\n');
console.log(count+' audio owner groups passed.');
