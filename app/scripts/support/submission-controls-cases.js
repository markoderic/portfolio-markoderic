import assert from 'node:assert/strict';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
import Prototype from './src/prototype/Prototype.jsx';
const text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join('');
const scene=h=>find(h,n=>n.props?.printMotion),desktop=h=>find(h,n=>n.props?.manager&&n.props?.notchScreen);
const byClass=(h,c)=>find(h,n=>n.props?.className===c),byText=(h,s)=>find(h,n=>n.type==='button'&&text(n)===s);
const target=kind=>({closest:s=>kind==='primary'?s.includes('data-entry-confirm'):kind==='secondary'?s!=='[data-entry-confirm]':false});
const event=(extra={})=>({target:target('backdrop'),pointerId:1,button:0,buttons:0,clientX:100,clientY:100,detail:1,nativeEvent:{},repeat:false,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...extra});
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
let focus=[],listeners=new Map(),selected='';
globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.window={getSelection:()=>({toString:()=>selected})};globalThis.document={activeElement:null,hidden:false};globalThis.history={pushState(){}};globalThis.addEventListener=(n,f)=>listeners.set(n,f);globalThis.removeEventListener=()=>{};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
function setup(hash='',{reduced=false,simple=false,width=1440}={}){
 globalThis.innerWidth=width;globalThis.innerHeight=900;globalThis.location={hash,search:simple?'?simple':''};globalThis.motionPreference={matches:reduced,addEventListener(n,f){listeners.set('motion',f)},removeEventListener(){}};globalThis.matchMedia=()=>motionPreference;globalThis.entryProgress={active:false,loaded:0,total:0,errors:[]};selected='';focus=[];listeners=new Map();
 const h=harness(Prototype,{}),render=()=>{h.render();for(const n of nodes(h.tree))if(n.props?.ref&&!n.props.ref.current)n.props.ref.current={style:{setProperty(k,v){this[k]=v},getPropertyValue(k){return this[k]||''}},scrollTo(){},focus:()=>focus.push(n.props.className||n.props['aria-label']),querySelector:()=>({focus(){}})};h.flushEffects();h.render();};render();
 const ready=()=>{for(const id of ['desk','workspace','laptopModel','phone','resources'])scene(h).props.onStageReady(id);render()};
 const activate=()=>{byClass(h,'entry-confirm').props.onClick(event({target:target('primary')}));render()};
 return {h,render,ready,activate};
}

import {AudioMock} from './scripts/support/fan-audio-mock.mjs';
let audio;
window.AudioContext=class extends AudioMock { constructor(){super();audio=this;} };
const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve()};
const s=setup();
assert.equal(audio,undefined);
s.ready();s.activate();await tick();s.render();
assert.equal(scene(s.h).props.entry.phase,'arriving');
assert.equal(audio.sources.length,0,'entry unlock creates no room or idle sources');
scene(s.h).props.onArrivalComplete(1);s.render();
scene(s.h).props.fanAudio.power(1);
const live=()=>audio.sources.filter(n=>n.connected&&!n.ended&&n.started!==undefined);
assert.equal(live().length,1,'only the fan creates a continuous source');
assert.equal(live()[0].next.kind,'filter','retained causal fan signal chain');
check('entry and fan source ownership',()=>assert.equal(audio.sources.filter(n=>n.loop).length,1));
find(s.h,n=>n.props?.['aria-label']==='Workspace navigation').props.onClick();s.render();
const menu=find(s.h,n=>n.type==='nav'&&n.props['aria-label']==='Workspace');
const controls=[...nodes(menu)].filter(n=>n.type==='button'||n.type==='a');
const labels=controls.map(text),tossIndex=labels.indexOf('Paper toss');
check('Explore prioritizes navigation and useful controls',()=>{
 assert.equal(labels[0],'View desk');assert.ok(tossIndex>labels.indexOf('Controls & credits'));
 for(const label of ['Open laptop','Pick up phone','View resume','Download PDF','Simple view','Nighttime','Reset view','Pause desk motion','Turn fan off','Open top drawer'])assert.ok(labels.indexOf(label)>=0&&labels.indexOf(label)<tossIndex,label);
 assert.equal(labels.includes('Local runtime diagnostics'),import.meta.env.DEV);
 assert.equal(labels.at(-1),import.meta.env.DEV?'Local runtime diagnostics':'Paper toss');
 const toss=controls[tossIndex];assert.equal(typeof toss.props.onKeyDown,'function');assert.equal(typeof toss.props.onClick,'function');
});
if(import.meta.env.DEV){
 byText(s.h,'Local runtime diagnostics').props.onClick();s.render();
 assert.ok(find(s.h,n=>n.props?.trace&&n.props?.onStart),'development diagnostics still opens');
}
byText(s.h,'Turn fan off').props.onClick();s.render();await tick();
scene(s.h).props.fanAudio.power(0);audio.advance(audio.currentTime+1);
check('fan off leaves no room bed',()=>assert.equal(live().length,0));
for(const view of ['laptop','phone','printer','paper','desk']){
 desktop(s.h).props.navigate(view);s.render();audio.advance(audio.currentTime+1);assert.equal(live().length,0,view);
}
const pref=desktop(s.h).props.sound;
for(const preferences of [{...pref,muted:true},{...pref,muted:false,volume:0},{...pref,muted:false,volume:.4}]){desktop(s.h).props.setSound(preferences);s.render();assert.equal(live().length,0)}
listeners.get('pagehide')();listeners.get('visibilitychange')();listeners.get('pageshow')();
document.hidden=true;listeners.get('visibilitychange')();document.hidden=false;listeners.get('visibilitychange')();
s.h.tree.props.onPointerDown(event());await tick();assert.equal(live().length,0);
check('navigation/preferences/page restoration do not create ambience',()=>assert.equal(audio.sources.filter(n=>n.loop).length,1));
for(const slot of s.h.slots)slot.cleanup?.();assert.ok(audio.nodes.every(n=>!n.connected));
console.log(`PASS ${count} current Prototype groups (${import.meta.env.DEV?'development':'production'} diagnostics visibility); modeled hooks/WebAudio only`);
