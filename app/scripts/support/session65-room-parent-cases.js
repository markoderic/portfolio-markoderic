import assert from 'node:assert/strict';import fs from 'node:fs';
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
 const h=harness(Prototype,{}),render=()=>{h.render();for(const n of nodes(h.tree))if(n.props?.ref&&!n.props.ref.current)n.props.ref.current={style:{},scrollTo(){},focus:()=>focus.push(n.props.className||n.props['aria-label']),querySelector:()=>({focus(){}})};h.flushEffects();h.render();};render();
 const ready=()=>{for(const id of ['desk','workspace','laptopModel','phone','resources'])scene(h).props.onStageReady(id);render()};
 const activate=()=>{byClass(h,'entry-confirm').props.onClick(event({target:target('primary')}));render()};
 return {h,render,ready,activate};
}

import {Context} from './scripts/support/room-audio-mock.mjs';
const audio=new Context();window.AudioContext=function(){return audio};audio.resume=async()=>{audio.resumes++;audio.stateTo('running')};
const s=setup(),loops=()=>audio.live().filter(n=>n.loop&&n.next?.kind==='gain');assert.equal(audio.sources.length,0);s.ready();s.activate();await Promise.resolve();await Promise.resolve();s.render();assert.equal(scene(s.h).props.entry.phase,'arriving');assert.equal(loops().length,1);assert.equal(audio.resumes,1);const source=loops()[0];
scene(s.h).props.onArrivalComplete(1);s.render();for(const view of ['laptop','phone','printer','paper','desk']){desktop(s.h).props.navigate(view);s.render();assert.equal(loops()[0],source)}
listeners.get('pagehide')();audio.advance(.1);assert.equal(loops().length,0);assert.equal(document.hidden,false);listeners.get('visibilitychange')();assert.equal(loops().length,0,'pagehide latch blocks visible event');listeners.get('pageshow')();assert.equal(loops().length,1);
document.hidden=true;listeners.get('visibilitychange')();audio.advance(.1);assert.equal(loops().length,0);document.hidden=false;listeners.get('visibilitychange')();assert.equal(loops().length,1);
const pref=desktop(s.h).props.sound;desktop(s.h).props.setSound({...pref,muted:true});s.render();audio.advance(.1);assert.equal(loops().length,0);desktop(s.h).props.setSound({...pref,muted:false,volume:0});s.render();assert.equal(loops().length,0);desktop(s.h).props.setSound({...pref,muted:false,volume:.4});s.render();assert.equal(loops().length,1);
audio.stateTo('suspended');assert.equal(loops().length,0);listeners.get('pagehide')();audio.stateTo('running');assert.equal(loops().length,0);listeners.get('pageshow')();assert.equal(loops().length,1);assert.equal(audio.resumes,1,'lifecycle never resumes context');
for(const slot of s.h.slots)slot.cleanup?.();assert.equal(loops().length,0);assert.equal(audio.listeners.size,0);assert.ok(audio.nodes.every(n=>!n.connected));fs.writeFileSync('../docs/redesign/session-65-background-audio/parent-checks.json',JSON.stringify({groups:4,coverage:['actual parent terminal/gesture/arrival hookup','ordinary view continuity','pagehide/BFCache and visibility latch','mute/zero/context-suspension/disposal'],boundary:'Actual Prototype/shared sound/room owner, modeled hooks and WebAudio; no native transport or listening'},null,2));console.log('4 actual parent room-audio lifecycle groups pass');
