// Actual AppContents -> CatMario -> defaultLoad -> shipped browser ESM/Wasm.
// Installed React reconciler; simulated host/canvas/resize/focus, offline VM file transport.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';import * as React from 'react';
import {gameKeys} from '../src/prototype/apps/catMarioInput.js';
import {mount,flush,nodes,text,node} from './support/react-host-renderer.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=path.resolve(root,'../docs/redesign/session-50-game-input'),vendor=path.join(root,'prototype-vendor/cat-mario');
const listeners=new Set(),observers=new Set(),frames=new Map(),timers=new Set(),requests=[],modules=new Map();let serial=0,time=0,draws=0,sharedContexts=0;let engine;const playerDraws=[],surfaceNames=new Set();
const events=()=>({addEventListener(type,fn){listeners.add({target:this,type,fn});},removeEventListener(type,fn){for(const r of listeners)if(r.target===this&&r.type===type&&r.fn===fn)listeners.delete(r);}});
function context2d(c){return new Proxy({canvas:c,measureText:s=>({width:Math.max(1,s.length*8)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})},{get:(o,k)=>k in o?o[k]:(()=>{draws++;})});}
globalThis.hostCanvasContext=context2d;
function canvas(){const c=node('canvas');Object.assign(c,events(),{width:480,height:420,style:{removeProperty(){},setProperty(){}},parentNode:{}});return c;}
const document={title:'Marko Deric — Private portfolio',...events(),createElement:()=>canvas(),body:{...events(),appendChild(){}},documentElement:{},hidden:false,hasFocus:()=>true,activeElement:null};globalThis.document=document;
const window={...events(),document,navigator:{userAgent:'offline'},innerWidth:1440,innerHeight:900};window.window=window;
const sandbox={console,window,document,innerWidth:1440,innerHeight:900,navigator:{getGamepads:()=>[],userAgent:'offline'},screen:{width:1440,height:900},WebAssembly,TextDecoder,TextEncoder,URL,performance,Date,AbortController,
 requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),
 setTimeout(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;},clearTimeout(id){timers.delete(id);clearTimeout(id);},
 ResizeObserver:class{constructor(fn){this.fn=fn;observers.add(this);}observe(){}disconnect(){observers.delete(this);}},
 AudioContext:class{constructor(){sharedContexts++;this.state='running';this.sampleRate=48000;this.destination={};}close(){throw Error('Shared context must survive');}suspend(){throw Error('Shared context must survive');}},
 fetch:async url=>{const s=String(url);assert.ok(s.startsWith('/prototype-vendor/cat-mario/'));const name=s.split('/').at(-1);assert.ok(['classic.wasm','scores.json'].includes(name));requests.push(s);return new Response(fs.readFileSync(path.join(vendor,name)),{headers:{'Content-Type':name.endsWith('wasm')?'application/wasm':'application/json'}});},
};
window.AudioContext=sandbox.AudioContext;
const context=vm.createContext(sandbox);
const react=new vm.SyntheticModule(Object.keys(React),function(){for(const key of Object.keys(React))this.setExport(key,React[key]);},{context});
async function dynamic(specifier){assert.ok(['/prototype-vendor/cat-mario/classic.mjs','/prototype-vendor/cat-mario/synth.mjs'].includes(specifier),specifier);requests.push(specifier);if(!modules.has(specifier)){const m=new vm.SourceTextModule(fs.readFileSync(path.join(vendor,specifier.split('/').at(-1)),'utf8'),{context,initializeImportMeta(meta){meta.url='https://offline.invalid'+specifier;}});modules.set(specifier,m);await m.link(()=>{throw Error('unexpected shipping static dependency');});await m.evaluate();}const original=modules.get(specifier);
 if(specifier.endsWith('classic.mjs')){const wrapped=new vm.SyntheticModule(['default'],function(){this.setExport('default',async options=>{const m=await original.namespace.default(options);engine=m;const blit=m.SDL.blitSurface;m.SDL.blitSurface=(src,sr,dst,dr,scale)=>{const d=m.SDL.surfaces[src];surfaceNames.add(d?.source);if(d?.source?.includes('player')||d?.playerSprite)m.SDL.surfaces[dst].playerSprite=dst!==m.SDL.screen;if((d?.playerSprite||(d?.width===30&&d?.height===36))&&dst===m.SDL.screen)playerDraws.push({time,source:d.source,...(dr?((r)=>({x:r.x,y:r.y}))(m.SDL.loadRect(dr)):{})});return blit(src,sr,dst,dr,scale);};return m;});},{context});await wrapped.link(()=>{});await wrapped.evaluate();return wrapped;}return original;}
