// Offline actual Rig callback + materialized furniture; no browser/WebGL/input.
import {pathToFileURL} from 'node:url';import nodePath from 'node:path';
import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {Desk,Printer,Bin,Chair,Plant,Lamp,Rig,harness,materialize} from './support/paper-scene-fixture.mjs';
import {PAPER_WIDTH,PAPER_HEIGHT,paperFeedPosition} from '../src/prototype/paperGeometry.js';
import {LAPTOP,PHONE} from '../src/prototype/deviceGeometry.js';
import {PRINTER} from '../src/prototype/sceneScale.js';
const before=process.argv.includes('--before'),baselineDir=new URL('../../docs/redesign/session-06-paper-trajectory/',import.meta.url);
const evidenceArg=process.argv.find(arg=>arg.startsWith('--evidence-dir='))?.slice('--evidence-dir='.length);
const dir=evidenceArg?pathToFileURL(nodePath.resolve(evidenceArg)+nodePath.sep):baselineDir;
fs.mkdirSync(dir,{recursive:true});
const groups={desk:materialize(harness(Desk,{}).tree),printer:materialize(harness(Printer,{progress:{current:1},onResume(){}}).tree),bin:materialize(harness(Bin,{}).tree),chair:materialize(harness(Chair,{}).tree)};
// Nearby props and imported devices are read-only collision evidence too.
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
const loader=new GLTFLoader();loader.register(()=>({name:'OFFLINE_TEXTURE',loadTexture(){return Promise.resolve(new T.Texture())}}));
const bytes=fs.readFileSync(new URL('../src/prototype/assets/laptop-m3.glb',import.meta.url));
const loaded=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
groups.laptop=new T.Group();groups.laptop.position.fromArray(LAPTOP.position);loaded.scene.scale.setScalar(LAPTOP.modelScale);groups.laptop.add(loaded.scene);
const {meshes:phoneMeshes}=await import('./inspect-phone-edges.mjs');const phoneBox=new T.Box3().setFromPoints(phoneMeshes.flatMap(m=>m.points));
groups.phone=new T.Group();groups.phone.position.fromArray(PHONE.desk);groups.phone.rotation.set(-Math.PI/2,0,-.23);const handset=new T.Mesh(new T.BoxGeometry(...phoneBox.getSize(new T.Vector3()).toArray()));handset.position.copy(phoneBox.getCenter(new T.Vector3()));groups.phone.add(handset);
groups.plant=materialize(harness(Plant,{}).tree);groups.lamp=materialize(harness(Lamp,{onToggle(){},night:false,reduced:false}).tree);
const originalBytes=fs.readFileSync(new URL('../../docs/redesign/session-04a-laptop-inspection/originals/macbook_pro_m3_16_inch_2024.glb',import.meta.url));
const originalJSON=JSON.parse(originalBytes.subarray(20,20+originalBytes.readUInt32LE(12)));
const obstacles=[];
for(const [name,group]of Object.entries(groups)){
 group.updateMatrixWorld(true);let i=0;
 const record=o=>{o.geometry.computeBoundingBox();obstacles.push({name:name+'/'+i++,object:o,box:new T.Box3().setFromObject(o),localBox:o.geometry.boundingBox.clone(),inverse:o.matrixWorld.clone().invert()})};
 group.traverse(o=>{if(!o.isMesh)return;
  if(name!=='laptop'){record(o);return;}
  // Runtime batches combine separated native parts by material. Their combined
  // AABB fills empty air. Retain the actual runtime vertices, using audited
  // source-part counts to obtain separate conservative boxes (no asset edits).
  const entry=loaded.parser.json.meshes[loaded.parser.associations.get(o).meshes];let offset=0;
  for(const source of entry.extras.sourceMeshes){const count=originalJSON.accessors[originalJSON.meshes[source].primitives[0].attributes.POSITION].count,geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(o.geometry.attributes.position.array.slice(offset*3,(offset+count)*3),3));offset+=count;const part=new T.Mesh(geometry);o.matrixWorld.decompose(part.position,part.quaternion,part.scale);part.updateMatrixWorld();record(part);}
  assert.equal(offset,o.geometry.attributes.position.count);
 });
}
// Optional Session 15 furniture sweep: all continuous drawer configurations,
// using the actual descendant vertex bounds translated along the measured rail.
if (process.argv.includes('--drawer-sweep')) {
 const {CABINET}=await import('../src/prototype/drawers.js');
 groups.desk.traverse(o=>{
  if(!o.isMesh)return;
  let parent=o;while(parent&&!/^drawer-[0-2]$/.test(parent.name))parent=parent.parent;
  if(!parent)return;
  const bound=new T.Box3().setFromObject(o,true);bound.max.z+=CABINET.travel;
  obstacles.push({name:'drawer-sweep/'+parent.name+'/'+o.name,box:bound,localBox:bound.clone(),inverse:new T.Matrix4(),object:o});
 });
}
// Fan enclosure includes the full sweep and every streamer power/phase.
if(process.argv.includes('--fan-sweep')){
 const {fanEnvelope}=await import('./support/fan-envelope.mjs');const box=fanEnvelope();
 obstacles.push({name:'fan-envelope',box,localBox:box.clone(),inverse:new T.Matrix4(),object:new T.Object3D()});
}
// Session 18 passive clock uses its actual mounted enclosure.
if(process.argv.includes('--clock')){
 const {mountClock}=await import('./support/clock-scene-fixture.mjs');const clock=await mountClock();clock.updateMatrixWorld(true);const box=new T.Box3().setFromObject(clock);
 obstacles.push({name:'clock-envelope',box,localBox:box.clone(),inverse:new T.Matrix4(),object:new T.Object3D()});
}
// Session 19 keeps separate structural bounds, avoiding empty boom-air AABBs.
if(process.argv.includes('--production-props')){
 const {productionParts}=await import('../src/prototype/productionPropsGeometry.js');
 for(const p of productionParts()){p.geometry.computeBoundingBox();const box=p.geometry.boundingBox.clone();obstacles.push({name:p.root+'/'+p.name,box,localBox:box.clone(),inverse:new T.Matrix4(),object:new T.Object3D()});}
}
function rig(start,q){globalThis.__printerFrames=[];const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT,16,20),new T.MeshBasicMaterial({side:T.DoubleSide}));paper.position.copy(start);paper.quaternion.copy(q);paper.visible=true;
 const laptop=new T.Object3D();laptop.position.fromArray(LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));laptop.rotation.set(...LAPTOP.screenRotation);const pivot=new T.Group(),phone=new T.Object3D();phone.position.fromArray(PHONE.position);pivot.add(phone);
 const hosts=Object.fromEntries(['laptop','phone','mask','paperMask','paper'].map(k=>[k,{current:null}]));const motion={current:{phase:'crumple',progress:0}};
 const props={orbit:{current:{yaw:0,pitch:0}},pointerLook:{current:{yaw:0,pitch:0}},completedPage:true,view:'printer',direct:false,reduced:false,hosts,layout:{laptop:{width:1120,height:700},phone:{width:300,height:650}},onSettled(){},laptop:{current:laptop},phone:{current:phone},pivot:{current:pivot},paper:{current:paper},printer:{current:groups.printer},printProgress:{current:1},printMotion:motion};
 const h=harness(Rig,props),camera=new T.PerspectiveCamera(39,1.6,.1,100);camera.position.set(10,6.8,23);camera.lookAt(0,-2,1);camera.updateMatrixWorld();
 return {paper,props,h,step(phase,t){motion.current={phase,progress:t};globalThis.__printerFrames.at(-1)({camera,size:{width:1440,height:900}},1/60);paper.updateMatrixWorld();return Array.from({length:paper.geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(paper.geometry.attributes.position,i).applyMatrix4(paper.matrixWorld));}};
}
const tray=new T.Vector3(...paperFeedPosition(1)),trayQ=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,PRINTER.rotation)),focus=new T.Vector3(-2.2,1.15,1.7);
let witness;const old=rig(focus,new T.Quaternion());old.step('crumple',1);for(let i=0;i<=450&&!witness;i++){const vertices=old.step('toss',i/450),index=vertices.findIndex(p=>obstacles[0].box.clone().expandByScalar(-.005).containsPoint(p));if(index>=0)witness={tossProgress:i/450,elapsedMs:200+i,center:old.paper.position.toArray(),vertexIndex:index,vertex:vertices[index].toArray(),obstacle:obstacles[0].name};}
if(before){let trayWitness;const release=rig(tray,trayQ);for(let i=0;i<=200&&!trayWitness;i++){const vertices=release.step('crumple',i/200);for(const o of obstacles.filter(o=>['printer/5','printer/6'].includes(o.name))){const index=vertices.findIndex(v=>o.localBox.clone().expandByScalar(-.002).containsPoint(v.clone().applyMatrix4(o.inverse)));if(index>=0){trayWitness={crumpleProgress:i/200,obstacle:o.name,vertex:vertices[index].toArray()};break}}}fs.writeFileSync(new URL('before-witness.json',dir),JSON.stringify({witness,trayWitness,focusBottom:1.15-PAPER_HEIGHT/2,tray:tray.toArray()},null,2)+'\n');assert.equal(witness,undefined,'current deformed paper intersects actual tabletop: '+JSON.stringify(witness));process.exit(0)}

