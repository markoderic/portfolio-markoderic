// Actual accepted Prototype actions -> Scene -> Desk -> Cabinet -> Drawer frames -> audio graph.
// Explicit hook/frame/DOM/Web Audio mocks; real Three front/occluder ray tests. No browser.
import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const prior=fs.readFileSync(path.join(root,'scripts/verify-trackpad-wiring.mjs'),'utf8');
const prefix=prior.split('const source = String.raw`')[1].split("await check('Physical pad")[0];
const source=prefix+String.raw`
import React from 'react';globalThis.React=React;import * as T from 'three';import Scene from './src/prototype/Scene';import {Desk} from './src/prototype/StudioProps';import DrawerCabinet,{Drawer} from './src/prototype/DrawerCabinet';import DeskFan from './src/prototype/DeskFan';import {CABINET,DRAWERS} from './src/prototype/drawers';
import {materialize,Desk as GeometryDesk,harness as geometryHarness} from './scripts/support/chair-scene-fixture.mjs';
const world=materialize(geometryHarness(GeometryDesk,{}).tree);world.updateMatrixWorld(true);
function mount(){for(let id=0;id<3;id++)world.getObjectByName('drawer-'+id).position.z=0;world.updateMatrixWorld(true);document.hidden=false;const s=setup();desktop(s.h).props.navigate('desk');s.render();s.settle();let stage,desk,cabinet;const hs=[],frames=[];
 const sync=()=>{s.render();if(!scene(s.h)){hs.forEach(dispose);frames.length=0;return;}stage ||=harness(Scene,scene(s.h).props);stage.render(scene(s.h).props);const dp=find(stage,n=>n.type===Desk).props;desk ||=harness(Desk,dp);desk.render(dp);const cp=find(desk,n=>n.type===DrawerCabinet).props;cabinet ||=harness(DrawerCabinet,cp);cabinet.render(cp);
  for(const n of nodes(cabinet.tree))if(n.type===Drawer){const id=n.props.spec.id;hs[id] ||=harness(Drawer,n.props);hs[id].render(n.props);frames[id]=globalThis.__frame;hs[id].tree.props.ref.current=world.getObjectByName('drawer-'+id);hs[id].flushEffects()}
 };sync();
 return {...s,sync,hs,get stage(){return stage},step(dt=1/60){audio?.advance(audio.currentTime+dt);frames.forEach(f=>f({},dt));world.updateMatrixWorld(true)},run(n=24){for(let i=0;i<n;i++)this.step()},toggle(id){scene(s.h).props.onDrawerToggle(id);sync()},dispose(){hs.forEach(dispose);dispose(s.h)}};
}
const live=()=>audio?.sources.filter(v=>v.connected)||[],loops=()=>live().filter(v=>v.loop),cueCount=()=>audio?.sources.filter(v=>!v.loop).length||0;
const menu=s=>{if(!byLabel(s.h,'Workspace navigation').props['aria-expanded']){byLabel(s.h,'Workspace navigation').props.onClick();s.sync()}};
function event(id,occluded=false){const object=world.getObjectByName('drawer-'+id).getObjectByName('drawer-front'),target=new T.Box3().setFromObject(object).getCenter(new T.Vector3()),eye=target.clone().add(new T.Vector3(occluded?6:0,0,occluded?-4:8));return {object,ray:new T.Ray(eye,target.sub(eye).normalize()),clientX:20,clientY:20,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,nativeEvent:{},delta:0,stopPropagation(){this.stopped=true}}}
function physical(s,id,mode='click'){
 const h=find(s.hs[id],n=>n.props?.name==='drawer-front').props,e=event(id,mode==='occluded');
 if(mode==='right')e.button=2;if(mode==='secondary')e.isPrimary=false;
 h.onPointerOver(e);if(mode==='hover')return;
 const synthetic={...e,nativeEvent:e.nativeEvent,target:{closest:()=>false},currentTarget:captureNode()};const host=find(s.h,n=>n.props.className==='scene');s.h.tree.props.onPointerDownCapture(synthetic);h.onPointerDown(e);host.props.onPointerDown(synthetic);s.h.tree.props.onPointerDown(synthetic);if(mode==='drag')h.onPointerMove({...e,clientX:40});if(mode==='cancel')h.onPointerCancel();h.onPointerUp(e);host.props.onPointerUp(synthetic);s.h.tree.props.onPointerUp(synthetic);s.h.tree.props.onClickCapture({...synthetic,detail:1});h.onClick(e);h.onClick(e);s.sync();
}
await check('Initial real component chain stays silent; exposed physical front triggers one slide + real endpoint without generic click',async()=>{
 const s=mount();s.run();const before=audio?.sources.length||0;physical(s,0);assert.deepEqual(scene(s.h).props.drawers,[true,false,false]);await tick();assert.equal(audio.sources.length,before);s.run(22);assert.equal(loops().length,1);assert.equal(cueCount(),0);s.step();assert.equal(cueCount(),1);assert.equal(world.getObjectByName('drawer-0').position.z,CABINET.travel);s.run();assert.equal(live().length,0);assert.equal(find(s.stage,n=>n.type===Desk).props.drawerShadow.current.revision,1);s.dispose();
});
await check('All Explore controls share owner, allow concurrent motion, held key guard and partial reversal',async()=>{
 const s=mount();menu(s);const before=cueCount();for(const name of ['Top','Middle','Bottom'])byLabel(s.h,name+' drawer: closed; open drawer').props.onClick();s.sync();await tick();s.run(3);assert.equal(loops().length,3);assert.equal(cueCount(),before);const first=loops()[0];byLabel(s.h,'Top drawer: open; close drawer').props.onClick();s.sync();s.step();assert.equal(loops()[0],first);assert.equal(cueCount(),before);
 const e={repeat:true,key:'Enter',preventDefault(){this.prevented=true}};byLabel(s.h,'Top drawer: closed; open drawer').props.onKeyDown(e);assert.ok(e.prevented);s.run();assert.equal(cueCount(),before+3);assert.deepEqual(scene(s.h).props.drawers,[false,true,true]);s.run();assert.equal(live().length,0);s.dispose();
});
await check('Rejected hover/drag/cancel/occluded/nonprimary and parent game/orbit/hidden gates stay silent',async()=>{
 for(const mode of ['hover','drag','cancel','occluded','right','secondary']){const s=mount(),before=audio.sources.length;physical(s,0,mode);await tick();s.run();assert.deepEqual(scene(s.h).props.drawers,[false,false,false],mode);assert.equal(audio.sources.length,before,mode);s.dispose()}
 const s=mount(),before=audio.sources.length;const host=find(s.h,n=>n.props.className==='scene');host.props.onPointerDown({button:0,pointerId:1,clientX:1,clientY:1,nativeEvent:{},currentTarget:captureNode()});s.toggle(0);assert.equal(scene(s.h).props.drawers[0],false);s.h.tree.props.onPointerCancel();s.sync();document.hidden=true;emit('visibilitychange');s.toggle(0);assert.equal(scene(s.h).props.drawers[0],false);document.hidden=false;emit('visibilitychange');s.run();assert.equal(audio.sources.length,before);s.dispose();
});
await check('Ordinary navigation and camera pause preserve the same finite stroke; no view-gated restart',async()=>{
 for(const route of ['laptop','phone','paper','printer']){const s=mount(),before=cueCount();s.toggle(0);await tick();s.run(2);const voice=loops()[0],owner=scene(s.h).props.drawerAudio;
 desktop(s.h).props.navigate(route);s.sync();assert.equal(scene(s.h).props.drawerAudio,owner);s.run(4);assert.equal(loops()[0],voice);s.run();assert.equal(cueCount(),before+1);s.run();assert.equal(live().length,0);s.dispose()}
 const s=mount();s.toggle(0);await tick();s.run(2);menu(s);const pause=byText(s.h,'Pause desk motion');assert.ok(pause);pause.props.onClick();s.sync();const v=loops()[0];s.run(2);assert.equal(loops()[0],v);s.run();s.dispose();
});
await check('Parent mute/latest volume, pagehide/visible return and Simple view consume interrupted strokes',async()=>{
 for(const mode of ['mute','hidden','pagehide','simple']){const s=mount();s.toggle(0);await tick();s.run(2);const before=cueCount();
 if(mode==='mute'){desktop(s.h).props.setSound({muted:true,volume:.4});s.sync()}
 if(mode==='hidden'){document.hidden=true;emit('visibilitychange')}
 if(mode==='pagehide')emit('pagehide');
 if(mode==='simple'){desktop(s.h).props.onSimple();s.sync()}
 assert.equal(live().length,0,mode);if(mode==='mute'){desktop(s.h).props.setSound({muted:false,volume:.4});s.sync()}if(mode==='hidden'){document.hidden=false;emit('visibilitychange')}if(mode==='pagehide')emit('pageshow');s.run();assert.equal(cueCount(),before,mode);s.dispose()}
});
await check('Actual accepted action with pending shared unlock expires without replay, or joins only remaining motion',async()=>{
 for(const ended of [true,false]){const s=mount();audio.state='suspended';let resolve;audio.pending=new Promise(r=>resolve=r);const before=audio.sources.length;s.toggle(0);s.run(ended?24:4);assert.equal(audio.sources.length,before);audio.state='running';audio.pending=null;resolve();await tick();assert.equal(audio.sources.length,before+(ended?0:1));s.run();s.dispose()}
});
await check('Paper-toss gate rejects drawer actions; moving-set and revision survive unrelated view changes',async()=>{
 const s=mount(),g=scene(s.h).props.toss;g.available=true;assert.equal(g.enter(),true);s.sync();const before=audio.sources.length;s.toggle(0);await tick();s.run();assert.equal(audio.sources.length,before);assert.deepEqual(scene(s.h).props.drawers,[false,false,false]);g.exit();s.sync();s.toggle(0);await tick();s.run(2);const shadow=find(s.stage,n=>n.type===Desk).props.drawerShadow;assert.equal(shadow.current.moving.has(0),true);assert.equal(shadow.current.revision,0);assert.equal(g.available,false);desktop(s.h).props.navigate('phone');s.sync();s.run();assert.equal(shadow.current.moving.size,0);assert.equal(shadow.current.revision,1);s.dispose();
});
await check('Actual fan and three drawers share the context without cancelling or restarting the motor voice',async()=>{
 const s=mount(),f=harness(DeskFan,find(s.stage,n=>n.type===DeskFan).props),frame=globalThis.__frame;materialize(f.tree);f.flushEffects();s.h.tree.props.onPointerDown({button:0,isPrimary:true});await tick();for(let i=0;i<90;i++){audio.advance(audio.currentTime+1/60);frame({clock:{elapsedTime:i/60}},1/60)}const motor=loops()[0];assert.ok(motor);assert.equal(motor.buffer.duration,4);
 for(let id=0;id<3;id++)s.toggle(id);await tick();s.run(2);assert.equal(loops().length,4);assert.ok(motor.connected);s.run(40);assert.deepEqual(loops(),[motor]);assert.equal(audio.closes+audio.suspends,0);dispose(f);s.dispose();assert.equal(live().length,0);
});
console.log(count+' composed drawer motion/audio groups passed, '+failures+' failed; mocked scheduling/input/audio, real owner wiring.');if(failures)process.exitCode=1;
`;
const original=fs.readFileSync(path.join(root,'scripts/verify-runtime-composition.mjs'),'utf8');
const footer=original.slice(original.indexOf('await build({stdin:')).replace('await import(pathToFileURL(out).href);','');
const out=path.join(root,'.vite/drawer-audio-wiring.mjs');
// Reuse established renderer/asset boundaries, not a stub audio owner or final play call.
await eval('(async()=>{'+footer+'})()');
await import(pathToFileURL(out).href);
