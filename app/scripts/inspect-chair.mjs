// Export actual mounted geometry for offline SceneKit comparison; no browser.
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Chair,Desk,Printer,Bin,Plant,Lamp,harness,materialize,CHAIR,FLOOR_Y,DESK} from './support/chair-scene-fixture.mjs';
import {LAPTOP,PHONE} from '../src/prototype/deviceGeometry.js';
const before=process.argv.includes('--chair-before'),tag=before?'before':'after',dir=new URL('../../docs/redesign/session-07-chair-refinement/',import.meta.url);
const scene=new T.Group(),chair=materialize(harness(Chair,{}).tree);chair.name='chair';scene.add(chair);
for(const [name,Component,props]of [['desk',Desk,{}],['printer',Printer,{progress:{current:0},onResume(){}}],['bin',Bin,{}],['plant',Plant,{}],['lamp',Lamp,{onToggle(){},night:false,reduced:false}]]){const node=materialize(harness(Component,props).tree);node.name=name;scene.add(node)}
const loader=new GLTFLoader();loader.register(()=>({name:'OFFLINE_TEXTURE',loadTexture(){return Promise.resolve(new T.Texture())}}));
async function load(name){const b=fs.readFileSync(new URL('../src/prototype/assets/'+name,import.meta.url));return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'')).scene;}
const laptop=await load('laptop-m3.glb');laptop.scale.setScalar(LAPTOP.modelScale);const laptopRoot=new T.Group();laptopRoot.name='laptop';laptopRoot.position.fromArray(LAPTOP.position);laptopRoot.add(laptop);scene.add(laptopRoot);
const handset=await load('phone-workspace.glb'),box=new T.Box3().setFromObject(handset),s=1.38/box.getSize(new T.Vector3()).y;handset.scale.setScalar(s);handset.position.copy(box.getCenter(new T.Vector3()).multiplyScalar(-s));handset.traverse(o=>{if(o.isMesh){if(o.material.name==='pIJKfZsazmcpEiU')o.visible=false;if(o.material.name==='zFdeDaGNRwzccye')o.material=new T.MeshBasicMaterial({color:'#090c0e'})}});const flip=new T.Group();flip.rotation.y=Math.PI;flip.add(handset);const phone=new T.Group();phone.name='phone';phone.position.fromArray(PHONE.desk);phone.rotation.set(-Math.PI/2,0,-.23);phone.add(flip);scene.add(phone);
scene.updateMatrixWorld(true);
const meshes=[],parts=[];scene.traverse(o=>{if(!o.isMesh||!o.visible)return;const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),positions=[],normals=[];
 for(let i=0;i<a.count;i++){positions.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).toArray());if(n)normals.push(new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray())}
 const m=Array.isArray(o.material)?o.material[0]:o.material;let root=o;while(root.parent&&root.parent!==scene)root=root.parent;const worldBox=new T.Box3().setFromPoints(positions.map(p=>new T.Vector3(...p)));
 meshes.push({name:o.name,root:root.name,positions,normals,indices:o.geometry.index?[...o.geometry.index.array]:Array.from({length:a.count},(_,i)=>i),color:m.color.toArray(),roughness:m.roughness??.8,metalness:m.metalness??0});
 if(root===chair)parts.push({name:o.name||'part-'+parts.length,min:worldBox.min.toArray(),max:worldBox.max.toArray(),triangles:(o.geometry.index?.count??a.count)/3});
});
const extents=new T.Box3().setFromObject(chair),inverse=chair.matrixWorld.clone().invert(),localPoints=[];chair.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++)localPoints.push(new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse))});const localBox=new T.Box3().setFromPoints(localPoints);
const measurements={tag,contract:CHAIR,parts,world:{min:extents.min.toArray(),max:extents.max.toArray(),size:extents.getSize(new T.Vector3()).toArray()},local:{min:localBox.min.toArray(),max:localBox.max.toArray(),size:localBox.getSize(new T.Vector3()).toArray()},chairMeshes:parts.length,chairTriangles:parts.reduce((s,p)=>s+p.triangles,0),deskWidth:DESK.width,laptopWidth:3.12,floor:FLOOR_Y};
fs.writeFileSync(new URL(tag+'-measurements.json',dir),JSON.stringify(measurements,null,2)+'\n');
fs.writeFileSync(new URL(tag+'-render.json',dir),JSON.stringify({tag,meshes})+'\n');
console.log(JSON.stringify({tag,world:measurements.world,local:measurements.local,meshes:parts.length,triangles:measurements.chairTriangles},null,2));
export {chair,scene,measurements};
