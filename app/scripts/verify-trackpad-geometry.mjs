import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {loadLaptop,laptopFixture} from './support/laptop-lighting-fixture.mjs';
import {LAPTOP} from '../src/prototype/deviceGeometry.js';
import {laptopHit,laptopHandlers,moveTrackpadInput,TRACKPAD_FACE} from '../src/prototype/trackpadInput.js';
const dir=new URL('../../docs/redesign/session-28-physical-trackpad-audio/',import.meta.url);
const model=await loadLaptop(),world=new T.Scene(),owner=new T.Group();
owner.position.fromArray(LAPTOP.position);model.scale.setScalar(LAPTOP.modelScale);owner.add(model);world.add(owner);world.updateMatrixWorld(true);
const pad=model.getObjectByName(TRACKPAD_FACE),g=pad.geometry;g.computeBoundingBox();
const normal=new T.Vector3(0,1,0),point=(x,z)=>new T.Vector3(x,.329,z).applyMatrix4(pad.matrixWorld);
const rayAt=(x,z,eye)=>{const target=point(x,z),origin=eye?new T.Vector3(...eye):target.clone().add(new T.Vector3(0,3,0));return {ray:new T.Ray(origin,target.clone().sub(origin).normalize())};};
let count=0;const check=(name,fn)=>{fn();console.log('PASS '+name);count++;};
const samples=[];
check('Actual M3 face triangles, center and edges; adjacent chassis and rounded-corner exclusions',()=>{
 assert.equal(g.attributes.position.count,192);
 for(const [x,z,want] of [[0,6.8,'trackpad'],[-7.8,6.8,'trackpad'],[7.8,6.8,'trackpad'],[0,1.94,'trackpad'],[0,11.7,'trackpad'],[8.05,6.8,'laptop'],[-8.05,6.8,'laptop'],[0,1.7,'laptop'],[0,12,'laptop'],[7.951,1.879,'laptop']]){
  const got=laptopHit(rayAt(x,z),owner);samples.push({x,z,want,got});assert.equal(got,want,`${x},${z}`);
 }
});
check('Desk, focused-like and oblique rays; first opaque obstruction wins including without handlers',()=>{
 const focusedEye=new T.Vector3(...LAPTOP.screenPosition).add(new T.Vector3(...LAPTOP.position)).addScaledVector(new T.Vector3(0,0,1).applyEuler(new T.Euler(...LAPTOP.screenRotation)),LAPTOP.height*900/(2*Math.tan(T.MathUtils.degToRad(39/2))*790));
 for(const eye of [[11,14,21],focusedEye.toArray(),[4,1.7,2]])assert.equal(laptopHit(rayAt(0,6.8,eye),owner),'trackpad');
 const block=new T.Mesh(new T.BoxGeometry(.35,.1,.3),new T.MeshBasicMaterial());block.position.copy(point(0,6.8)).add(new T.Vector3(0,.2,0));world.add(block);
 assert.equal(laptopHit(rayAt(0,6.8),owner),null);block.visible=false;assert.equal(laptopHit(rayAt(0,6.8),owner),'trackpad');block.visible=true;block.userData.shadowOnly=true;assert.equal(laptopHit(rayAt(0,6.8),owner),'trackpad');world.remove(block);
 assert.equal(laptopHit(rayAt(30,30),owner),null);
});
const e=(extra={})=>({pointerId:1,button:0,isPrimary:true,pointerType:'mouse',clientX:10,clientY:10,delta:0,nativeEvent:{},stopPropagation(){this.stopped=true},...rayAt(0,6.8),...extra});
check('Actual triangle handler: primary mouse/pen/touch one sound intent and duplicate delivery consumed',()=>{
 for(const pointerType of ['mouse','pen','touch']){const input={},calls=[],h=laptopHandlers(input,true,{current:owner},kind=>calls.push(kind));const v=e({pointerType});h.onPointerDown(v);h.onPointerDown(v);h.onPointerUp(v);h.onClick(v);h.onClick(v);assert.deepEqual(calls,['trackpad']);assert.equal(v.nativeEvent.sceneObject,true);}
});
check('Reject hover, naked click, drag returning to origin, wrong pointer, cancellation, right/secondary, stale/disabled/hidden/orbit and occluded release',()=>{
 for(const mode of ['click','drag','wrong','cancel','lost','right','secondary','disabled','hidden','orbit','release-off','delta']){
  const input={},calls=[],h=laptopHandlers(input,mode!=='disabled',{current:owner},kind=>calls.push(kind));let v=e(mode==='right'?{button:2}:mode==='secondary'?{isPrimary:false}:{});
  if(mode!=='click')h.onPointerDown(v);
  if(mode==='drag')moveTrackpadInput(input,e({clientX:50}));
  if(mode==='wrong')v=e({pointerId:2});if(mode==='cancel')h.onPointerCancel(v);if(mode==='lost')h.onLostPointerCapture(v);if(mode==='hidden')input.hidden=true;if(mode==='orbit')input.dragging=true;
  if(mode==='release-off')v={...v,...rayAt(30,30)};if(mode==='delta'){v.clientX+=9;moveTrackpadInput(input,v);}
  h.onPointerUp(v);h.onClick(v);assert.equal(calls.length,0,mode);
 }
 const calls=[],h=laptopHandlers({},true,{current:owner},k=>calls.push(k)),v=e(rayAt(10,6.8));h.onPointerDown(v);h.onPointerUp(v);h.onClick(v);assert.deepEqual(calls,['laptop']);
});

