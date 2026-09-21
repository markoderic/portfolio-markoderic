// Actual GLTFLoader geometry/material parsing, with image decoding stubbed only.
// No browser, WebGL, frame-rate or input verification is implied.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LAPTOP } from '../src/prototype/deviceGeometry.js';
import { projectScreen, maskPhone, maskPaper } from '../src/prototype/screenProjection.js';
import { localPointer } from '../src/prototype/windowState.js';
import { recordEntryStage, entryStatus } from '../src/prototype/entryState.js';
const originalBytes=fs.readFileSync(new URL('../../docs/redesign/session-04a-laptop-inspection/originals/macbook_pro_m3_16_inch_2024.glb',import.meta.url));
const derivedBytes=fs.readFileSync(new URL('../src/prototype/assets/laptop-m3.glb',import.meta.url));
const json=b=>JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),g=json(originalBytes),d=json(derivedBytes);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function parse(bytes){const loader=new GLTFLoader();loader.register(parser=>({name:'OFFLINE_TEXTURE_DECODE',loadTexture(index){const t=new T.Texture();const s=parser.json.samplers[parser.json.textures[index].sampler];t.wrapS=s.wrapS===10497?T.RepeatWrapping:T.ClampToEdgeWrapping;t.wrapT=s.wrapT===10497?T.RepeatWrapping:T.ClampToEdgeWrapping;return Promise.resolve(t)}}));const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);return loader.parseAsync(data,'');}
const original=await parse(originalBytes),derived=await parse(derivedBytes);original.scene.updateMatrixWorld(true);derived.scene.updateMatrixWorld(true);
let count=0;function check(name,fn){fn();console.log('PASS '+name);count++}
const sourceMeshes=new Map();original.scene.traverse(o=>{if(o.isMesh)sourceMeshes.set(original.parser.associations.get(o).meshes,o)});
const runtimeMeshes=[];derived.scene.traverse(o=>{if(o.isMesh)runtimeMeshes.push(o)});
check('original hash, binary header and embedded provenance retained; no account evidence',()=>{
 assert.equal(hash(originalBytes),'234c2b69cbf0327b46c4440610da0845679ae51ee84d4b5d46dd3bf5a1392b02');assert.equal(derivedBytes.readUInt32LE(8),derivedBytes.length);assert.equal(d.asset.extras.source,g.asset.extras.source);assert.equal(d.asset.extras.author,g.asset.extras.author);assert.equal(d.asset.extras.license,g.asset.extras.license);assert.match(d.asset.extras.adaptation,/No decimation/);
});
check('every retained vertex, normal, tangent, UV set and triangle matches transformed original',()=>{
 for(const m of runtimeMeshes){const entry=d.meshes[derived.parser.associations.get(m).meshes];let base=0,indexOffset=0;
  for(const sourceIndex of entry.extras.sourceMeshes){const src=sourceMeshes.get(sourceIndex),geom=src.geometry,nm=new T.Matrix3().getNormalMatrix(src.matrixWorld);assert.deepEqual(Object.keys(m.geometry.attributes).sort(),Object.keys(geom.attributes).sort());
   for(const [name,a]of Object.entries(geom.attributes)){const dest=m.geometry.attributes[name];for(let i=0;i<a.count;i++){
    let values=Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k]);if(name==='position')values=new T.Vector3(...values).applyMatrix4(src.matrixWorld).toArray();if(name==='normal')values=new T.Vector3(...values).applyNormalMatrix(nm).toArray();if(name==='tangent')values=[...new T.Vector3(...values).transformDirection(src.matrixWorld).toArray(),values[3]];
    for(let k=0;k<a.itemSize;k++)assert.ok(Math.abs(dest.array[(base+i)*a.itemSize+k]-values[k])<.00001,`${sourceIndex}/${name}/${i}/${k}`);
   }}
   for(let i=0;i<geom.index.count;i++)assert.equal(m.geometry.index.getX(indexOffset+i),geom.index.getX(i)+base);
   indexOffset+=geom.index.count;base+=geom.attributes.position.count;
  }
  assert.equal(indexOffset,m.geometry.index.count);assert.equal(base,m.geometry.attributes.position.count);assert.ok([...m.geometry.index.array].every(i=>i>=0&&i<base));
 }
});
check('only audited alpha-zero parts omitted; separate dark display and wallpaper bytes removed',()=>{
 const kept=d.meshes.flatMap(m=>m.extras.sourceMeshes).sort((a,b)=>a-b),expected=g.meshes.flatMap((m,i)=>m.primitives[0].material===5?[]:[i]);assert.deepEqual(kept,expected);
 const display=derived.scene.getObjectByName('M3_DisplayBacking');assert.ok(display?.isMesh&&display.material.isMeshBasicMaterial);assert.equal(display.material.map,null);assert.ok(display.material.color.r<.01);
 const imageBytes=(b,j,img)=>{const v=j.bufferViews[img.bufferView],start=28+b.readUInt32LE(12);return b.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength)};
 const wallpaperHash=hash(imageBytes(originalBytes,g,g.images[16]));const retainedHashes=d.images.map(im=>hash(imageBytes(derivedBytes,d,im)));assert.ok(!retainedHashes.includes(wallpaperHash));assert.deepEqual([...retainedHashes].sort(),g.images.filter((_,i)=>i!==16).map(im=>hash(imageBytes(originalBytes,g,im))).sort());assert.ok(!d.materials.some(m=>m.emissiveTexture));
});
check('speaker repeat sampler, texture-coordinate channels and material definitions survive',()=>{
 for(const mesh of d.meshes){const sourceIndex=mesh.extras.sourceMeshes[0],sourceMat=g.materials[g.meshes[sourceIndex].primitives[0].material],dest=d.materials[mesh.primitives[0].material];if(sourceIndex===56)continue;
  function normalize(m,j){const v=structuredClone(m);delete v.name;function walk(o){if(!o||typeof o!=='object')return;for(const[k,x]of Object.entries(o)){if(k.endsWith('Texture')){const t=j.textures[x.index];x.imageHash=hash(image(j,t.source));delete x.index;assert.equal(j.samplers[t.sampler].wrapS,10497);assert.equal(j.samplers[t.sampler].wrapT,10497)}else walk(x)}}walk(v);return v;}
  function image(j,index){const b=j===g?originalBytes:derivedBytes,v=j.bufferViews[j.images[index].bufferView],start=28+b.readUInt32LE(12);return b.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength)}
  assert.deepEqual(normalize(dest,d),normalize(sourceMat,g));
 }
});
const root=new T.Group();root.position.set(...LAPTOP.position);derived.scene.scale.setScalar(LAPTOP.modelScale);root.add(derived.scene);const screen=new T.Object3D();screen.position.set(...LAPTOP.screenPosition);screen.rotation.set(...LAPTOP.screenRotation);root.add(screen);root.updateMatrixWorld(true);
const display=derived.scene.getObjectByName('M3_DisplayBacking'),normal=new T.Vector3(0,0,1).transformDirection(screen.matrixWorld),ray=new T.Raycaster();
check('loaded derived hierarchy is scaled once, desk-contacting and proportional to source body',()=>{
 const box=new T.Box3().setFromObject(derived.scene);assert.ok(Math.abs(box.min.y)<1e-6);assert.ok(box.getSize(new T.Vector3()).x>3.119&&box.getSize(new T.Vector3()).x<3.121);
 const src=sourceMeshes.get(6),boxBody=new T.Box3().setFromObject(src);assert.ok(Math.abs(boxBody.getSize(new T.Vector3()).x*LAPTOP.modelScale-3.12)<1e-7);assert.equal(LAPTOP.width/LAPTOP.height,1.6);assert.ok(screen.getWorldScale(new T.Vector3()).distanceTo(new T.Vector3(1,1,1))<1e-9);
});
check('10,449 actual loaded-display ray samples contain adapter rectangle; notch stays above menu',()=>{
 for(let y=0;y<=80;y++)for(let x=0;x<=128;x++){const point=new T.Vector3((x/128-.5)*LAPTOP.width,(y/80-.5)*LAPTOP.height,0).applyMatrix4(screen.matrixWorld);ray.set(point.clone().addScaledVector(normal,.1),normal.clone().negate());const hit=ray.intersectObject(display,false)[0];assert.ok(hit,`outside aperture ${x},${y}`);assert.ok(hit.point.distanceTo(point)<.000002);}
 // Probe the center notch near the physical top, which must NOT be display geometry.
 const position=display.geometry.attributes.position,up=new T.Vector3(0,1,0).transformDirection(screen.matrixWorld);let max=-Infinity;for(let i=0;i<position.count;i++)max=Math.max(max,new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(display.matrixWorld).dot(up));
 const top=new T.Vector3(0,LAPTOP.height/2,0).applyMatrix4(screen.matrixWorld);assert.ok(max-top.dot(up)>.05);const notch=top.clone().addScaledVector(up,max-top.dot(up)-.01);ray.set(notch.clone().addScaledVector(normal,.1),normal.clone().negate());assert.equal(ray.intersectObject(display,false).length,0);
});
check('new aperture projection and pointer inverse agree through desk/laptop/phone/paper transition fixtures',()=>{
 globalThis.getComputedStyle=el=>el.style;globalThis.DOMMatrix=class { constructor(css){this.values=Float64Array.from(css.slice(9,-1).split(","),Number)} toFloat64Array(){return this.values} };const target=screen.getWorldPosition(new T.Vector3()),pixels={width:1120,height:700},viewport={width:1440,height:900};
 const poses=[{eye:[10,6.8,23],look:[0,-2,1]},{eye:target.clone().addScaledVector(normal,3.6).toArray(),look:target.toArray()},{eye:[1.15,1.5,4],look:[1.15,1.5,.534]},{eye:[-2.2,1.15,5.9],look:[-2.2,1.15,1.7]}];
 let samples=0;for(let p=0;p<poses.length;p++)for(let step=0;step<=20;step++){const a=poses[p],b=poses[(p+1)%poses.length],t=step/20,camera=new T.PerspectiveCamera(39,1.6,.1,100);camera.position.fromArray(a.eye).lerp(new T.Vector3(...b.eye),t);camera.lookAt(new T.Vector3(...a.look).lerp(new T.Vector3(...b.look),t));camera.updateMatrixWorld();const el={style:{},closest:()=>null};projectScreen(el,screen,camera,viewport,[LAPTOP.width,LAPTOP.height],pixels);assert.equal(el.style.visibility,'visible');const values=el.style.transform.slice(9,-1).split(',').map(Number),css=new T.Matrix4().fromArray(values);
  for(const [u,v]of [[0,0],[1,0],[1,1],[0,1],[.4,.3]]){const result=new T.Vector4(u*pixels.width,v*pixels.height,0,1).applyMatrix4(css),x=result.x/result.w,y=result.y/result.w;const world=new T.Vector3((u-.5)*LAPTOP.width,(.5-v)*LAPTOP.height,0).applyMatrix4(screen.matrixWorld).project(camera);assert.ok(Math.abs(x-(world.x+1)*720)<1e-7&&Math.abs(y-(1-world.y)*450)<1e-7);const inverse=localPointer(el,x,y);assert.ok(Math.abs(inverse.x-u*pixels.width)<1e-6&&Math.abs(inverse.y-v*pixels.height)<1e-6);samples++;}
  const phone=new T.Object3D();phone.position.set(1.15,1.5,.48);phone.updateMatrixWorld();const paper=new T.Mesh(new T.PlaneGeometry(1.8,2.329));paper.position.set(-2.2,1.15,1.7);paper.updateMatrixWorld();for(const apply of [el=>maskPhone(el,phone,camera,pixels,screen,pixels),el=>maskPaper(el,paper,camera,screen,pixels)]){const mask={style:{}};apply(mask);assert.ok(!/NaN|Infinity/.test(mask.style.clipPath));}
 }delete globalThis.getComputedStyle;delete globalThis.DOMMatrix;assert.equal(samples,420);
});
check('laptop readiness requires model AND workspace in either order; error never becomes ready',()=>{
 for(const ids of [['workspace','laptopModel'],['laptopModel','workspace']]){let s={desk:true,phone:true,resources:true};s=recordEntryStage(s,ids[0]);assert.equal(entryStatus(s).ready,false);s=recordEntryStage(s,ids[1]);assert.equal(entryStatus(s).ready,true);assert.equal(recordEntryStage(s,ids[1]),s);assert.equal(entryStatus(s,{errors:['laptop-m3.glb']}).ready,false);assert.equal(entryStatus(s,{failed:true}).ready,false);}
});
console.log(`${count} asset/adapter checks passed. Texture image decoding mocked; no browser or GPU evidence.`);
