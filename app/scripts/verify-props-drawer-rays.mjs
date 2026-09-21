import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {Desk,harness,materialize} from './support/chair-scene-fixture.mjs';import {mountProps} from './support/production-props-fixture.mjs';import {deskPose,deskAngles} from '../src/prototype/deskCamera.js';
const props=mountProps().root,ray=new T.Raycaster(),results=[];
for(let mask=0;mask<8;mask++){
 const desk=materialize(harness(Desk,{drawers:[0,1,2].map(i=>!!(mask&(1<<i)))}).tree);desk.updateMatrixWorld(true);const targets=[];desk.traverse(o=>{if(o.name==='drawer-handle')targets.push(o)});
 for(const angles of [...Array.from({length:17},(_,i)=>deskAngles(i*2.5)),...[-.48,.48].flatMap(yaw=>[-.16,.22].map(pitch=>({yaw,pitch})))]){
 const origin=deskPose({width:1440,height:900},angles).position;let visible=0;
 for(const object of targets){const b=new T.Box3().setFromObject(object,true);for(const fraction of [.15,.5,.85]){const point=new T.Vector3(b.min.x+(b.max.x-b.min.x)*fraction,(b.min.y+b.max.y)/2,b.max.z);ray.set(origin,point.clone().sub(origin).normalize());ray.far=Infinity;const original=ray.intersectObject(desk,true)[0];if(original?.object!==object)continue;visible++;ray.far=original.distance-.001;const hit=ray.intersectObject(props,true)[0];assert.ok(!hit,JSON.stringify({mask,angles,point,newOccluder:hit?.object.name}));}}
 results.push({mask,angles,baselineVisibleHandleRays:visible});
 }
}
assert.ok(results.some(r=>r.baselineVisibleHandleRays>0));const result={pass:true,configurations:results.length,preservedVisibleRays:results.reduce((n,r)=>n+r.baselineVisibleHandleRays,0),results,note:'Actual desk and actual mounted prop triangles. Rays already hidden by desk are excluded; all eight open/closed combinations across 21 camera angles. No native input.'};fs.writeFileSync(new URL('../../docs/redesign/session-19-production-props/drawer-rays.json',import.meta.url),JSON.stringify(result,null,2));console.log('PASS',result.configurations,'configurations;',result.preservedVisibleRays,'previously exposed drawer-handle rays preserved');
