// Actual parent/Scene/model/fan callbacks and real meshes, simulated native/synthetic ordering.
import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const prior=fs.readFileSync(path.join(root,'scripts/verify-trackpad-wiring.mjs'),'utf8');
const prefix=prior.split('const source = String.raw`')[1].split("await check('Physical pad")[0];
const source=prefix+String.raw`
import React from 'react';import fs from 'node:fs';globalThis.React=React;
import * as T from 'three';import Scene from './src/prototype/Scene';import LaptopModel from './src/prototype/LaptopModel';import DeskFan from './src/prototype/DeskFan';
import {loadLaptop} from './scripts/support/laptop-lighting-fixture.mjs';import {materialize} from './scripts/support/chair-scene-fixture.mjs';import {LAPTOP} from './src/prototype/deviceGeometry';import {deskPose} from './src/prototype/deskCamera';
const world=new T.Scene(),laptopOwner=new T.Group(),model=await loadLaptop();laptopOwner.position.fromArray(LAPTOP.position);model.scale.setScalar(LAPTOP.modelScale);laptopOwner.add(model);world.add(laptopOwner);world.updateMatrixWorld(true);
const canvas={closest:()=>false},hostNode={setPointerCapture(){this.held=true;},hasPointerCapture(){return !!this.held;},releasePointerCapture(){this.held=false;},getBoundingClientRect:()=>({left:0,top:0,width:1440,height:900})};let time=100;
function mount(fresh=false){const s=setup(fresh?'#desk':'#laptop');if(!fresh)desktop(s.h).props.navigate('desk');s.render();s.settle();let stage,pad,fan,fanRoot,frame;const sync=()=>{s.render();stage ||=harness(Scene,scene(s.h).props);stage.render(scene(s.h).props);const p=find(stage,n=>n.type===LaptopModel).props;pad ||=harness(LaptopModel,p);pad.render(p);pad.tree.props.ref.current=laptopOwner;pad.flushEffects();const f=find(stage,n=>n.type===DeskFan).props;fan ||=harness(DeskFan,f);fan.render(f);frame=globalThis.__frame;if(!fanRoot){fanRoot=materialize(fan.tree);world.add(fanRoot);}fan.flushEffects();world.updateMatrixWorld(true);};sync();const host=()=>find(s.h,n=>n.props.className==='scene');
 const rayLaptop=(kind)=>{if(kind==='screen'||kind==='bezel'){const t=new T.Vector3(kind==='bezel'?LAPTOP.width/2+.03:0,0,0).applyEuler(new T.Euler(...LAPTOP.screenRotation)).add(new T.Vector3(...LAPTOP.screenPosition)).add(laptopOwner.position),normal=new T.Vector3(0,0,1).applyEuler(new T.Euler(...LAPTOP.screenRotation)),eye=t.clone().addScaledVector(normal,3);return {object:model,ray:new T.Ray(eye,t.sub(eye).normalize())};}const t=new T.Vector3(kind==='pad'?0:kind==='keyboard'?0:10,.329,kind==='keyboard'?-4:6.8).applyMatrix4(model.getObjectByName('M3_Surface_8').matrixWorld),eye=t.clone().add(new T.Vector3(0,3,0));return {object:model,ray:new T.Ray(eye,t.sub(eye).normalize())};};
 const rayFan=()=>{const object=fanRoot.getObjectByName('fan-switch'),target=new T.Box3().setFromObject(object).getCenter(new T.Vector3()),eye=deskPose({width:1440,height:900}).position;return {object,ray:new T.Ray(eye,target.sub(eye).normalize())};};
 const native=(type,extra={})=>({type,pointerId:7,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointermove'?1:0,clientX:20,clientY:20,target:canvas,timeStamp:time+=10,isTrusted:true,detail:type==='click'?1:0,...extra});
 const synthetic=n=>({...n,nativeEvent:n,currentTarget:hostNode,preventDefault(){},stopPropagation(){}});
 const child=(n,ray)=>({...n,...ray,nativeEvent:n,intersections:[{object:ray.object}],delta:0,stopPropagation(){this.stopped=true;}});
 const handlers=kind=>kind==='fan'?fan.tree.props:pad.tree.props;
 const ray=kind=>kind==='fan'?rayFan():rayLaptop(kind);
 const down=(kind,extra={})=>{const n=native('pointerdown',extra);s.h.tree.props.onPointerDownCapture(synthetic(n));handlers(kind).onPointerDown(child(n,ray(kind)));host().props.onPointerDown(synthetic(n));s.h.tree.props.onPointerDown(synthetic(n));return n;};
 const up=(kind,extra={})=>{const n=native('pointerup',extra);handlers(kind).onPointerUp(child(n,ray(kind)));host().props.onPointerUp(synthetic(n));s.h.tree.props.onPointerUp(synthetic(n));return n;};
 const click=(kind,extra={})=>{const n=native('click',extra);if(extra.legacy)delete n.pointerId;s.h.tree.props.onClickCapture(synthetic(n));handlers(kind).onClick(child(n,ray(kind)));return n;};
 const move=(kind,extra={})=>{const n=native('pointermove',extra);s.h.tree.props.onPointerMoveCapture(synthetic(n));handlers(kind).onPointerMove(child(n,ray(kind)));host().props.onPointerMove(synthetic(n));};
 return {...s,sync,host,down,up,click,move,handlers,native,synthetic,child,ray,fanRoot,get fan(){return fan;},get stage(){return stage;},input:scene(s.h).props.deskInput.current,
 run(seconds){for(let i=0;i<seconds*60;i++){frame({clock:{elapsedTime:time/1000}},1/60);time+=1000/60;audio?.advance(audio.currentTime+1/60);}},
 dispose(){dispose(pad);dispose(fan);world.remove(fanRoot);dispose(s.h);}};
}
await check('Full parent/child sequence: legacy MouseEvent click opens exposed chassis; one trackpad sound',async()=>{for(const kind of ['laptop','pad','screen','bezel','keyboard']){const s=mount();const n=audio?.sources.filter(v=>!v.loop).length||0;s.down(kind);s.up(kind);s.click(kind,{legacy:true});s.click(kind,{legacy:true});s.sync();await tick();assert.equal(view(s.h),'laptop');assert.equal(pushes.filter(p=>p==='#laptop').length,1);assert.equal(audio.sources.filter(v=>!v.loop).length-n,kind==='pad'?1:0);scene(s.h).props.onSettled('laptop');s.sync();assert.equal(desktop(s.h).props.enabled,true);s.dispose();}});

await check('Actual fan guard hit/miss at one client pixel: paired exposed release toggles once',async()=>{
 const s=mount(),camera=new T.PerspectiveCamera(39,1440/900,.1,100);const pose=deskPose({width:1440,height:900});camera.position.copy(pose.position);camera.lookAt(pose.look);camera.updateMatrixWorld();
 const center=new T.Box3().setFromObject(s.fanRoot.getObjectByName('fan-guard')).getCenter(new T.Vector3()).project(camera),cx=(center.x+1)*720,cy=(1-center.y)*450,cast=new T.Raycaster();let witness;
 const at=(x,y)=>{cast.setFromCamera(new T.Vector2(x/720-1,1-y/450),camera);const hits=cast.intersectObject(s.fanRoot,true);return {hit:hits[0],ray:cast.ray.clone()};};
 for(let y=Math.floor(cy-45);y<cy+45&&!witness;y++)for(let x=Math.floor(cx-45);x<cx+45&&!witness;x++){
  const a=at(x,y);if(a.hit?.object.name!=='fan-guard')continue;
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b=at(x+dx,y+dy);if(!b.hit){witness={x,y,dx,dy,a,b};break;}}
 }
 assert.ok(witness,'real visible guard/empty neighbour');const {x,y,dx,dy,a,b}=witness,hit={object:a.hit.object,ray:a.ray},e=s.native('pointerdown',{clientX:x,clientY:y});
 s.h.tree.props.onPointerDownCapture(s.synthetic(e));s.handlers('fan').onPointerDown(s.child(e,hit));s.host().props.onPointerDown(s.synthetic(e));s.h.tree.props.onPointerDown(s.synthetic(e));
 const move=s.native('pointermove',{clientX:x+dx,clientY:y+dy});s.h.tree.props.onPointerMoveCapture(s.synthetic(move));s.handlers('fan').onPointerOut({...s.child(e,hit),intersections:[]});s.host().props.onPointerMove(s.synthetic(move));
 const up=s.native('pointerup',{clientX:x,clientY:y});s.handlers('fan').onPointerUp(s.child(up,hit));s.host().props.onPointerUp(s.synthetic(up));s.h.tree.props.onPointerUp(s.synthetic(up));const click=s.native('click',{clientX:x,clientY:y});delete click.pointerId;s.h.tree.props.onClickCapture(s.synthetic(click));s.handlers('fan').onClick(s.child(click,hit));s.handlers('fan').onClick(s.child(click,hit));s.sync();await tick();assert.equal(scene(s.h).props.fanOn,false);
 fs.writeFileSync(new URL('../../docs/redesign/session-32-device-fan-activation/guard-gap.json',import.meta.url),JSON.stringify({kind:'offline actual fan geometry with modeled parent/R3F delivery, not observed native input',viewport:[1440,900],guardPoint:[x,y],gapPoint:[x+dx,y+dy],guardObject:a.hit.object.name,guardDistance:a.hit.distance,gapHits:0},null,2)+'\n');s.dispose();
});
await check('Successful physical/Explore toggles drive actual fan frame to zero and owned motor silence, rapid reversal',async()=>{const s=mount();s.h.tree.props.onPointerDown({button:0,isPrimary:true});await tick();s.run(2);assert.ok(audio.sources.some(v=>v.loop&&v.connected&&!v.ended));for(const expected of [false,true,false]){const clicks=audio.sources.filter(v=>!v.loop).length;s.down('fan');s.up('fan');s.click('fan');s.click('fan');s.sync();await tick();assert.equal(scene(s.h).props.fanOn,expected);assert.equal(audio.sources.filter(v=>!v.loop).length,clicks+1);const indicator=find(s.fan,n=>n.props.name==='fan-switch-mark');assert.equal(indicator.props.children[0].props.color,expected?'#b7c39a':'#4b5450');s.run(.1);}s.run(5);const snapshot=find(s.stage,n=>n.type===DeskFan).props.snapshot.current;assert.equal(snapshot.current.power,0);assert.equal(audio.sources.filter(v=>v.loop&&v.connected&&!v.ended).length,0);const rotor=s.fanRoot.getObjectByName('fan-rotor'),spin=rotor.rotation.z;s.run(1);assert.equal(rotor.rotation.z,spin);byLabel(s.h,'Workspace navigation').props.onClick();s.sync();byLabel(s.h,'Desk fan: off; turn on').props.onClick();s.sync();await tick();assert.equal(scene(s.h).props.fanOn,true);s.run(.5);assert.ok(snapshot!==find(s.stage,n=>n.type===DeskFan).props.snapshot.current);assert.ok(audio.sources.some(v=>v.loop&&v.connected&&!v.ended));s.dispose();});

await check('Parent cancellation/excursion, wrong/secondary/untrusted release and keyboard click, off-target up and occlusion reject both owners',async()=>{
 for(const kind of ['laptop','pad','fan'])for(const mode of ['away-return','cancel','lost','wrong','right','secondary','off-target','occluded','untrusted','naked','keyboard']){
  const s=mount(),before=audio?.sources.filter(v=>!v.loop).length||0;let block;
  if(mode!=='naked'&&mode!=='keyboard')s.down(kind,mode==='right'?{button:2}:mode==='secondary'?{isPrimary:false}:{});
  if(mode==='away-return'){s.h.tree.props.onPointerMoveCapture(s.synthetic(s.native('pointermove',{clientX:80})));s.move(kind);}
  if(mode==='cancel')s.h.tree.props.onPointerCancel();
  if(mode==='lost'){const e=s.synthetic(s.native('lostpointercapture'));s.host().props.onLostPointerCapture(e);s.h.tree.props.onLostPointerCapture(e);}
  if(mode==='occluded'){const r=s.ray(kind).ray;block=new T.Mesh(new T.BoxGeometry(.6,.6,.6));block.position.copy(r.origin).addScaledVector(r.direction,1);world.add(block);world.updateMatrixWorld(true);}
  if(mode==='off-target'){const e=s.synthetic(s.native('pointerup'));s.host().props.onPointerUp(e);s.h.tree.props.onPointerUp(e);}else s.up(kind,mode==='wrong'?{pointerId:99}:mode==='untrusted'?{isTrusted:false}:{});
  s.click(kind,{legacy:mode!=='wrong',...(mode==='wrong'?{pointerId:99}:mode==='untrusted'?{isTrusted:false}:mode==='keyboard'?{detail:0}:{} )});s.sync();await tick();
  assert.equal(view(s.h),'desk',kind+'/'+mode);assert.equal(scene(s.h).props.fanOn,true,kind+'/'+mode);assert.equal(audio.sources.filter(v=>!v.loop).length,before,kind+'/'+mode);if(block)world.remove(block);s.dispose();
 }
});
await check('Valid release is final: late, unexpected-ID or untrusted subsequent click cannot repeat or revoke activation',async()=>{
 for(const kind of ['laptop','pad','fan']){const s=mount();s.down(kind);s.up(kind);s.sync();assert.equal(kind==='fan'?scene(s.h).props.fanOn:view(s.h),kind==='fan'?false:'laptop');time+=1500;s.click(kind,{pointerId:-1});s.click(kind,{isTrusted:false});s.sync();assert.equal(kind==='fan'?scene(s.h).props.fanOn:view(s.h),kind==='fan'?false:'laptop');s.dispose();}
});
await check('Touch implicit capture release after valid up remains a paired click; premature loss cancels',async()=>{
 for(const kind of ['laptop','pad','fan']){const s=mount();s.down(kind,{pointerType:'touch'});s.up(kind,{pointerType:'touch'});const e=s.synthetic(s.native('lostpointercapture',{pointerType:'touch'}));s.handlers(kind).onLostPointerCapture(s.child(e,s.ray(kind)));s.host().props.onLostPointerCapture(e);s.h.tree.props.onLostPointerCapture(e);s.click(kind,{legacy:true,pointerType:'touch'});s.sync();assert.equal(kind==='fan'?scene(s.h).props.fanOn:view(s.h),kind==='fan'?false:'laptop');s.dispose();}
});
await check('Device/Cat Mario return, Explore close, game exit/cancel and cancelled orbit do not strand activation flags',async()=>{
 for(const route of ['laptop','phone','paper','catmario','explore','toss-exit','toss-cancel','orbit']){
  const s=mount();
  if(['laptop','phone','paper'].includes(route)){desktop(s.h).props.navigate(route);s.sync();s.settle();desktop(s.h).props.navigate('desk');s.sync();s.settle();}
  if(route==='catmario'){desktop(s.h).props.open('catmario');s.sync();s.settle();assert.ok(desktop(s.h).props.manager.windows.some(w=>w.id==='catmario'));const e=key();s.h.tree.props.onKeyDownCapture(e);s.h.tree.props.onKeyDown(e);s.sync();s.settle();}
  if(route==='explore'){byLabel(s.h,'Workspace navigation').props.onClick();s.sync();assert.equal(find(s.stage,n=>n.type===LaptopModel).props.enabled,false);byLabel(s.h,'Workspace navigation').props.onClick();s.sync();}
  if(route.startsWith('toss')){const game=scene(s.h).props.toss;game.available=true;game.enter();s.sync();assert.equal(find(s.stage,n=>n.type===LaptopModel).props.enabled,false);game.phase='aiming';s.sync();assert.equal(find(s.stage,n=>n.type===DeskFan).props.enabled,false);if(route==='toss-cancel')game.cancelAim();game.exit();s.sync();}
  if(route==='orbit'){const n=s.native('pointerdown');s.h.tree.props.onPointerDownCapture(s.synthetic(n));s.host().props.onPointerDown(s.synthetic(n));s.host().props.onPointerMove(s.synthetic(s.native('pointermove',{clientX:80})));s.h.tree.props.onPointerCancel();s.sync();}
  assert.equal(s.input.dragging,false,route);assert.equal(scene(s.h).props.toss.active(),false,route);s.down('fan');s.up('fan');s.click('fan',{legacy:true});s.sync();assert.equal(scene(s.h).props.fanOn,false,route);s.down('laptop');s.up('laptop');s.click('laptop',{legacy:true});s.sync();assert.equal(view(s.h),'laptop',route);s.dispose();
 }
});

await check('Fresh terminal/arrival lock then first eligible physical click and interactive desktop',async()=>{
 const s=mount(true);assert.equal(find(s.stage,n=>n.type===LaptopModel).props.enabled,false);assert.equal(find(s.stage,n=>n.type===DeskFan).props.enabled,false);
 // Real initialization callbacks, no clock fake-completion or automatic entry.
 for(const stage of ['desk','laptopModel','phone','workspace','resources'])scene(s.h).props.onStageReady(stage);
 s.sync();const confirm=find(s.h,n=>n.props.className==='entry-confirm');assert.ok(confirm);confirm.props.onClick({preventDefault(){},stopPropagation(){},target:{closest:()=>false}});s.sync();
 assert.equal(scene(s.h).props.entry.phase,'arriving');
 if(scene(s.h).props.entry.phase==='arriving'){assert.equal(find(s.stage,n=>n.type===LaptopModel).props.enabled,false);scene(s.h).props.onArrivalComplete(scene(s.h).props.entry.token);s.sync();}
 assert.equal(scene(s.h).props.entry.phase,'active');s.down('laptop');s.up('laptop');s.click('laptop',{legacy:true});s.sync();scene(s.h).props.onSettled('laptop');s.sync();assert.equal(desktop(s.h).props.enabled,true);s.dispose();
});
console.log(count+' composed activation groups passed, '+failures+' failed; actual callbacks/geometry/motion with mocked DOM/input/audio, not native verification.');if(failures)process.exitCode=1;
`;
const out=path.join(root,'.vite/device-fan-activation.mjs');
await build({stdin:{contents:process.argv.includes('--before')?source.slice(0,source.indexOf("await check('Parent cancellation"))+"console.log(count+' pre-fix groups passed, '+failures+' failed');if(failures)process.exitCode=1;":source,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:out,plugins:[{name:'boundaries',setup(b){if(process.argv.includes('--before'))b.onLoad({filter:/src\/prototype\/(Prototype\.jsx|fanInput\.js|trackpadInput\.js)$/},a=>({contents:fs.readFileSync(path.join(root,'../docs/redesign/session-32-device-fan-activation/before',path.basename(a.path)),'utf8'),loader:a.path.endsWith('.jsx')?'jsx':'js',resolveDir:path.dirname(a.path)}));b.onResolve({filter:/^react$/},()=>({path:root+'scripts/support/hook-harness.js'}));b.onResolve({filter:/^@react-three\//},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('fiber')?'export const Canvas="Canvas",useFrame=fn=>{globalThis.__frame=fn;};':'export const useProgress=()=>({active:false,loaded:0,total:0,errors:[]}),RoundedBox="RoundedBox",Environment="Environment",Lightformer="Lightformer",useTexture=()=>({}),useGLTF=()=>({scene:null});'}));b.onResolve({filter:/\?url$/},()=>({path:'asset',namespace:'url'}));b.onLoad({filter:/.*/,namespace:'url'},()=>({contents:'export default "local-asset"'}));b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));for(const name of ['laptop-lighting-fixture','chair-scene-fixture'])b.onResolve({filter:new RegExp('support/'+name+'\\.mjs$')},()=>({path:pathToFileURL(path.join(root,'scripts/support',name+'.mjs')).href,external:true}));}}],loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl','.css':'empty'}});
await import(pathToFileURL(out).href);
