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


const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
const dispose=h=>h.slots.forEach(s=>s.cleanup?.());
let audio;window.AudioContext=class extends AudioMock{constructor(){super();audio=this;}};
const listeners=new Map();globalThis.addEventListener=(kind,fn)=>{if(!listeners.has(kind))listeners.set(kind,new Set());listeners.get(kind).add(fn);};globalThis.removeEventListener=(kind,fn)=>listeners.get(kind)?.delete(fn);
const emit=kind=>{for(const fn of listeners.get(kind)||[])fn();};
await check('Actual Prototype physical/Explore share one distinct switch; generic capture, drag/cancel/repeats add no voices',async()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const owner=scene(s.h).props.fanAudio;owner.power(1);assert.equal(audio,undefined);
 s.h.tree.props.onPointerDown({});await tick();assert.equal(audio.sources.filter(v=>v.loop).length,1);assert.equal(audio.sources.filter(v=>!v.loop).length,0);
 const physical=fanHandlers(scene(s.h).props.deskInput.current,true,scene(s.h).props.onFanToggle,()=>true);
 const e={pointerId:1,button:0,isPrimary:true,clientX:10,clientY:10,nativeEvent:{},stopPropagation(){}};
 physical.onPointerDown(e);physical.onPointerUp(e);physical.onClick(e);physical.onClick(e);s.render();await tick();assert.equal(scene(s.h).props.fanOn,false);assert.equal(audio.sources.filter(v=>!v.loop).length,1);
 for(const mode of ['drag','cancel']){physical.onPointerDown(e);if(mode==='drag')physical.onPointerMove({...e,clientX:30});else physical.onPointerCancel(e);physical.onPointerUp(e);physical.onClick(e);s.render();await tick();assert.equal(audio.sources.filter(v=>!v.loop).length,1);}
 byLabel(s.h,'Workspace navigation').props.onClick();s.render();const b=byLabel(s.h,'Desk fan: off; turn on');
 s.h.tree.props.onClickCapture({detail:0,target:{closest:selector=>selector==='button,a,.window-title'?b:null}});b.props.onClick();s.render();await tick();assert.equal(scene(s.h).props.fanOn,true);assert.equal(audio.sources.filter(v=>!v.loop).length,2);
 const held={key:'Enter',repeat:true,preventDefault(){this.prevented=true}};b.props.onKeyDown(held);assert.ok(held.prevented);assert.equal(audio.sources.filter(v=>!v.loop).length,2);
 dispose(s.h);assert.ok(audio.nodes.every(n=>!n.connected));
});
await check('Actual preferences/device/visibility/page handlers stop voices, return resumes without switch; camera pause independent',async()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const owner=scene(s.h).props.fanAudio;owner.power(1);s.render();
 const live=()=>audio.sources.filter(v=>v.loop&&v.connected&&!v.ended),clicks=()=>audio.sources.filter(v=>!v.loop).length;
 assert.equal(live().length,1);const c=clicks();
 byLabel(s.h,'Workspace navigation').props.onClick();s.render();byText(s.h,'Pause desk motion').props.onClick();s.render();assert.equal(scene(s.h).props.deskPaused,true);assert.equal(live().length,1);assert.equal(clicks(),c);byLabel(s.h,'Workspace navigation').props.onClick();s.render();
 for(const view of ['phone','laptop','paper','printer']){scene(s.h).props.onSelect(view);s.render();audio.advance(audio.currentTime+.1);assert.equal(live().length,1,view);scene(s.h).props.onSelect('desk');s.render();assert.equal(live().length,1);assert.equal(clicks(),c);}
 document.hidden=true;emit('visibilitychange');audio.advance(audio.currentTime+.1);assert.equal(live().length,0);document.hidden=false;emit('visibilitychange');assert.equal(live().length,1);
 emit('pagehide');audio.advance(audio.currentTime+.1);assert.equal(live().length,0);emit('pageshow');assert.equal(live().length,1);
 desktop(s.h).props.setSound({muted:true,volume:.4});s.render();audio.advance(audio.currentTime+.1);assert.equal(live().length,0);desktop(s.h).props.setSound({muted:false,volume:.2});s.render();assert.equal(live().length,1);assert.equal(clicks(),c);
 dispose(s.h);assert.ok(audio.nodes.every(n=>!n.connected));assert.equal(audio.closes+audio.suspends,0);
});
await check('Actual reduced routing keeps invisible fan silent but allows explicit preference-respecting switch',async()=>{
 const s=setup('#desk',{reduced:true});const before=audio.sources.length;scene(s.h).props.fanAudio.power(1);assert.equal(audio.sources.length,before);byLabel(s.h,'Workspace navigation').props.onClick();s.render();byLabel(s.h,'Desk fan: on; turn off').props.onClick();s.render();await tick();assert.equal(audio.sources.length,before+1);assert.equal(audio.sources.at(-1).loop,false);dispose(s.h);
});
console.log(count+' actual callback wiring groups passed, '+failures+' failed. Mock DOM/audio, not native input/output.');if(failures)process.exitCode=1;

`;
const output = path.join(root, ".vite/fan-audio-wiring-test.mjs");
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
