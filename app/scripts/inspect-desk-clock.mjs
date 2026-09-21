import fs from 'node:fs';import * as T from 'three';import {mountClock} from './support/clock-scene-fixture.mjs';
const dir=new URL('../../docs/redesign/session-18-vintage-clock/',import.meta.url);
for(const [name,hour,minute,night]of [['day',9,58,false],['night',21,58,true],['noon',12,0,false]]){
 const root=await mountClock(new Date(2026,8,18,hour,minute),night);root.updateMatrixWorld(true);const meshes=[];root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,a=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),m=o.material;
 const positions=[],normals=[],colors=[];for(let i=0;i<a.count;i++){positions.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).toArray());if(n)normals.push(new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray());if(c)colors.push([c.getX(i)*m.color.r,c.getY(i)*m.color.g,c.getZ(i)*m.color.b]);}
 meshes.push({root:'clock',name:o.name,positions,normals,colors,indices:g.index?[...g.index.array]:Array.from({length:a.count},(_,i)=>i),color:m.color.toArray(),roughness:m.roughness??1,metalness:m.metalness??0,basic:!!m.isMeshBasicMaterial,opacity:m.opacity,castShadow:o.castShadow});});
 fs.writeFileSync(new URL(name+'-clock.json',dir),JSON.stringify({fixture:`${hour}:${minute}`,night,meshes})+'\n');console.log(name,meshes.length,meshes.reduce((n,m)=>n+m.indices.length/3,0));
}
