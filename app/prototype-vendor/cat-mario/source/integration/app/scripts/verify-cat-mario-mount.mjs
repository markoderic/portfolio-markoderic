// Real React.lazy/Suspense/reconciliation with controlled module transport and host nodes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';import React from 'react';
import {mount,flush,nodes,text} from './support/react-host-renderer.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=path.resolve(root,'../docs/redesign/session-40-cat-mario-launch');
const before=process.argv.includes('--before');
const source=before?path.join(evidence,'AppContents.before.jsx'):path.join(root,'src/prototype/apps/AppContents.jsx');
const outfile=path.join(root,'.vite/session40',before?'before.mjs':'after.mjs');
await build({entryPoints:[path.join(root,'src/prototype/apps/AppContents.jsx')],outfile,bundle:true,packages:'external',platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':'"/"'},loader:{'.css':'empty','.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'controlled-import',setup(b){
 b.onLoad({filter:/apps\/AppContents\.jsx$/},()=>({contents:fs.readFileSync(source,'utf8').replaceAll('import("./CatMario")','globalThis.catModuleLoad()'),loader:'jsx',resolveDir:path.join(root,'src/prototype/apps')}));
 b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));
}}]});
const results=[];const record=(name,data={})=>{results.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
const fresh=async()=> (await import(pathToFileURL(outfile).href+'?case='+Math.random())).default;
let mounts=0,unmounts=0,calls=0;
const Game=()=>{React.useEffect(()=>{mounts++;return()=>unmounts++;},[]);return React.createElement('section',null,'Real reconciliation mounted module');};
const module={default:Game},props={id:'catmario',sound:{muted:true,volume:0},gameEligible:true};
const button=h=>nodes(h.container).find(n=>n.type==='button');
const save=()=>fs.writeFileSync(path.join(evidence,before?'mount-before.json':'mount-after.json'),JSON.stringify({react:React.version,renderer:'installed react-reconciler 0.27.0; simulated host/module transport',results},null,2)+'\n');
if(before){
 for(const cached of [false,true]){
  const pending=[];calls=0;mounts=0;globalThis.catModuleLoad=()=>{calls++;return cached?Promise.resolve(module):new Promise(r=>pending.push(r));};
  const h=mount(await fresh(),props);await flush();
  for(let i=0;i<8;i++){pending.splice(0).forEach(r=>r(module));await flush(1);}
  const outcome={importCalls:calls,mounts,visible:text(h.container)};
  assert.equal(mounts,0);assert.match(outcome.visible,/Opening application/);assert.ok(calls>=8);
  h.close();await flush();record('Pre-fix failure reproduced: '+(cached?'cached resolved import':'deferred resolved imports'),outcome);
 }
 save();if(process.argv.includes("--require-mount"))assert.ok(mounts>0,"Resolved application import must mount the game; pre-fix remains in fallback");process.exit(0);
}
// Keep rejected/render errors visible to assertions, omit React's expected error-boundary console noise.
const error=console.error;console.error=(...args)=>{if(!String(args[0]).startsWith('The above error occurred'))error(...args);};
let resolve;calls=0;mounts=0;unmounts=0;
globalThis.catModuleLoad=()=>{calls++;return new Promise(r=>resolve=r);};
const App=await fresh(),h=mount(App,props);await flush();assert.match(text(h.container),/Opening application/);assert.equal(calls,1);
resolve(module);await flush();assert.match(text(h.container),/Real reconciliation mounted/);assert.equal(mounts,1);assert.equal(calls,1);
h.render({...props,gameEligible:false});await flush();assert.equal(mounts,1);h.close();await flush();assert.equal(unmounts,1);
const reopened=mount(App,props);await flush();assert.equal(calls,1);assert.equal(mounts,2);reopened.close();await flush();record('Deferred resolves, prop update retains instance, close/reopen uses cached lazy record');
for(const failure of ['reject','render']){
 calls=0;globalThis.catModuleLoad=()=>{calls++;return calls===1?(failure==='reject'?Promise.reject(Error('test chunk unavailable')):Promise.resolve({default:()=>{throw Error('test render exception');}})):Promise.resolve(module);};
 const h=mount(await fresh(),props);await flush();assert.match(text(h.container),/Cat Mario could not open/);assert.equal(calls,1);button(h).props.onClick();await flush();assert.match(text(h.container),/Real reconciliation mounted/);assert.equal(calls,2);h.close();await flush();record(failure+' error contained; explicit retry recovers');
}
let pending=[];calls=0;const prior=mounts;globalThis.catModuleLoad=()=>{calls++;return new Promise(r=>pending.push(r));};
const CloseApp=await fresh(),closed=mount(CloseApp,props);await flush();closed.close();await flush();pending.splice(0).forEach(r=>r(module));await flush();assert.equal(mounts,prior);assert.equal(text(closed.container),'');const again=mount(CloseApp,props);await flush();assert.equal(mounts,prior+1);again.close();await flush();record('Close pending never mounts ghost; resolved reopen mounts once');
// Timeout uses the actual production deadline; intercept only that timer, not React scheduling.
const timers=new Set(),nativeSet=setTimeout,nativeClear=clearTimeout;let expire;
globalThis.setTimeout=(fn,ms,...args)=>{const id=nativeSet(fn,ms,...args);if(ms===20000){timers.add(id);expire=fn;}return id;};globalThis.clearTimeout=id=>{timers.delete(id);nativeClear(id);};
calls=0;let late;globalThis.catModuleLoad=()=>{calls++;return calls===1?new Promise(r=>late=r):Promise.resolve(module);};
const stalled=mount(await fresh(),props);await flush();assert.equal(timers.size,1);expire();await flush();assert.match(text(stalled.container),/too long|timed out/);button(stalled).props.onClick();await flush();assert.match(text(stalled.container),/Real reconciliation mounted/);late(module);await flush();assert.equal(calls,2);stalled.close();await flush();assert.equal(timers.size,0);
// Closing a still-pending import clears the deadline; rejection cannot resurrect UI.
let reject;globalThis.catModuleLoad=()=>new Promise((_,r)=>reject=r);
const cancelled=mount(await fresh(),props);await flush();assert.equal(timers.size,1);cancelled.close();await flush();assert.equal(timers.size,0);reject(Error('late cancelled request'));await flush();assert.equal(text(cancelled.container),'');
globalThis.setTimeout=nativeSet;globalThis.clearTimeout=nativeClear;record('Honest 20s timeout, retry, stale completion ignored; zero loading timers');
save();console.error=error;
