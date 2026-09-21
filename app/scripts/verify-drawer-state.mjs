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

check('Explore top drawer button starts closed, toggles independently and exposes semantic state',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();byLabel(s.h,'Workspace navigation').props.onClick();s.render();
 assert.deepEqual(scene(s.h).props.drawers,[false,false,false]);
 const button=byLabel(s.h,'Top drawer: closed; open drawer');assert.equal(button.type,'button');assert.equal(button.props['aria-pressed'],false);button.props.onClick();s.render();
 assert.deepEqual(scene(s.h).props.drawers,[true,false,false]);assert.equal(byLabel(s.h,'Top drawer: open; close drawer').props['aria-pressed'],true);
 const held={repeat:true,key:'Enter',preventDefault(){this.prevented=true}};byLabel(s.h,'Top drawer: open; close drawer').props.onKeyDown(held);assert.ok(held.prevented);
 press(s.h);assert.ok(!byLabel(s.h,'Workspace'));assert.equal(view(s.h),'desk');assert.deepEqual(scene(s.h).props.drawers,[true,false,false]);
});
check('All three semantic controls remain independently addressable and allow all eight target combinations',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();byLabel(s.h,'Workspace navigation').props.onClick();s.render();
 for(let mask=0;mask<8;mask++)for(let id=0;id<3;id++){const current=scene(s.h).props.drawers[id],target=!!(mask&(1<<id));if(current!==target){const name=['Top','Middle','Bottom'][id]+' drawer: '+(current?'open; close drawer':'closed; open drawer');byLabel(s.h,name).props.onClick();s.render();}assert.equal(scene(s.h).props.drawers[id],target);}
 assert.deepEqual(scene(s.h).props.drawers,[true,true,true]);
});
check('Drawer target state survives laptop/phone/resume visits, appearance and lamp switches; inactive callbacks reject changes',()=>{
 const s=setup(),windows=desktop(s.h).props.manager,mail=desktop(s.h).props.mail;desktop(s.h).props.navigate('desk');s.render();scene(s.h).props.onDrawerToggle(0);s.render();
 for(const route of ['laptop','phone','paper']){desktop(s.h).props.navigate(route);s.render();scene(s.h).props.onDrawerToggle(0);s.render();assert.deepEqual(scene(s.h).props.drawers,[true,false,false]);}
 desktop(s.h).props.onLamp();s.render();desktop(s.h).props.navigate('desk');s.render();scene(s.h).props.onLamp();s.render();assert.deepEqual(scene(s.h).props.drawers,[true,false,false]);assert.equal(desktop(s.h).props.manager,windows);assert.equal(desktop(s.h).props.mail,mail);
});
check('Terminal, arrival, manual orbit and Simple/reduced view do not admit drawer activation',()=>{
 const fresh=setup('#desk');scene(fresh.h).props.onDrawerToggle(0);fresh.render();assert.deepEqual(scene(fresh.h).props.drawers,[false,false,false]);
 for(const opts of [{simple:true},{reduced:true}]){const s=setup('#laptop',opts);const control=scene(s.h);control?.props.onDrawerToggle(0);s.render();if(scene(s.h))assert.deepEqual(scene(s.h).props.drawers,[false,false,false]);assert.ok(!byLabel(s.h,'Top drawer: closed; open drawer'));}
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const root=find(s.h,n=>n.props?.className==='scene');const node=captureNode();root.props.onPointerDown({button:0,pointerId:8,clientX:1,clientY:1,nativeEvent:{},currentTarget:node});scene(s.h).props.onDrawerToggle(0);s.render();assert.deepEqual(scene(s.h).props.drawers,[false,false,false]);
});
check('Escape cancels an active drawer gesture before menu/device navigation; view exit clears cursor input',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const input=scene(s.h).props.deskInput.current;input.drawerHover=0;input.drawerPress={id:0};const e=press(s.h);assert.ok(e.defaultPrevented);assert.equal(input.drawerPress,null);assert.equal(input.drawerHover,null);assert.equal(view(s.h),'desk');
 input.drawerHover=0;desktop(s.h).props.navigate('laptop');s.render();assert.equal(input.drawerHover,null);
});
console.log(count+' Prototype callback/state checks passed, '+failures+' failed. Mock focus/DOM only.');if(failures)process.exitCode=1;

`;
const output = path.join(root, ".vite/drawer-state-test.mjs");
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
