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
import MacDesktop from './src/prototype/MacDesktop.jsx';
import Window from './src/prototype/WorkspaceWindow.jsx';
import Calendar from './src/prototype/apps/CalendarPanel.jsx';
import Code from './src/prototype/apps/CodeWorkspace.jsx';
import Mail from './src/prototype/apps/MailComposer.jsx';
import Notch from './src/prototype/notch/NotchDemo.jsx';
let count=0,failures=0;
const check=(name,fn)=>{try{fn();count++;console.log('PASS '+name);}catch(e){failures++;console.log('FAIL '+name+'\n'+e.stack);}};
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

check('Fan initial on and semantic Explore toggle retain state across devices, lamp/desktop appearance and drawers',()=>{
 const s=setup();assert.equal(scene(s.h).props.fanOn,true);desktop(s.h).props.navigate('desk');s.render();byLabel(s.h,'Workspace navigation').props.onClick();s.render();
 let b=byLabel(s.h,'Desk fan: on; turn off');assert.equal(b.type,'button');assert.equal(b.props['aria-pressed'],true);b.props.onClick();s.render();assert.equal(scene(s.h).props.fanOn,false);
 for(const key of ['Enter',' ']){const held={repeat:true,key,preventDefault(){this.prevented=true}};byLabel(s.h,'Desk fan: off; turn on').props.onKeyDown(held);assert.ok(held.prevented);}
 byLabel(s.h,'Top drawer: closed; open drawer').props.onClick();s.render();assert.equal(scene(s.h).props.drawers[0],true);
 for(const view of ['laptop','phone','paper','desk']){scene(s.h).props.onSelect(view);s.render();assert.equal(scene(s.h).props.fanOn,false);assert.equal(scene(s.h).props.drawers[0],true);}
 scene(s.h).props.onLamp();s.render();assert.equal(scene(s.h).props.fanOn,false);desktop(s.h).props.onLamp();s.render();assert.equal(scene(s.h).props.fanOn,false);
 scene(s.h).props.onFanToggle();s.render();assert.equal(scene(s.h).props.fanOn,true);
});
check('Fan physical action respects desk/entry/direct/orbit, while its Explore action works with menu open',()=>{
 const s=setup();scene(s.h).props.onFanToggle();s.render();assert.equal(scene(s.h).props.fanOn,true);
 desktop(s.h).props.navigate('desk');s.render();const div=find(s.h,n=>n.props?.className==='scene');div.props.onPointerDown({button:0,pointerId:3,clientX:1,clientY:1,nativeEvent:{},currentTarget:{setPointerCapture(){},hasPointerCapture(){return false}}});scene(s.h).props.onFanToggle();s.render();assert.equal(scene(s.h).props.fanOn,true);press(s.h);
 byLabel(s.h,'Workspace navigation').props.onClick();s.render();byLabel(s.h,'Desk fan: on; turn off').props.onClick();s.render();assert.equal(scene(s.h).props.fanOn,false);assert.equal(scene(s.h).props.deskBlocked,true);
 const t=setup('#desk');scene(t.h).props.onFanToggle();t.render();assert.equal(scene(t.h).props.fanOn,true);
 const simple=setup('#desk',{simple:true});assert.ok(!byLabel(simple.h,'Desk fan: on; turn off'));
});
check('Escape cancels fan press first; view/cancel/other press/menu clear it without device navigation',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const input=scene(s.h).props.deskInput.current;
 input.fanPress={pointerId:1};input.fanHover=true;press(s.h);assert.equal(input.fanPress,null);assert.equal(input.fanHover,false);assert.equal(view(s.h),'desk');
 for(const action of ['cancel','other','menu','view']){input.fanPress={pointerId:1};input.fanHover=true;if(action==='cancel')s.h.tree.props.onPointerCancel();if(action==='other')s.h.tree.props.onPointerDownCapture({clientX:1,clientY:2,button:0,isPrimary:true,pointerId:2});if(action==='menu')byLabel(s.h,'Workspace navigation').props.onClick();if(action==='view')scene(s.h).props.onSelect('phone');s.render();assert.equal(input.fanPress,null);assert.equal(input.fanHover,false);}
});
check('Reduced motion retains logical fan control without changing camera pause meaning',()=>{
 const s=setup('#desk',{reduced:true});byLabel(s.h,'Workspace navigation').props.onClick();s.render();const b=byLabel(s.h,'Desk fan: on; turn off');assert.ok(b);b.props.onClick();s.render();assert.equal(scene(s.h).props.fanOn,false);assert.equal(scene(s.h).props.reduced,true);assert.equal(scene(s.h).props.deskPaused,false);
});
console.log(count+' Prototype callback/state checks passed, '+failures+' failed. Mock focus/DOM only.');if(failures)process.exitCode=1;

`;
const output = path.join(root, ".vite/fan-state-test.mjs");
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