const {disposalCurve,DISPOSAL_LIFT,PAPER_REST,keepPaperAboveDesk}=await import('../src/prototype/paperDisposal.js');
const R=PRINTER.scale*(.105+.018),margin=.002;
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
const points=(paper)=>Array.from({length:paper.geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(paper.geometry.attributes.position,i).applyMatrix4(paper.matrixWorld));
const starts=[];for(let i=0;i<=40;i++){const t=i/40,p=tray.clone().lerp(new T.Vector3(...PAPER_REST),t),q=trayQ.clone().slerp(new T.Quaternion(),t);const object={position:p,quaternion:q};keepPaperAboveDesk(object);starts.push({name:i===0?'tray':i===40?'focused':'transition-'+i,p,q});}
for(const origin of ['focus','tray'])for(const phase of ['crumple','toss'])for(const t of [.05,.25,.5,.75,.95]){const f=rig(origin==='focus'?new T.Vector3(...PAPER_REST):tray,origin==='focus'?new T.Quaternion():trayQ);f.step(phase,t);f.props.view='paper';f.h.render(f.props);f.step('idle',0);starts.push({name:'restart-'+origin+'-'+phase+'-'+t,p:f.paper.position.clone(),q:f.paper.quaternion.clone()});}
check('before witness comes from actual baseline Rig and corrected starts have no below-desk corner',()=>{
 const saved=JSON.parse(fs.readFileSync(new URL('before-witness.json',baselineDir)));assert.ok(saved.witness.vertex[1]<0);assert.ok(saved.focusBottom<0);
 for(const {p,q}of starts){const frame=rig(p,q),vertices=frame.step('crumple',0);assert.ok(Math.min(...vertices.map(v=>v.y))>=.0249999);assert.ok(frame.paper.position.distanceTo(p)<1e-12);assert.ok(frame.paper.quaternion.angleTo(q)<1e-7)}
});
// SAT between the convex enclosure of a triangle at two times and a mesh's
// local bounding box. Extra candidate axes are harmless; no separation means
// subdivide, never assume it is clear. A .002 world-unit inflated box margin.
function separated(vertices,box){const center=box.getCenter(new T.Vector3()),half=box.getSize(new T.Vector3()).multiplyScalar(.5);const axes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];
 const separates=axis=>{if(axis.lengthSq()<1e-20)return false;let min=Infinity,max=-Infinity;for(const p of vertices){const d=p.dot(axis);min=Math.min(min,d);max=Math.max(max,d)}const c=center.dot(axis),r=Math.abs(axis.x)*half.x+Math.abs(axis.y)*half.y+Math.abs(axis.z)*half.z;return max<c-r||min>c+r;};
 if(axes.some(separates))return true;
 for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++){const edge=vertices[j].clone().sub(vertices[i]);for(const a of axes)if(separates(new T.Vector3().crossVectors(edge,a)))return true;for(let k=j+1;k<vertices.length;k++)if(separates(new T.Vector3().crossVectors(edge,vertices[k].clone().sub(vertices[i]))))return true;}
 return false;
}
const ordinary=obstacles.filter(o=>!o.name.startsWith('bin/')),supportNames=new Set(['printer/4','printer/20','printer/21']);
let crumpleIntervals=0,supportIntervals=0;
check('full crumple swept triangles clear real desk/tray/printer/chair bounds from supported tray/focus/transition/interrupted poses',()=>{
 const printerInverse=groups.printer.matrixWorld.clone().invert();
 for(const {name,p,q}of starts){const frame=rig(p,q),a=frame.step('crumple',0),b=frame.step('crumple',1),idx=frame.paper.geometry.index;
  for(const o of ordinary){const localA=a.map(v=>v.clone().applyMatrix4(o.inverse)),localB=b.map(v=>v.clone().applyMatrix4(o.inverse));const scale=o.object.getWorldScale(new T.Vector3()),box=o.localBox.clone().expandByVector(new T.Vector3(margin/scale.x,margin/scale.y,margin/scale.z));
   for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
    function clear(lo,hi,depth){crumpleIntervals++;const vertices=ids.flatMap(j=>[localA[j].clone().lerp(localB[j],lo),localA[j].clone().lerp(localB[j],hi)]);if(separated(vertices,box))return;
     if(supportNames.has(o.name)&&hi<=.1){
      // Only the existing feed slot/roller contact strip, never tray or body.
      // All paper points begin at/forward of slotZ and the contracted endpoint
      // lies farther forward: no deeper entry; by s=.1 all vertices clear it.
      const rearA=Math.min(...a.map(v=>v.clone().applyMatrix4(printerInverse).z)),rearB=Math.min(...b.map(v=>v.clone().applyMatrix4(printerInverse).z));
      assert.ok(rearA>=PRINTER.slotZ-1e-7);assert.ok(rearB>rearA);assert.ok(.9*rearA+.1*rearB>.51);supportIntervals++;return;
     }
     assert.ok(depth<14,`${name} crumple ${lo}..${hi} against ${o.name}`);const mid=(lo+hi)/2;clear(lo,mid,depth+1);clear(mid,hi,depth+1);
    }clear(0,1,0);
   }
  }
 }
});
function split(c){const a=c[0].clone().lerp(c[1],.5),b=c[1].clone().lerp(c[2],.5),d=c[2].clone().lerp(c[3],.5),e=a.clone().lerp(b,.5),f=b.clone().lerp(d,.5),g=e.clone().lerp(f,.5);return [[c[0],a,e,g],[g,f,d,c[3]]];}
let curveIntervals=0,minimumSampleClearance=Infinity,binMargin=Infinity;
check('entire spinning ball clears furniture continuously using subdivided Bezier convex enclosures',()=>{
 for(const {name,p,q}of starts){const curve=disposalCurve(p,[-5.95,-6.3,3.1]),controls=[curve.v0,curve.v1,curve.v2,curve.v3];
  function clear(c,depth){curveIntervals++;const box=new T.Box3().setFromPoints(c).expandByScalar(R+margin);const possible=ordinary.filter(o=>box.intersectsBox(o.box));if(!possible.length)return;assert.ok(depth<18,`${name} toss enclosure hits ${possible.map(o=>o.name)}`);split(c).forEach(part=>clear(part,depth+1));}clear(controls,0);
  const frame=rig(p,q);frame.step('crumple',1);for(let i=0;i<=100;i++){const v=frame.step('toss',i/100);for(const point of v)assert.ok(point.distanceTo(frame.paper.position)<=R+1e-7);for(const o of ordinary)minimumSampleClearance=Math.min(minimumSampleClearance,o.box.distanceToPoint(frame.paper.position)-R);}
 }
});
check('whole ball enters inside measured bin rim/walls and completes below opening above its floor',()=>{
 const lathe=obstacles.find(o=>o.name==='bin/0').object,vertices=lathe.geometry.attributes.position;
 // Infer inner bottom/top rings from actual loaded lathe points, excluding axis.
 const rings=new Map();for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),r=Math.hypot(vertices.getX(i),vertices.getZ(i));if(r>.1){const key=+y.toFixed(5);const old=rings.get(key)||[];old.push(r);rings.set(key,old)}}
 const topLocal=Math.max(...rings.keys()),bottomLocal=.05,topRadius=Math.min(...rings.get(topLocal)),bottomRadius=Math.min(...rings.get(bottomLocal));const top=-6.3+topLocal*2.1,floor=obstacles.find(o=>o.name==='bin/1').box.max.y;
 assert.ok(Math.abs(top+4.704)<1e-6);assert.ok(Math.abs(topRadius-.36)<1e-6);assert.ok(Math.abs(bottomRadius-.28)<1e-6);
 for(const {p}of starts){const curve=disposalCurve(p,[-5.95,-6.3,3.1]);
  function clear(c,depth){const box=new T.Box3().setFromPoints(c);if(box.min.y-R>top+margin)return;
   const low=box.min.y-R,insideRadius=(bottomRadius+(topRadius-bottomRadius)*Math.max(0,Math.min(1,(low+6.3-.05*2.1)/((topLocal-.05)*2.1))))*2.1*Math.cos(Math.PI/48);
   const radial=Math.hypot(Math.max(Math.abs(box.min.x+5.95),Math.abs(box.max.x+5.95)),Math.max(Math.abs(box.min.z-3.1),Math.abs(box.max.z-3.1)))+R;
   if(low>floor+margin&&radial<insideRadius-margin){binMargin=Math.min(binMargin,insideRadius-radial);return;}assert.ok(depth<18,'bin enclosure/rim failure');split(c).forEach(part=>clear(part,depth+1));
  }clear([curve.v0,curve.v1,curve.v2,curve.v3],0);assert.ok(curve.v3.y+R<top);assert.ok(curve.v3.y-R>floor);assert.equal(curve.v3.x-curve.v2.x,0);assert.equal(curve.v3.z-curve.v2.z,0);
 }
});
check('crumple/toss seam has continuous position, orientation, shape and zero endpoint velocity',()=>{
 for(const {p,q}of starts){const frame=rig(p,q),end=frame.step('crumple',1),at=frame.paper.position.clone(),rot=frame.paper.quaternion.clone();const begin=frame.step('toss',0);assert.ok(at.distanceTo(frame.paper.position)<1e-12);assert.ok(rot.angleTo(frame.paper.quaternion)<1e-7);end.forEach((v,i)=>assert.ok(v.distanceTo(begin[i])<1e-8));
 const h=1e-5;frame.step('crumple',1-h);assert.ok(frame.paper.position.distanceTo(at)/(h*.2)<.001);frame.step('toss',h);assert.ok(frame.paper.position.distanceTo(at)/(h*.45)<.001);assert.ok(frame.paper.visible);
 }
});
check('interruption clears captured path and a subsequent disposal captures its new pose',()=>{
 const frame=rig(new T.Vector3(...PAPER_REST),new T.Quaternion());frame.step('crumple',1);frame.step('toss',.4);frame.props.view='paper';frame.h.render(frame.props);frame.step('idle',0);const next=frame.paper.position.clone(),q=frame.paper.quaternion.clone();frame.props.view='printer';frame.h.render(frame.props);frame.step('crumple',0);assert.ok(frame.paper.position.distanceTo(next)<1e-12);assert.ok(frame.paper.quaternion.angleTo(q)<1e-7);frame.step('toss',1);assert.ok(frame.paper.position.distanceTo(disposalCurve(next,[-5.95,-6.3,3.1],q).getPoint(1))<1e-12);
});
check('mounted Rig keeps the moving-paper mask live, then restores one flat feed sheet and clears hidden mask',()=>{
 const f=rig(new T.Vector3(...PAPER_REST),new T.Quaternion()),host={style:{}};f.props.hosts.paperMask.current=host;let masked=0;
 for(const phase of ['crumple','toss'])for(let i=0;i<=30;i++){f.step(phase,i/30);assert.ok(f.paper.visible);assert.ok(!/NaN|Infinity/.test(host.style.clipPath));if(host.style.clipPath!=='none')masked++;}
 assert.ok(masked>0);f.props.completedPage=false;f.props.printProgress.current=0;f.h.render(f.props);f.step('feed',0);assert.equal(f.paper.visible,false);assert.equal(host.style.clipPath,'none');assert.equal(f.paper.userData.crumpled,false);
 const a=f.paper.geometry.attributes.position.array,b=f.paper.userData.original;assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<1e-7);
});
const {triangles,contactHeight}=await import('./support/bin-contact.mjs');
const receiving=obstacles.filter(o=>o.object.name.startsWith('bin-paper-')).flatMap(o=>triangles(o.object.geometry).map(tri=>tri.map(p=>new T.Vector3(...p).applyMatrix4(o.object.matrixWorld).toArray())));
const peelBox=new T.Box3().setFromObject(groups.bin.getObjectByName('bin-peel'));
let contactGap=Infinity,maxContactGap=0,terminalSamples=0,peelIntervals=0;
const landingFits=[];
check('local terminal fit preserves upper arc, monotone path and whole-paper contact without pile penetration',()=>{
 for(const {p,q,name}of starts){
  const curve=disposalCurve(p,[-5.95,-6.3,3.1],q),original=new T.CubicBezierCurve3(curve.v0,curve.v1,curve.v2,curve.v3),frame=rig(p,q);
  for(let i=0;i<=100;i++){const t=curve.landing.begin*i/100;assert.ok(curve.getPoint(t).distanceTo(original.getPoint(t))<1e-10);}
  assert.ok(curve.landing.end>curve.landing.begin&&curve.landing.end<1);
  // Hermite derivative = (1-u)[m + (6d-3m)u]. Nonnegative
  // on the whole interval iff 0 <= m <= 3d; not only a sampled claim.
  const d=curve.landing.end-curve.landing.begin,m=1-curve.landing.begin;
  assert.ok(m<=3*d,name+' terminal Hermite would reverse/overshoot');
  landingFits.push({name,...curve.landing,slopeRatio:m/d});
  let lastY=Infinity;for(let i=0;i<=1000;i++){const t=curve.landing.begin+(1-curve.landing.begin)*i/1000,point=curve.getPoint(t);assert.ok(point.y<=lastY+1e-9);lastY=point.y;}
  const h=1e-6,b=curve.landing.begin;
  assert.ok(curve.getPoint(b+h).distanceTo(curve.getPoint(b-h))<.0001);
  assert.ok(curve.getPoint(1).distanceTo(curve.getPoint(1-h))/h<.002);
  frame.step('crumple',1);
  for(let i=850;i<=1000;i++){
   frame.step('toss',i/1000);const live=triangles(frame.paper.geometry).map(tri=>tri.map(p=>new T.Vector3(...p).applyMatrix4(frame.paper.matrixWorld).toArray()));
   const gap=-contactHeight(live,receiving).height;terminalSamples++;assert.ok(gap>=-1e-6,name+' pile penetration '+gap);
   if(i===1000){contactGap=Math.min(contactGap,gap);maxContactGap=Math.max(maxContactGap,gap);assert.ok(gap<.00201);}
  }
  function clearPeel(c,depth){peelIntervals++;const box=new T.Box3().setFromPoints(c).expandByScalar(R);if(!box.intersectsBox(peelBox))return;assert.ok(depth<18,'whole rotating ball intersects peel bound');split(c).forEach(part=>clearPeel(part,depth+1));}clearPeel([curve.v0,curve.v1,curve.v2,curve.v3],0);
 }
});
fs.writeFileSync(new URL('landing.json',dir),JSON.stringify({contactGap,maxContactGap,terminalSamples,peelIntervals,landingFits,contactTolerance:.002,method:'Actual deformed triangles: sampled terminal poses plus exact final vertical contact; continuous original-curve enclosures retain furniture/rim/peel clearance. Not a continuous pile-contact proof.'},null,2)+'\n');
// Actual mounted live mesh at selected poses, for labeled static offline views.
for(const [tag,t]of [['entry',.84],['approach',.92],['contact',1]]){
 const frame=rig(new T.Vector3(...PAPER_REST),new T.Quaternion());frame.step('crumple',1);frame.step('toss',t);const g=frame.paper.geometry,a=g.attributes.position,n=g.attributes.normal,nm=new T.Matrix3().getNormalMatrix(frame.paper.matrixWorld),positions=[],normals=[];
 for(let i=0;i<a.count;i++){positions.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(frame.paper.matrixWorld).toArray());normals.push(new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray());}
 fs.writeFileSync(new URL(tag+'-paper.json',dir),JSON.stringify({meshes:[{root:'live-paper',name:'live-resume',positions,normals,indices:[...g.index.array],color:[.8,.86,.92],roughness:.9,metalness:0,side:2,castShadow:true}]})+'\n');
}
fs.writeFileSync(new URL('clearance.json',dir),JSON.stringify({checks,starts:starts.length,ballRadius:R,obstacleMargin:margin,crumpleIntervals,supportIntervals,curveIntervals,minimumSampleClearance,conservativeBinRadialMargin:binMargin,obstacles:obstacles.length,method:'Convex enclosure SAT per crumpling triangle; recursively subdivided cubic control hull + enclosing sphere for entire rotating toss; actual materialized obstacle bounds. No browser evidence.'},null,2)+'\n');
console.log(checks+' trajectory checks passed. '+JSON.stringify({crumpleIntervals,curveIntervals,minimumSampleClearance,binMargin}));

