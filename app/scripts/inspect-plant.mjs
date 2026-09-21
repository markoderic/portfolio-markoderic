// Export actual JSX/Three plant geometry; no browser or image decoder.
import fs from 'node:fs';import * as T from 'three';
import {Plant,harness,materialize} from './support/paper-scene-fixture.mjs';
const tag=process.argv.includes('--baseline')?'before':'after',dir=new URL('../../docs/redesign/session-12-plant/',import.meta.url);
const plant=materialize(harness(Plant,{}).tree);plant.updateMatrixWorld(true);
const meshes=[],materials=new Set(),textures=new Set();let triangles=0;
plant.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,a=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),positions=[],normals=[],colors=[];
for(let k=0;k<a.count;k++){positions.push(new T.Vector3().fromBufferAttribute(a,k).applyMatrix4(o.matrixWorld).toArray());normals.push(new T.Vector3().fromBufferAttribute(n,k).applyNormalMatrix(nm).toArray());if(c)colors.push([c.getX(k),c.getY(k),c.getZ(k),1]);}
const ids=g.index?[...g.index.array]:Array.from({length:a.count},(_,i)=>i),ms=Array.isArray(o.material)?o.material:[o.material];triangles+=ids.length/3;
for(const m of ms){materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v)})}
const groups=Array.isArray(o.material)?g.groups:[{start:0,count:ids.length,materialIndex:0}];
for(const group of groups){const m=ms[group.materialIndex];meshes.push({root:'plant',name:o.name,positions,normals,colors,indices:ids.slice(group.start,group.start+group.count),color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,side:m.side,castShadow:true})}
});
const bounds=new T.Box3().setFromObject(plant);let meshCount=0;plant.traverse(o=>{if(o.isMesh)meshCount++});
fs.writeFileSync(new URL(tag+'-plant.json',dir),JSON.stringify({meshes})+'\n');
const cost={meshes:meshCount,drawGroups:meshes.length,triangles,materials:materials.size,textures:textures.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
fs.writeFileSync(new URL(tag+'-measurements.json',dir),JSON.stringify(cost,null,2)+'\n');console.log(tag,cost);
