// Actual component callbacks and geometry/state checks in Node, never a browser.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = `
import assert from 'node:assert/strict';
import Prototype from './src/prototype/Prototype.jsx';
const {paperRig,binPosition:BIN_POSITION}=await import('../scripts/support/paper-frame-fixture.mjs');
import {PaperAudioMock as AudioMock} from './scripts/support/paper-audio-mock.mjs';
import {applyDisposalPose,disposalCurve,PAPER_REST} from './src/prototype/paperDisposal';

import * as T from 'three';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
let now=0,serial=0;const frames=new Map();globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial};globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.document={activeElement:null};globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.location={hash:'#paper',search:''};globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};globalThis.window={};globalThis.history={pushState(){}};
const scene=h=>find(h,n=>n.props?.printMotion),text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join(''),button=(h,label)=>find(h,n=>n.type==='button'&&text(n)===label),render=h=>{h.render();h.flushEffects();h.render();},tick=(h,t)=>{now=t;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(t));render(h)};
let count=0;const check=(name,fn)=>{frames.clear();now=0;fn();count++;console.log('PASS '+name)};
let audio;window.AudioContext=class extends AudioMock{constructor(){super();audio=this;} createBufferSource(){const s=super.createBufferSource(),start=s.start;s.start=(t,o,d)=>{s.feedDuration=d;start(t,o);};return s;}};
const mounted=[];
const init=()=>{const h=harness(Prototype,{});render(h);mounted.push(h);const rig=paperRig(scene(h).props);return {h,rig,draw(){rig.step(scene(h).props);}}};
for(const origin of ['desk','laptop']) check('first physical feed from '+origin,()=>{
 location.hash='#laptop'; const s=init(),{h}=s;
 if(origin==='desk'){scene(h).props.onSelect('desk');render(h);}
 for(let i=0;i<180;i++){s.draw();render(h);}
 scene(h).props.onResume();render(h); const accepted=now; let first=null,started=null;
 for(let i=1;i<=240;i++){tick(h,accepted+i*1000/60);s.draw();render(h);const m=scene(h).props.printMotion.current;
 if(m.job?.startedAt!==undefined&&started===null)started=m.job.startedAt-accepted;
 if(m.phase==='feed'&&m.progress>0&&s.rig.paper.visible){first=now-accepted;break;}}
 assert.equal(first,50);assert.equal(started,1000/30);console.log(JSON.stringify({origin,started,firstFeed:first}));
 scene(h).props.onSelect('desk');render(h);
});

await Promise.resolve();await Promise.resolve();
check('delayed audio unlock joins remaining feed and does not own a voice prematurely',()=>{
 location.hash='#laptop';const {h,draw}=init();let resolve;audio.state='suspended';audio.pending=new Promise(r=>resolve=r);
 scene(h).props.onResume();render(h);draw();tick(h,20);draw();tick(h,620);draw();
 const job=scene(h).props.printMotion.current.job;assert.equal(job.feeding,undefined);
 audio.state='running';resolve();tick(h,820);draw();assert.equal(job.feeding,true);
 const voice=audio.sources.at(-1);assert.equal(voice.buffer.duration,2.08);assert.equal(voice.offset,.8);assert.equal(voice.feedDuration,1.2);
 tick(h,1020);draw();assert.equal(audio.sources.at(-1),voice);tick(h,2020);draw();assert.equal(scene(h).props.view,'paper');assert.ok(voice.stopped!==undefined);
});
await Promise.resolve();await Promise.resolve();
check('cancelled approach, stale pose, repeated action and delayed unlock cannot revive an old job',()=>{
 location.hash='#laptop';const {h,draw}=init();audio.pending=null;audio.state='running';scene(h).props.onResume();render(h);const old=scene(h).props.printMotion.current;draw();const late=[...frames.values()];scene(h).props.onSelect('desk');render(h);late.forEach(fn=>fn(50));render(h);assert.equal(scene(h).props.printMotion.current.phase,'idle');
 scene(h).props.onResume();render(h);const current=scene(h).props.printMotion.current;assert.notEqual(current.job,old.job);scene(h).props.onResume();render(h);assert.equal(scene(h).props.printMotion.current,current);tick(h,60);assert.equal(current.job.startedAt,undefined);draw();tick(h,80);assert.equal(current.job.startedAt,80);
 scene(h).props.onSelect('desk');render(h);
});
check('progress zero commits while hidden pages cannot acknowledge/start a new physical job',()=>{
 location.hash='#laptop';const {h,draw}=init();scene(h).props.onResume();render(h);const motion=scene(h).props.printMotion.current;document.hidden=true;scene(h).props.deskInput.current.hidden=true;draw();tick(h,100);assert.equal(motion.job.startedAt,undefined);document.hidden=false;scene(h).props.deskInput.current.hidden=false;draw();assert.equal(motion.job.feedPosePresented,motion);tick(h,120);assert.equal(motion.job.startedAt,120);scene(h).props.onSelect('desk');render(h);
});
await Promise.resolve();await Promise.resolve();
check('unlock after cancellation or expired feed cannot replay a printer voice',()=>{
 for(const cancel of [true,false]){
  location.hash='#laptop';const {h,draw}=init();audio.pending=null;audio.state='suspended';audio.resume=()=>Promise.resolve();
  scene(h).props.onResume();render(h);draw();tick(h,20);draw();const before=audio.sources.length;const late=[...frames.values()];
  if(cancel){scene(h).props.onSelect('desk');render(h);}else{tick(h,2520);draw();assert.equal(scene(h).props.view,'paper');}
  audio.state='running';late.forEach(f=>f(2540));render(h);assert.equal(audio.sources.length,before);
 }
});
check('direct and reduced printing completes immediately without waiting for hidden mesh or motor',()=>{
 for(const reduced of [false,true]){location.hash='#laptop';globalThis.innerWidth=reduced?1440:600;globalThis.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});const {h}=init();const before=audio.sources.length;scene(h).props.onResume();render(h);tick(h,20);assert.equal(scene(h).props.completedPage,true);assert.equal(scene(h).props.view,'paper');assert.equal(audio.sources.slice(before).filter(s=>s.buffer?.duration===2.08).length,0);}
 globalThis.innerWidth=1440;globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
});
check('paper automatically focuses Fit control; deliberate keyboard scroll region and zoom/fit remain',()=>{
 location.hash='#paper';const {h}=init();let fit=0,region=0;button(h,'Fit page').props.ref.current={focus(){fit++}};const host=find(h,n=>n.props?.className?.split(' ').includes('paper-surface'));host.props.ref.current={focus(){region++},scrollTo(){}};
 scene(h).props.onSettled('paper');render(h);assert.equal(fit,1);assert.equal(region,0);assert.equal(find(h,n=>n.props?.role==='region'&&n.props?.className?.includes('paper-surface')).props.tabIndex,0);
 button(h,'Zoom in').props.onClick();render(h);assert.equal(find(h,n=>n.props?.className?.includes('paper-surface')).props.style['--paper-zoom'],1.2);button(h,'Fit page').props.onClick();render(h);assert.equal(find(h,n=>n.props?.className?.includes('paper-surface')).props.style['--paper-zoom'],1);
});
for(const h of mounted)h.slots.forEach(s=>s.cleanup?.());
console.log(count+' parent/Rig/audio groups passed; mock DOM/audio, actual Three poses, no native rendering/listening or downloads.');
`;
const output = path.join(root, ".vite/session49-printer-test.mjs");
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
        b.onResolve({filter:/paper-frame-fixture\.mjs$/},a=>({path:a.path,external:true}));
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
