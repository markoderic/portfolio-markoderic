// Session 02: actual component callbacks with explicit simulated propagation.
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
check('background click does not pause motion; deliberate mouse/touch orbit does and survives leave',()=>{
 for(const pointerType of ['mouse','touch']){const s=setup();desktop(s.h).props.navigate('desk');s.render();const surface=()=>find(s.h,n=>n.props?.className==='scene'),node=captureNode();node.getBoundingClientRect=()=>({left:0,top:0,width:1440,height:900});const event=(x,y)=>({pointerType,pointerId:4,button:0,buttons:1,clientX:x,clientY:y,currentTarget:node,nativeEvent:{}});
 surface().props.onPointerDown(event(100,100));surface().props.onPointerUp(event(100,100));s.render();assert.equal(scene(s.h).props.deskPaused,false);
 surface().props.onPointerDown(event(100,100));surface().props.onPointerMove(event(140,130));s.render();assert.equal(scene(s.h).props.deskPaused,true);assert.equal(scene(s.h).props.deskInput.current.dragging,true);const chosen={...scene(s.h).props.orbit.current};surface().props.onPointerUp(event(140,130));surface().props.onPointerLeave();s.render();assert.deepEqual(scene(s.h).props.orbit.current,chosen);assert.equal(scene(s.h).props.deskInput.current.dragging,false);assert.equal(node.held,false);
 }
});
check('cancel/lost capture and Escape end only the local orbit gesture',()=>{
 for(const end of ['onPointerCancel','onLostPointerCapture','escape']){const s=setup();desktop(s.h).props.navigate('desk');s.render();const el=find(s.h,n=>n.props?.className==='scene'),node=captureNode(),event={pointerType:'mouse',pointerId:1,button:0,clientX:0,clientY:0,currentTarget:node,nativeEvent:{}};el.props.onPointerDown(event);el.props.onPointerMove({...event,clientX:40,clientY:20});s.render();if(end==='escape')press(s.h);else el.props[end]();assert.equal(scene(s.h).props.deskInput.current.dragging,false);assert.equal(node.held,false);assert.equal(view(s.h),'desk');assert.equal(scene(s.h).props.deskInput.current.pointer,null);}
});
check('Explore pause choice persists through navigation; explicit resume/reset and keyboard orbit work',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();byLabel(s.h,'Workspace navigation').props.onClick();s.render();byText(s.h,'Pause desk motion').props.onClick();s.render();assert.equal(scene(s.h).props.deskPaused,true);desktop(s.h).props.navigate('phone');s.render();desktop(s.h).props.navigate('desk');s.render();assert.equal(scene(s.h).props.deskPaused,true);byLabel(s.h,'Workspace navigation').props.onClick();s.render();byLabel(s.h,'Orbit right').props.onClick();s.render();assert.ok(scene(s.h).props.orbit.current.yaw>0);byText(s.h,'Reset view').props.onClick();s.render();assert.deepEqual(scene(s.h).props.orbit.current,{yaw:0,pitch:0});assert.equal(scene(s.h).props.deskPaused,true);byText(s.h,'Resume desk motion').props.onClick();s.render();assert.equal(scene(s.h).props.deskPaused,false);assert.equal(scene(s.h).props.deskInput.current.manual,false);press(s.h);s.render();assert.equal(scene(s.h).props.deskBlocked,false);assert.equal(scene(s.h).props.deskInput.current.ui,false);
});
check('touch scene-object selection does not start orbit or require hover first',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const el=find(s.h,n=>n.props?.className==='scene'),node=captureNode();el.props.onPointerDown({pointerType:'touch',pointerId:2,button:0,clientX:20,clientY:20,currentTarget:node,nativeEvent:{sceneObject:true}});assert.equal(node.held,false);assert.equal(scene(s.h).props.deskInput.current.dragging,false);scene(s.h).props.onSelect('phone');s.render();assert.equal(view(s.h),'phone');assert.equal(scene(s.h).props.deskPaused,false);
});
check('mouse samples clear on departure, touch, UI and navigation; simple/reduced controls cannot enable drift',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const el=find(s.h,n=>n.props?.className==='scene'),node=captureNode();node.getBoundingClientRect=()=>({left:0,top:0,width:1440,height:900});const event={pointerType:'mouse',buttons:0,clientX:200,clientY:200,currentTarget:node};el.props.onPointerMove(event);assert.ok(scene(s.h).props.deskInput.current.pointer);el.props.onPointerLeave();assert.equal(scene(s.h).props.deskInput.current.pointer,null);el.props.onPointerMove(event);find(s.h,n=>n.props?.className==='context-nav').props.onPointerEnter();assert.equal(scene(s.h).props.deskInput.current.pointer,null);assert.equal(scene(s.h).props.deskInput.current.ui,true);desktop(s.h).props.navigate('laptop');s.render();assert.equal(scene(s.h).props.deskInput.current.pointer,null);
 for(const opts of [{simple:true},{reduced:true}]){const t=setup('#laptop',opts);desktop(t.h).props.navigate('desk');t.render();byLabel(t.h,'Workspace navigation').props.onClick();t.render();assert.equal(byText(t.h,'Desk motion unavailable in Simple / reduced motion view').props.disabled,true);}
});
check('visibility listener clears hover and freezes input without changing the user pause choice',()=>{
 const listeners=new Map();globalThis.addEventListener=(type,fn)=>listeners.set(type,fn);const s=setup();desktop(s.h).props.navigate('desk');s.render();const input=scene(s.h).props.deskInput.current;input.pointer={x:10,y:20};document.hidden=true;listeners.get('visibilitychange')();assert.equal(input.hidden,true);assert.equal(input.pointer,null);document.hidden=false;listeners.get('visibilitychange')();assert.equal(input.hidden,false);assert.equal(scene(s.h).props.deskPaused,false);globalThis.addEventListener=()=>{};
});
console.log(count+' passed, '+failures+' failed. Callback/state/focus-call mocks only; real keyboard/DOM/visual verification pending.');if(failures)process.exitCode=1;
`;
const output = path.join(root, ".vite/desk-input-test.mjs");
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
