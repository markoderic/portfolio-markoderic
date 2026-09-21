import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {build} from 'esbuild';import {fileURLToPath} from 'node:url';import * as T from 'three';
import {FAN} from '../src/prototype/fanMotion.js';import {fanEnvelopes} from './support/fan-envelope.mjs';
import {productionParts,productionBatches,PRODUCTION} from '../src/prototype/productionPropsGeometry.js';
import {fanParts,streamerGeometry,deformStreamers} from '../src/prototype/fanGeometry.js';
import {CHAIR,DESK,PRINTER} from '../src/prototype/sceneScale.js';import {PHONE} from '../src/prototype/deviceGeometry.js';
import {PAPER_WIDTH,PAPER_HEIGHT,paperFeedPosition} from '../src/prototype/paperGeometry.js';
import {Desk,Chair,harness,materialize} from '../../docs/redesign/session-37-props/scene-fixture.mjs';import {CABINET} from '../src/prototype/drawers.js';
import {meshes as handset} from './inspect-phone-edges.mjs';
const dir=new URL('../../docs/redesign/session-37-props/',import.meta.url),checks=[],details={};const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)};
const parts=productionParts(),bounds=p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;};parts.forEach(bounds);
const unscaled=productionParts({...PRODUCTION,cameraScale:1}),boxJSON=b=>({min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()}),gap=(a,b)=>Math.max(a.min.x-b.max.x,b.min.x-a.max.x,a.min.y-b.max.y,b.min.y-a.max.y,a.min.z-b.max.z,b.min.z-a.max.z);
const union=ps=>ps.reduce((b,p)=>b.union(bounds(p)),new T.Box3());
check('camera current uniform scale around support, two feet contact, finite unit normals; microphone bytes unchanged',()=>{
 assert.equal(PRODUCTION.cameraScale,.6);let maxError=0,normalError=0;
 for(let i=0;i<parts.length;i++){const p=parts[i],old=unscaled[i];assert.equal(p.name,old.name);const a=p.geometry.attributes.position,b=old.geometry.attributes.position,n=p.geometry.attributes.normal;
  if(p.root==='microphone'){for(const k of Object.keys(p.geometry.attributes))assert.deepEqual(p.geometry.attributes[k].array,old.geometry.attributes[k].array);assert.deepEqual(p.geometry.index?.array,old.geometry.index?.array);continue;}
  for(let j=0;j<a.count;j++){const want=new T.Vector3().fromBufferAttribute(b,j).sub(new T.Vector3(...PRODUCTION.camera)).multiplyScalar(PRODUCTION.cameraScale).add(new T.Vector3(...PRODUCTION.camera));maxError=Math.max(maxError,want.distanceTo(new T.Vector3().fromBufferAttribute(a,j)));normalError=Math.max(normalError,Math.abs(new T.Vector3().fromBufferAttribute(n,j).length()-1));}
  if(p.name.startsWith('camera-foot'))assert.ok(Math.abs(bounds(p).min.y)<1e-7);
 }
 assert.ok(maxError<1e-6&&normalError<1e-6);const camera=union(parts.filter(p=>p.root==='camera'));assert.ok(camera.min.x>-5.4&&camera.max.x<5.4&&camera.min.z>-3&&camera.max.z<3);assert.ok(camera.min.y>-1e-7);
 details.camera={before:boxJSON(union(unscaled.filter(p=>p.root==='camera'))),after:boxJSON(camera),feet:parts.filter(p=>p.name.startsWith('camera-foot')).map(p=>({name:p.name,...boxJSON(bounds(p))})),maxError,normalError};
 const beforeMic=productionBatches(productionParts({...PRODUCTION,cameraScale:1})).filter(p=>p.root==='microphone'),afterMic=productionBatches(productionParts()).filter(p=>p.root==='microphone');details.microphoneHashes=[];
 for(let i=0;i<beforeMic.length;i++){const a=beforeMic[i],b=afterMic[i];assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);assert.deepEqual(a.geometry.attributes.normal.array,b.geometry.attributes.normal.array);details.microphoneHashes.push({name:a.name,sha256:createHash('sha256').update(Buffer.from(b.geometry.attributes.position.array.buffer)).digest('hex')});}
});
const volumes=fanEnvelopes(),overall=Object.values(volumes).reduce((b,p)=>b.union(p),new T.Box3());details.volumes=Object.fromEntries(Object.entries(volumes).map(([k,v])=>[k,boxJSON(v)]));
const chair=materialize(harness(Chair,{}).tree);chair.updateMatrixWorld(true);const back=chair.getObjectByName('back-cushion'),backCenter=new T.Box3().setFromObject(back).getCenter(new T.Vector3()),pivot=new T.Vector3(...FAN.position).add(new T.Vector3(...FAN.pivot));
check('real +Z outlet moves toward chair area; 90-degree sweep includes chair base and backrest bearing',()=>{
 const g=fanParts(),front=g.find(p=>p.name==='fan-front-cap'),motor=g.find(p=>p.name==='fan-motor');assert.ok(bounds(front).max.z>bounds(motor).max.z);
 const bearings=[new T.Vector3(...CHAIR.position),backCenter].map(p=>Math.atan2(p.x-pivot.x,p.z-pivot.z));for(const a of bearings)assert.ok(a>=FAN.direction-FAN.sweep&&a<=FAN.direction+FAN.sweep);
 assert.equal(FAN.direction,-Math.PI/4);assert.equal(FAN.sweep,Math.PI/4);const outlet=new T.Vector3(FAN.head[0],FAN.head[1],FAN.head[2]+.28).applyAxisAngle(new T.Vector3(0,1,0),FAN.direction).add(pivot);
 details.direction={before:-Math.PI/2,after:FAN.direction,outlet:outlet.toArray(),outletBearings:[new T.Vector3(...CHAIR.position),backCenter].map(p=>Math.atan2(p.x-outlet.x,p.z-outlet.z)),chairBase:CHAIR.position,chairBackCenter:backCenter.toArray(),bearings,poses:[-1,0,1].map(e=>{const yaw=FAN.direction+e*FAN.sweep;return {yaw,outlet:new T.Vector3(0,0,1).applyAxisAngle(new T.Vector3(0,1,0),yaw).toArray()}})};g.forEach(p=>p.geometry.dispose());
});
const scene=JSON.parse(fs.readFileSync(new URL('after-scene.json',dir))),obstacles=scene.meshes.filter(m=>!['fan','desk','camera','microphone','production'].includes(m.root)).map(m=>({name:m.root+'/'+m.name,box:new T.Box3().setFromPoints(m.positions.map(v=>new T.Vector3(...v)))}));
for(const p of parts)obstacles.push({name:p.root+'/'+p.name,box:bounds(p)});
const desk=materialize(harness(Desk,{}).tree);desk.updateMatrixWorld(true);let id=0;
desk.traverse(o=>{if(!o.isMesh)return;const box=new T.Box3().setFromObject(o,true);let p=o;while(p&&!/^drawer-[0-2]$/.test(p.name))p=p.parent;if(p)box.max.z+=CABINET.travel;if(box.max.y<=.00001)return;obstacles.push({name:'desk/'+(p?.name||o.name||id++),box});});
check('analytic full head/rotor/ribbon sweep stays on tabletop and clears all current props and continuous drawers',()=>{
 assert.ok(overall.min.x>-5.4&&overall.max.x<5.4&&overall.min.z>-3&&overall.max.z<3);assert.ok(Math.abs(overall.min.y)<1e-7);let minimum=Infinity,witness;
 for(const o of obstacles)for(const [part,b]of Object.entries(volumes)){const d=gap(b,o.box);assert.ok(d>.003,part+' / '+o.name+' '+d);if(d<minimum){minimum=d;witness=[part,o.name]}}
 details.minimumGap={minimum,witness};
});
check('actual sampled all-yaw/rotor/ribbon vertices remain inside full analytic volumes',()=>{
 const ps=fanParts(),strip=streamerGeometry(),up=new T.Vector3(0,1,0);let samples=0;
 for(let y=0;y<=90;y++){const yaw=FAN.direction-FAN.sweep+y*Math.PI/180;for(const power of [0,.5,1])for(let phase=0;phase<4;phase++){deformStreamers(strip,power,phase*Math.PI/2);for(const p of [...ps,{owner:'strip',geometry:strip}]){const a=p.geometry.attributes.position,b=['fixed','indicator'].includes(p.owner)?volumes.fixed:p.owner==='strip'?volumes.streamers:volumes.head;
 for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i);if(p.owner==='rotor')v.applyAxisAngle(new T.Vector3(0,0,1),phase*Math.PI/2);if(!['fixed','indicator'].includes(p.owner))v.add(new T.Vector3(...FAN.head)).applyAxisAngle(up,yaw).add(new T.Vector3(...FAN.pivot));v.add(new T.Vector3(...FAN.position));assert.ok(b.clone().expandByScalar(1e-6).containsPoint(v));samples++;}
 }}}
 details.vertexSamples=samples;ps.forEach(p=>p.geometry.dispose());strip.dispose();
});
check('whole handset pickup/return and whole printer feed clear camera and fan envelopes',()=>{
 const radius=Math.max(...handset.flatMap(m=>m.points.map(p=>p.length()))),phone=new T.Box3().setFromPoints([new T.Vector3(...PHONE.desk),new T.Vector3(...PHONE.picked)]).expandByScalar(radius),feed=new T.Box3();
 for(const progress of [0,1]){const g=new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT),m=new T.Matrix4().makeRotationFromEuler(new T.Euler(-Math.PI/2,0,PRINTER.rotation));m.setPosition(...paperFeedPosition(progress));g.applyMatrix4(m);g.computeBoundingBox();feed.union(g.boundingBox);g.dispose();}
 for(const b of [...Object.values(volumes),union(parts.filter(p=>p.root==='camera'))]){assert.ok(!b.intersectsBox(phone));assert.ok(!b.intersectsBox(feed));}details.phone=boxJSON(phone);details.feed=boxJSON(feed);
});
// Airflow is parallel to the actual new outlet, with finite reach. Its x component
// is nonpositive throughout [-90,0] and throw vx is negative; ball x cannot reach fan.
check('full moving fan remains unreachable to bounded negative-X game throws, including full ball radius',()=>{const ballMaxX=-1.8+.18;assert.ok(overall.min.x>ballMaxX);for(let i=0;i<=90;i++)assert.ok(Math.sin(FAN.direction-FAN.sweep+i*Math.PI/180)<=1e-12);details.launchCorridor={maximumBallX:ballMaxX,fanMinimumX:overall.min.x,gap:overall.min.x-ballMaxX,reason:'negative initial vx, nonpositive fan force x; drag cannot reverse vx in existing fixed step'};});
fs.writeFileSync(new URL('geometry-checks.json',dir),JSON.stringify({checks,...details,evidence:'Actual geometry + continuous analytic envelope; sampled contained vertices. No native browser rendering.'},null,2)+'\n');
