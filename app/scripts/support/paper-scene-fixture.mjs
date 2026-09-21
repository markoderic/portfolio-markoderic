// Offline actual JSX/Three geometry, no browser or image decoding.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {build} from 'esbuild';import * as T from 'three';
const root=fileURLToPath(new URL('../../',import.meta.url));
const before=process.argv.includes('--before');
const output=path.join(root,'.vite/paper-trajectory-fixture-'+(before?'before':'after')+'.mjs');
await build({stdin:{contents:`export {Printer,Desk,Bin,Chair,Plant,Lamp} from './src/prototype/StudioProps.jsx';export {Rig} from './src/prototype/Scene.jsx';export {harness} from './scripts/support/hook-harness.js';`,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:output,plugins:[{name:'offline-scene',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'fixture'}));
 b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'fixture'}));
 b.onResolve({filter:/^@react-three\/drei$/},()=>({path:'drei',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:root,contents:a.path==='react'?`import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export const forwardRef=fn=>props=>fn(props,null);export default {...h,forwardRef};`:a.path==='fiber'?`export const Canvas=()=>null;export const useFrame=fn=>globalThis.__printerFrames.push(fn);`:`export {RoundedBox} from './node_modules/@react-three/drei/core/RoundedBox.js';export const useGLTF=()=>{throw Error('Not used in geometry fixture')};export const useTexture=()=>{};export const Environment=()=>null;export const Lightformer=()=>null;export const ContactShadows=()=>null;`}));
 b.onLoad({filter:/\/src\/prototype\/Scene.jsx$/},a=>({contents:fs.readFileSync(before?path.join(root,'../docs/redesign/session-06-paper-trajectory/before-Scene.jsx'):a.path,'utf8')+'\nexport {Rig};',loader:'jsx',resolveDir:path.dirname(a.path)}));
 b.onResolve({filter:/\.glb\?url$/},a=>({path:a.path,namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},()=>({contents:'export default "offline-asset"'}));
 }}],loader:{'.png':'text','.jpg':'text'}});
globalThis.__printerFrames=[];const {Printer,Desk,Bin,Chair,Plant,Lamp,Rig,harness}=await import(pathToFileURL(output).href+'?v='+Date.now());
// Materialize the actual Printer and Body/RoundedBox JSX, including the installed
// drei rounded-box shape/bevel parameters. Only renderer/DOM and material IO mocked.
function materialize(node){
 if(!node||typeof node!=='object')return null;
 if(typeof node.type==='function'){const h=harness(node.type,node.props);const object=materialize(h.tree);h.effects.forEach(f=>f());return object;}
 const p=node.props??{},children=p.children??[];
 if(node.type==='group'||node.type==='mesh'){
  const object=node.type==='group'?new T.Group():new T.Mesh(p.geometry,p.material);
  if(p.position)Array.isArray(p.position)?object.position.set(...p.position):object.position.copy(p.position);if(p.quaternion)object.quaternion.copy(p.quaternion);if(p.rotation)object.rotation.set(...p.rotation);if(p.scale)typeof p.scale==='number'?object.scale.setScalar(p.scale):object.scale.set(...p.scale);if(p.visible!==undefined)object.visible=p.visible;
  if(p.name)object.name=p.name;if(p.userData)object.userData=p.userData;if(p.raycast)object.raycast=p.raycast;
  if(p.ref)p.ref.current=object;
  for(const child of children){const value=materialize(child);if(value?.isBufferGeometry)object.geometry=value;else if(value?.isMaterial)object.material=value;else if(value?.isObject3D)object.add(value);}
  return object;
 }
 const geometries={torusGeometry:T.TorusGeometry,extrudeGeometry:T.ExtrudeGeometry,boxGeometry:T.BoxGeometry,cylinderGeometry:T.CylinderGeometry,circleGeometry:T.CircleGeometry,latheGeometry:T.LatheGeometry};
 if(geometries[node.type]){const geometry=new geometries[node.type](...(p.args??[]));if(p.ref)p.ref.current=geometry;return geometry;}
 if(node.type==='meshStandardMaterial'){const {children,ref,...params}=p;const material=new T.MeshStandardMaterial(params);if(ref)ref.current=material;return material;}
 return null;
}

export {Printer,Desk,Bin,Chair,Plant,Lamp,Rig,harness,materialize};
