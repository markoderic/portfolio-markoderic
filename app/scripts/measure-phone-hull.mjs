// Offline read of the existing asset; never rewrites it or opens a browser.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';
const b=fs.readFileSync(new URL('../src/prototype/assets/phone-workspace.glb',import.meta.url)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
const meshes=[];
function walk(id,parent){const node=g.nodes[id],local=new T.Matrix4();if(node.matrix)local.fromArray(node.matrix);else local.compose(new T.Vector3(...node.translation||[0,0,0]),new T.Quaternion(...node.rotation||[0,0,0,1]),new T.Vector3(...node.scale||[1,1,1]));const matrix=parent.clone().multiply(local);
 if(node.mesh!==undefined)for(const primitive of g.meshes[node.mesh].primitives){const a=g.accessors[primitive.attributes.POSITION],v=g.bufferViews[a.bufferView],points=[];if(a.componentType!==5126)throw Error('Unexpected component type');for(let i=0;i<a.count;i++){const at=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12);points.push(new T.Vector3(bin.readFloatLE(at),bin.readFloatLE(at+4),bin.readFloatLE(at+8)).applyMatrix4(matrix));}meshes.push({name:g.meshes[node.mesh].name,material:g.materials[primitive.material].name,points});}
 for(const child of node.children||[])walk(child,matrix);
}
for(const id of g.scenes[g.scene||0].nodes)walk(id,new T.Matrix4());
const all=meshes.flatMap(m=>m.points),box=new T.Box3().setFromPoints(all),center=box.getCenter(new T.Vector3()),scale=1.38/box.getSize(new T.Vector3()).y,rotate=new T.Matrix4().makeRotationY(Math.PI);
for(const point of all)point.sub(center).multiplyScalar(scale).applyMatrix4(rotate);
const hull=new ConvexHull().setFromPoints(all);
// Hull.vertices includes interior input nodes: take only final face vertices.
const vertices=new Map();for(const face of hull.faces){let edge=face.edge;do{const p=edge.head().point;vertices.set(p.toArray().join(','),p.toArray().map(n=>Number(n.toFixed(8))));edge=edge.next;}while(edge!==face.edge);}
fs.writeFileSync(new URL('../src/prototype/assets/phone-hull.json',import.meta.url),JSON.stringify([...vertices.values()])+'\n');
const measurements=meshes.map(m=>{const b=new T.Box3().setFromPoints(m.points);return {name:m.name,material:m.material,size:b.getSize(new T.Vector3()).toArray(),center:b.getCenter(new T.Vector3()).toArray()};}).filter(m=>m.size[0]>.60&&m.size[1]>1.3);
console.log(JSON.stringify({source:'app/src/prototype/assets/phone-workspace.glb',sourceSha256:createHash('sha256').update(b).digest('hex'),method:'Transformed original glTF position accessors; same center/scale/rotation as PhoneModel; convex exterior vertices only',inputPoints:all.length,hullPoints:vertices.size,frontMeshes:measurements},null,2));
