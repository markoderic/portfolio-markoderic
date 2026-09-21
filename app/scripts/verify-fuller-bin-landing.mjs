// Cold/warm Node fitting + mocked hook ownership; no browser performance claim.
import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {build} from 'esbuild';import * as T from 'three';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=new URL('../../docs/redesign/session-23-gray-printer-fuller-bin/',import.meta.url),results={};
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
for(const stage of ['before','after']){
 const outfile=path.join(root,'.vite/session23-'+stage+'.mjs');
 await build({stdin:{contents:`export {disposalCurve,PAPER_REST} from './src/prototype/paperDisposal.js';export {default as BinContents} from './src/prototype/BinContents.jsx';export {BIN_PAPERS} from './src/prototype/binGeometry.js';export {harness} from './scripts/support/hook-harness.js';`,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile,plugins:[{name:'evidence',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({resolveDir:root,contents:`import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export default h;`}));
 if(stage==='before')b.onLoad({filter:/\/binGeometry.js$/},()=>({contents:fs.readFileSync(new URL('before-binGeometry.js',dir),'utf8'),loader:'js'}));
 }}]});
 const api=await import(pathToFileURL(outfile).href),q=new T.Quaternion(),p=new T.Vector3(...api.PAPER_REST),bin=[-5.95,-6.3,3.1];
 const times=[],fits=[];for(let i=0;i<81;i++){const start=performance.now(),c=api.disposalCurve(p,bin,q);times.push(performance.now()-start);fits.push(c.landing);}
 for(const fit of fits)assert.deepEqual(fit,fits[0]);
 const h=api.harness(api.BinContents,{});h.flushEffects();const geometries=h.slots[0].value,peel=h.slots[1].value,material=h.slots[2].value;
 for(let i=0;i<30;i++){h.render();h.flushEffects();assert.equal(h.slots[0].value,geometries);assert.equal(h.slots[1].value,peel);assert.equal(h.slots[2].value,material);}
 let disposed=0;for(const g of [...geometries,peel,material])g.addEventListener('dispose',()=>disposed++);for(const slot of h.slots)slot.cleanup?.();assert.equal(disposed,api.BIN_PAPERS.length+2);
 const remount=api.harness(api.BinContents,{});assert.notEqual(remount.slots[0].value,geometries);assert.equal(remount.slots[0].value.length,api.BIN_PAPERS.length);remount.flushEffects();for(const s of remount.slots)s.cleanup?.();
 // New module simulates a fresh development module evaluation: lazy receiving
 // cache is rebuilt from this layout, rather than a previous module's surface.
 const reload=await import(pathToFileURL(outfile).href+'?reload=1');assert.deepEqual(reload.disposalCurve(p,bin,q).landing,fits[0]);
 results[stage]={paperCount:api.BIN_PAPERS.length,receivingTriangles:api.BIN_PAPERS.length*60,firstFitMs:times[0],warmMedianMs:median(times.slice(11)),warmMaxMs:Math.max(...times.slice(11)),fits:times.length,landing:fits[0],rerenders:30,disposedResources:disposed,reloadedAndRemounted:true};
}
assert.ok(results.after.landing.height>results.before.landing.height+.15);assert.ok(results.after.landing.end<results.before.landing.end);assert.equal(results.after.paperCount,16);
fs.writeFileSync(new URL('landing-cost-ownership.json',dir),JSON.stringify({results,note:'81 fits/layout in Node, first call includes lazy surface build; warm statistics discard first 11. Shared module surface reused per throw. Mocked hooks and fresh bundle evaluation test ownership/reload, not actual Vite HMR/browser latency/GPU.'},null,2)+'\n');console.log(results);
