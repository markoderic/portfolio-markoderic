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
let audio;window.AudioContext=class extends AudioMock{constructor(){super();audio=this;}};
const mounted=[];
const init=()=>{const h=harness(Prototype,{});render(h);mounted.push(h);const rig=paperRig(scene(h).props);return {h,rig,draw(){rig.step(scene(h).props);}}};
check('actual parent and Rig present terminal fitted contact before handoff, with 200/800/2000 timing',()=>{
 const s=init(),{h,rig}=s;button(h,'Reprint').props.onClick();render(h);s.draw();assert.equal(audio.sources.length,1);const job=scene(h).props.printMotion.current.job;
 tick(h,200);s.draw();tick(h,999);s.draw();assert.equal(job.contactPresented,undefined);tick(h,1000);assert.equal(scene(h).props.printMotion.current.terminal,true);assert.equal(scene(h).props.completedPage,false);
 s.draw();assert.equal(job.contactPresented,true);assert.equal(rig.paper.visible,true);assert.equal(rig.paper.userData.crumpled,true);const endpoint=rig.paper.position.clone();
 const curve=disposalCurve(new T.Vector3(...PAPER_REST),BIN_POSITION,new T.Quaternion());assert.ok(endpoint.distanceTo(curve.getPoint(1))<1e-8);assert.equal(audio.sources.length,2);s.draw();assert.equal(audio.sources.length,2);
 tick(h,1016);s.draw();assert.equal(scene(h).props.printMotion.current.phase,'feed');assert.equal(scene(h).props.completedPage,false);assert.equal(audio.sources.length,3);assert.equal(audio.sources.at(-1).buffer.duration,2.08);
 tick(h,2999);assert.equal(scene(h).props.printMotion.current.phase,'feed');tick(h,3000);assert.equal(scene(h).props.view,'paper');assert.equal(scene(h).props.completedPage,true);
});
check('low frame rate skips expired rustle, applies one final contact, never replays missed feed',()=>{
 const s=init(),{h}=s;const n=audio.sources.length;button(h,'Discard paper').props.onClick();render(h);tick(h,1400);s.draw();assert.equal(audio.sources.length,n+1);assert.equal(scene(h).props.printMotion.current.job.contactPresented,true);tick(h,1416);assert.equal(scene(h).props.view,'desk');assert.equal(scene(h).props.completedPage,false);
});
check('cancel/reopen at crumple, toss and acknowledged contact stops audio and defeats saved stale RAF',()=>{
 for(const at of [50,450,1000]){const s=init(),{h}=s;button(h,'Reprint').props.onClick();render(h);tick(h,at);s.draw();const late=[...frames.values()];scene(h).props.onSelect('desk');render(h);const n=audio.sources.length;late.forEach(f=>f(at+2000));render(h);assert.equal(scene(h).props.view,'desk');assert.equal(scene(h).props.printMotion.current.phase,'idle');assert.equal(audio.sources.length,n);scene(h).props.onSelect('paper');render(h);assert.equal(scene(h).props.view,'paper');assert.equal(frames.size,0);}
});
check('hidden catch-up and direct disposal do not invent paper effects; exact view ownership stays valid',()=>{
 const s=init(),{h}=s;button(h,'Discard paper').props.onClick();render(h);const n=audio.sources.length;document.hidden=true;tick(h,1500);assert.equal(scene(h).props.view,'desk');document.hidden=false;s.draw();assert.equal(audio.sources.length,n);
 globalThis.innerWidth=600;const t=init();button(t.h,'Discard paper').props.onClick();render(t.h);const before=audio.sources.length;tick(t.h,1600);t.draw();assert.equal(audio.sources.length,before);assert.equal(scene(t.h).props.view,'desk');globalThis.innerWidth=1440;
});
for(const h of mounted)h.slots.forEach(s=>s.cleanup?.());
console.log(count+' parent/Rig/audio groups passed; mock DOM/audio, actual Three poses, no native rendering/listening or downloads.');
`;
const output = path.join(root, ".vite/paper-motion-audio-test.mjs");
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
