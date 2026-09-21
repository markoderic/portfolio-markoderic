// Actual component callbacks and geometry/state checks in Node, never a browser.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = `
import assert from 'node:assert/strict';
import Prototype from './src/prototype/Prototype.jsx';
import {acknowledgePaperMotion} from './src/prototype/sceneInteraction';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
let now=0,serial=0;const frames=new Map();globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial};globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.document={activeElement:null};globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.location={hash:'#paper',search:''};globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};globalThis.window={};globalThis.history={pushState(){}};
const scene=h=>find(h,n=>n.props?.printMotion),text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join(''),button=(h,label)=>find(h,n=>n.type==='button'&&text(n)===label),render=h=>{h.render();h.flushEffects();h.render();},tick=(h,t)=>{now=t;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(t));render(h)};
let count=0;const check=(name,fn)=>{frames.clear();now=0;fn();count++;console.log('PASS '+name)};
check('actual parent keeps 200/800/2000ms sequencing and rejects duplicate reprints',()=>{
 const h=harness(Prototype,{});render(h);const reprint=button(h,'Reprint');reprint.props.onClick();reprint.props.onClick();render(h);assert.equal(frames.size,1);tick(h,199);assert.equal(scene(h).props.printMotion.current.phase,'crumple');tick(h,200);assert.equal(scene(h).props.printMotion.current.phase,'toss');tick(h,999);assert.equal(scene(h).props.printMotion.current.phase,'toss');tick(h,1000);assert.equal(scene(h).props.printMotion.current.terminal,true);acknowledgePaperMotion(scene(h).props.printMotion.current,true);tick(h,1016);assert.equal(scene(h).props.printMotion.current.phase,'feed');assert.equal(scene(h).props.completedPage,false);tick(h,2999);assert.equal(scene(h).props.printMotion.current.phase,'feed');tick(h,3000);assert.equal(scene(h).props.view,'paper');assert.equal(scene(h).props.completedPage,true);assert.equal(frames.size,0);
 scene(h).props.onSelect('desk');render(h);scene(h).props.onResume();render(h);assert.equal(scene(h).props.view,'paper');assert.equal(scene(h).props.completedPage,true);assert.equal(frames.size,0);
 const download=find(h,n=>n.type==='a'&&n.props.download!==undefined&&text(n)==='Download');assert.ok(download.props.href.startsWith('data:application/pdf;base64,'));assert.ok(Buffer.from(download.props.href.split(',')[1],'base64').subarray(0,5).toString()==='%PDF-');assert.equal(button(h,'Reprint').props.disabled,false);
});
check('discard-only completes once without a feed and subsequent resume starts a new print',()=>{
 const h=harness(Prototype,{});render(h);const discard=button(h,'Discard paper');discard.props.onClick();discard.props.onClick();render(h);assert.equal(frames.size,1);tick(h,999);assert.equal(scene(h).props.printMotion.current.phase,'toss');tick(h,1000);assert.equal(scene(h).props.printMotion.current.terminal,true);acknowledgePaperMotion(scene(h).props.printMotion.current,true);tick(h,1016);assert.equal(scene(h).props.view,'desk');assert.equal(scene(h).props.completedPage,false);assert.equal(frames.size,0);scene(h).props.onResume();render(h);assert.equal(scene(h).props.printMotion.current.phase,'feed');assert.equal(frames.size,1);
});
check('cancelled disposal cannot revive a queued frame or leave a duplicate replacement job',()=>{
 const h=harness(Prototype,{});render(h);button(h,'Reprint').props.onClick();render(h);tick(h,350);scene(h).props.onSelect('desk');render(h);assert.equal(frames.size,0);tick(h,900);assert.equal(scene(h).props.view,'desk');assert.equal(scene(h).props.printMotion.current.phase,'idle');scene(h).props.onSelect('paper');render(h);button(h,'Reprint').props.onClick();render(h);assert.equal(frames.size,1);tick(h,1100);assert.equal(scene(h).props.printMotion.current.phase,'toss');tick(h,1900);acknowledgePaperMotion(scene(h).props.printMotion.current,true);tick(h,3900);assert.equal(scene(h).props.view,'paper');assert.equal(scene(h).props.completedPage,true);assert.equal(frames.size,0);
});
check('reduced motion preserves immediate replacement and discard with no slow toss',()=>{
 globalThis.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});const h=harness(Prototype,{});render(h);button(h,'Reprint').props.onClick();render(h);tick(h,0);assert.equal(scene(h).props.view,'paper');assert.equal(scene(h).props.completedPage,true);assert.equal(frames.size,0);button(h,'Discard paper').props.onClick();render(h);tick(h,1);assert.equal(scene(h).props.view,'desk');assert.equal(scene(h).props.completedPage,false);assert.equal(frames.size,0);
});
console.log(count+' paper lifecycle callback checks passed; no browser, downloads or audio executed.');
`;
const output = path.join(root, ".vite/paper-lifecycle-test.mjs");
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
