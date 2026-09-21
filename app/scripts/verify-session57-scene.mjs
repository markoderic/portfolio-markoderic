// Real Three transforms and the existing Rig frame callback; no browser/GPU/input.
import assert from 'node:assert/strict';
import * as T from 'three';
import {Rig,Scene,DeskFan,Ball,harness,createPaperToss,tossPose} from './support/session57-scene-fixture.mjs';
import {FAN} from '../src/prototype/fanMotion.js';
import {DESK_CAMERA,createDeskInput,deskPose,clearDeskPointer} from '../src/prototype/deskCamera.js';
import {LAPTOP,PHONE,fitPhone} from '../src/prototype/deviceGeometry.js';
import {PAPER_WIDTH,PAPER_HEIGHT} from '../src/prototype/paperGeometry.js';
globalThis.React={createElement:(type,props,...children)=>({type,props:{...props,children:children.flat(Infinity)}})};
const scene=new T.Scene();
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
function fixture(size={width:1440,height:900},extra={}){
 const screen=new T.Object3D();screen.position.fromArray(LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));screen.rotation.set(...LAPTOP.screenRotation);screen.updateMatrixWorld();
 const pivot=new T.Group(),phone=new T.Object3D();phone.position.fromArray(PHONE.position);pivot.position.fromArray(PHONE.desk);pivot.rotation.set(-Math.PI/2,0,-.23);pivot.add(phone);
 const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT,16,20));
 const hosts=Object.fromEntries(['laptop','phone','mask','paperMask','paper'].map(k=>[k,{current:{style:{},closest:()=>null}}]));
 const height=Math.min(size.height-110,(size.width-96)/1.6),layout={laptop:{width:height*1.6,height},phone:fitPhone(size)};
 const events=[],props={orbit:{current:{yaw:0,pitch:0}},deskInput:{current:createDeskInput()},completedPage:false,view:'desk',direct:false,reduced:false,hosts,layout,onSettled:v=>events.push(v),laptop:{current:screen},phone:{current:phone},pivot:{current:pivot},paper:{current:paper},printer:{current:null},printProgress:{current:0},printMotion:{current:{phase:'idle',progress:0}},...extra};
 const h=harness(Rig,props);const camera=new T.PerspectiveCamera(39,size.width/size.height,.1,100);camera.position.fromArray(DESK_CAMERA.eye);camera.lookAt(...DESK_CAMERA.look);camera.updateMatrixWorld();
 let time=0;let callback=globalThis.__printerFrames.at(-1);const frame=dt=>{time+=dt;callback({camera,size,scene,clock:{elapsedTime:time}},dt);};
 const render=patch=>{Object.assign(props,patch);h.render(props);callback=globalThis.__printerFrames.at(-1)};
 const run=(seconds,rate=60)=>{for(let i=0;i<Math.round(seconds*rate);i++)frame(1/rate)};
 // Settle without advancing idle phase, so comparisons start at the same pose.
 render({deskPaused:true});run(4);render({deskPaused:false,...extra});
 return {h,props,camera,frame,run,render,events,size};
}

