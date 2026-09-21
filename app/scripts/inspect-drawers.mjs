// Export actual mounted geometry for offline comparisons, no browser.
import fs from 'node:fs';import * as T from 'three';import {Desk,harness,materialize} from './support/chair-scene-fixture.mjs';
const dir=new URL('../../docs/redesign/session-15-drawers/',import.meta.url);
for(const [tag,states] of [['closed',[false,false,false]],['open',[true,true,true]],['top',[true,false,false]],['middle',[false,true,false]],['bottom',[false,false,true]]]){
 const root=materialize(harness(Desk,{drawers:states}).tree);root.updateMatrixWorld(true);const meshes=[],materials=new Set();
 root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),positions=[],normals=[];for(let i=0;i<a.count;i++){positions.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).toArray());if(n)normals.push(new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray());}const m=o.material;materials.add(m);let parent=o,drawer=null;while(parent){if(/^drawer-[0-2]$/.test(parent.name))drawer=parent.name;parent=parent.parent;}
 meshes.push({root:'desk',drawer,name:o.name,positions,normals,indices:o.geometry.index?[...o.geometry.index.array]:Array.from({length:a.count},(_,i)=>i),color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,side:m.side,castShadow:true});
 });
 const bounds=new T.Box3().setFromObject(root);fs.writeFileSync(new URL(tag+'-desk.json',dir),JSON.stringify({meshes})+'\n');console.log(tag,{meshes:meshes.length,triangles:meshes.reduce((n,m)=>n+m.indices.length/3,0),materials:materials.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
}
