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

check('existing Rig puts phone down and settles laptop at 30/60/120Hz',()=>{
 for(const hz of [30,60,120]){
  const f=fixture();f.render({view:'phone'});f.run(6,hz);assert.equal(f.events.at(-1),'phone');
  f.render({view:'laptop'});let arrived=false;
  for(let i=0;i<8*hz;i++){f.frame(1/hz);if(f.events.at(-1)==='laptop'){arrived=true;break;}}
  assert.ok(arrived);assert.ok(f.props.pivot.current.position.distanceTo(new T.Vector3(...PHONE.desk))<.00015);
  assert.ok(f.props.pivot.current.quaternion.angleTo(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,-.23)))<.00015);
  const eye=f.camera.position.clone();f.run(2,hz);assert.ok(f.camera.position.distanceTo(eye)<.001);
 }
});
console.log(count+' actual Rig/Three return group passed; no native transition verification.');