check('Real Rig eligibility waits for drawer/page transitions; stable close throwing camera and saved manual/passive state',()=>{
 const game=createPaperToss(),drawerShadow={current:{moving:new Set([0])}},ready=[];
 const f=fixture(undefined,{toss:game,tossReady:v=>ready.push(v),drawerShadow,deskPaused:true});f.run(1);assert.equal(game.available,false);drawerShadow.current.moving.clear();f.run(1);assert.equal(game.available,true);game.available=false;const updates=ready.length;f.frame(1/60);assert.equal(ready.length,updates+1);assert.equal(game.available,true);
 f.props.deskInput.current.manual=true;f.props.orbit.current={yaw:.3,pitch:.1};f.run(3);const before=f.camera.position.clone();assert.ok(game.enter());f.run(4);assert.equal(game.phase,'ready');assert.ok(f.camera.position.distanceTo(tossPose(f.size).position)<1e-9);const stable=f.camera.matrixWorld.clone();f.run(3);assert.deepEqual(f.camera.matrixWorld.elements,stable.elements);assert.equal(f.props.deskPaused,true);
 game.exit();f.run(4);assert.ok(f.camera.position.distanceTo(before)<.0001);assert.equal(f.props.orbit.current.yaw,.3);assert.equal(f.props.deskInput.current.manual,true);
 f.render({view:'paper'});f.run(4);f.render({view:'desk'});f.frame(1/60);assert.equal(game.available,false);f.run(5);assert.equal(game.available,true);
 game.enter();f.run(4);assert.equal(game.phase,'ready');game.exit();f.render({view:'phone'});f.frame(1/60);assert.equal(game.phase,'off');f.run(6);assert.equal(f.events.at(-1),'phone');game.dispose();
});
check('Actual Rig close transition pauses hidden, settles after resize and reverses exit without stale game poses',()=>{
 const game=createPaperToss(),f=fixture({width:1440,height:900},{toss:game,deskPaused:true});assert.ok(game.enter());f.frame(1/60);const entered=f.camera.position.clone();assert.ok(entered.distanceTo(tossPose(f.size).position)>1);f.props.deskInput.current.hidden=true;f.run(2);assert.ok(f.camera.position.equals(entered));f.props.deskInput.current.hidden=false;f.run(4);assert.equal(game.phase,'ready');assert.ok(f.camera.position.distanceTo(tossPose(f.size).position)<1e-9);
 f.size.width=390;f.size.height=844;f.camera.aspect=390/844;f.camera.updateProjectionMatrix();f.frame(1/60);f.run(3);assert.equal(game.phase,'ready');assert.ok(f.camera.position.distanceTo(tossPose(f.size).position)<1e-9);game.exit();f.frame(1/60);assert.ok(f.camera.position.distanceTo(tossPose(f.size).position)>1);f.run(4);assert.ok(f.camera.position.distanceTo(deskPose(f.size).position)<.0001);
 assert.ok(game.enter());f.frame(1/60);game.exit();f.run(4);assert.equal(game.phase,'off');assert.ok(f.camera.position.distanceTo(deskPose(f.size).position)<.0001);f.render({reduced:true});f.frame(1/60);assert.ok(f.camera.position.distanceTo(deskPose(f.size).position)<1e-9);game.dispose();
});
function* nodes(n){if(!n||typeof n!=='object')return;yield n;for(const c of n.props?.children||[])yield* nodes(c);}
check('Actual fan callback publishes before Rig without rendering takeover, coast and hidden snapshots',()=>{
 const snapshot={current:null},input={hidden:false},fan=harness(DeskFan,{on:true,enabled:true,view:'desk',active:true,input,snapshot});
 for(const n of nodes(fan.tree))if(n.props?.ref)n.props.ref.current=new T.Group();const tick=globalThis.__printerFrames.at(-1);assert.equal(tick.priority,-1);let time=0;for(let i=0;i<120;i++){time+=1/60;tick({clock:{elapsedTime:time}},1/60);}assert.ok(snapshot.current.current.power>.95);assert.equal(snapshot.current.current.time,time);assert.ok(snapshot.current.previous.time<time);assert.ok(snapshot.current.current.yaw>=FAN.direction-FAN.sweep&&snapshot.current.current.yaw<=FAN.direction+FAN.sweep);
 const power=snapshot.current.current.power;fan.render({on:false});const coast=globalThis.__printerFrames.at(-1);coast({clock:{elapsedTime:time+1/60}},1/60);assert.ok(snapshot.current.current.power>0&&snapshot.current.current.power<power);input.hidden=true;const frozen={...snapshot.current.current};coast({clock:{elapsedTime:time+1}},1);assert.equal(snapshot.current.current.power,frozen.power);assert.equal(snapshot.current.current.yaw,frozen.yaw);
});
check('Mounted Scene disables device/prop callbacks and drawer gestures while retaining fan until aiming',()=>{
 const game=createPaperToss();game.available=true;game.enter();let physical=0;const fn=()=>physical++,h=harness(Scene,{toss:game,view:'desk',entry:{phase:'active'},deskInput:{current:{}},hosts:{},layout:{},drawers:[false,false,false],onSelect:fn,onTrackpad:fn,onLamp:fn,onResume:fn,onPaper:fn});
 const elements=()=>[...nodes(h.tree)];assert.equal(elements().find(n=>n.props?.drawerShadow&&n.props?.drawers!==undefined)?.props.drawerEnabled,false);
 const laptop=elements().find(n=>n.props?.screen&&n.props?.onTrackpad);assert.equal(laptop.props.enabled,false);
 for(const n of elements()){if(n.props?.pivot&&n.props?.onSelect)n.props.onSelect('phone');if(n.props?.onResume)n.props.onResume();if(n.props?.sheet&&n.props?.onSelect)n.props.onSelect();if(n.type?.name==='Lamp')n.props.onToggle();}assert.equal(physical,0);assert.equal(elements().find(n=>n.type===DeskFan).props.enabled,true);game.phase='aiming';h.render();assert.equal(elements().find(n=>n.type===DeskFan).props.enabled,false);game.dispose();
});
check('Actual reusable ball/cue fits sphere, owns no shadow pass and disposes owned resources',()=>{
 const game=createPaperToss(),h=harness(Ball,{game});h.flushEffects();const mesh=[...nodes(h.tree)].find(n=>n.type==='mesh'),geometry=mesh.props.geometry,a=geometry.attributes.position;let max=0;for(let i=0;i<a.count;i++)max=Math.max(max,new T.Vector3().fromBufferAttribute(a,i).length());assert.ok(max<=.180001);console.log(`Ball maximum vertex radius ${max}; ${a.count} vertices`);assert.equal(mesh.props.castShadow,undefined);assert.equal(h.tree.props.userData.tossOwned,true);let disposed=0;geometry.addEventListener('dispose',()=>disposed++);h.slots.forEach(s=>s.cleanup?.());assert.equal(disposed,1);assert.equal(game.cue,null);assert.equal(game.ball,null);
});
console.log(count+' actual Scene/Rig/fan/resource groups passed; offline callbacks, no native render.');
