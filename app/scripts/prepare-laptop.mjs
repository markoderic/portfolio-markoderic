// Reproducible, private-prototype-only conversion of the inspected CC BY M3.
// No decimation, resampling or downloaded script execution. Root transforms baked once.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
const input=new URL('../../docs/redesign/session-04a-laptop-inspection/originals/macbook_pro_m3_16_inch_2024.glb',import.meta.url);
const output=new URL('../src/prototype/assets/laptop-m3.glb',import.meta.url);
const audit=new URL('../../docs/redesign/session-04b-laptop-integration/asset-conversion.json',import.meta.url);
const bytes=fs.readFileSync(input),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(hash(bytes)!=='234c2b69cbf0327b46c4440610da0845679ae51ee84d4b5d46dd3bf5a1392b02')throw Error('Original changed: review before conversion');
const jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},sizes={5123:2,5125:4,5126:4},reads={5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'};
function read(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],n=components[a.type],size=sizes[a.componentType];if(!n||!size||a.sparse||a.normalized)throw Error('Unsupported accessor');return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>bin[reads[a.componentType]]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*size)+k*size)));}
const invisible=g.materials[5];if(invisible.alphaMode!=='BLEND'||invisible.pbrMetallicRoughness.baseColorFactor[3]!==0||JSON.stringify(invisible).includes('Texture'))throw Error('Transparent-part audit changed');
if(g.materials[36].emissiveTexture.index!==16)throw Error('Display audit changed');
const materials=[],materialMap=new Map(),dedup=new Map();
for(let i=0;i<g.materials.length;i++){
 if(i===5)continue;
 const {name,...definition}=g.materials[i];
 const mat=i===36?{name:'M3_DisplayBacking',pbrMetallicRoughness:{baseColorFactor:[0.004,0.005,0.006,1],metallicFactor:0,roughnessFactor:1},doubleSided:true,extensions:{KHR_materials_unlit:{}}}:{...definition,name};
 const {name:label,...properties}=mat,key=JSON.stringify(properties);
 if(!dedup.has(key)){dedup.set(key,materials.length);materials.push(mat)}materialMap.set(i,dedup.get(key));
}
const groups=new Map(),removed=[];let originalTriangles=0,originalPrimitives=0;
function visit(i,parent=new T.Matrix4()){
 const n=g.nodes[i],local=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1]))),world=parent.clone().multiply(local);
 if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){
  if((p.mode??4)!==4||p.targets||p.extensions||Object.keys(p.attributes).some(k=>!['POSITION','NORMAL','TANGENT'].includes(k)&&!/^TEXCOORD_[0-5]$/.test(k)))throw Error('Unexpected geometry contract');
  const positions=read(p.attributes.POSITION),indices=p.indices===undefined?positions.map((_,i)=>i):read(p.indices).flat();originalTriangles+=indices.length/3;originalPrimitives++;
  if(p.material===5){removed.push({node:i,mesh:n.mesh,triangles:indices.length/3});continue;}
  if(world.determinant()<=0)throw Error('Mirrored transform requires winding review');
  const material=materialMap.get(p.material),signature=Object.keys(p.attributes).sort().join('/'),key=`${material}:${signature}`;
  if(!groups.has(key))groups.set(key,{material,attributes:Object.fromEntries(Object.keys(p.attributes).map(k=>[k,[]])),indices:[],sourceMeshes:[],sourceNodes:[]});
  const group=groups.get(key),base=group.attributes.POSITION.length,normalMatrix=new T.Matrix3().getNormalMatrix(world);
  for(const [semantic,index]of Object.entries(p.attributes)){
   const values=read(index).map(v=>semantic==='POSITION'?new T.Vector3(...v).applyMatrix4(world).toArray():semantic==='NORMAL'?new T.Vector3(...v).applyNormalMatrix(normalMatrix).toArray():semantic==='TANGENT'?[...new T.Vector3(...v).transformDirection(world).toArray(),v[3]]:v);
   group.attributes[semantic].push(...values);
  }
  group.indices.push(...indices.map(j=>j+base));group.sourceMeshes.push(n.mesh);group.sourceNodes.push(i);
 }
 for(const child of n.children||[])visit(child,world);
}
for(const n of g.scenes[g.scene||0].nodes)visit(n);
const j={asset:{...g.asset,extras:{...g.asset.extras,adaptation:'Private portfolio: baked root transforms; omitted fully transparent parts; merged compatible static primitives with identical materials; replaced emissive wallpaper with dark unlit backing; pruned unused wallpaper image. No decimation or texture resampling.'}},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials,accessors:[],bufferViews:[],buffers:[],textures:[],images:[],samplers:g.samplers,extensionsUsed:['KHR_materials_unlit']};
let offset=0;const chunks=[];
function view(data,target){const id=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});const pad=Buffer.alloc((4-data.length%4)%4);chunks.push(data,pad);offset+=data.length+pad.length;return id;}
function accessor(values,type,componentType,target){const flat=values.flat(),data=Buffer.alloc(flat.length*4);flat.forEach((v,i)=>{if(!Number.isFinite(v))throw Error('Nonfinite geometry');componentType===5126?data.writeFloatLE(v,i*4):data.writeUInt32LE(v,i*4)});const a={bufferView:view(data,target),componentType,count:values.length,type};if(type==='VEC3'&&target===34962){a.min=[0,1,2].map(k=>values.reduce((n,v)=>Math.min(n,v[k]),Infinity));a.max=[0,1,2].map(k=>values.reduce((n,v)=>Math.max(n,v[k]),-Infinity));}j.accessors.push(a);return j.accessors.length-1;}
for(const group of groups.values()){
 const attributes={};for(const [k,v]of Object.entries(group.attributes))attributes[k]=accessor(v,k.startsWith('TEXCOORD_')?'VEC2':k==='TANGENT'?'VEC4':'VEC3',5126,34962);
 const name=materials[group.material].name==='M3_DisplayBacking'?'M3_DisplayBacking':`M3_Surface_${j.meshes.length}`;
 const mesh=j.meshes.length;j.meshes.push({name,primitives:[{attributes,indices:accessor(group.indices,'SCALAR',5125,34963),material:group.material,mode:4}],extras:{sourceMeshes:group.sourceMeshes,sourceNodes:group.sourceNodes}});j.nodes.push({name,mesh});j.scenes[0].nodes.push(mesh);
}
const used=new Set();function textures(o,fn){if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){if(k.endsWith('Texture')&&Number.isInteger(v?.index))fn(v);else textures(v,fn)}}textures(materials,v=>used.add(v.index));
const textureMap=new Map([...used].sort((a,b)=>a-b).map((v,i)=>[v,i]));textures(materials,v=>v.index=textureMap.get(v.index));
const imageMap=new Map();for(const index of textureMap.keys()){
 const t=structuredClone(g.textures[index]);if(t.extensions)throw Error('Texture extension needs review');
 if(!imageMap.has(t.source)){const old=g.images[t.source],v=g.bufferViews[old.bufferView];imageMap.set(t.source,j.images.length);j.images.push({...old,bufferView:view(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength))});}
 t.source=imageMap.get(t.source);j.textures.push(t);
}
if(imageMap.has(16))throw Error('Wallpaper unexpectedly retained');
j.buffers=[{byteLength:offset}];const raw=Buffer.from(JSON.stringify(j)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),binary=Buffer.concat(chunks),header=Buffer.alloc(20),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);const result=Buffer.concat([header,json,bh,binary]);fs.writeFileSync(output,result);
const report={original:{bytes:bytes.length,sha256:hash(bytes),triangles:originalTriangles,primitives:originalPrimitives,materials:g.materials.length,images:g.images.length},derived:{bytes:result.length,sha256:hash(result),triangles:[...groups.values()].reduce((sum,m)=>sum+m.indices.length/3,0),primitives:j.meshes.length,materials:materials.length,images:j.images.length},removedTransparent:removed,removedImageIndices:[16],materialMap:Object.fromEntries(materialMap),groups:j.meshes.map(m=>({name:m.name,...m.extras})),coordinates:'All source node transforms baked into positions/normals; derived scene root and mesh nodes identity. Native coordinate units retained; runtime applies one uniform scale.'};fs.writeFileSync(audit,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({original:report.original,derived:report.derived},null,2));
