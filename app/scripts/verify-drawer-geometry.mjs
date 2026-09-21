// Actual JSX rounded-box/torus meshes, sampled and swept bounds. No browser.
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {Desk,Chair,harness,materialize,FLOOR_Y} from './support/chair-scene-fixture.mjs';
import {CABINET,DRAWERS,createDrawerMotion,advanceDrawer} from '../src/prototype/drawers.js';
const dir=new URL('../../docs/redesign/session-15-drawers/',import.meta.url),first=process.argv.includes('--first');
const desk=materialize(harness(Desk,{}).tree),chair=materialize(harness(Chair,{}).tree);desk.updateMatrixWorld(true);chair.updateMatrixWorld(true);
const drawers=Array.from({length:first?1:3},(_,id)=>desk.getObjectByName('drawer-'+id));assert.ok(drawers.every(Boolean));
const meshes=root=>{const a=[];root.traverse(o=>{if(o.isMesh)a.push(o)});return a;};
const box=o=>new T.Box3().setFromObject(o,true);
const fixed=meshes(desk).filter(o=>!drawers.some(d=>{for(let p=o;p;p=p.parent)if(p===d)return true;return false}));
const chairMeshes=meshes(chair);const gap=(a,b)=>Math.max(a.min.x-b.max.x,b.min.x-a.max.x,a.min.y-b.max.y,b.min.y-a.max.y,a.min.z-b.max.z,b.min.z-a.max.z);
let minChair=Infinity,minStatic=Infinity,minFloor=Infinity,minDrawer=Infinity;let comparisons=0;
const epsilon=2e-5;
// Linear rail motion: union of endpoint vertex bounds is a conservative exact
// swept AABB for each whole mesh, including every intervening translation.
const sweeps=drawers.map(d=>{d.position.z=0;d.updateWorldMatrix(true,true);const a=meshes(d).map(o=>({name:o.name,box:box(o)}));d.position.z=CABINET.travel;d.updateWorldMatrix(true,true);return a.map((record,i)=>({...record,box:record.box.union(box(meshes(d)[i]))}));});
for(const parts of sweeps)for(const part of parts){
 minFloor=Math.min(minFloor,part.box.min.y-FLOOR_Y);assert.ok(part.box.min.y>=FLOOR_Y);
 for(const o of chairMeshes){const distance=gap(part.box,box(o));minChair=Math.min(minChair,distance);assert.ok(distance>=-epsilon,'Chair '+part.name+' / '+o.name+' '+distance);comparisons++;}
 for(const o of fixed){const distance=gap(part.box,box(o));minStatic=Math.min(minStatic,distance);assert.ok(distance>=-epsilon,'Fixed '+part.name+' / '+o.name+' '+distance);comparisons++;}
}
for(let i=0;i<sweeps.length;i++)for(let j=i+1;j<sweeps.length;j++)for(const a of sweeps[i])for(const b of sweeps[j]){const distance=gap(a.box,b.box);minDrawer=Math.min(minDrawer,distance);assert.ok(distance>=-epsilon);comparisons++;}
const motion=createDrawerMotion();for(let i=0;i<23;i++)advanceDrawer(motion,true,false,1/60);assert.equal(motion.value,1);advanceDrawer(motion,false,false,.1);const actual=motion.value;advanceDrawer(motion,true,false,0);assert.equal(motion.value,actual);advanceDrawer(motion,false,true,0);assert.equal(motion.value,0);
const contents=[];
for(const d of drawers){
 const id=Number(d.name.slice(-1)),group=d.getObjectByName(['top-contents','middle-contents','bottom-contents'][id]);
 const bounds=box(group),floor=box(d.getObjectByName('tray-bottom')).max.y;
 const left=box(d.getObjectByName('tray-side--1')).max.x,right=box(d.getObjectByName('tray-side-1')).min.x;
 const rear=box(d.getObjectByName('tray-back')).max.z,front=box(d.getObjectByName('drawer-front')).min.z;
 assert.ok(bounds.min.x>=left-.00002&&bounds.max.x<=right+.00002,'contents clear tray sides');
 assert.ok(bounds.min.z>=rear-.00002&&bounds.max.z<=front+.00002,'contents clear tray back/front');
 assert.ok(bounds.min.y>=floor-.00002&&bounds.min.y-floor<.005,'contents supported at tray floor');
 contents.push({drawer:id,leftClearance:bounds.min.x-left,rightClearance:right-bounds.max.x,backClearance:bounds.min.z-rear,frontClearance:front-bounds.max.z,floorContact:bounds.min.y-floor});
}
const summary={contents,stage:first?'first top drawer':'all three drawers',travel:CABINET.travel,duration:CABINET.duration,drawers:drawers.length,meshCounts:drawers.map(d=>meshes(d).length),comparisons,minimumSeparatingAxisGaps:{chair:minChair,stationaryDesk:minStatic,floor:minFloor,betweenDrawers:first?null:minDrawer},method:'Conservative whole-mesh vertex AABB sweeps over the complete linear travel; separation sufficient, no center-point shortcut. Cabinet front can touch at its closed mounting seam.',retainedRailOverlap:1.275-(-2.015+CABINET.travel),allCombinationsCovered:!first};
fs.writeFileSync(new URL(first?'first-drawer-check.json':'drawer-clearance.json',dir),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
