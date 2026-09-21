// Actual AppContents -> CatMario -> defaultLoad -> shipped browser ESM/Wasm.
// Installed React reconciler; simulated host/canvas/resize/focus, offline VM file transport.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';import * as React from 'react';
import {mount,flush,nodes,text,node} from './support/react-host-renderer.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=path.resolve(root,'../docs/redesign/session-40-cat-mario-launch'),vendor=path.join(root,'prototype-vendor/cat-mario');
const listeners=new Set(),observers=new Set(),frames=new Map(),timers=new Set(),requests=[],modules=new Map();let serial=0,time=0,draws=0,sharedContexts=0;
const events=()=>({addEventListener(type,fn){listeners.add({target:this,type,fn});},removeEventListener(type,fn){for(const r of listeners)if(r.target===this&&r.type===type&&r.fn===fn)listeners.delete(r);}});
function context2d(c){return new Proxy({canvas:c,measureText:s=>({width:Math.max(1,s.length*8)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})},{get:(o,k)=>k in o?o[k]:(()=>{draws++;})});}
globalThis.hostCanvasContext=context2d;
function canvas(){const c=node('canvas');Object.assign(c,events(),{width:480,height:420,style:{removeProperty(){},setProperty(){}},parentNode:{}});return c;}
const document={...events(),createElement:()=>canvas(),body:{...events(),appendChild(){}},documentElement:{},hidden:false,hasFocus:()=>true,activeElement:null};globalThis.document=document;
const window={...events(),document,navigator:{userAgent:'offline'},innerWidth:1440,innerHeight:900};window.window=window;
const sandbox={console,window,document,navigator:{getGamepads:()=>[],userAgent:'offline'},screen:{width:1440,height:900},WebAssembly,TextDecoder,TextEncoder,URL,performance,Date,AbortController,
 requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),
 setTimeout(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;},clearTimeout(id){timers.delete(id);clearTimeout(id);},
 ResizeObserver:class{constructor(fn){this.fn=fn;observers.add(this);}observe(){}disconnect(){observers.delete(this);}},
 AudioContext:class{constructor(){sharedContexts++;this.state='running';this.sampleRate=48000;this.destination={};}close(){throw Error('Shared context must survive');}suspend(){throw Error('Shared context must survive');}},
 fetch:async url=>{const s=String(url);assert.ok(s.startsWith('/prototype-vendor/cat-mario/'));const name=s.split('/').at(-1);assert.ok(['classic.wasm','scores.json'].includes(name));requests.push(s);return new Response(fs.readFileSync(path.join(vendor,name)),{headers:{'Content-Type':name.endsWith('wasm')?'application/wasm':'application/json'}});},
};
window.AudioContext=sandbox.AudioContext;
const context=vm.createContext(sandbox);
const react=new vm.SyntheticModule(Object.keys(React),function(){for(const key of Object.keys(React))this.setExport(key,React[key]);},{context});
async function dynamic(specifier){assert.ok(['/prototype-vendor/cat-mario/classic.mjs','/prototype-vendor/cat-mario/synth.mjs'].includes(specifier),specifier);requests.push(specifier);if(!modules.has(specifier)){const m=new vm.SourceTextModule(fs.readFileSync(path.join(vendor,specifier.split('/').at(-1)),'utf8'),{context,initializeImportMeta(meta){meta.url='https://offline.invalid'+specifier;}});modules.set(specifier,m);await m.link(()=>{throw Error('unexpected shipping static dependency');});await m.evaluate();}return modules.get(specifier);}
const output=await build({entryPoints:[path.join(root,'src/prototype/apps/AppContents.jsx')],bundle:true,write:false,platform:'browser',format:'esm',external:['react'],define:{'import.meta.env.BASE_URL':'"/"'},loader:{'.css':'empty','.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'raw',setup(b){b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
const appModule=new vm.SourceTextModule(output.outputFiles[0].text,{context,importModuleDynamically:dynamic});await appModule.link(s=>{assert.equal(s,'react');return react;});await appModule.evaluate();const App=appModule.namespace.default;
const props={id:'catmario',gameEligible:true,gameLifecycle:{current:null},sound:{muted:true,volume:.4},maximized:false,onMaximize(){}};
const button=(h,label)=>nodes(h.container).find(n=>n.type==='button'&&text(n)===label);
const status=h=>nodes(h.container).filter(n=>n.props?.role==='status').map(text);
const key=(h,name,down=true)=>{const c=nodes(h.container).find(n=>n.type==='canvas'),region=nodes(h.container).find(n=>n.props?.className==='cat-play-region');const e={key:name,code:name,target:c,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};region.props[down?'onKeyDown':'onKeyUp'](e);return e;};
async function step(n){for(let i=0;i<n;i++){time+=1000/60;const jobs=[...frames.values()];frames.clear();for(const fn of jobs)fn(time);}await flush();}
const results=[];for(let cycle=0;cycle<3;cycle++){
 const h=mount(App,props);for(let i=0;i<200&&!status(h).includes('Ready');i++)await flush(1);
 assert.ok(status(h).includes('Ready'),text(h.container));assert.ok(!text(h.container).includes('Opening application'));assert.equal(frames.size,0);assert.equal(sharedContexts,cycle===0?0:1);assert.equal(observers.size,1);
 const titleSelect=()=>nodes(h.container).find(n=>n.type==='select');button(h,'Start').props.onClick();await flush();assert.ok(status(h).includes('Playing'));assert.equal(frames.size,1);assert.equal(titleSelect().props.disabled,false);
 key(h,'Enter');await step(8);key(h,'Enter',false);await step(100);assert.equal(titleSelect().props.disabled,true,'actual shipping title-to-level signal');assert.ok(draws>0);
 key(h,'ArrowRight');key(h,'z');await step(8);key(h,'ArrowRight',false);key(h,'z',false);
 const esc=key(h,'Escape');await flush();assert.ok(esc.defaultPrevented&&esc.stopped);assert.ok(status(h).includes('Paused'));assert.equal(frames.size,0);
 assert.ok(!key(h,'Escape').defaultPrevented);button(h,'Resume').props.onClick();await flush();assert.equal(frames.size,1);
 h.render({...props,gameEligible:false});await flush();assert.ok(status(h).includes('Paused'));assert.equal(frames.size,0);h.render(props);await flush();assert.ok(status(h).includes('Paused'));assert.equal(titleSelect().props.disabled,true);
 h.close();await flush();assert.equal(observers.size,0);assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(listeners.size,0);results.push('cycle '+(cycle+1)+': actual app Ready, Start/Enter to level, keys, local Escape, explicit Resume, eligibility pause, close cleanup');
 console.log('PASS',results.at(-1));
}
fs.writeFileSync(path.join(evidence,'composed-mount.json'),JSON.stringify({kind:'actual React mount and shipping engine; simulated host/canvas/transport/resize/focus; mute enabled, no native input or listening',react:React.version,results,requests,drawCalls:draws,sharedContexts,remainingListeners:listeners.size,remainingTimers:timers.size,remainingFrames:frames.size,remainingObservers:observers.size},null,2)+'\n');
