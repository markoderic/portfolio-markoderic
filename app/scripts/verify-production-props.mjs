import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {productionParts,productionBatches,PRODUCTION} from '../src/prototype/productionPropsGeometry.js';import {fanEnvelope} from './support/fan-envelope.mjs';
import {Desk,harness,materialize} from './support/chair-scene-fixture.mjs';import {CABINET} from '../src/prototype/drawers.js';
import {PHONE} from '../src/prototype/deviceGeometry.js';import {PAPER_WIDTH,PAPER_HEIGHT,paperFeedPosition} from '../src/prototype/paperGeometry.js';import {PRINTER} from '../src/prototype/sceneScale.js';
const dir=new URL('../../docs/redesign/session-19-production-props/',import.meta.url),checks=[],details={};const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)};
const parts=productionParts(),by=name=>parts.find(p=>p.name===name),bounds=p=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox;};parts.forEach(bounds);
// A routed cable spans empty space in its whole-mesh AABB. Conservative
// triangle bounds retain a no-contact proof without treating that empty span as solid.
const occupiedBounds=p=>{if(p.name!=='boom-cable')return [bounds(p)];const g=p.geometry,a=g.attributes.position,ix=g.index,out=[];for(let i=0;i<(ix?.count??a.count);i+=3)out.push(new T.Box3().setFromPoints([0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,ix?ix.getX(i+j):i+j))));return out;};
const gap=(a,b)=>Math.max(a.min.x-b.max.x,b.min.x-a.max.x,a.min.y-b.max.y,b.min.y-a.max.y,a.min.z-b.max.z,b.min.z-a.max.z);
const sources=[['session-07-chair-refinement/after-render.json',m=>['chair','phone'].includes(m.root)],['session-11-laptop-lighting/laptop-render.json',()=>true],['session-12-plant/after-plant.json',()=>true],['session-16-palette-bin/rose-props.json',()=>true],['session-18-vintage-clock/day-clock.json',()=>true]];
const obstacles=[];for(const [name,filter]of sources)for(const m of JSON.parse(fs.readFileSync(new URL('../../docs/redesign/'+name,import.meta.url))).meshes.filter(filter))obstacles.push({name:m.root+'/'+m.name,box:new T.Box3().setFromPoints(m.positions.map(p=>new T.Vector3(...p)))});
obstacles.push({name:'full-fan-envelope',box:fanEnvelope()});
const desk=materialize(harness(Desk,{}).tree);desk.updateMatrixWorld(true);let i=0;desk.traverse(o=>{if(!o.isMesh)return;const b=new T.Box3().setFromObject(o,true);let p=o;while(p&&!/^drawer-[0-2]$/.test(p.name))p=p.parent;if(p)b.max.z+=CABINET.travel;obstacles.push({name:'desk/'+(p?p.name+'/':'')+(o.name||i++),box:b,table:b.min.x< -5.39&&b.max.x>5.39&&Math.abs(b.max.y)<1e-5});});
check('all prop parts clear existing furniture/devices, whole fan sweep and continuous all-drawer envelope',()=>{
 let minimum=Infinity,witness;for(const p of parts)for(const o of obstacles){if(o.table){assert.ok(bounds(p).min.y>=-1e-6||bounds(p).max.y<=-.21999||bounds(p).max.x< -5.4,'part penetrates tabletop: '+p.name);continue;}const d=Math.min(...occupiedBounds(p).map(b=>gap(b,o.box)));assert.ok(d>.003,`${p.root}/${p.name} against ${o.name}: ${d}`);if(d<minimum){minimum=d;witness=[p.name,o.name]}}details.minimumGap={minimum,witness};
});
check('camera two feet contact desk; lens is supported by its mount with glass recessed behind open lip',()=>{
 for(const p of parts.filter(p=>p.name.startsWith('camera-foot'))){assert.ok(Math.abs(bounds(p).min.y)<1e-7);assert.ok(gap(bounds(p),bounds(by('camera-body')))<1e-7);}
 const inverse=new T.Matrix4().makeRotationY(PRODUCTION.cameraYaw);inverse.setPosition(...PRODUCTION.camera);inverse.invert();const local=name=>{const g=by(name).geometry.clone().applyMatrix4(inverse);g.computeBoundingBox();const b=g.boundingBox.clone();g.dispose();return b;};
 const mount=local('lens-mount'),barrel=local('lens-barrel'),glass=local('lens-optical-element'),lip=local('lens-front-lip');assert.ok(gap(mount,barrel)<1e-6);assert.ok(gap(mount,local('camera-body'))<1e-6);assert.ok(glass.max.z<lip.max.z-.02&&glass.min.z>barrel.max.z);assert.ok(local('lens-front-lip').min.y>0);assert.ok(gap(local('lens-front-sleeve'),barrel)<0);assert.ok(gap(local('lens-front-sleeve'),lip)<0);details.cameraLens={mount:mount.max.z,barrelFront:barrel.max.z,glassFront:glass.max.z,lipFront:lip.max.z};
});
check('clamp pads fit measured .22 tabletop, with continuously connected screw, jaws, arm and mic support',()=>{
 assert.ok(Math.abs(bounds(by('clamp-upper-pad')).min.y)<1e-7);assert.ok(Math.abs(bounds(by('clamp-lower-pad')).max.y+.22)<1e-7);
 const pairs=[['clamp-upper-pad','clamp-upper-jaw'],['clamp-upper-jaw','clamp-spine'],['clamp-spine','clamp-lower-jaw'],['clamp-lower-jaw','clamp-screw'],['clamp-screw','clamp-lower-pad'],['clamp-screw','clamp-handle'],['clamp-upper-jaw','boom-socket'],['boom-socket','boom-joint-0'],['boom-joint-0','boom-link-0'],['boom-link-0','boom-joint-1'],['boom-joint-1','boom-link-1'],['boom-link-1','boom-joint-2'],['boom-joint-2','mic-threaded-collar'],['mic-threaded-collar','mic-yoke-bottom'],['mic-yoke-bottom','mic-yoke-arm'],['mic-yoke-arm','mic-yoke-pivot'],['mic-yoke-pivot','mic-body'],['mic-body','mic-windscreen'],['mic-body','mic-rear-cap'],['mic-rear-cap','mic-xlr-connector'],['mic-xlr-connector','mic-strain-relief'],['mic-strain-relief','boom-cable']];
 for(const [a,b]of pairs)assert.ok(gap(bounds(by(a)),bounds(by(b)))<.001,a+' to '+b);details.supportPairs=pairs.length;
 // Also measure the rotated microphone in its own frame: world AABBs alone
 // can overlap across a small gap between a side pivot and the cylinder.
 const micMatrix=new T.Matrix4().makeRotationY(PRODUCTION.micYaw);micMatrix.setPosition(...PRODUCTION.tip);const inverse=micMatrix.invert();
 const micLocal=p=>{const g=p.geometry.clone().applyMatrix4(inverse);g.computeBoundingBox();const b=g.boundingBox.clone();g.dispose();return b;};
 for(const pivot of parts.filter(p=>p.name==='mic-yoke-pivot'))assert.ok(gap(micLocal(pivot),micLocal(by('mic-body')))<-.004,'Actual local pivot reaches mic body');
});
const {meshes:handset}=await import('./inspect-phone-edges.mjs');let radius=0;for(const m of handset)for(const p of m.points)radius=Math.max(radius,p.length());const sweep=new T.Box3().setFromPoints([new T.Vector3(...PHONE.desk),new T.Vector3(...PHONE.picked)]).expandByScalar(radius);
check('full handset rotation-independent pickup/return enclosure clears every new part',()=>{for(const p of parts)assert.ok(occupiedBounds(p).every(b=>!b.intersectsBox(sweep)),p.name);details.phone={radius,min:sweep.min.toArray(),max:sweep.max.toArray()};});
check('full paper feed at every depth clears selected props; alternate camera intersects its output lane',()=>{
 const page=new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT),matrix=new T.Matrix4().makeRotationFromEuler(new T.Euler(-Math.PI/2,0,PRINTER.rotation)),g=page.clone();matrix.setPosition(...paperFeedPosition(1));g.applyMatrix4(matrix);g.computeBoundingBox();
 const pageBox=g.boundingBox.clone();matrix.setPosition(...paperFeedPosition(0));const g0=page.clone().applyMatrix4(matrix);g0.computeBoundingBox();pageBox.union(g0.boundingBox);
 for(const p of parts)assert.ok(occupiedBounds(p).every(b=>!b.intersectsBox(pageBox)),'feed: '+p.name);
 const alt=JSON.parse(fs.readFileSync(new URL('alternative-props.json',dir))).meshes,conflicts=alt.filter(p=>p.root==='camera'&&pageBox.intersectsBox(new T.Box3(...p.bounds.map(x=>new T.Vector3(...x))))).map(p=>p.name);assert.ok(conflicts.length>0);details.alternativeFeedConflicts=conflicts;details.paperFeedBounds=[pageBox.min.toArray(),pageBox.max.toArray()];
});
check('static resources have bounded geometry and no ground-band geometry',()=>{
 const batches=productionBatches(productionParts());assert.equal(batches.length,9);assert.ok(parts.every(p=>bounds(p).min.y> -2.91));details.cost={parts:parts.length,meshes:batches.length,triangles:batches.reduce((n,p)=>n+p.geometry.attributes.position.count/3,0),materials:6,textures:0,newLights:0,newTimers:0,newFrameCallbacks:0,lowestY:Math.min(...parts.map(p=>bounds(p).min.y))};batches.forEach(p=>p.geometry.dispose());
});
fs.writeFileSync(new URL('geometry-checks.json',dir),JSON.stringify({checks,...details,evidence:'Actual Three geometry, conservative structural bounds; not browser/native verification'},null,2)+'\n');console.log(checks.length+' geometry checks passed');
