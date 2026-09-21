// Actual materialized chair geometry; offline evidence, not browser acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {chair,scene,measurements} from './inspect-chair.mjs';
import {CHAIR,FLOOR_Y} from '../src/prototype/sceneScale.js';
const checks=[],details={};
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)};
const meshes=[];chair.traverse(o=>{if(o.isMesh)meshes.push(o)});
const vertices=o=>Array.from({length:o.geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld));
const world=p=>chair.localToWorld(new T.Vector3(...p));
const bounds=o=>new T.Box3().setFromPoints(vertices(o));
const ray=new T.Raycaster(),direction=new T.Vector3(1,.317,.137).normalize();
function contains(mesh,point){
 if(!new T.Box3().setFromObject(mesh).expandByScalar(1e-6).containsPoint(point))return false;
 const material=mesh.material,side=material.side;material.side=T.DoubleSide;ray.set(point,direction);
 const distances=ray.intersectObject(mesh,false).map(h=>h.distance);material.side=side;
 if(distances.some(d=>d<1e-6))return true;
 return distances.filter((d,i)=>!i||Math.abs(d-distances[i-1])>1e-6).length%2===1;
}
check('all five casters contact the existing floor; no chair vertex penetrates it',()=>{
 details.casterFloorErrors=Array.from({length:5},(_,i)=>bounds(chair.getObjectByName('wheel-'+i)).min.y-FLOOR_Y);
 for(const error of details.casterFloorErrors)assert.ok(Math.abs(error)<1e-6);
 assert.ok(Math.min(...meshes.map(o=>bounds(o).min.y))>=FLOOR_Y-1e-6);
 assert.deepEqual(chair.position.toArray(),[.25,FLOOR_Y,4.95]);assert.equal(chair.rotation.y,-.2);
});
check('backrest upper edge reclines away from the sitter in the actual transformed frame',()=>{
 const back=chair.getObjectByName('backrest'),inverse=chair.matrixWorld.clone().invert();
 const lower=back.localToWorld(new T.Vector3(0,0,0)).applyMatrix4(inverse),upper=back.localToWorld(new T.Vector3(0,CHAIR.backHeight,0)).applyMatrix4(inverse);
 assert.ok(upper.z>lower.z);assert.ok(upper.y>lower.y);
 details.backTiltDegrees=Math.atan2(upper.z-lower.z,upper.y-lower.y)*180/Math.PI;
});
check('every rod endpoint joins another actual mesh, including back, arms, gas column and caster forks',()=>{
 let endpoints=0;
 for(const rod of meshes.filter(m=>m.geometry.type==='CylinderGeometry'&&!m.name.startsWith('wheel-'))){
  const h=rod.geometry.parameters.height;
  for(const y of [-h/2,h/2]){const p=rod.localToWorld(new T.Vector3(0,y,0));assert.ok(meshes.some(other=>other!==rod&&contains(other,p)),`Disconnected rod endpoint ${p.toArray()}`);endpoints++}
 }
 details.connectedRodEndpoints=endpoints;
});
check('seat upholstery, pan and mechanism overlap; back cushion is seated in its shell',()=>{
 for(const [a,b,p]of [['seat-cushion','seat-pan',world([0,3.70,0])],['seat-pan','seat-mechanism',world([0,3.58,.1])],['back-cushion','back-shell',chair.getObjectByName('backrest').localToWorld(new T.Vector3(0,CHAIR.backHeight/2,.19))]]){
  assert.ok(contains(chair.getObjectByName(a),p),a);assert.ok(contains(chair.getObjectByName(b),p),b);
 }
 const seat=bounds(chair.getObjectByName('seat-cushion'));details.seatTopAboveFloor=seat.max.y-FLOOR_Y;details.seatTopCm=details.seatTopAboveFloor*11.5;
 // Record usable height rather than asserting an arbitrary aesthetic target.
});
check('chair clears the fixed desk/drawers and nearby devices and props',()=>{
 const clearances={};
 for(const prop of scene.children.filter(o=>o!==chair)){
  const box=new T.Box3().setFromObject(prop),chairBox=new T.Box3().setFromObject(chair);
  // Positive bounding-box separation certifies no geometry intersection.
  const gap=new T.Vector3(...['x','y','z'].map(axis=>Math.max(0,box.min[axis]-chairBox.max[axis],chairBox.min[axis]-box.max[axis]))).length();
  assert.ok(gap>0,`chair intersects conservative ${prop.name} bounds`);clearances[prop.name]=gap;
 }
 details.conservativeClearance=clearances;
});
fs.writeFileSync(new URL('../../docs/redesign/session-07-chair-refinement/geometry-checks.json',import.meta.url),JSON.stringify({checks,details,chairMeshes:measurements.chairMeshes,chairTriangles:measurements.chairTriangles,evidence:'Actual geometry and offline ray/bounds checks. Not browser, ergonomic certification or visual acceptance.'},null,2)+'\n');
console.log(`${checks.length} focused geometry checks passed`);
