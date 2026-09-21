// Pixel-center rays through actual exported triangles at unchanged default framing.
// No raster/material/browser claim; includes desk/chair foreground occluders.
import fs from 'node:fs';import * as T from 'three';import assert from 'node:assert/strict';
const docs=new URL('../../docs/redesign/',import.meta.url),dir=new URL('session-23-gray-printer-fuller-bin/',docs);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,docs))).meshes;
const fixed=[...read('session-07-chair-refinement/after-render.json').filter(m=>m.root==='chair'),...read('session-15-drawers/closed-desk.json').filter(m=>m.root==='desk')];
const camera=new T.PerspectiveCamera(39,1440/900,.1,100);camera.position.set(11,14,21);camera.lookAt(.4,-1.7,1);camera.updateMatrixWorld();const ray=new T.Raycaster(),results={};
for(const stage of ['before','after']){
 const objects=[...fixed,...read('session-23-gray-printer-fuller-bin/'+stage+'-props.json')].map(m=>{const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(m.positions.flat(),3));g.setIndex(m.indices);const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=m.name;mesh.userData.root=m.root;mesh.updateMatrixWorld();return mesh;});
 const binBox=new T.Box3();objects.filter(o=>o.userData.root==='bin').forEach(o=>binBox.union(new T.Box3().setFromObject(o)));
 const projected=[];for(const x of [binBox.min.x,binBox.max.x])for(const y of [binBox.min.y,binBox.max.y])for(const z of [binBox.min.z,binBox.max.z]){const v=new T.Vector3(x,y,z).project(camera);projected.push([(v.x+1)*720,(1-v.y)*450]);}
 const bounds=[Math.floor(Math.min(...projected.map(p=>p[0]))),Math.ceil(Math.max(...projected.map(p=>p[0]))),Math.floor(Math.min(...projected.map(p=>p[1]))),Math.ceil(Math.max(...projected.map(p=>p[1])))];
 let papers=0,binPixels=0;const visible=new Set();for(let y=bounds[2];y<=bounds[3];y++)for(let x=bounds[0];x<=bounds[1];x++){ray.setFromCamera(new T.Vector2((x+.5)/720-1,1-(y+.5)/450),camera);const hit=ray.intersectObjects(objects,false)[0];if(hit?.object.userData.root==='bin')binPixels++;if(hit?.object.name.startsWith('bin-paper-')){papers++;visible.add(hit.object.name);}}
 results[stage]={paperPixelCenterRays:papers,binPixelCenterRays:binPixels,visiblePapers:[...visible],bounds};objects.forEach(o=>{o.geometry.dispose();o.material.dispose()});
}
assert.ok(results.after.paperPixelCenterRays>results.before.paperPixelCenterRays*2);assert.ok(results.after.visiblePapers.some(n=>Number(n.slice(10))>=11));
fs.writeFileSync(new URL('visibility.json',dir),JSON.stringify({results,method:'Exact triangle ray queries at 1440x900 pixel centers in default camera; actual bin, printer/lamp, desk and chair. Discrete visibility evidence only; not pixels from a browser or material/color appearance.'},null,2)+'\n');console.log(results);
