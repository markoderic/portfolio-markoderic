// Actual JSX/material geometry with explicit hook/light mocks; no WebGL or browser.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as T from 'three';
const root=fileURLToPath(new URL('../../',import.meta.url));
export async function lampFixture(before=false) {
 const output=path.join(root,'.vite/lamp-fixture-'+(before?'before':'after')+'.mjs');
 await build({stdin:{contents:"export {Lamp,Lighting,Desk} from './src/prototype/StudioProps.jsx';export {harness,nodes} from './scripts/support/hook-harness.js';",resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:output,plugins:[{name:'lamp-offline',setup(b){
  b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'react-mock'}));
  b.onLoad({filter:/.*/,namespace:'react-mock'},()=>({resolveDir:root,contents:`import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export const forwardRef=fn=>props=>fn(props,null);export default {...h,forwardRef};`}));
  b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const useFrame=fn=>globalThis.lampFrames.push(fn);'}));
  b.onResolve({filter:/^@react-three\/drei$/},()=>({path:'drei',namespace:'drei'}));
  b.onLoad({filter:/.*/,namespace:'drei'},()=>({contents:`export {RoundedBox} from './node_modules/@react-three/drei/core/RoundedBox.js';`,resolveDir:root}));
  if(before)b.onLoad({filter:/\/StudioProps.jsx$/},a=>({contents:fs.readFileSync(path.join(root,'../docs/redesign/session-10-lamp-lighting/before-StudioProps.jsx'),'utf8'),loader:'jsx',resolveDir:path.dirname(a.path)}));
 }}]});
 const api=await import(pathToFileURL(output).href+'?v='+Date.now());
 function materialize(node) {
  if(!node||typeof node!=='object')return null;
  if(typeof node.type==='function'){const h=api.harness(node.type,node.props),obj=materialize(h.tree);h.effects.forEach(fn=>fn());return obj;}
  const p=node.props||{},children=p.children||[];
  const constructors={mesh:T.Mesh,group:T.Group,ambientLight:T.AmbientLight,directionalLight:T.DirectionalLight,spotLight:T.SpotLight};
  if(constructors[node.type]||node.type===undefined||node.type==='primitive'){
   const o=node.type==='primitive'?p.object:constructors[node.type]?new constructors[node.type](...(node.type==='mesh'?[p.geometry,p.material]:[])):new T.Group();
   for(const k of ['name','castShadow','receiveShadow','intensity','angle','penumbra','distance','decay','target'])if(p[k]!==undefined)o[k]=p[k];
   if(o.isLight&&p.color)o.color.set(p.color);
   if(p.position)Array.isArray(p.position)?o.position.fromArray(p.position):o.position.copy(p.position);
   if(p.rotation)o.rotation.set(...p.rotation);if(p.quaternion)o.quaternion.copy(p.quaternion);
   if(p.scale)typeof p.scale==='number'?o.scale.setScalar(p.scale):o.scale.fromArray(p.scale);
   for(const [k,v]of Object.entries(p))if(k.startsWith('shadow-')){const a=k.split('-').slice(1);let obj=o.shadow;for(const s of a.slice(0,-1))obj=obj[s];const key=a.at(-1);if(Array.isArray(v))obj[key].set(...v);else obj[key]=v;}
   if(p.ref)p.ref.current=o;
   for(const child of children){const value=materialize(child);if(value?.isBufferGeometry)o.geometry=value;else if(value?.isMaterial)o.material=value;else if(value?.isObject3D)o.add(value);}return o;
  }
  const geometries={extrudeGeometry:T.ExtrudeGeometry,boxGeometry:T.BoxGeometry,cylinderGeometry:T.CylinderGeometry,circleGeometry:T.CircleGeometry,latheGeometry:T.LatheGeometry};
  if(geometries[node.type]){const g=new geometries[node.type](...(p.args||[]));if(p.ref)p.ref.current=g;return g;}
  if(node.type==='meshStandardMaterial'){const {children,ref,...params}=p,m=new T.MeshStandardMaterial(params);if(ref)ref.current=m;return m;}
  return null;
 }
 function mount({night=false,reduced=false,onToggle=()=>{}}={}){
  globalThis.lampFrames=[];const lamp=api.harness(api.Lamp,{night,reduced,onToggle}),lighting=api.harness(api.Lighting,{night,reduced});
  const scene=new T.Scene(),object=materialize(lamp.tree);scene.add(object,materialize(lighting.tree));scene.updateMatrixWorld(true);
  const gl={setClearColor(){},toneMappingExposure:1};let callbacks=[...globalThis.lampFrames];
  return {lamp,lighting,object,scene,gl,frame(dt=1/60){callbacks.forEach(fn=>fn({scene,gl},dt));scene.updateMatrixWorld(true);},render(props){globalThis.lampFrames=[];lamp.render(props);lighting.render(props);callbacks=[...globalThis.lampFrames];}};
 }
 return {...api,materialize,mount};
}
