// Actual generated geometry and camera/ray math. No browser or real input.
import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';import {MeshBVH} from 'three-mesh-bvh';
import {Plant,Desk,Printer,Lamp,harness,materialize} from './support/paper-scene-fixture.mjs';
import {PLANT_LEAVES,PLANT_SOIL,soilHeight,leafGeometry,soilGeometry} from '../src/prototype/plantGeometry.js';
import {deskPose,deskAngles} from '../src/prototype/deskCamera.js';import {LAPTOP,PHONE} from '../src/prototype/deviceGeometry.js';import {FLOOR_Y} from '../src/prototype/sceneScale.js';
import {loadLaptop} from './support/laptop-lighting-fixture.mjs';
const dir=new URL('../../docs/redesign/session-12-plant/',import.meta.url),results=[],details={};
const check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name)};
const h=harness(Plant,{}),plant=materialize(h.tree);plant.updateMatrixWorld(true);const leaves=plant.children.slice(2),soil=plant.children[1],pot=plant.children[0];
check('pot world vertices/material/floor unchanged from captured pre-edit geometry',()=>{
 const before=JSON.parse(fs.readFileSync(new URL('before-plant.json',dir))).meshes[0],p=pot.geometry.attributes.position;
 for(let i=0;i<p.count;i++)assert.deepEqual(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(pot.matrixWorld).toArray(),before.positions[i]);
 assert.deepEqual(pot.material.color.toArray(),before.color);assert.equal(pot.material.roughness,before.roughness);assert.equal(new T.Box3().setFromObject(pot).min.y,FLOOR_Y);
});
check('finite solid leaves, outward normals, closed edges, no leaf-to-leaf intersection',()=>{
 let minimumVolume=Infinity,minimumNormal=Infinity;
 for(const leaf of leaves){const g=leaf.geometry,p=g.attributes.position,n=g.attributes.normal,ids=g.index.array,edges=new Map();let volume=0;
  for(let k=0;k<p.count;k++){const a=new T.Vector3().fromBufferAttribute(p,k),b=new T.Vector3().fromBufferAttribute(n,k);assert.ok([...a,...b].every(Number.isFinite));minimumNormal=Math.min(minimumNormal,b.length());assert.ok(Math.abs(b.length()-1)<1e-5);}
  for(let k=0;k<ids.length;k+=3){const tri=[ids[k],ids[k+1],ids[k+2]],v=tri.map(i=>new T.Vector3().fromBufferAttribute(p,i));assert.ok(new T.Triangle(...v).getArea()>1e-12);volume+=v[0].dot(v[1].clone().cross(v[2]))/6;for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],key=[a,b].sort((a,b)=>a-b).join('/');edges.set(key,(edges.get(key)??0)+1)}}
  assert.ok([...edges.values()].every(n=>n===2));assert.ok(volume>0);minimumVolume=Math.min(minimumVolume,volume);
 }
 for(let i=0;i<leaves.length;i++)for(let j=i+1;j<leaves.length;j++)assert.equal(new MeshBVH(leaves[i].geometry.clone()).intersectsGeometry(leaves[j].geometry,new T.Matrix4()),false,`leaves ${i}/${j} intersect`);
 details.leaves={minimumVolume,minimumNormal,intersectionPairs:0};
});
check('entire buried bases fit soil/interior; actual soil triangles intersect every leaf around its full perimeter',()=>{
 const inner=y=>.37+(y-.08)/(.74-.08)*.07;let minimumBury=Infinity,wallMargin=Infinity;
 const ground=new T.Mesh(soil.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));ground.updateMatrixWorld();
 leaves.forEach(leaf=>{const p=leaf.geometry.attributes.position;
  for(let k=0;k<12;k++){
   const root=new T.Vector3().fromBufferAttribute(p,k);minimumBury=Math.min(minimumBury,soilHeight(root.x,root.z)-root.y);
   let crossed=false;for(let ring=0;ring<4;ring++){const below=new T.Vector3().fromBufferAttribute(p,k+ring*12),above=new T.Vector3().fromBufferAttribute(p,k+(ring+1)*12),delta=above.clone().sub(below),ray=new T.Raycaster(below,delta.clone().normalize(),0,delta.length());crossed ||= ray.intersectObject(ground).length>0;}assert.ok(crossed,'base perimeter must cross actual soil triangles');
  }
  for(let k=0;k<p.count;k++){const v=new T.Vector3().fromBufferAttribute(p,k);if(v.y<.74){const gap=inner(v.y)-Math.hypot(v.x,v.z);assert.ok(gap>0);wallMargin=Math.min(wallMargin,gap)}}
 });
 const p=soil.geometry.attributes.position,heights=[];let soilWallMargin=Infinity;
 for(let k=0;k<p.count;k++){const x=p.getX(k),y=p.getY(k),z=p.getZ(k);assert.ok(Number.isFinite(y)&&y<.74);const gap=inner(y)-Math.hypot(x,z);assert.ok(gap>0);soilWallMargin=Math.min(soilWallMargin,gap);heights.push(y)}
 const normal=soil.geometry.attributes.normal;for(let k=0;k<normal.count;k++)assert.ok(normal.getY(k)>0);
 assert.ok(Math.max(...heights)-Math.min(...heights)>.01);details.soil={min:Math.min(...heights),max:Math.max(...heights),minimumBury,rootWallMargin:wallMargin,soilWallMargin,rimTop:.79};
});
const laptop=await loadLaptop();laptop.scale.setScalar(LAPTOP.modelScale);laptop.position.fromArray(LAPTOP.position);laptop.updateMatrixWorld(true);
const furniture={desk:materialize(harness(Desk,{}).tree),printer:materialize(harness(Printer,{progress:{current:1},onResume(){}}).tree),lamp:materialize(harness(Lamp,{onToggle(){},night:false,reduced:false}).tree),laptop};
check('plant envelope clears unchanged desk, printer, lamp, laptop and handset',()=>{
 const box=new T.Box3().setFromObject(plant),gaps={};
 for(const [name,object]of Object.entries(furniture)){const b=new T.Box3().setFromObject(object);assert.equal(box.intersectsBox(b),false,name);gaps[name]=Math.max(b.min.x-box.max.x,box.min.x-b.max.x,b.min.y-box.max.y,box.min.y-b.max.y,b.min.z-box.max.z,box.min.z-b.max.z)}
 // Conservative desk handset envelope (larger than actual phone).
 const phone=new T.Box3().setFromCenterAndSize(new T.Vector3(...PHONE.desk),new T.Vector3(2,.3,2));assert.equal(box.intersectsBox(phone),false);details.sceneAxisGaps=gaps;
});
check('camera extremes retain clump silhouette and plant does not intercept device/lamp selection rays',()=>{
 const sizes=[{width:1440,height:900},{width:1920,height:1080},{width:390,height:844}],angles=[...Array.from({length:81},(_,i)=>deskAngles(i*.5)),...[-.48,.48].flatMap(yaw=>[-.16,.22].map(pitch=>({yaw,pitch})))];
 const laptopPoint=new T.Vector3(...LAPTOP.screenPosition).add(new T.Vector3(...LAPTOP.position));
 const targets=[['laptop',laptopPoint],['phone',new T.Vector3(...PHONE.desk)],['printer',new T.Vector3(-3.65,1,-.65)],['lamp',new T.Vector3(3.4,.15,-1.05)]];
 const points=[];plant.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++)points.push(new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld))});
 let maxX=0,maxY=0,rays=0;
 for(const size of sizes)for(const angle of angles)for(const hover of [null,...targets.map(t=>t[1])]){
  const pose=deskPose(size,angle,hover),camera=new T.PerspectiveCamera(39,size.width/size.height,.1,100);camera.position.copy(pose.position);camera.lookAt(pose.look);camera.updateMatrixWorld();
  for(const p of points){const q=p.clone().project(camera);maxX=Math.max(maxX,Math.abs(q.x));maxY=Math.max(maxY,Math.abs(q.y));assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z<1&&q.z>-1,'plant outside current camera frustum '+JSON.stringify({size,angle,q}))}
  for(const [id,p]of targets){const delta=p.clone().sub(camera.position),ray=new T.Raycaster(camera.position,delta.clone().normalize(),0,delta.length());assert.equal(ray.intersectObject(plant,true).length,0,id+' ray obstructed');rays++}
 }
 details.framing={poses:sizes.length*angles.length*5,actionRays:rays,maxAbsNdcX:maxX,maxAbsNdcY:maxY};
});
check('deterministic geometry, non-emissive materials, memoized across rerenders, no new frame callback or event handler',()=>{
 const a=soilGeometry(),b=soilGeometry();assert.deepEqual(a.attributes.position.array,b.attributes.position.array);assert.deepEqual(a.attributes.color.array,b.attributes.color.array);
 for(let i=0;i<leaves.length;i++)assert.deepEqual(leaves[i].geometry.attributes.position.array,leafGeometry(PLANT_LEAVES[i],i).attributes.position.array);
 const old=h.slots.map(v=>v.value);h.flushEffects();h.render({});h.slots.forEach((v,i)=>assert.equal(v.value,old[i]));
 for(const mesh of [soil,...leaves])for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){assert.equal(m.emissive.getHex(),0);assert.equal(m.metalness,0);assert.ok(m.roughness>=.7)}
 const source=fs.readFileSync(new URL('../src/prototype/StudioProps.jsx',import.meta.url),'utf8').split('export function Plant()')[1].split('export function Lamp')[0];assert.doesNotMatch(source,/useFrame|onClick|onPointer|Math.random|dispose=\{null\}/);
});
check('owned prop geometries/materials are disposed on unmount',()=>{
 const owned=[...leaves.map(l=>l.geometry),soil.geometry,leaves[0].material,...soil.material];let disposed=0;
 for(const resource of owned)resource.addEventListener('dispose',()=>disposed++);
 h.slots.forEach(s=>s.cleanup?.());assert.equal(disposed,owned.length);details.ownedResourcesDisposed=disposed;
});
fs.writeFileSync(new URL('plant-checks.json',dir),JSON.stringify({evidence:'Actual Three geometry, hook mocks and camera math; no live WebGL or input',checks:results,details},null,2)+'\n');console.log(results.length+' plant checks passed');
