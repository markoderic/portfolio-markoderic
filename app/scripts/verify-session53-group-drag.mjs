// Real React parent/icon ownership, with modeled local boxes and capture/event delivery.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';import {mount,flush,nodes} from './support/react-host-renderer.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.resolve(root,'../docs/redesign/session-53-group-icon-drag'),out=path.join(root,'.vite/session53-group.mjs'),before=process.argv.includes('--before');
await build({entryPoints:[path.join(root,'src/prototype/DesktopItems.jsx')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:out,loader:{'.png':'dataurl'}});
const listeners=new Map(),on=(k,f)=>{if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},off=(k,f)=>listeners.get(k)?.delete(f),emit=(k,e={})=>[...(listeners.get(k)||[])].forEach(f=>f(e));globalThis.addEventListener=on;globalThis.removeEventListener=off;globalThis.document={hidden:false,activeElement:null,addEventListener:on,removeEventListener:off};globalThis.getComputedStyle=()=>({transform:'none'});let now=0;globalThis.performance={now:()=>now};let observer;globalThis.ResizeObserver=class{constructor(f){this.f=f;observer=this}observe(){}disconnect(){}};
globalThis.hostCommitProps=(n,old,props)=>{for(const [k,v] of Object.entries(props.style||{}))if(old.style?.[k]!==v)n.style[k]=v};
const Items=(await import(pathToFileURL(out))).default,results=[];
async function setup(){let launches=0,activation=0;const props={size:{width:1040,height:650},enabled:true,controller:{current:null},host:{current:{offsetWidth:1040,offsetHeight:650,closest:()=>true,getBoundingClientRect:()=>({left:0,top:0,width:1040,height:650})}},launch(){launches++},activate(){activation++}},h=mount(Items,props);await flush();const rootNode=()=>nodes(h.container).find(n=>n.props?.className==='desktop-items'),icons=()=>nodes(h.container).filter(n=>n.props?.['data-launcher']),icon=id=>icons().find(n=>n.props['data-launcher']===id),selected=()=>icons().filter(n=>n.props['aria-pressed']).map(n=>n.props['data-launcher']);
 const position=n=>({x:parseFloat(n.style.left??n.props.style.left),y:parseFloat(n.style.top??n.props.style.top)}),positions=()=>Object.fromEntries(icons().map(n=>[n.props['data-launcher'],position(n)])),committed=()=>Object.fromEntries(icons().map(n=>[n.props['data-launcher'],{x:n.props.style.left,y:n.props.style.top}]));
 const attach=n=>{n.held=null;n.setPointerCapture=id=>n.held=id;n.hasPointerCapture=id=>n.held===id;n.releasePointerCapture=id=>{n.held=null;rootNode()?.props.onLostPointerCapture?.({pointerId:id})};Object.defineProperties(n,{offsetLeft:{get:()=>position(n).x,configurable:true},offsetTop:{get:()=>position(n).y,configurable:true}});n.offsetWidth=80;n.offsetHeight=82;n.dataset={launcher:n.props['data-launcher']}};attach(rootNode());icons().forEach(attach);rootNode().querySelectorAll=()=>icons();
 const event=(x,y,extra={})=>({pointerId:1,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y,currentTarget:rootNode(),target:rootNode(),detail:1,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},...extra});
 const marrow=async()=>{rootNode().props.onPointerDownCapture(event(945,35));rootNode().props.onPointerDown(event(945,35));rootNode().props.onPointerMove(event(1035,215));rootNode().props.onPointerUp(event(1035,215));await flush();assert.deepEqual(selected(),['finder','premiere','vscode']);};
 const down=(id,x,y,extra={})=>{const n=icon(id),e=event(x,y,{target:n,currentTarget:n,...extra});rootNode().props.onPointerDownCapture(e);n.props.onPointerDown(e);return e};
 const move=(id,x,y,extra={})=>{const n=icon(id),e=event(x,y,{target:n,currentTarget:n,...extra});(before?n:rootNode()).props.onPointerMove(e);return e};
 const up=(id,x,y,extra={})=>{const n=icon(id),e=event(x,y,{target:n,currentTarget:n,...extra});(before?n:rootNode()).props.onPointerUp(e);return e};
 const click=(id,extra={})=>{const n=icon(id),e=event(0,0,{target:n,currentTarget:n,...extra});rootNode().props.onClickCapture(e);if(!e.defaultPrevented)n.props.onClick(e);return e};
 return{h,props,root:rootNode,icons,icon,selected,positions,committed,event,marrow,down,move,up,click,render:async p=>{Object.assign(props,p);h.render(props);await flush()},close:async()=>{h.close();await flush()},launches:()=>launches,activation:()=>activation};}
