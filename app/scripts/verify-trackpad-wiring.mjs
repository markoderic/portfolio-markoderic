// Session 11: actual scene/desktop state callbacks, with explicit mocked DOM.
// No browser, React DOM, native keyboard/focus or external IO.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = String.raw`
import assert from 'node:assert/strict';
import {harness,find,nodes,captureNode} from './scripts/support/hook-harness.js';
import Prototype from './src/prototype/Prototype.jsx';
import {AudioMock} from './scripts/support/fan-audio-mock.mjs';
import {fanHandlers} from './src/prototype/fanInput.js';
import MacDesktop from './src/prototype/MacDesktop.jsx';
import Window from './src/prototype/WorkspaceWindow.jsx';
import Calendar from './src/prototype/apps/CalendarPanel.jsx';
import Code from './src/prototype/apps/CodeWorkspace.jsx';
import Mail from './src/prototype/apps/MailComposer.jsx';
import Notch from './src/prototype/notch/NotchDemo.jsx';
let count=0,failures=0;
const check=async(name,fn)=>{try{await fn();count++;console.log('PASS '+name);}catch(e){failures++;console.log('FAIL '+name+'\n'+e.stack);}};
const text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join('');
const byLabel=(h,label)=>find(h,n=>n.props?.['aria-label']===label);
const byText=(h,label)=>find(h,n=>n.type==='button'&&text(n)===label);
const desktop=h=>find(h,n=>n.type===MacDesktop);
const phone=h=>find(h,n=>n.type===Notch);
const scene=h=>find(h,n=>n.props?.printMotion);
const paper=h=>find(h,n=>n.props?.className?.startsWith('paper-surface'));
const view=h=>h.tree.props.className.match(/view-(desk|laptop|phone|paper|printer)/)[1];
const key=(extra={})=>({key:'Escape',repeat:false,nativeEvent:{},defaultPrevented:false,stopped:false,target:{closest:()=>false},preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra});
// Deliberately explicit mock routing, not evidence of browser propagation.
function press(h,locals=[],extra={}){const e=key(extra);h.tree.props.onKeyDownCapture(e);for(const fn of [...locals,h.tree.props.onKeyDown]){if(e.stopped)break;fn?.(e);}h.render();return e;}
let pushes=[],focuses=[];
globalThis.innerWidth=1440;globalThis.innerHeight=900;
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.window={};globalThis.document={activeElement:null,querySelector:s=>({focus:()=>focuses.push(s)})};
globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
globalThis.getComputedStyle=()=>({transform:'none'});
function setup(hash='#laptop',{simple=false,reduced=false}={}){
 pushes=[];focuses=[];globalThis.history={pushState:(_a,_b,url)=>pushes.push(url)};
 globalThis.location={hash,search:simple?'?simple':''};globalThis.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});
 const h=harness(Prototype,{});
 const attach=()=>{for(const n of nodes(h.tree))if(n.props?.ref&&!n.props.ref.current){const label=n.props['aria-label']||n.props.className;n.props.ref.current={style:{},scrollTop:0,focus:options=>focuses.push({label,options}),scrollTo(){this.scrollTop=0;},querySelector:s=>({focus:options=>focuses.push({label:s,options})})};}};
 const render=()=>{h.render();attach();h.flushEffects();h.render();attach();};render();
 const settle=()=>{scene(h)?.props.onSettled(view(h));render();};settle();
 return {h,render,settle};
}