fs.writeFileSync(new URL('after-obstacles.json',dir),JSON.stringify(obstacles.map(o=>({name:o.name,min:o.box.min.toArray(),max:o.box.max.toArray()})),null,2)+'\n');
const path=pts=>pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
const side=p=>[55+(p.x+7)*85,90+(3-p.y)*66],top=p=>[655+(p.x+7)*85,200+(p.z+1)*92];
const corrected=disposalCurve(new T.Vector3(...PAPER_REST),[-5.95,-6.3,3.1]);const previous=new T.QuadraticBezierCurve3(new T.Vector3(-2.2,1.15,1.7),new T.Vector3(-3.5,2.7,1.6),new T.Vector3(-5.95,-5.69,3.1));
function rectangle(project,min,max,fill){const a=project(new T.Vector3(...min)),b=project(new T.Vector3(...max));return `<rect x="${Math.min(a[0],b[0])}" y="${Math.min(a[1],b[1])}" width="${Math.abs(a[0]-b[0])}" height="${Math.abs(a[1]-b[1])}" fill="${fill}"/>`;}
let diagram=`<svg xmlns="http://www.w3.org/2000/svg" width="1220" height="870"><defs><clipPath id="left"><rect x="35" y="75" width="555" height="690"/></clipPath><clipPath id="right"><rect x="630" y="75" width="555" height="690"/></clipPath></defs><rect width="1220" height="870" fill="#f6f6f2"/><g font-family="sans-serif" fill="#25343c"><text x="35" y="30" font-size="22">Paper disposal — offline geometry, not a browser animation</text><text x="35" y="59" font-size="16">Side (x/y) and top (x/z). Shapes are projected conservative bounds; both views matter.</text></g>`;
for(const [project,id]of [[side,'left'],[top,'right']]){diagram+=`<g clip-path="url(#${id})">`;diagram+=rectangle(project,[-5.4,-.22,-3],[5.4,0,3],'#bbaa98');for(const o of obstacles.filter(o=>o.name.startsWith('desk/')&&!['desk/0'].includes(o.name)||o.name.startsWith('printer/')))diagram+=rectangle(project,o.box.min.toArray(),o.box.max.toArray(),o.name.startsWith('printer')?'#abb6bd88':'#bbaa9840');
 if(id==='left'){diagram+=rectangle(project,[-6.769,-6.3,2.281],[-5.131,-4.704,3.919],'#89917c66');const l=side(new T.Vector3(-6.706,-4.704,3.1)),r=side(new T.Vector3(-5.194,-4.704,3.1));diagram+=`<path d="M${l} L${r}" stroke="#4c563f" stroke-width="3"/>`;}else{const c=top(new T.Vector3(-5.95,0,3.1));diagram+=`<ellipse cx="${c[0]}" cy="${c[1]}" rx="${.819*85}" ry="${.819*92}" fill="#89917c66"/><ellipse cx="${c[0]}" cy="${c[1]}" rx="${.756*85}" ry="${.756*92}" fill="#f6f6f2" stroke="#4c563f" stroke-width="2"/>`;}
 diagram+=`<path d="${path(previous.getPoints(100).map(project))}" fill="none" stroke="#c94351" stroke-width="2" stroke-dasharray="6 4"/><path d="${path(corrected.getPoints(100).map(project))}" fill="none" stroke="#087c71" stroke-width="3"/>`;
 for(const t of [0,.2,.4,.6,.8,1]){const c=project(corrected.getPoint(t));diagram+=`<ellipse cx="${c[0]}" cy="${c[1]}" rx="${R*85}" ry="${R*(id==='left'?66:92)}" fill="#087c7117" stroke="#087c71"/>`;}diagram+='</g>';}
diagram+=`<g font-family="sans-serif" font-size="17" fill="#25343c"><text x="35" y="793">Green: new path + enclosing paper sphere, radius .2583</text><text x="35" y="822">Red: old path penetrates tabletop at 423 ms</text><text x="655" y="793">Desk, apron, posts, printer/tray and bin stay fixed</text><text x="655" y="822">Current timing: crumple 200 ms + toss 800 ms</text><text x="35" y="851">Start: open-page release after .4-unit lift. End: live ball contacts the static receiving pile.</text></g></svg>`;
diagram=diagram.replace(/fill="#([0-9a-f]{6})([0-9a-f]{2})"/g,(_,color,alpha)=>`fill="#${color}" fill-opacity="${parseInt(alpha,16)/255}"`);
diagram=diagram.replace('</svg>','<g font-family="sans-serif" font-size="15" fill="#25343c"><text x="470" y="170">Release</text><text x="190" y="670">Inside bin</text><text x="320" y="285">Desk edge</text><text x="270" y="245">Printer</text><text x="930" y="330">Printer / tray</text><text x="666" y="676">Bin opening</text></g></svg>');
fs.writeFileSync(new URL('trajectory.svg',dir),diagram);