const f=await setup();await f.marrow();const initial=f.positions();f.down('finder',960,60);await flush();f.move('finder',860,100);f.up('finder',860,100);await flush();const delta=Object.fromEntries(['finder','premiere','vscode'].map(id=>[id,{x:f.positions()[id].x-initial[id].x,y:f.positions()[id].y-initial[id].y}]));
if(before){assert.deepEqual(f.selected(),['finder']);assert.deepEqual(delta,{finder:{x:-100,y:40},premiere:{x:0,y:0},vscode:{x:0,y:0}});fs.writeFileSync(path.join(dir,'before.json'),JSON.stringify({selectionAfter:f.selected(),delta,kind:'real parent/icon React; modeled boxes/events'},null,2));await f.close();console.log('Pre-fix selected set collapsed; only pressed icon moved');process.exit(0)}
assert.deepEqual(f.selected(),['finder','premiere','vscode']);for(const d of Object.values(delta))assert.deepEqual(d,{x:-100,y:40});assert.deepEqual(f.positions(),f.committed());results.push('Marquee-selected set dragged through actual parent/icon callbacks with one equal delta');await f.close();
// Remaining focused sequences follow below.
const run=async(name,fn)=>{const s=await setup();try{await fn(s);results.push(name);console.log('PASS '+name)}finally{await s.close();assert.equal([...listeners.values()].reduce((n,v)=>n+v.size,0),0)}};
await run('group edge clamp preserves every relative offset and live movement precedes React commit',async s=>{
 await s.marrow();const original=s.positions();s.down('premiere',960,145);s.move('premiere',2000,2000);const live=s.positions();assert.deepEqual(s.committed(),original);for(const id of ['finder','premiere','vscode'])assert.deepEqual({x:live[id].x-original[id].x,y:live[id].y-original[id].y},{x:8,y:292});assert.equal(live.vscode.y,506);s.up('premiere',2000,2000);await flush();assert.deepEqual(s.committed(),live);assert.deepEqual(s.positions(),live);
 const e=s.click('premiere',{metaKey:true});assert.ok(e.defaultPrevented);assert.deepEqual(s.selected(),['finder','premiere','vscode']);assert.equal(s.launches(),0);
});
await run('rapid pre-commit group gestures start from committed authoritative refs; late capture cannot restore old positions',async s=>{
 await s.marrow();const before=s.positions();s.down('finder',960,60);s.move('finder',910,80);s.up('finder',910,80);s.down('finder',910,80);s.move('finder',860,100);await flush();for(const id of ['finder','premiere','vscode'])assert.deepEqual(s.positions()[id],{x:before[id].x-100,y:before[id].y+40});s.up('finder',860,100);s.root().props.onLostPointerCapture(s.event(0,0));await flush();for(const id of ['finder','premiere','vscode'])assert.deepEqual(s.positions()[id],{x:before[id].x-100,y:before[id].y+40});assert.deepEqual(s.positions(),s.committed());const retained=s.positions();await s.render({enabled:false});await s.render({enabled:true,night:true});assert.deepEqual(s.positions(),retained);
});
for(const reason of ['escape','cancel','lost','blur','windowblur','hidden','pagehide','disabled','size','cssresize','invalid','arrange','unmount'])await run('group cancellation: '+reason,async s=>{
 await s.marrow();const original=s.positions();const old=s.icon('finder');observer.f([{contentRect:{width:1040,height:650}}]);s.down('finder',960,60);s.move('finder',860,100);
 if(reason==='escape')s.root().props.onKeyDown({...s.event(0,0),key:'Escape'});
 if(reason==='cancel')s.root().props.onPointerCancel(s.event(0,0));
 if(reason==='lost')s.root().props.onLostPointerCapture(s.event(0,0));
 if(reason==='blur')s.root().props.onBlur({currentTarget:s.root(),relatedTarget:{}});
 if(reason==='windowblur')emit('blur');if(reason==='pagehide')emit('pagehide');if(reason==='hidden'){document.hidden=true;emit('visibilitychange');document.hidden=false;}
 if(reason==='disabled')await s.render({enabled:false});if(reason==='size')await s.render({size:{width:1030,height:650}});
 if(reason==='cssresize')observer.f([{contentRect:{width:1039,height:650}}]);
 if(reason==='invalid'){s.props.host.current.getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});s.move('finder',860,100);}
 if(reason==='arrange')s.props.controller.current.arrange();
 if(reason==='unmount'){s.h.close();await flush();assert.equal(old.held,null);assert.equal(old.style.left,'948px');return;}
 await flush();assert.equal(old.held,null);assert.deepEqual(s.selected(),['finder','premiere','vscode']);assert.deepEqual(s.positions(),s.committed());
 if(reason==='size'){for(const id of ['finder','premiere','vscode'])assert.deepEqual(s.positions()[id],{...original[id],x:946});}
 else assert.deepEqual(s.positions(),original);
 s.root().props.onPointerUp(s.event(860,100));s.root().props.onLostPointerCapture(s.event(0,0));await flush();assert.deepEqual(s.positions(),s.committed());
});
await run('click-only collapse, unselected single drag, Shift/Cmd/Ctrl context, keyboard group movement',async s=>{
 await s.marrow();s.down('finder',960,60);s.up('finder',960,60);s.click('finder');await flush();assert.deepEqual(s.selected(),['finder']);
 s.click('premiere',{shiftKey:true});s.click('vscode',{metaKey:true});await flush();assert.deepEqual(s.selected(),['finder','premiere','vscode']);const before=s.positions();s.icon('premiere').props.onKeyDown({...s.event(0,0),altKey:true,key:'ArrowLeft'});s.icon('premiere').props.onKeyDown({...s.event(0,0),altKey:true,key:'ArrowLeft'});await flush();for(const id of s.selected())assert.equal(s.positions()[id].x,before[id].x-24);
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform:'MacIntel'}});const e=s.click('finder',{ctrlKey:true});assert.ok(!e.defaultPrevented);await flush();assert.equal(s.selected().length,3);if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;
 const old=s.positions();s.down('mail',880,160);s.move('mail',820,180);s.up('mail',820,180);await flush();assert.deepEqual(s.selected(),['mail']);for(const id of ['finder','premiere','vscode'])assert.deepEqual(s.positions()[id],old[id]);assert.notDeepEqual(s.positions().mail,old.mail);
});
await run('fresh doubleclick/keyboard launch; group movement/cancel suppresses compatibility click before modifier handling',async s=>{
 s.down('finder',960,60);s.up('finder',960,60);s.click('finder');s.down('finder',960,60);s.up('finder',960,60);s.click('finder',{detail:2});const e=s.event(0,0,{detail:2});s.root().props.onDoubleClickCapture(e);if(!e.defaultPrevented)s.icon('finder').props.onDoubleClick(e);assert.equal(s.launches(),1);
 s.click('finder',{detail:0});assert.equal(s.launches(),2);await s.marrow();s.down('finder',960,60);s.move('finder',900,90);s.root().props.onPointerCancel(s.event(0,0));const c=s.click('premiere',{shiftKey:true});assert.ok(c.defaultPrevented);await flush();assert.deepEqual(s.selected(),['finder','premiere','vscode']);assert.equal(s.launches(),2);
});
await run('touch tap opens once; travelled short touch does not open; longpress moves selected group',async s=>{
 now=0;s.down('finder',960,60,{pointerType:'touch'});s.up('finder',960,60,{pointerType:'touch'});s.click('finder',{pointerType:'touch'});assert.equal(s.launches(),1);
 s.down('finder',960,60,{pointerType:'touch'});now=50;s.move('finder',910,70,{pointerType:'touch'});s.up('finder',910,70,{pointerType:'touch'});assert.equal(s.launches(),1);
 await s.marrow();const old=s.positions();s.down('finder',960,60,{pointerType:'touch'});now=250;s.move('finder',900,90,{pointerType:'touch'});s.up('finder',900,90,{pointerType:'touch'});await flush();for(const id of s.selected())assert.deepEqual(s.positions()[id],{x:old[id].x-60,y:old[id].y+30});assert.equal(s.launches(),1);
});
await run('failed capture/secondary pointer cannot claim or split a selected group',async s=>{
 await s.marrow();const old=s.positions();const n=s.icon('finder'),saved=n.setPointerCapture;n.setPointerCapture=()=>{throw Error('capture failed')};s.down('finder',960,60);await flush();assert.deepEqual(s.positions(),old);assert.deepEqual(s.selected(),['finder','premiere','vscode']);n.setPointerCapture=saved;
 s.down('finder',960,60);s.down('mail',880,160,{pointerId:2,isPrimary:false});s.move('finder',100,100,{pointerId:2});s.up('finder',100,100,{pointerId:2});s.click('mail',{pointerId:2});await flush();assert.deepEqual(s.selected(),['finder','premiere','vscode']);assert.deepEqual(s.positions(),old);s.move('finder',900,90);s.up('finder',900,90);await flush();assert.equal(n.held,null);assert.equal(s.selected().length,3);
});
fs.writeFileSync(path.join(dir,'group-checks.json'),JSON.stringify({kind:'actual React DesktopItems/DesktopIcon; manual local boxes/capture/event transport, no native input',results},null,2)+'\n');console.log(results.length+' group checks passed');
