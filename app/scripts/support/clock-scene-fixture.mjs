import path from 'node:path';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';import * as T from 'three';
import {materialize as baseMaterialize} from './chair-scene-fixture.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'.vite/clock-fixture.mjs');
await build({stdin:{contents:"export {default as DeskClock} from './src/prototype/DeskClock.jsx';export {default as LocalClockTime} from './src/prototype/LocalClockTime.jsx';export {harness,nodes} from './scripts/support/hook-harness.js';",resolveDir:root,loader:'jsx'},bundle:true,format:'esm',platform:'node',packages:'external',outfile:out,plugins:[{name:'clock-offline',setup(b){b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({resolveDir:root,contents:"import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export default h;"}));}}]});
export const {DeskClock,LocalClockTime,harness,nodes}=await import(pathToFileURL(out).href+'?'+Date.now());
export function materialize(node){
 if(!node||typeof node!=='object')return null;if(typeof node.type==='function')return materialize(harness(node.type,node.props).tree);
 const p=node.props||{};if(node.type==='meshBasicMaterial'){const {children,...props}=p;return new T.MeshBasicMaterial(props);}
 if(node.type==='mesh'||node.type==='group'){const object=node.type==='group'?new T.Group():new T.Mesh(p.geometry);if(p.position)object.position.fromArray(p.position);if(p.rotation)object.rotation.set(...p.rotation);object.name=p.name||'';object.castShadow=!!p.castShadow;object.receiveShadow=!!p.receiveShadow;
  for(const child of p.children||[]){const v=materialize(child);if(v?.isMaterial)object.material=v;else if(v?.isObject3D)object.add(v);}return object;
 }return baseMaterialize(node);
}
export function mountClock(date=new Date(2026,8,18,9,58),night=false){const clock={read:()=>({digits:[null,9,5,8],period:'AM',key:'fixture',label:'9:58 AM',datetime:'09:58'}),subscribe:()=>()=>{}};
 // Use the actual formatting path for fixture times too.
 return import('../../src/prototype/localClock.js').then(({localClockReading})=>{clock.read=()=>localClockReading(date);return materialize(harness(DeskClock,{night,clock}).tree);});}
