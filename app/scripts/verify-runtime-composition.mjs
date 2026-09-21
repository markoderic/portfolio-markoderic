// Actual parent/Scene/model/fan callbacks and real meshes, simulated native/synthetic ordering.
import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const prior=fs.readFileSync(path.join(root,'scripts/verify-trackpad-wiring.mjs'),'utf8');
const prefix=prior.split('const source = String.raw`')[1].split("await check('Physical pad")[0].replace('globalThis.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});', 'globalThis.__media={matches:reduced,addEventListener(_k,fn){this.change=fn;},removeEventListener(){}};globalThis.matchMedia=()=>globalThis.__media;');
const source=prefix+String.raw`
import React from 'react';import fs from 'node:fs';globalThis.React=React;
import * as T from 'three';import Scene from './src/prototype/Scene';import LaptopModel from './src/prototype/LaptopModel';import DeskFan from './src/prototype/DeskFan';
import {loadLaptop} from './scripts/support/laptop-lighting-fixture.mjs';import {materialize} from './scripts/support/chair-scene-fixture.mjs';import {LAPTOP} from './src/prototype/deviceGeometry';
const world=new T.Scene(),laptopOwner=new T.Group(),model=await loadLaptop();laptopOwner.position.fromArray(LAPTOP.position);model.scale.setScalar(LAPTOP.modelScale);laptopOwner.add(model);world.add(laptopOwner);world.updateMatrixWorld(true);
const canvas={closest:()=>false},hostNode={setPointerCapture(){this.held=true;},hasPointerCapture(){return !!this.held;},releasePointerCapture(){this.held=false;},getBoundingClientRect:()=>({left:0,top:0,width:1440,height:900})};let time=100;
function mount(fresh=false){const s=setup(fresh?'#desk':'#laptop');if(!fresh)desktop(s.h).props.navigate('desk');s.render();s.settle();let stage,pad,fan,fanRoot,frame;const sync=()=>{s.render();stage ||=harness(Scene,scene(s.h).props);stage.render(scene(s.h).props);const p=find(stage,n=>n.type===LaptopModel).props;pad ||=harness(LaptopModel,p);pad.render(p);pad.tree.props.ref.current=laptopOwner;pad.flushEffects();const f=find(stage,n=>n.type===DeskFan).props;fan ||=harness(DeskFan,f);fan.render(f);frame=globalThis.__frame;if(!fanRoot){fanRoot=materialize(fan.tree);world.add(fanRoot);}fan.flushEffects();world.updateMatrixWorld(true);};sync();const host=()=>find(s.h,n=>n.props.className==='scene');
 const rayLaptop=(kind)=>{if(kind==='screen'||kind==='bezel'){const t=new T.Vector3(kind==='bezel'?LAPTOP.width/2+.03:0,0,0).applyEuler(new T.Euler(...LAPTOP.screenRotation)).add(new T.Vector3(...LAPTOP.screenPosition)).add(laptopOwner.position),normal=new T.Vector3(0,0,1).applyEuler(new T.Euler(...LAPTOP.screenRotation)),eye=t.clone().addScaledVector(normal,3);return {object:model,ray:new T.Ray(eye,t.sub(eye).normalize())};}const t=new T.Vector3(kind==='pad'?0:kind==='keyboard'?0:10,.329,kind==='keyboard'?-4:6.8).applyMatrix4(model.getObjectByName('M3_Surface_8').matrixWorld),eye=t.clone().add(new T.Vector3(0,3,0));return {object:model,ray:new T.Ray(eye,t.sub(eye).normalize())};};
 const rayFan=()=>{const object=fanRoot.getObjectByName('fan-switch'),target=new T.Box3().setFromObject(object).getCenter(new T.Vector3()),eye=new T.Vector3(11,14,21);return {object,ray:new T.Ray(eye,target.sub(eye).normalize())};};
 const native=(type,extra={})=>({type,pointerId:7,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointermove'?1:0,clientX:20,clientY:20,target:canvas,timeStamp:time+=10,isTrusted:true,detail:type==='click'?1:0,...extra});
 const synthetic=n=>({...n,nativeEvent:n,currentTarget:hostNode,preventDefault(){},stopPropagation(){}});
 const child=(n,ray)=>({...n,...ray,nativeEvent:n,intersections:[{object:ray.object}],delta:0,stopPropagation(){this.stopped=true;}});
 const handlers=kind=>kind==='fan'?fan.tree.props:pad.tree.props;
 const ray=kind=>kind==='fan'?rayFan():rayLaptop(kind);
 const down=(kind,extra={})=>{const n=native('pointerdown',extra);s.h.tree.props.onPointerDownCapture(synthetic(n));handlers(kind).onPointerDown(child(n,ray(kind)));host().props.onPointerDown(synthetic(n));s.h.tree.props.onPointerDown(synthetic(n));return n;};
 const up=(kind,extra={})=>{const n=native('pointerup',extra);handlers(kind).onPointerUp(child(n,ray(kind)));host().props.onPointerUp(synthetic(n));s.h.tree.props.onPointerUp(synthetic(n));return n;};
 const click=(kind,extra={})=>{const n=native('click',extra);if(extra.legacy)delete n.pointerId;s.h.tree.props.onClickCapture(synthetic(n));handlers(kind).onClick(child(n,ray(kind)));return n;};
 const move=(kind,extra={})=>{const n=native('pointermove',extra);s.h.tree.props.onPointerMoveCapture(synthetic(n));handlers(kind).onPointerMove(child(n,ray(kind)));host().props.onPointerMove(synthetic(n));};
 return {...s,frame:dt=>frame({clock:{elapsedTime:time/1000}},dt),sync,host,down,up,click,move,handlers,native,synthetic,child,ray,fanRoot,get fan(){return fan;},get stage(){return stage;},input:scene(s.h).props.deskInput.current,
 run(seconds){for(let i=0;i<seconds*60;i++){frame({clock:{elapsedTime:time/1000}},1/60);time+=1000/60;audio?.advance(audio.currentTime+1/60);}},
 dispose(){dispose(pad);dispose(fan);world.remove(fanRoot);dispose(s.h);}};
}
const openMenu=s=>{if(!byLabel(s.h,'Workspace navigation').props['aria-expanded']){byLabel(s.h,'Workspace navigation').props.onClick();s.sync();}};
const loops=()=>audio.sources.filter(v=>v.loop&&v.connected&&!v.ended),cues=()=>audio.sources.filter(v=>!v.loop).length;
const snapshot=s=>find(s.stage,n=>n.type===DeskFan).props.snapshot.current.current;
const rotate=s=>s.fanRoot.getObjectByName('fan-rotor').rotation.z;
async function running(){const s=mount();s.h.tree.props.onPointerDown({button:0,isPrimary:true});await tick();s.run(1);return s;}
await check('Actual parent/Scene/frame: navigation advances existing rotor, head, strips and wind snapshot',async()=>{
 const s=await running();try{const instance=s.fan,owner=scene(s.h).props.fanAudio;
 for(const route of ['laptop','phone','printer','paper','desk']){const before=rotate(s),yaw=snapshot(s).yaw,version=s.fanRoot.getObjectByName('fan-streamers').geometry.attributes.position.version;desktop(s.h).props.navigate(route);s.sync();assert.equal(s.fan,instance);assert.equal(scene(s.h).props.fanAudio,owner);s.run(.2);assert.notEqual(rotate(s),before,route+' rotor');assert.notEqual(snapshot(s).yaw,yaw,route+' yaw');assert.ok(s.fanRoot.getObjectByName('fan-streamers').geometry.attributes.position.version>version);s.settle();s.sync();s.run(.1);assert.ok(snapshot(s).power>.9);}
 }finally{s.dispose();}
});
await check('Actual parent/audio: same motor voice survives views, camera pause, menus and Cat Mario app opening',async()=>{
 const s=await running();try{const motor=loops()[0],sources=audio.sources.length,n=cues();assert.ok(motor);
 byLabel(s.h,'Workspace navigation').props.onClick();s.sync();byText(s.h,'Pause desk motion').props.onClick();s.sync();assert.equal(scene(s.h).props.deskPaused,true);
 for(const route of ['laptop','phone','printer','paper','desk']){desktop(s.h).props.navigate(route);s.sync();s.run(.2);assert.ok(loops()[0]===motor,route+' same voice');assert.equal(loops().length,1);byLabel(s.h,'Workspace navigation').props.onClick();s.sync();assert.ok(byLabel(s.h,'Desk fan: on; turn off'));s.run(.2);assert.ok(loops()[0]===motor);assert.equal(scene(s.h).props.deskPaused,true);}
 desktop(s.h).props.open('catmario');s.sync();s.settle();s.run(.2);assert.ok(loops()[0]===motor);assert.equal(audio.sources.length,sources);assert.equal(cues(),n);assert.equal(audio.peakLoops,1);
 }finally{s.dispose();}
});
if(!process.argv.includes('--before')){
await check('Explore switches every ordinary view once; physical gates, held keys, aim priority and UI silence survive',async()=>{
 const s=await running();try{
 for(const route of ['laptop','phone','printer','paper','desk']){
 desktop(s.h).props.navigate(route);s.sync();const p=find(s.stage,n=>n.type===DeskFan).props;assert.equal(p.enabled,route==='desk');
 if(route!=='desk'){s.down('fan');s.up('fan');s.click('fan');s.sync();assert.equal(scene(s.h).props.fanOn,true);scene(s.h).props.onFanToggle();s.sync();assert.equal(scene(s.h).props.fanOn,true);}
 byLabel(s.h,'Workspace navigation').props.onClick();s.sync();const n=cues();let control=byLabel(s.h,'Desk fan: on; turn off');assert.equal(control.props['aria-pressed'],true);
 for(const key of ['Enter',' ']){const e={key,repeat:true,preventDefault(){this.prevented=true;}};control.props.onKeyDown(e);assert.ok(e.prevented);}
 s.h.tree.props.onClickCapture({detail:1,target:{closest:()=>false}});control.props.onClick();s.sync();await tick();assert.equal(view(s.h),route);assert.equal(cues(),n+1);s.run(5);assert.equal(snapshot(s).power,0);assert.equal(loops().length,0);const spin=rotate(s);s.run(.2);assert.equal(rotate(s),spin);
 desktop(s.h).props.navigate('desk');s.sync();s.run(.2);assert.equal(scene(s.h).props.fanOn,false);assert.equal(rotate(s),spin);byLabel(s.h,'Workspace navigation').props.onClick();s.sync();byLabel(s.h,'Desk fan: off; turn on').props.onClick();s.sync();await tick();s.run(.2);assert.ok(snapshot(s).power>0);
 }
 if(byLabel(s.h,'Workspace navigation').props['aria-expanded']){byLabel(s.h,'Workspace navigation').props.onClick();s.sync();}const toss=scene(s.h).props.toss;toss.available=true;toss.enter();toss.phase='aiming';s.sync();scene(s.h).props.onFanToggle();s.sync();assert.equal(scene(s.h).props.fanOn,true);byLabel(s.h,'Workspace navigation').props.onClick();s.sync();assert.notEqual(toss.phase,'aiming');byLabel(s.h,'Desk fan: on; turn off').props.onClick();s.sync();await tick();s.run(.1);byLabel(s.h,'Desk fan: off; turn on').props.onClick();s.sync();await tick();s.run(.1);byLabel(s.h,'Desk fan: on; turn off').props.onClick();s.sync();await tick();s.run(5);assert.equal(snapshot(s).power,0);assert.equal(loops().length,0);toss.exit();
 }finally{s.dispose();}
});
await check('Hidden/pagehide freeze pose and silence; no-frame hidden interval discards first resume delta, no backlog',async()=>{
 const s=await running();try{for(const page of [false,true]){
 const spin=rotate(s);if(page)emit('pagehide');else{document.hidden=true;emit('visibilitychange');}s.sync();audio.advance(audio.currentTime+.2);assert.equal(loops().length,0);s.run(1);assert.equal(rotate(s),spin);assert.equal(scene(s.h).props.fanOn,true);
 if(page)emit('pageshow');else{document.hidden=false;emit('visibilitychange');}s.frame(30);assert.equal(rotate(s),spin);s.frame(1/60);assert.equal(rotate(s),spin);s.run(.2);assert.notEqual(rotate(s),spin);assert.equal(loops().length,1);
 }
 const spin=rotate(s);emit('pagehide');audio.advance(audio.currentTime+.2);emit('pageshow');s.frame(1/60);assert.equal(rotate(s),spin);s.frame(1/60);assert.notEqual(rotate(s),spin);
 }finally{document.hidden=false;s.dispose();}
});
await check('Mute/volume update only owned sound; reduced/narrow/Simple/failure suspend, retain logical switch and pose',async()=>{
 const s=await running();try{const motor=loops()[0];desktop(s.h).props.setSound({muted:false,volume:.2});s.sync();assert.ok(loops()[0]===motor);assert.ok(motor.next.next.gain.events.at(-1).value>0 && motor.next.next.gain.events.at(-1).value<.08);
 for(const pref of [{muted:true,volume:.2},{muted:false,volume:0}]){desktop(s.h).props.setSound(pref);s.sync();s.run(.2);assert.equal(loops().length,0);assert.ok(snapshot(s).power>0);}
 desktop(s.h).props.setSound({muted:false,volume:.4});s.sync();s.run(.1);assert.equal(loops().length,1);
 for(const mode of ['narrow','reduced']){const spin=rotate(s);if(mode==='narrow'){innerWidth=700;emit('resize');}else{globalThis.__media.matches=true;globalThis.__media.change();}s.sync();s.run(.2);assert.equal(rotate(s),spin);assert.equal(loops().length,0);assert.equal(scene(s.h).props.fanOn,true);openMenu(s);assert.equal(!!byLabel(s.h,'Desk fan: on; turn off'),mode==='reduced');
 if(mode==='narrow'){innerWidth=1440;emit('resize');}else{globalThis.__media.matches=false;globalThis.__media.change();}s.sync();s.frame(1/60);assert.equal(rotate(s),spin);s.run(.2);assert.notEqual(rotate(s),spin);assert.equal(loops().length,1);}
 byLabel(s.h,'Workspace navigation').props.onClick();s.sync();if(!byText(s.h,'Simple view')){byLabel(s.h,'Workspace navigation').props.onClick();s.sync();}byText(s.h,'Simple view').props.onClick();s.render();audio.advance(audio.currentTime+.2);assert.equal(scene(s.h),undefined);assert.equal(loops().length,0);byLabel(s.h,'Workspace navigation').props.onClick();s.render();byText(s.h,'Use 3D').props.onClick();s.sync();assert.equal(scene(s.h).props.fanOn,true);
 find(s.h,n=>typeof n.props?.onFailure==='function').props.onFailure();s.render();audio.advance(audio.currentTime+.2);assert.equal(scene(s.h),undefined);assert.equal(loops().length,0);
 }finally{innerWidth=1440;s.dispose();}
});
await check('Pending shared unlock follows navigation but rejects late Off/mute/hidden/disposed cues and starts no stale motor',async()=>{
 for(const mode of ['navigation','off','mute','hidden','dispose']){const s=mount();let resolve;audio.state='suspended';audio.pending=new Promise(r=>resolve=r);const before=audio.sources.length;
 // Turn off while suspended without unlocking, then explicitly request On.
 scene(s.h).props.onFanToggle();s.sync();scene(s.h).props.onFanToggle();s.sync();s.run(.2);
 if(mode==='navigation'){desktop(s.h).props.navigate('phone');s.sync();}
 if(mode==='off'){scene(s.h).props.onFanToggle();s.sync();}
 if(mode==='mute'){desktop(s.h).props.setSound({muted:true,volume:.4});s.sync();}
 if(mode==='hidden'){emit('pagehide');}
 if(mode==='dispose')s.dispose();audio.state='running';resolve();await tick();audio.pending=null;
 if(mode==='navigation'){assert.equal(loops().length,1);assert.equal(audio.sources.slice(before).filter(v=>!v.loop).length,1);}else{assert.equal(audio.sources.length,before,mode);}
 if(mode!=='dispose')s.dispose();assert.equal(audio.closes+audio.suspends,0);assert.ok(audio.nodes.every(n=>!n.connected));assert.ok([...listeners.values()].every(set=>set.size===0));
 }
});
}
await check('Opt-in UI reaches real owners, traces rejected and accepted gestures, exports identity; local Escape and cleanup',async()=>{
 const s=await running();const trace=s.input.trace;assert.equal(trace.enabled,false);assert.equal(trace.report().records.length,0);
 openMenu(s);byText(s.h,'Local runtime diagnostics').props.onClick();s.sync();let node=find(s.h,n=>n.type?.name==='RuntimeDiagnostics');assert.ok(node);const panel=harness(node.type,node.props);byText(panel,'Start new trace and return').props.onClick();s.sync();assert.equal(trace.enabled,true);assert.equal(byLabel(s.h,'Workspace navigation').props['aria-expanded'],false);
 s.down('laptop');s.up('laptop',{isTrusted:false});s.sync();assert.equal(view(s.h),'desk');assert.ok(trace.report().records.some(r=>r.owner==='laptop'&&r.reason==='untrusted'));
 s.down('laptop');s.up('laptop');s.sync();assert.equal(view(s.h),'laptop');s.settle();s.sync();assert.equal(trace.report().state.laptopEnabled,true);assert.ok(trace.report().records.some(r=>r.kind==='navigation'&&r.requested==='laptop'));assert.ok(trace.report().records.some(r=>r.kind==='state'&&r.view==='laptop'));
 const voice=trace.report().state.voice;for(const route of ['phone','paper','printer','laptop']){desktop(s.h).props.navigate(route);s.sync();for(let i=0;i<20;i++)s.frame(.12);assert.equal(trace.report().state.voice,voice);}
 openMenu(s);byLabel(s.h,'Desk fan: on; turn off').props.onClick();s.sync();s.run(5);assert.equal(snapshot(s).power,0);assert.equal(loops().length,0);assert.ok(trace.report().records.some(r=>r.kind==='fan-toggle'&&r.source==='Explore'&&r.on===false));
 byText(s.h,'Local runtime diagnostics').props.onClick();s.sync();node=find(s.h,n=>n.type?.name==='RuntimeDiagnostics');panel.render(node.props);const e={key:'Escape',preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};find(panel,n=>n.props.role==='dialog').props.onKeyDown(e);s.h.tree.props.onKeyDown(e);s.sync();assert.equal(view(s.h),'laptop');assert.equal(find(s.h,n=>n.type?.name==='RuntimeDiagnostics'),undefined);assert.equal(trace.enabled,true);
 trace.stop();const length=trace.report().records.length;s.run(.1);assert.equal(trace.report().records.length,length);dispose(panel);s.dispose();assert.equal(trace.report().records.length,0);
});
console.log(count+' composed continuity groups passed, '+failures+' failed; mocked DOM/audio and offline geometry, not native verification.');if(failures)process.exitCode=1;
`;
const out=path.join(root,'.vite/runtime-composition.mjs');
await build({stdin:{contents:source,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:out,plugins:[{name:'boundaries',setup(b){if(process.argv.includes('--before'))b.onLoad({filter:/src\/prototype\/(Prototype\.jsx|DeskFan\.jsx|fanMotion\.js|fanSound\.js)$/},a=>({contents:fs.readFileSync(path.join(root,'../docs/redesign/session-33-fan-continuity/before',path.basename(a.path)),'utf8'),loader:a.path.endsWith('.jsx')?'jsx':'js',resolveDir:path.dirname(a.path)}));b.onResolve({filter:/^react$/},()=>({path:root+'scripts/support/hook-harness.js'}));b.onResolve({filter:/^@react-three\//},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('fiber')?'export const Canvas="Canvas",useFrame=fn=>{globalThis.__frame=fn;};':'export const useProgress=()=>({active:false,loaded:0,total:0,errors:[]}),RoundedBox="RoundedBox",Environment="Environment",Lightformer="Lightformer",useTexture=()=>({}),useGLTF=()=>({scene:null});'}));b.onResolve({filter:/\?url$/},()=>({path:'asset',namespace:'url'}));b.onLoad({filter:/.*/,namespace:'url'},()=>({contents:'export default "local-asset"'}));b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));for(const name of ['laptop-lighting-fixture','chair-scene-fixture'])b.onResolve({filter:new RegExp('support/'+name+'\\.mjs$')},()=>({path:pathToFileURL(path.join(root,'scripts/support',name+'.mjs')).href,external:true}));}}],loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl','.css':'empty'}});
await import(pathToFileURL(out).href);
