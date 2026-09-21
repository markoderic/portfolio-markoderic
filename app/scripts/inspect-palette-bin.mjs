// Actual JSX geometry exports, no browser. Alternate palette uses the same props.
import fs from 'node:fs';import * as T from 'three';
import {Printer,Lamp,Bin,harness,materialize} from './support/chair-scene-fixture.mjs';
import {PROP_PALETTES} from '../src/prototype/propPalette.js';
const dir=new URL('../../docs/redesign/session-16-palette-bin/',import.meta.url);
export function exportMeshes(root,label){root.updateMatrixWorld(true);const meshes=[];root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,c=o.geometry.attributes.color,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),positions=[],normals=[],colors=[];for(let i=0;i<a.count;i++){positions.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).toArray());if(n)normals.push(new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray());if(c)colors.push([c.getX(i),c.getY(i),c.getZ(i),1]);}const m=o.material;meshes.push({root:label,name:o.name,positions,normals,colors,indices:o.geometry.index?[...o.geometry.index.array]:Array.from({length:a.count},(_,i)=>i),color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,side:m.side,emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,castShadow:true});});return meshes;}
for(const [tag,palette]of Object.entries(PROP_PALETTES)){
 const meshes=[...exportMeshes(materialize(harness(Printer,{progress:{current:0},onResume(){},palette}).tree),'printer'),...exportMeshes(materialize(harness(Lamp,{night:true,onToggle(){},palette}).tree),'lamp'),...exportMeshes(materialize(harness(Bin,{}).tree),'bin')];
 fs.writeFileSync(new URL(tag+'-props.json',dir),JSON.stringify({meshes})+'\n');console.log(tag,meshes.length,meshes.reduce((sum,m)=>sum+m.indices.length/3,0));
}