const {LaptopModel,harness}=await laptopFixture();let selected=0,clicks=0;const component=harness(LaptopModel,{enabled:true,input:{},screen:{},onTrackpad:()=>clicks++,onSelect:()=>selected++});component.tree.props.ref.current=owner;
const v=e();component.tree.props.onPointerDown(v);component.tree.props.onPointerUp(v);component.tree.props.onClick(v);component.tree.props.onClick(v);assert.equal(clicks,1);assert.equal(selected,0);
component.render({enabled:false});component.flushEffects();component.tree.props.onPointerDown(v);component.tree.props.onPointerUp(v);component.tree.props.onClick(v);assert.equal(clicks,1);
console.log('PASS Loaded LaptopModel mounts real ownership handlers with no proxy mesh or extra onSelect for pad');count++;
const bytes=fs.readFileSync(new URL('../src/prototype/assets/laptop-m3.glb',import.meta.url));const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));const mesh=json.meshes.find(m=>m.name===TRACKPAD_FACE)||json.meshes[8];
fs.writeFileSync(new URL('geometry.json',dir),JSON.stringify({mesh:TRACKPAD_FACE,vertices:g.attributes.position.count,triangles:g.index.count/3,localBounds:g.boundingBox,worldBounds:new T.Box3().setFromObject(pad),normal:'+Y face; local triangle normal.y > .9',transform:LAPTOP,manifest:mesh.extras,runtimeSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),samples},null,2)+'\n');
// Offline painter triangle drawing from actual runtime vertices. Not a shaded WebGL render.
for(const [name,eye,blocked] of [['top',[0,8,1],false],['oblique',[4,3,5],false],['occluded',[0,8,1],true]]){
 const scene=world.clone(true);if(blocked){const b=new T.Mesh(new T.BoxGeometry(.5,.12,.4),new T.MeshBasicMaterial());b.name='ILLUSTRATIVE_OBSTRUCTION';b.position.copy(point(0,6.8)).add(new T.Vector3(0,.2,0));scene.add(b);}scene.updateMatrixWorld(true);
 const camera=new T.OrthographicCamera(-2.4,2.4,2.4,-2.4,.01,40);camera.position.fromArray(eye);camera.lookAt(-.58,.65,-.6);camera.updateMatrixWorld();camera.updateProjectionMatrix();const paths=[];
 scene.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,idx=o.geometry.index;
 for(let i=0;i<(idx?.count||a.count);i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,idx?idx.getX(i+j):i+j).applyMatrix4(o.matrixWorld).project(camera));
 const area=(vs[1].x-vs[0].x)*(vs[2].y-vs[0].y)-(vs[1].y-vs[0].y)*(vs[2].x-vs[0].x);if(area<=.00000015)continue;
 const color=o.name===TRACKPAD_FACE?'#399fce':o.name==='ILLUSTRATIVE_OBSTRUCTION'?'#bd7050':o.name==='M3_DisplayBacking'?'#171d25':'#626d79';
 paths.push({z:vs.reduce((s,v)=>s+v.z,0)/3,svg:`<path d="M${vs.map(v=>`${(350+v.x*320).toFixed(2)},${(375-v.y*320).toFixed(2)}`).join('L')}Z" fill="${color}" stroke="${color}" stroke-width=".25"/>`});}
 });
 paths.sort((a,b)=>b.z-a.z);let markers='';if(name==='top')for(const p of samples){const v=point(p.x,p.z).project(camera);markers+=`<circle cx="${350+v.x*320}" cy="${375-v.y*320}" r="3" fill="${p.got==='trackpad'?'#adffc5':'#ff9479'}"/>`;}
 fs.writeFileSync(new URL(name+'.svg',dir),`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="760" viewBox="0 0 700 760"><rect width="700" height="760" fill="#101720"/><g font-family="monospace" fill="white"><text x="20" y="25">OFFLINE GEOMETRY: ${name} — not browser/click evidence</text><text x="20" y="48">Blue: actual trackpad triangles; green/red: accepted/rejected</text><text x="20" y="71">${blocked?'Orange: representative opaque test box, not scene furniture':'Actual GLB triangles; painter approximation; no materials/lighting'}</text></g>${paths.map(p=>p.svg).join('')}${markers}</svg>`);
}
console.log(count+' geometry/input groups passed; offline rays/callbacks only.');