const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const dispose=h=>h.slots.forEach(s=>s.cleanup?.());
let audio;window.AudioContext=class extends AudioMock{constructor(){super();audio=this;}};
const listeners=new Map();globalThis.addEventListener=(kind,fn)=>{if(!listeners.has(kind))listeners.set(kind,new Set());listeners.get(kind).add(fn);};globalThis.removeEventListener=(kind,fn)=>listeners.get(kind)?.delete(fn);
const emit=kind=>{for(const fn of listeners.get(kind)||[])fn();};
await check('Physical pad owns one sound and one desk navigation; focused press does not restart navigation',async()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();
 s.h.tree.props.onPointerDown({button:2,isPrimary:true});s.h.tree.props.onPointerDown({button:0,isPrimary:false});await tick();assert.equal(audio,undefined);
 const before=audio?.sources.length||0;
 scene(s.h).props.onTrackpad();s.render();await tick();
 assert.equal(view(s.h),'laptop');assert.equal(pushes.filter(p=>p==='#laptop').length,1);assert.equal(audio.sources.length,before+1);
 const navs=pushes.length;scene(s.h).props.onTrackpad();s.render();await tick();assert.equal(pushes.length,navs);assert.equal(audio.sources.length,before+2);
 const prior=audio.sources.length;scene(s.h).props.onSelect('phone');s.render();await tick();assert.equal(view(s.h),'phone');assert.equal(audio.sources.length,prior);
 scene(s.h).props.onSelect('laptop');s.render();await tick();assert.equal(view(s.h),'laptop');assert.equal(audio.sources.length,prior);dispose(s.h);
});
// Session45/W13 supersedes click/activation sound with one DOM pointer-pair owner.
await check('Actual parent click captures and icon activation stay silent; mounted Mac owns a press/release pair',async()=>{
 const s=setup();audio.advance(audio.currentTime+1);const before=audio.sources.length;
 const target={closest:()=>false};
 for(const detail of [0,1,2])s.h.tree.props.onClickCapture({detail,target});
 s.h.tree.props.onDoubleClickCapture?.({detail:2,target});await tick();assert.equal(audio.sources.length,before);
 const mac=harness(MacDesktop,desktop(s.h).props);mac.flushEffects();
 const items=find(mac,n=>n.props?.activate&&n.props?.controller);items.props.activate();await tick();assert.equal(audio.sources.length,before);
 const e={pointerId:31,button:0,isPrimary:true,pointerType:'mouse',target};
 mac.tree.props.onPointerDownCapture(e);await tick();assert.equal(audio.sources.length,before+1);
 mac.tree.props.onPointerUpCapture(e);await tick();assert.equal(audio.sources.length,before+2);
 mac.tree.props.onLostPointerCaptureCapture(e);s.h.tree.props.onClickCapture({detail:1,target});assert.equal(audio.sources.length,before+2);
 dispose(mac);dispose(s.h);
});
await check('Actual global movement/cancellation, hidden/pagehide, mute, menu and direct gates invalidate physical input/audio',async()=>{
 const s=setup();const input=scene(s.h).props.deskInput.current;
 input.trackpadPress={pointerId:1,x:10,y:10};s.h.tree.props.onPointerMoveCapture({pointerId:1,buttons:1,clientX:40,clientY:10});s.h.tree.props.onPointerMoveCapture({pointerId:1,buttons:1,clientX:10,clientY:10});assert.ok(input.trackpadPress.moved);
 s.h.tree.props.onPointerCancel();assert.equal(input.trackpadPress,null);
 input.trackpadPress={pointerId:1};s.h.tree.props.onPointerUp({pointerId:1});assert.equal(input.trackpadPress,null);
 const before=audio.sources.length;desktop(s.h).props.setSound({muted:true,volume:.4});s.render();scene(s.h).props.onTrackpad();await tick();assert.equal(audio.sources.length,before);
 desktop(s.h).props.setSound({muted:false,volume:.4});s.render();document.hidden=true;emit('visibilitychange');scene(s.h).props.onTrackpad();await tick();assert.equal(audio.sources.length,before);document.hidden=false;emit('visibilitychange');
 emit('pagehide');scene(s.h).props.onTrackpad();await tick();assert.equal(audio.sources.length,before);emit('pageshow');
 byLabel(s.h,'Workspace navigation').props.onClick();s.render();scene(s.h).props.onTrackpad();await tick();assert.equal(audio.sources.length,before);dispose(s.h);
 const simple=setup('#laptop',{simple:true});const n=audio.sources.length;assert.equal(scene(simple.h),undefined);dispose(simple.h);
 const reduced=setup('#laptop',{reduced:true});scene(reduced.h).props.onTrackpad();await tick();assert.equal(audio.sources.length,n);dispose(reduced.h);
});
console.log(count+' actual callback wiring groups passed, '+failures+' failed. Mock DOM/audio, not native input/output.');if(failures)process.exitCode=1;

`;
const output = path.join(root, ".vite/trackpad-wiring-test.mjs");
await build({
  stdin: { contents: source, resolveDir: root, loader: "jsx" },
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "transform",
  outfile: output,
  plugins: [
    {
      name: "test-boundaries",
      setup(b) {
        if (process.argv.includes('--before')) b.onLoad({filter: /src\/prototype\/.*\.jsx$/}, async a => {
          const rel = path.relative(path.join(root, 'src/prototype'), a.path);
          try { return {contents: await readFile(path.join(root, '../docs/redesign/session-02-escape-navigation-evidence/before', rel), 'utf8'), loader: 'jsx', resolveDir: path.dirname(a.path)}; }
          catch (e) { if (e.code !== 'ENOENT') throw e; }
        });
        b.onResolve({ filter: /^react$/ }, () => ({
          path: path.join(root, "scripts/support/hook-harness.js"),
        }));
        b.onResolve({ filter: /^@react-three\/drei$/ }, () => ({
          path: "progress",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents:
            "export const useProgress=()=>({active:false,loaded:0,total:0,errors:[]});",
        }));
        b.onResolve({ filter: /\?raw$/ }, (a) => ({
          path: path.resolve(a.resolveDir, a.path.slice(0, -4)),
          namespace: "raw",
        }));
        b.onLoad({ filter: /.*/, namespace: "raw" }, async (a) => ({
          contents: await (
            await import("node:fs/promises")
          ).readFile(a.path, "utf8"),
          loader: "text",
        }));
        b.onResolve({ filter: /Scene$/ }, () => ({
          path: "scene",
          namespace: "empty-scene",
        }));
        b.onLoad({ filter: /.*/, namespace: "empty-scene" }, () => ({
          contents: "export default function Scene() {}",
        }));
      },
    },
  ],
  loader: {
    ".png": "dataurl",
    ".jpg": "dataurl",
    ".pdf": "dataurl",
    ".css": "empty",
  },
});
await import(pathToFileURL(output).href + "?v=" + Date.now());
