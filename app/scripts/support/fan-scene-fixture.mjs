// Actual Fan JSX and callbacks; no renderer/browser/native input.
import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';
import {materialize} from './chair-scene-fixture.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'.vite/fan-fixture.mjs');
await build({stdin:{contents:"export {default as DeskFan} from './src/prototype/DeskFan.jsx';export {harness,nodes} from './scripts/support/hook-harness.js';",resolveDir:root,loader:'jsx'},bundle:true,format:'esm',platform:'node',packages:'external',outfile:output,plugins:[{name:'fan-offline',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'mock'}));b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({resolveDir:root,contents:a.path==='react'?"import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export default h;":"export const useFrame=fn=>globalThis.__fanFrame=fn;"}));
}}]});
const api=await import(pathToFileURL(output).href+'?'+Date.now());
export const {DeskFan,harness,nodes}=api;
export {materialize};
export function mountFan(extra={}){
 const props={on:true,enabled:true,view:'desk',active:true,direct:false,reduced:false,input:{hidden:false,dragging:false},...extra};
 const h=harness(DeskFan,props),root=materialize(h.tree);h.flushEffects();let frame=globalThis.__fanFrame;
 return {h,root,props,frame(dt){frame({},dt);root.updateMatrixWorld(true)},render(patch){Object.assign(props,patch);h.render(props);frame=globalThis.__fanFrame;},run(seconds,hz=60){for(let i=0;i<seconds*hz;i++)this.frame(1/hz);}};
}
