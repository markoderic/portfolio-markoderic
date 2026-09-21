// Offline geometry evidence; no browser/image decode or runtime asset writes.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {convexHull,roundedOutline} from '../src/prototype/screenProjection.js';
const loader=new GLTFLoader();loader.register(()=>({name:'OFFLINE_TEXTURE',loadTexture(){return Promise.resolve(new T.Texture())}}));
const bytes=fs.readFileSync(new URL('../src/prototype/assets/phone-workspace.glb',import.meta.url));
const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
const box=new T.Box3().setFromObject(scene),scale=1.38/box.getSize(new T.Vector3()).y;
scene.scale.setScalar(scale);scene.position.copy(box.getCenter(new T.Vector3()).multiplyScalar(-scale));
const root=new T.Group();root.rotation.y=Math.PI;root.add(scene);root.updateMatrixWorld(true);
export const meshes=[];
scene.traverse(o=>{if(!o.isMesh)return;const points=Array.from({length:o.geometry.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld));meshes.push({object:o,points,name:o.name,material:o.material.name,box:new T.Box3().setFromPoints(points)});});
export const wallpaper=meshes.find(m=>m.material==='pIJKfZsazmcpEiU');
export const outline=convexHull(wallpaper.points.map(p=>[p.x,p.y]));
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const data=meshes.map(({name,material,box,points})=>({name,material,vertices:points.length,min:box.min.toArray(),max:box.max.toArray()}));
 console.log(JSON.stringify({source:'phone-workspace.glb',sha256:createHash('sha256').update(bytes).digest('hex'),meshes:data,displayOutline:outline},null,2));
}
export const glass=meshes.find(m=>m.material==='zFdeDaGNRwzccye');
export const island=meshes.find(m=>m.name==='SysBlPspVQNIcce');
export const center=wallpaper.box.getCenter(new T.Vector3());
// Front glass is a surround with an inner hole. Cross-check the display contour
// against its triangle edges, not just wallpaper bounds or a fitted corner radius.
export function edgeDistance(point,mesh){
 const a=mesh.object.geometry.attributes.position,index=mesh.object.geometry.index;
 let distance=Infinity;
 for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
  const p=new T.Vector3().fromBufferAttribute(a,index.getX(i+j)).applyMatrix4(mesh.object.matrixWorld);
  const q=new T.Vector3().fromBufferAttribute(a,index.getX(i+(j+1)%3)).applyMatrix4(mesh.object.matrixWorld);
  p.z=q.z=0;const v=new T.Vector3(point[0],point[1],0),delta=q.clone().sub(p);
  const t=T.MathUtils.clamp(v.clone().sub(p).dot(delta)/delta.lengthSq(),0,1);
  distance=Math.min(distance,v.distanceTo(p.addScaledVector(delta,Number.isFinite(t)?t:0)));
 }
 return distance;
}
if(process.argv.includes('--write-contract')){
 const size=wallpaper.box.getSize(new T.Vector3()),ib=island.box;
 const contract={source:'phone-workspace.glb',method:'Loaded PhoneModel normalization; outer display contour cross-checked against front-glass inner edges. Pivot coordinates in scene units.',width:+size.x.toFixed(7),height:+size.y.toFixed(7),position:center.toArray(),outline:outline.map(([x,y])=>[x-center.x,y-center.y]),cameraOutline:convexHull(island.points.map(p=>[p.x,p.y])).map(([x,y])=>[x-center.x,y-center.y]),island:{left:(ib.min.x-wallpaper.box.min.x)/size.x,top:(wallpaper.box.max.y-ib.max.y)/size.y,width:(ib.max.x-ib.min.x)/size.x,height:(ib.max.y-ib.min.y)/size.y}};
 const error=Math.max(...outline.map(p=>edgeDistance(p,glass)));if(error>1e-5)throw Error('Display/glass disagreement: '+error);
 fs.writeFileSync(new URL('../src/prototype/assets/phone-aperture.json',import.meta.url),JSON.stringify(contract,null,2)+'\n');
 console.error('Glass/display maximum contour edge difference:',error);
}
