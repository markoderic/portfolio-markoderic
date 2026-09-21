// Executes the real Rig with Three geometry. Renderer/DOM/input are mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createEntry,transitionEntry} from '../src/prototype/entryState.js';
import {ARRIVAL,arrivalPose} from '../src/prototype/entryCamera.js';
import {Rig,harness} from './support/paper-scene-fixture.mjs';
import {DESK_CAMERA,createDeskInput,createDeskMotion,deskAngles,deskPose,deskHit,recordDeskPointer,clearDeskPointer,updateDeskMotion} from '../src/prototype/deskCamera.js';
import {LAPTOP,PHONE,fitPhone} from '../src/prototype/deviceGeometry.js';
import {PAPER_WIDTH,PAPER_HEIGHT} from '../src/prototype/paperGeometry.js';
const dir=new URL('../../docs/redesign/session-18-vintage-clock/camera/',import.meta.url);
const meshes=JSON.parse(fs.readFileSync(new URL('../../docs/redesign/session-07-chair-refinement/after-render.json',import.meta.url))).meshes.filter(m=>!['desk','plant','lamp','printer','bin'].includes(m.root)).concat(...['session-15-drawers/open-desk.json','session-12-plant/after-plant.json','session-16-palette-bin/rose-props.json','session-17-desk-fan/center-fan.json','session-18-vintage-clock/day-clock.json'].map(p=>JSON.parse(fs.readFileSync(new URL('../../docs/redesign/'+p,import.meta.url))).meshes));
const scene=new T.Scene(),roots={};
for(const m of meshes){const root=roots[m.root]||=new T.Group();root.name=m.root;if(['laptop','phone','printer','lamp'].includes(m.root))root.userData.deskTarget=m.root;if(!root.parent)scene.add(root);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.positions.flat(),3));g.setIndex(m.indices);const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=m.name||'';mesh.userData.fanTrigger=m.root==='fan'&&['fan-base','fan-switch','fan-switch-mark'].includes(m.name);root.add(mesh)}
scene.updateMatrixWorld(true);
const checkResults=[];function check(name,fn){if(process.argv.includes('--projection-only')&&!name.startsWith('clock enclosure'))return;fn();checkResults.push(name);console.log('PASS '+name)}
function fixture(size={width:1440,height:900},extra={}){
 const screen=new T.Object3D();screen.position.fromArray(LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));screen.rotation.set(...LAPTOP.screenRotation);screen.updateMatrixWorld();
 const pivot=new T.Group(),phone=new T.Object3D();phone.position.fromArray(PHONE.position);pivot.position.fromArray(PHONE.desk);pivot.rotation.set(-Math.PI/2,0,-.23);pivot.add(phone);
 const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT,16,20));
 const hosts=Object.fromEntries(['laptop','phone','mask','paperMask','paper'].map(k=>[k,{current:{style:{},closest:()=>null}}]));
 const height=Math.min(size.height-110,(size.width-96)/1.6),layout={laptop:{width:height*1.6,height},phone:fitPhone(size)};
 const events=[],props={orbit:{current:{yaw:0,pitch:0}},deskInput:{current:createDeskInput()},completedPage:false,view:'desk',direct:false,reduced:false,hosts,layout,onSettled:v=>events.push(v),laptop:{current:screen},phone:{current:phone},pivot:{current:pivot},paper:{current:paper},printer:{current:null},printProgress:{current:0},printMotion:{current:{phase:'idle',progress:0}},...extra};
 const h=harness(Rig,props);const camera=new T.PerspectiveCamera(39,size.width/size.height,.1,100);camera.position.fromArray(DESK_CAMERA.eye);camera.lookAt(...DESK_CAMERA.look);camera.updateMatrixWorld();
 const frame=dt=>{globalThis.__printerFrames.at(-1)({camera,size,scene},dt);};
 const render=patch=>{Object.assign(props,patch);h.render(props)};
 const run=(seconds,rate=60)=>{for(let i=0;i<Math.round(seconds*rate);i++)frame(1/rate)};
 // Settle without advancing idle phase, so comparisons start at the same pose.
 render({deskPaused:true});run(4);render({deskPaused:false,...extra});
 return {h,props,camera,frame,run,render,events,size};
}
check('ready terminal holds far pose; 30/60/120 Hz arrival completes exactly once at one visible second',()=>{
 for(const hz of [30,60,120]){
  const entry=createEntry(true),completions=[],f=fixture(undefined,{entry,onArrivalComplete:token=>{completions.push(token);transitionEntry(entry,'complete',token)}});
  f.run(30,hz);assert.ok(f.camera.position.distanceTo(arrivalPose(f.size,0).position)<1e-10);assert.equal(entry.phase,'terminal');assert.equal(completions.length,0);
  transitionEntry(entry,'confirm');for(let i=0;i<hz-1;i++)f.frame(1/hz);assert.equal(entry.phase,'arriving');f.frame(1/hz);assert.equal(entry.phase,'active');assert.deepEqual(completions,[1]);assert.ok(f.camera.position.distanceTo(deskPose(f.size).position)<1e-10);
  const end=f.camera.position.clone();f.frame(1/hz);assert.ok(f.camera.position.distanceTo(end)<1e-10);f.frame(1/hz);assert.ok(f.camera.position.distanceTo(end)<.01);f.run(5,hz);assert.equal(completions.length,1);assert.ok(f.camera.position.distanceTo(end)>.1);
 }
});
check('hidden and large deltas freeze arrival without replay; skip and navigation cancel it',()=>{
 const entry=createEntry(true),done=[],f=fixture(undefined,{entry,onArrivalComplete:t=>done.push(t)});transitionEntry(entry,'confirm');f.run(.25);const p=f.camera.position.clone();f.props.deskInput.current.hidden=true;f.run(10);assert.ok(p.equals(f.camera.position));f.props.deskInput.current.hidden=false;f.frame(60);assert.ok(p.equals(f.camera.position));transitionEntry(entry,'cancel');f.render({view:'phone'});f.run(5);assert.equal(done.length,0);assert.equal(f.events.at(-1),'phone');const q=f.camera.position.clone();f.run(5);assert.ok(q.equals(f.camera.position));
 const skip=createEntry(true),g=fixture(undefined,{entry:skip});transitionEntry(skip,'skip');g.frame(1/60);assert.ok(g.camera.position.distanceTo(deskPose(g.size).position)<1e-10);
});
check('arrival whole-workstation silhouette stays in frame; descending path does not cross furniture',()=>{
 let maxExtent=0;const samples=[];
 for(const size of [{width:1440,height:900},{width:800,height:500},{width:800,height:900},{width:2560,height:1080}]){
  const camera=new T.PerspectiveCamera(39,size.width/size.height,.1,100),points=meshes.flatMap(m=>m.positions.map(p=>new T.Vector3(...p)));let lastY=Infinity;
  for(let i=0;i<=100;i++){const pose=arrivalPose(size,i/100);assert.ok(pose.position.y<=lastY+1e-9);lastY=pose.position.y;camera.position.copy(pose.position);camera.lookAt(pose.look);camera.updateMatrixWorld();for(const point of points){const p=point.clone().project(camera);maxExtent=Math.max(maxExtent,Math.abs(p.x),Math.abs(p.y));assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.96&&p.z<1&&p.z>-1)}for(const root of Object.values(roots))assert.equal(new T.Box3().setFromObject(root).containsPoint(pose.position),false);if(size.width===1440&&[0,10,25,50,75,100].includes(i))samples.push({seconds:i/100,position:pose.position.toArray(),look:pose.look.toArray()});}
 }
 fs.writeFileSync(new URL('arrival-samples.json',dir),JSON.stringify({ARRIVAL,samples,maxExtent,evidence:'Actual geometry/projection math, not browser pacing'},null,2));
});
check('stationary pointer produces bounded continuous motion and desk remains interactive',()=>{
 const f=fixture(),start=f.camera.position.clone();let distance=0;for(let i=0;i<2400;i++){f.frame(1/60);const angles=f.props.deskInput.current.liveOrbit;assert.ok(Math.abs(angles.yaw)<=DESK_CAMERA.yaw+1e-12);assert.ok(Math.abs(angles.pitch)<=DESK_CAMERA.pitch+1e-12);distance=Math.max(distance,start.distanceTo(f.camera.position));assert.equal(f.events.at(-1),'desk')}
 assert.ok(distance>2);assert.ok(f.camera.up.equals(new T.Vector3(0,1,0)));
});
check('30/60/120 Hz timing agrees, and periodic position/velocity join is smooth',()=>{
 const final=[];for(const hz of [30,60,120]){const f=fixture();f.run(12,hz);final.push(f.camera.position.clone())}assert.ok(final[0].distanceTo(final[2])<.025);
 const eps=1e-4,p=t=>deskPose({width:1440,height:900},deskAngles(t)).position;
 assert.ok(p(0).distanceTo(p(40))<1e-12);assert.ok(p(eps).sub(p(-eps)).multiplyScalar(1/(2*eps)).distanceTo(p(40+eps).sub(p(40-eps)).multiplyScalar(1/(2*eps)))<1e-8);
});
check('pause, hidden tab and large delta freeze phase without a return leap',()=>{
 const f=fixture();f.run(6);f.render({deskPaused:true});f.run(3);const p=f.camera.position.clone();f.run(20);assert.ok(p.distanceTo(f.camera.position)<1e-5);
 f.render({deskPaused:false});f.props.deskInput.current.hidden=true;f.run(10);assert.ok(p.distanceTo(f.camera.position)<1e-5);f.props.deskInput.current.hidden=false;f.frame(60);assert.ok(p.distanceTo(f.camera.position)<1e-5);f.frame(1/60);assert.ok(p.distanceTo(f.camera.position)<.01);
});
check('manual orbit wins, persists until deliberate resume, and reset keeps chosen pause',()=>{
 const f=fixture();f.run(6);f.props.deskInput.current.manual=true;f.props.orbit.current={yaw:.35,pitch:-.1};f.render({deskPaused:true});f.run(4);const expected=deskPose(f.size,f.props.orbit.current);assert.ok(f.camera.position.distanceTo(expected.position)<1e-5);const p=f.camera.position.clone();f.run(5);assert.ok(p.distanceTo(f.camera.position)<1e-5);
 f.props.deskInput.current.manual=false;f.render({deskPaused:false});f.frame(1/60);assert.ok(p.distanceTo(f.camera.position)<.5);f.run(4);assert.ok(p.distanceTo(f.camera.position)>2);
});
check('focused laptop/phone/paper settle, stay exact, and return resumes smoothly',()=>{
 const f=fixture();f.run(6);for(const view of ['laptop','phone','paper','printer']){f.render({view});f.run(5);assert.equal(f.events.at(-1),view);const p=f.camera.position.clone(),q=f.camera.quaternion.clone();f.run(3);assert.ok(p.equals(f.camera.position));assert.ok(q.equals(f.camera.quaternion));}
 f.render({view:'desk'});const p=f.camera.position.clone();f.frame(1/60);assert.ok(p.distanceTo(f.camera.position)<2);f.run(6);assert.equal(f.events.at(-1),'desk');const back=f.camera.position.clone();f.run(2);assert.ok(back.distanceTo(f.camera.position)>.1);
});
check('reduced/direct and active overlays have stable framing, without changing pause choice',()=>{
 for(const pref of [{reduced:true},{direct:true},{deskBlocked:true}]){const f=fixture(undefined,pref);f.run(5);const p=f.camera.position.clone();f.run(20);assert.ok(p.distanceTo(f.camera.position)<1e-8)}
});
check('actual mesh hover uses a frozen camera and hysteresis; camera motion alone cannot churn it',()=>{
 const f=fixture();const input=f.props.deskInput.current,state=createDeskMotion();state.active=true;state.width=f.size.width;state.height=f.size.height;
 const center=new T.Box3().setFromObject(roots.laptop).getCenter(new T.Vector3()).project(f.camera),pointer={x:(center.x+1)*720,y:(1-center.y)*450,width:1440,height:900};
 input.pointer=pointer;input.serial++;const update=()=>updateDeskMotion(state,{dt:1/60,camera:f.camera,scene,size:f.size,input,orbit:input.liveOrbit,active:true});update();assert.equal(state.hover?.id,'laptop');const clock=state.time,anchorCamera=state.hitCamera;
 // Even a deliberately changed actual camera cannot induce a new hit at rest.
 f.camera.position.x+=2;f.camera.lookAt(0,0,0);f.camera.updateMatrixWorld();for(let i=0;i<600;i++)update();assert.equal(state.hover.id,'laptop');assert.equal(state.hitCamera,anchorCamera);assert.equal(state.time,clock);
 input.pointer={...pointer,x:pointer.x+1};input.serial++;update();assert.equal(state.hover.id,'laptop');
 input.pointer={...pointer,x:10,y:10};input.serial++;update();assert.equal(state.hover,null);assert.equal(state.hitCamera,null);
 input.pointer=pointer;input.serial++;update();clearDeskPointer(input);update();assert.equal(state.hover,null);
});
check('hover only identifies actionable visible meshes; touch/cancel cannot leave sticky intent',()=>{
 const state=createDeskMotion(),c=new T.PerspectiveCamera(39,1.6,.1,100);c.position.set(0,0,5);c.lookAt(0,0,0);c.updateMatrixWorld();const group=new T.Group(),m=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());group.add(m);const s=new T.Scene();s.add(group);s.updateMatrixWorld(true);const pointer={x:800,y:500,width:1600,height:1000};assert.equal(deskHit(state,c,s,pointer),null);group.userData.deskTarget='lamp';assert.equal(deskHit(state,c,s,pointer).id,'lamp');group.visible=false;assert.equal(deskHit(state,c,s,pointer),null);
 const input=createDeskInput(),rect={left:0,top:0,width:1600,height:1000};recordDeskPointer(input,{pointerType:'mouse',buttons:0,clientX:800,clientY:500},rect);const serial=input.serial;recordDeskPointer(input,{pointerType:'mouse',buttons:0,clientX:800,clientY:500},rect);assert.equal(input.serial,serial);recordDeskPointer(input,{pointerType:'touch',buttons:0,clientX:800,clientY:500},rect);assert.equal(input.pointer,null);
});
check('all existing desktop actions have hover hit witnesses; preview keeps target center aligned and fits context',()=>{
 const f=fixture(),state=createDeskMotion();
 // Lamp witness is its exposed left base; the fan physically overlaps the right/center from this view.
 const targets={laptop:new T.Vector3(...LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition)),phone:new T.Vector3(...PHONE.desk),printer:new T.Vector3(-3.65,1.35,-.65),lamp:new T.Vector3(3.15,.13,-1.05)};
 for(const [id,point]of Object.entries(targets)){
  const ndc=point.clone().project(f.camera),pointer={x:(ndc.x+1)*f.size.width/2,y:(1-ndc.y)*f.size.height/2,...f.size};assert.equal(deskHit(state,f.camera,scene,pointer)?.id,id,id);
  const center=new T.Box3().setFromObject(roots[id]).getCenter(new T.Vector3()),before=deskPose(f.size),after=deskPose(f.size,undefined,center),c=new T.PerspectiveCamera(39,1.6,.1,100);
  c.position.copy(before.position);c.lookAt(before.look);c.updateMatrixWorld();const a=center.clone().project(c);c.position.copy(after.position);c.lookAt(after.look);c.updateMatrixWorld();const b=center.clone().project(c);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-12);
  for(const mesh of meshes)for(const xyz of mesh.positions){const v=new T.Vector3(...xyz).project(c);assert.ok(Math.abs(v.x)<.96&&Math.abs(v.y)<.96);}
 }
});
check('clock display is exposed from the normal desk view and has no interaction target',()=>{
 const f=fixture(),raycast=new T.Raycaster(),display=roots.clock.getObjectByName('clock-segments');display.geometry.computeBoundingBox();const box=display.geometry.boundingBox;let visible=0;
 for(let x=0;x<=4;x++){const point=new T.Vector3(box.min.x+(box.max.x-box.min.x)*x/4,(box.min.y+box.max.y)/2,(box.min.z+box.max.z)/2);raycast.set(f.camera.position,point.clone().sub(f.camera.position).normalize());const first=raycast.intersectObjects(scene.children,true)[0];if(first?.object.parent===roots.clock)visible++;}assert.equal(visible,5);assert.equal(roots.clock.userData.deskTarget,undefined);
});
const frames=[];const add=(name,size,pose)=>frames.push({name,...size,eye:pose.position.toArray(),look:pose.look.toArray()});
add('before-neutral',{width:1440,height:900},{position:new T.Vector3(10,6.8,23),look:new T.Vector3(0,-2,1)});
for(const [name,time]of [['after-neutral',0],['arc-right',10],['arc-left',30]])add(name,{width:1440,height:900},deskPose({width:1440,height:900},deskAngles(time)));
add('hover-laptop',{width:1440,height:900},deskPose({width:1440,height:900},deskAngles(10),new T.Box3().setFromObject(roots.laptop).getCenter(new T.Vector3())));
add('narrow-overview',{width:800,height:900},deskPose({width:800,height:900}));
let maxExtent=0;
check('fixed actual workstation fits at passive and manual extremes across supported viewport sizes',()=>{
 const points=meshes.flatMap(m=>m.positions.map(p=>new T.Vector3(...p)));
 for(const size of [{width:1440,height:900},{width:1280,height:720},{width:800,height:900},{width:800,height:500},{width:2560,height:1080}])for(const angles of [...Array.from({length:17},(_,i)=>deskAngles(i*2.5)),...[-.48,.48].flatMap(yaw=>[-.16,.22].map(pitch=>({yaw,pitch})))]){
  const c=new T.PerspectiveCamera(39,size.width/size.height,.1,100),p=deskPose(size,angles);c.position.copy(p.position);c.lookAt(p.look);c.updateMatrixWorld();for(const point of points){const v=point.clone().project(c);maxExtent=Math.max(maxExtent,Math.abs(v.x),Math.abs(v.y));assert.ok(Math.abs(v.x)<.96&&Math.abs(v.y)<.96&&v.z<1,JSON.stringify({size,angles,v:v.toArray()}));}
 }
});
const {fanEnvelope}=await import('./support/fan-envelope.mjs');
check('complete analytic fan envelope fits passive/manual framing and both physical controls have visible rays',()=>{
 const b=fanEnvelope(),points=Array.from({length:8},(_,i)=>new T.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z));
 for(const size of [{width:1440,height:900},{width:800,height:900},{width:2560,height:1080}])for(const angles of [...Array.from({length:17},(_,i)=>deskAngles(i*2.5)),...[-.48,.48].flatMap(yaw=>[-.16,.22].map(pitch=>({yaw,pitch})))]){
  const c=new T.PerspectiveCamera(39,size.width/size.height,.1,100),p=deskPose(size,angles);c.position.copy(p.position);c.lookAt(p.look);c.updateMatrixWorld();for(const point of points){const v=point.clone().project(c);assert.ok(Math.abs(v.x)<.96&&Math.abs(v.y)<.96&&v.z<1);}
 }
 const f=fixture(),raycast=new T.Raycaster();for(const name of ['fan-base','fan-switch']){const object=roots.fan.getObjectByName(name);object.geometry.computeBoundingBox();const target=object.geometry.boundingBox.getCenter(new T.Vector3());raycast.set(f.camera.position,target.clone().sub(f.camera.position).normalize());const hits=raycast.intersectObjects(scene.children,true);assert.ok(hits[0]?.object.userData.fanTrigger,name);}
});
if(!process.argv.includes('--projection-only'))fs.writeFileSync(new URL('framing.json',dir),JSON.stringify({frames,maxExtent,geometrySource:'Session 07 furniture/M3, Session 10 lamp, Session 12 plant',offline:true},null,2)+'\n');



