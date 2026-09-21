// Real Three transforms and the existing Rig frame callback; no browser/GPU/input.
import assert from 'node:assert/strict';
import * as T from 'three';
import {Rig,harness} from './support/paper-scene-fixture.mjs';
import {DESK_CAMERA,createDeskInput,deskPose,clearDeskPointer} from '../src/prototype/deskCamera.js';
import {LAPTOP,PHONE,fitPhone} from '../src/prototype/deviceGeometry.js';
import {PAPER_WIDTH,PAPER_HEIGHT} from '../src/prototype/paperGeometry.js';
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
 const frame=dt=>{globalThis.__printerFrames.at(-1)({camera,size,scene},dt);};
 const render=patch=>{Object.assign(props,patch);h.render(props)};
 const run=(seconds,rate=60)=>{for(let i=0;i<Math.round(seconds*rate);i++)frame(1/rate)};
 // Settle without advancing idle phase, so comparisons start at the same pose.
 render({deskPaused:true});run(4);render({deskPaused:false,...extra});
 return {h,props,camera,frame,run,render,events,size};
}

check('phone pickup/settled return reaches neutral desk and resting phone at 30/60/120 Hz',()=>{
 for(const hz of [30,60,120])for(const pickup of [.02,.5,5])for(const paused of [false,true]){
  const f=fixture(undefined,{deskPaused:paused});
  f.props.deskInput.current.manual=true;f.props.orbit.current={yaw:.4,pitch:.2};f.run(3,hz);
  f.render({view:'phone'});f.run(pickup,hz);
  // Same reset request asserted through actual Prototype handlers in the companion suite.
  Object.assign(f.props.deskInput.current,{manual:false,ui:false,reset:1});
  clearDeskPointer(f.props.deskInput.current);f.props.orbit.current={yaw:0,pitch:0};f.render({view:'desk'});
  let arrived=false;
  for(let i=0;i<8*hz;i++){f.frame(1/hz);if(f.events.at(-1)==='desk'){
   assert.ok(f.camera.position.distanceTo(deskPose(f.size).position)<.031);
   assert.ok(f.props.pivot.current.position.distanceTo(new T.Vector3(...PHONE.desk))<.00015);
   assert.ok(f.props.pivot.current.quaternion.angleTo(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,-.23)))<.00015);
   arrived=true;break;
  }}
  assert.ok(arrived);f.run(5,hz);assert.equal(f.props.deskPaused,paused);
  const distance=f.camera.position.distanceTo(deskPose(f.size).position);assert.ok(paused?distance<1e-5:distance>.1);
 }
});
check('rapid return/reentry settles final phone; direct and reduced paths keep normal overview policy',()=>{
 for(const extra of [{},{reduced:true},{direct:true}]){
  const f=fixture(undefined,extra);for(let i=0;i<4;i++){f.render({view:'phone'});f.run(.1);f.render({view:'desk'});f.run(.1)}
  f.render({view:'phone'});f.run(6);assert.equal(f.events.at(-1),'phone');
  assert.ok(f.props.pivot.current.position.distanceTo(new T.Vector3(...PHONE.picked))<1e-8);
  f.props.deskInput.current.reset++;f.render({view:'desk'});f.run(6);assert.equal(f.events.at(-1),'desk');
  if(extra.reduced||extra.direct)assert.ok(f.camera.position.distanceTo(deskPose(f.size).position)<1e-8);
 }
});
console.log(count+' real-Rig/Three math groups passed; no native rendering or keyboard verification.');
