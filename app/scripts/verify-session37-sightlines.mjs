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
const dir=new URL('../../docs/redesign/session-37-props/',import.meta.url);
const meshes=JSON.parse(fs.readFileSync(new URL('after-scene.json',dir))).meshes;
const scene=new T.Scene(),roots={};
for(const m of meshes){const root=roots[m.root]||=new T.Group();root.name=m.root;if(['laptop','phone','printer','lamp'].includes(m.root))root.userData.deskTarget=m.root;if(!root.parent)scene.add(root);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.positions.flat(),3));g.setIndex(m.indices);const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=m.name||'';mesh.userData.fanOwned=m.root==='fan'&&m.name!=='fan-streamers';root.add(mesh)}
fs.mkdirSync(dir,{recursive:true});scene.updateMatrixWorld(true);
const checkResults=[];function check(name,fn){if(process.argv.includes('--projection-only')&&!name.startsWith('production props')&&!name.startsWith('new props'))return;fn();checkResults.push(name);console.log('PASS '+name)}
function fixture(size={width:1440,height:900},extra={}){
 const screen=new T.Object3D();screen.position.fromArray(LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));screen.rotation.set(...LAPTOP.screenRotation);screen.updateMatrixWorld();
 const pivot=new T.Group(),phone=new T.Object3D();phone.position.fromArray(PHONE.position);pivot.position.fromArray(PHONE.desk);pivot.rotation.set(-Math.PI/2,0,-.23);pivot.add(phone);
 const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT,16,20));
 const hosts=Object.fromEntries(['laptop','phone','mask','paperMask','paper'].map(k=>[k,{current:{style:{},closest:()=>null}}]));
 const height=Math.min(size.height-110,(size.width-96)/1.6,(size.height-32)/1.118),layout={laptop:{width:height*1.6,height},phone:fitPhone(size)};
 const events=[],props={orbit:{current:{yaw:0,pitch:0}},deskInput:{current:createDeskInput()},completedPage:false,view:'desk',direct:false,reduced:false,hosts,layout,onSettled:v=>events.push(v),laptop:{current:screen},phone:{current:phone},pivot:{current:pivot},paper:{current:paper},printer:{current:null},printProgress:{current:0},printMotion:{current:{phase:'idle',progress:0}},...extra};
 const h=harness(Rig,props);const camera=new T.PerspectiveCamera(39,size.width/size.height,.1,100);camera.position.fromArray(DESK_CAMERA.eye);camera.lookAt(...DESK_CAMERA.look);camera.updateMatrixWorld();
 const frame=dt=>{globalThis.__printerFrames.at(-1)({camera,size,scene},dt);};
 const render=patch=>{Object.assign(props,patch);h.render(props)};
 const run=(seconds,rate=60)=>{for(let i=0;i<Math.round(seconds*rate);i++)frame(1/rate)};
 // Settle without advancing idle phase, so comparisons start at the same pose.
 render({deskPaused:true});run(4);render({deskPaused:false,...extra});
 return {h,props,camera,frame,run,render,events,size};
}
const {fanProjection}=await import('./support/fan-projection.mjs');const oracle=fanProjection(),ray=new T.Ray();let samples=0;
check('fan moving geometry clears sampled live laptop and phone sightlines during camera/device transitions',()=>{
 for(const size of [{width:1440,height:900},{width:800,height:900},{width:2560,height:1080}])for(const angles of [{yaw:0,pitch:0},{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}]){
  const f=fixture(size,{deskPaused:true});f.props.orbit.current=angles;f.props.deskInput.current.manual=true;f.run(3);
  for(const view of ['laptop','desk','phone','desk','printer','paper','desk']){
   f.render({view});for(let tick=0;tick<100;tick++){f.frame(1/30);for(const [screen,width,height]of [[f.props.laptop.current,LAPTOP.width,LAPTOP.height],[f.props.phone.current,PHONE.width,PHONE.height]]){
    screen.updateWorldMatrix(true,false);for(let x=0;x<=4;x++)for(let y=0;y<=4;y++){
     const point=new T.Vector3((x/4-.5)*width,(y/4-.5)*height,0).applyMatrix4(screen.matrixWorld),distance=point.distanceTo(f.camera.position);ray.set(f.camera.position,point.clone().sub(f.camera.position).normalize());const at=oracle.hit(ray,distance);assert.ok(!at,'fan before live screen '+JSON.stringify({view,tick,size,angles,screen:screen===f.props.laptop.current?'laptop':'phone',point:point.toArray(),camera:f.camera.position.toArray(),hit:at}));samples++;
    }
   }}
  }
 }
});
fs.writeFileSync(new URL('fan-projection.json',dir),JSON.stringify({samples,poses:oracle.poses,...oracle.stats(),method:'Actual Rig camera/phone poses; rays through 5x5 grids of both measured displays against actual triangles at 19 yaw angles x 3 power levels x 4 ribbon phases, plus a filled rotor volume. Sampled views/time/grid/poses, not browser compositing proof.'},null,2)+'\n');