const clockBox=new T.Box3().setFromObject(roots.clock),clockHit=new T.Vector3(),ray=new T.Ray();let samples=0;
check('clock enclosure clears sampled live laptop and phone sightlines during camera/device transitions',()=>{
 for(const size of [{width:1440,height:900},{width:800,height:900},{width:2560,height:1080}])for(const angles of [{yaw:0,pitch:0},{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}]){
  const f=fixture(size,{deskPaused:true});f.props.orbit.current=angles;f.props.deskInput.current.manual=true;f.run(3);
  for(const view of ['laptop','desk','phone','desk','printer','paper','desk']){
   f.render({view});for(let tick=0;tick<100;tick++){f.frame(1/30);for(const [screen,width,height]of [[f.props.laptop.current,LAPTOP.width,LAPTOP.height],[f.props.phone.current,PHONE.width,PHONE.height]]){
    screen.updateWorldMatrix(true,false);for(let x=0;x<=4;x++)for(let y=0;y<=4;y++){
     const point=new T.Vector3((x/4-.5)*width,(y/4-.5)*height,0).applyMatrix4(screen.matrixWorld),distance=point.distanceTo(f.camera.position);ray.set(f.camera.position,point.clone().sub(f.camera.position).normalize());const at=ray.intersectBox(clockBox,clockHit);assert.ok(!at||at.distanceTo(f.camera.position)>distance,'clock before live screen '+JSON.stringify({view,tick,size,angles,screen:screen===f.props.laptop.current?'laptop':'phone',point:point.toArray(),camera:f.camera.position.toArray(),hit:at}));samples++;
    }
   }}
  }
 }
});
fs.writeFileSync(new URL('clock-projection.json',dir),JSON.stringify({samples,method:'Actual Rig camera/phone poses; rays through 5x5 grids of both measured displays against the entire conservative clock AABB. Sampled views/time/grid, not browser compositing proof.'},null,2)+'\n');

if(!process.argv.includes('--projection-only'))fs.writeFileSync(new URL('camera-checks.json',dir),JSON.stringify({checks:checkResults,maxExtent,evidence:'Actual Rig callbacks and geometry; source/offline checks, not browser/native verification'},null,2)+'\n');console.log(`${checkResults.length} camera checks passed`);
