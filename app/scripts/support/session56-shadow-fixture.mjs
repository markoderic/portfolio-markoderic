// Actual JSX, hooks and Three geometry; frame priorities modeled, GPU calls mocked.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {build} from 'esbuild';import * as T from 'three';
const root=fileURLToPath(new URL('../../',import.meta.url)),before=process.env.SESSION56_BEFORE==='1',output=path.join(root,'.vite/session56-fixture-'+(before?'before':'after')+'.mjs');
await build({stdin:{contents:`export {Drawer} from './src/prototype/DrawerCabinet.jsx';export {default as Ground} from './src/prototype/GroundShadows.jsx';export {Desk,Chair,Plant,Bin,Lighting} from './src/prototype/StudioProps.jsx';export * from './src/prototype/groundShadowPass.js';export {harness,nodes} from './scripts/support/hook-harness.js';`,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:output,plugins:[{name:'offline-hooks',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'react-mock'}));
 b.onLoad({filter:/.*/,namespace:'react-mock'},()=>({resolveDir:root,contents:`import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export const forwardRef=fn=>props=>fn(props,null);export default {...h,forwardRef};`}));
 b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const useFrame=(fn,priority=0)=>{fn.priority=priority;globalThis.session56Frames.push(fn)};'}));
 b.onResolve({filter:/^@react-three\/drei$/},()=>({path:'drei',namespace:'drei'}));
 b.onLoad({filter:/.*/,namespace:'drei'},()=>({contents:`export {RoundedBox} from './node_modules/@react-three/drei/core/RoundedBox.js';`,resolveDir:root}));
 if(before)b.onLoad({filter:/\/(GroundShadows.jsx|DrawerCabinet.jsx|groundShadowPass.js|StudioProps.jsx)$/},a=>({contents:fs.readFileSync(path.join(root,'../docs/redesign/session-56-shadow-continuity/before',path.basename(a.path)),'utf8'),loader:a.path.endsWith('.jsx')?'jsx':'js',resolveDir:path.dirname(a.path)}));
 }}]});
globalThis.session56Frames=[];export const api=await import(pathToFileURL(output));
export function materialize(node){if(!node||typeof node!=='object')return null;if(typeof node.type==='function'){const h=api.harness(node.type,node.props),o=materialize(h.tree);h.effects.forEach(fn=>fn());return o;}
 const p=node.props||{},constructors={mesh:T.Mesh,group:T.Group,ambientLight:T.AmbientLight,directionalLight:T.DirectionalLight};
 if(constructors[node.type]||node.type===undefined){const o=constructors[node.type]?new constructors[node.type](...(node.type==='mesh'?[p.geometry,p.material]:[])):new T.Group();for(const k of ['name','userData','raycast','visible','castShadow','receiveShadow','renderOrder'])if(p[k]!==undefined)o[k]=p[k];if(p.position)Array.isArray(p.position)?o.position.fromArray(p.position):o.position.copy(p.position);if(p.rotation)o.rotation.set(...p.rotation);if(p.scale)typeof p.scale==='number'?o.scale.setScalar(p.scale):o.scale.fromArray(p.scale);if(p.ref)p.ref.current=o;
 for(const [k,v]of Object.entries(p))if(k.startsWith('shadow-')){const a=k.split('-').slice(1);let obj=o.shadow;for(const s of a.slice(0,-1))obj=obj[s];const key=a.at(-1);if(Array.isArray(v))obj[key].set(...v);else obj[key]=v;}
 for(const child of p.children||[]){const v=materialize(child);if(v?.isBufferGeometry)o.geometry=v;else if(v?.isMaterial)o.material=v;else if(v?.isObject3D)o.add(v);}return o;}
 const types={boxGeometry:T.BoxGeometry,planeGeometry:T.PlaneGeometry,cylinderGeometry:T.CylinderGeometry,torusGeometry:T.TorusGeometry,latheGeometry:T.LatheGeometry,extrudeGeometry:T.ExtrudeGeometry,sphereGeometry:T.SphereGeometry,circleGeometry:T.CircleGeometry};if(types[node.type])return new types[node.type](...(p.args||[]));if(node.type==='meshStandardMaterial'){const{children,ref,...params}=p;return new T.MeshStandardMaterial(params)}return null;
}