const output=await build({entryPoints:[path.join(root,'src/prototype/WorkspaceWindow.jsx')],bundle:true,write:false,platform:'browser',format:'esm',external:['react'],define:{'import.meta.env.BASE_URL':'"/"'},loader:{'.css':'empty','.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'raw',setup(b){b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
const appModule=new vm.SourceTextModule(output.outputFiles[0].text,{context,importModuleDynamically:dynamic});await appModule.link(s=>{assert.equal(s,'react');return react;});await appModule.evaluate();const App=appModule.namespace.default;
const props={w:{id:'catmario',bounds:{x:20,y:30,w:700,h:560},max:false,minimized:false},isActive:true,size:{width:1120,height:700},host:{current:{...node('div'),querySelector:()=>null}},enabled:true,reduced:true,sound:{muted:true,volume:.4},action(){},dismiss(){}};
const button=(h,label)=>nodes(h.container).find(n=>n.type==='button'&&text(n)===label);
const status=h=>nodes(h.container).filter(n=>n.props?.role==='status').map(text);
const key=(h,name,down=true,extra={})=>{const c=nodes(h.container).find(n=>n.type==='canvas'),region=nodes(h.container).find(n=>n.props?.className==='cat-play-region');const e={key:name,code:name,target:c,...extra,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};region.props[down?'onKeyDown':'onKeyUp'](e);return e;};
async function step(n){for(let i=0;i<n;i++){time+=1000/60;const jobs=[...frames.values()];frames.clear();for(const fn of jobs)fn(time);}await flush();}
const results=[];for(let cycle=0;cycle<2;cycle++){
 const h=mount(App,props);for(let i=0;i<200&&!status(h).includes('Ready');i++)await flush(1);
 assert.ok(status(h).includes('Ready'),text(h.container));for(const [name,domCode] of [['ArrowLeft',37],['ArrowRight',39],['ArrowUp',38],['ArrowDown',40],['F1',112]])assert.equal(gameKeys[name],engine.SDL.keyCodes[domCode]);assert.equal(document.title,'Marko Deric — Private portfolio');assert.ok(!text(h.container).includes('Opening application'));assert.equal(frames.size,0);assert.equal(sharedContexts,cycle===0?0:1);assert.equal(observers.size,1);
 const titleSelect=()=>nodes(h.container).find(n=>n.type==='select');button(h,'Start').props.onClick();await flush();assert.ok(status(h).includes('Playing'));assert.equal(frames.size,1);assert.equal(titleSelect().props.disabled,false);
 key(h,' ');await step(8);key(h,' ',false);await step(100);assert.equal(titleSelect().props.disabled,true,'actual shipping title-to-level signal');assert.ok(draws>0);
 const before=playerDraws.at(-1);const rightDown=key(h,'ArrowRight');assert.ok(rightDown.defaultPrevented&&rightDown.stopped);await step(8);const repeat=key(h,'ArrowRight',true,{repeat:true});assert.ok(repeat.defaultPrevented);const rightUp=key(h,'ArrowRight',false);assert.ok(rightUp.stopped);const right=playerDraws.at(-1);assert.ok(right.x>before.x,JSON.stringify({before,right}));
 key(h,'ArrowLeft');await step(20);key(h,'ArrowLeft',false);const left=playerDraws.at(-1);assert.ok(left.x<right.x,JSON.stringify({right,left}));
 key(h,'ArrowRight');key(h,' ');await step(20);key(h,' ',false);key(h,'ArrowRight',false);const jump=playerDraws.at(-1);assert.ok(jump.x>left.x&&jump.y<left.y,JSON.stringify({left,jump}));
 assert.equal(document.title,'Marko Deric — Private portfolio');
 results.push({cycle,before,right,left,jump});console.log('PASS actual shipped player movement/jump',JSON.stringify(results.at(-1)));
 const esc=key(h,'Escape');await flush();assert.ok(esc.defaultPrevented&&esc.stopped);assert.ok(status(h).includes('Paused'));assert.equal(frames.size,0);
 assert.ok(!key(h,'Escape').defaultPrevented);
 const press=()=>{const c=nodes(h.container).find(n=>n.type==='canvas'),stage=nodes(h.container).find(n=>n.props?.className==='cat-stage');const e={button:0,isPrimary:true,target:c,preventDefault(){this.defaultPrevented=true;}};stage.props.onPointerDown(e);assert.equal(e.defaultPrevented,true);assert.equal(document.activeElement,c);};
 press();await flush();assert.ok(status(h).includes('Playing'));assert.equal(frames.size,1);
 h.render({...props,isActive:false});await flush();assert.ok(status(h).includes('Paused'));assert.equal(frames.size,0);h.render(props);await flush();assert.ok(status(h).includes('Paused'));assert.equal(titleSelect().props.disabled,true);
 // Actual window capture focuses the inactive app; child sees old props until React commit.
 h.render({...props,isActive:false,action(type){if(type==='focus')h.render(props);}});await flush();const shell=nodes(h.container).find(n=>n.props?.['aria-label']==='Cat Mario window'),c=nodes(h.container).find(n=>n.type==='canvas');c.closest=selector=>selector==='.cat-play-region'?nodes(h.container).find(n=>n.props?.className==='cat-play-region'):null;
 shell.props.onPointerDownCapture({target:c});press();await flush();await step(1);assert.ok(status(h).includes('Playing'));assert.equal(document.title,'Marko Deric — Private portfolio');

 for(const patch of [{isActive:false},{gameBlocked:true},{enabled:false},{w:{...props.w,minimized:true}}]){
  key(h,'ArrowRight');h.render({...props,...patch});await flush();assert.ok(status(h).includes('Paused'));assert.equal(frames.size,0);assert.ok(!key(h,'ArrowRight').defaultPrevented);
  h.render(props);await flush();assert.ok(status(h).includes('Paused'),'eligibility alone must not resume');press();await flush();assert.ok(status(h).includes('Playing'));
 }
 const fire=(target,type)=>{for(const r of [...listeners])if(r.target===target&&r.type===type)r.fn();};
 key(h,'ArrowRight');document.hidden=true;fire(document,'visibilitychange');await flush();assert.ok(status(h).includes('Paused'));document.hidden=false;fire(document,'visibilitychange');await flush();assert.ok(status(h).includes('Paused'));press();await flush();
 fire(window,'blur');await flush();assert.ok(status(h).includes('Paused'));assert.equal(frames.size,0);fire(window,'focus');await flush();assert.ok(status(h).includes('Paused'));
 const resumeKey=key(h,' ',true,{repeat:true});assert.ok(!resumeKey.defaultPrevented);assert.ok(status(h).includes('Paused'));key(h,' ');await flush();assert.ok(status(h).includes('Playing'));key(h,' ',false);
 const shortcut=key(h,' ',true,{ctrlKey:true});await flush();assert.ok(!shortcut.defaultPrevented);assert.ok(status(h).includes('Paused'));press();await flush();
 h.render({...props,isActive:false});await flush();press();const staleResume=[...frames.values()];h.close();await flush();for(const fn of staleResume)fn(time);assert.equal(observers.size,0);assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(listeners.size,0);assert.equal(document.title,'Marko Deric — Private portfolio');results.push('cycle '+(cycle+1)+': actual window/app Ready, Start/Space to level, directional/jump movement, local Escape, surface/refocus resume, menu/minimize/hidden/blur/shortcut pauses and close cleanup');
 console.log('PASS',results.at(-1));
}
fs.writeFileSync(path.join(evidence,'composed-game.json'),JSON.stringify({kind:'actual React mount and shipping engine; simulated host/canvas/transport/resize/focus; mute enabled, no native input or listening',react:React.version,results,requests,drawCalls:draws,sharedContexts,remainingListeners:listeners.size,remainingTimers:timers.size,remainingFrames:frames.size,remainingObservers:observers.size},null,2)+'\n');
