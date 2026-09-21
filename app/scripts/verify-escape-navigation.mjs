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
 const attach=()=>{for(const n of nodes(h.tree))if(n.props?.ref&&!n.props.ref.current){const label=n.props['aria-label']||n.props.className;n.props.ref.current={style:{},scrollTop:0,focus:options=>focuses.push({label,options}),scrollTo(){this.scrollTop=0;},querySelector:s=>s==='.n-sheet'?null:({focus:options=>focuses.push({label:s,options})})};}};
 const render=()=>{h.render();attach();h.flushEffects();h.render();attach();};render();
 const settle=()=>{scene(h)?.props.onSettled(view(h));render();};settle();
 return {h,render,settle};
}
check('one unhandled Escape from laptop, phone and resume uses the existing desk route',()=>{
 for(const hash of ['#laptop','#phone','#paper','#resume']){const s=setup(hash);const initial=view(s.h);const e=press(s.h);assert.equal(view(s.h),'desk',initial);assert.equal(e.defaultPrevented,true);assert.deepEqual(pushes,['#desk']);s.render();assert.equal(desktop(s.h).props.enabled,false);assert.equal(phone(s.h).props.enabled,false);assert.equal(byLabel(s.h,'Workspace navigation').props.ref.current!==undefined,true);assert.deepEqual(focuses.at(-1),{label:'Workspace navigation',options:{preventScroll:true}});}
});
check('preventDefault and stopPropagation each reserve Escape for the local consumer',()=>{
 for(const consume of [e=>e.preventDefault(),e=>e.stopPropagation()]){const s=setup();press(s.h,[consume]);assert.equal(view(s.h),'laptop');assert.equal(pushes.length,0);press(s.h);assert.equal(view(s.h),'desk');}
});
check('held repeat and composing Escape cannot cascade or cancel another local layer',()=>{
 for(const extra of [{repeat:true},{nativeEvent:{isComposing:true}},{isComposing:true},{keyCode:229}]){const s=setup();let calls=0;const e=press(s.h,[()=>calls++],extra);assert.equal(calls,0);assert.equal(view(s.h),'laptop');assert.equal(e.stopped,true);assert.equal(e.defaultPrevented,!!extra.repeat);}
});
check('terminal, arrival, desk and printing remain stable; Enter still begins normally',()=>{
 for(const hash of ['', '#desk']){const s=setup(hash);assert.ok(find(s.h,n=>n.props?.className==='entry-layer'));press(s.h);assert.ok(find(s.h,n=>n.props?.className==='entry-layer'));for(const id of ['desk','workspace','laptopModel','phone','resources'])scene(s.h).props.onStageReady(id);s.render();press(s.h,[],{key:'Enter'});assert.ok(find(s.h,n=>n.props?.className==='arrival-shield'));press(s.h);assert.ok(find(s.h,n=>n.props?.className==='arrival-shield'));assert.equal(pushes.length,0);scene(s.h).props.onArrivalComplete(scene(s.h).props.entry.token);s.render();press(s.h);assert.equal(view(s.h),'desk');}
 const s=setup();desktop(s.h).props.navigate('desk');s.render();pushes=[];press(s.h);assert.equal(view(s.h),'desk');assert.equal(pushes.length,0);
 desktop(s.h).props.onResume();s.render();assert.equal(view(s.h),'printer');const job=scene(s.h).props.printMotion.current;press(s.h);assert.equal(view(s.h),'printer');assert.equal(scene(s.h).props.printMotion.current,job);
});
check('explicit project deep links and reduced/simple views return without requiring 3D',()=>{
 for(const opts of [{},{simple:true},{reduced:true}])for(const hash of ['#film','#notch','#phone','#resume']){const s=setup(hash,opts);const manager=desktop(s.h).props.manager;press(s.h);s.render();assert.equal(view(s.h),'desk');assert.equal(desktop(s.h).props.manager,manager);assert.equal(!!scene(s.h),!opts.simple);desktop(s.h).props.navigate('laptop');s.render();s.settle();assert.equal(desktop(s.h).props.enabled,true);assert.equal(desktop(s.h).props.manager,manager);}
});
check('Explore dismisses before navigation, including at desk; repeat does not cascade',()=>{
 for(const destination of ['laptop','desk']){const s=setup();desktop(s.h).props.navigate(destination);s.render();byLabel(s.h,'Workspace navigation').props.onClick();s.render();pushes=[];press(s.h);assert.equal(view(s.h),destination);assert.equal(byLabel(s.h,'Workspace navigation').props['aria-expanded'],false);press(s.h,[],{repeat:true});assert.equal(view(s.h),destination);assert.equal(pushes.length,0);press(s.h);assert.equal(view(s.h),'desk');}
});
check('Mac menus respect inner consumption, close once, restore trigger and keep laptop',()=>{
 for(const menu of ['File','Control Center']){const s=setup(),d=harness(MacDesktop,desktop(s.h).props);const toggle=()=>find(d,n=>n.props?.['data-menu']===menu);toggle().props.onClick();d.render();press(s.h,[e=>e.preventDefault(),d.tree.props.onKeyDown]);d.render();assert.equal(toggle().props['aria-expanded'],true);press(s.h,[d.tree.props.onKeyDown]);d.render();assert.equal(toggle().props['aria-expanded'],false);assert.equal(view(s.h),'laptop');assert.ok(focuses.includes('[data-menu="'+menu+'"]'));press(s.h,[d.tree.props.onKeyDown],{repeat:true});assert.equal(view(s.h),'laptop');press(s.h,[d.tree.props.onKeyDown]);assert.equal(view(s.h),'desk');}
});
check('calendar closes locally both inside the panel and after focus moves outside it',()=>{
 for(const inside of [true,false]){const s=setup(),d=harness(MacDesktop,desktop(s.h).props);find(d,n=>n.props?.['data-calendar-trigger']).props.onClick();d.render();const c=harness(Calendar,find(d,n=>n.type===Calendar).props);byLabel(c,'Calendar and meeting request');const handlers=inside?[c.tree.props.onKeyDown,d.tree.props.onKeyDown]:[d.tree.props.onKeyDown];press(s.h,handlers);d.render();assert.equal(find(d,n=>n.type===Calendar).props.visible,false);assert.equal(view(s.h),'laptop');assert.ok(focuses.includes('[data-calendar-trigger]'));press(s.h,[d.tree.props.onKeyDown]);assert.equal(view(s.h),'desk');}
});
check('live VS Code/Xcode Find closes its search surface and retains the query',()=>{
 for(const xcode of [false,true]){const s=setup(),c=harness(Code,{xcode,navigate(){},notchScreen(){}});byLabel(c,'Toggle source search').props.onClick();c.render();byLabel(c,'Search all source files').props.onChange({target:{value:'keep query'}});c.render();let focused=0;byLabel(c,'Toggle source search').props.ref.current={focus:()=>focused++};press(s.h,[c.tree.props.onKeyDown]);c.render();assert.equal(byLabel(c,'Search all source files'),undefined);assert.equal(view(s.h),'laptop');assert.equal(focused,1);press(s.h,[c.tree.props.onKeyDown]);assert.equal(view(s.h),'desk');byLabel(c,'Toggle source search').props.onClick();c.render();assert.equal(byLabel(c,'Search all source files').props.value,'keep query');}
});
check('Mail discard confirmation cancels without discarding, closing or submitting',()=>{
 const s=setup('#mail');desktop(s.h).props.setMail(m=>({...m,draft:{...m.draft,details:'Unsent words'}}));s.render();const draft=desktop(s.h).props.mail.draft;let submits=0,closes=0,writes=0;const m=harness(Mail,{mail:desktop(s.h).props.mail,setMail(){writes++;},sendMail(){submits++;},onClose(){closes++;}});byText(m,'Discard draft').props.onClick();m.render();let focused=0;byText(m,'Discard draft').props.ref.current={focus:()=>focused++};press(s.h,[m.tree.props.onKeyDown]);m.render();assert.equal(byText(m,'Keep writing'),undefined);assert.equal(view(s.h),'laptop');assert.equal(focused,1);press(s.h,[m.tree.props.onKeyDown]);assert.equal(view(s.h),'desk');assert.equal(submits+closes+writes,0);assert.equal(desktop(s.h).props.mail.draft,draft);
});
check('Notch dialog consumes Escape before phone navigation and preserves saved state',()=>{
 const s=setup('#phone'),p=harness(Notch,phone(s.h).props);const state=p.props.state;find(p,n=>n.props?.className==='n-primary').props.onClick();p.render();const sheet=find(p,n=>n.props?.title&&n.props?.onClose);assert.ok(sheet);const d=harness(sheet.type,sheet.props);press(s.h,[byLabel(d,sheet.props.title).props.onKeyDown]);p.render();assert.equal(find(p,n=>n.props?.title&&n.props?.onClose),undefined);assert.equal(view(s.h),'phone');assert.equal(phone(s.h).props.state,state);press(s.h,[],{repeat:true});assert.equal(view(s.h),'phone');press(s.h);assert.equal(view(s.h),'desk');
});
check('active drag/resize cancels to its origin; a new press returns; Session 01 capture stays idempotent',()=>{
 for(const resize of [false,true]){const s=setup('#finder'),d=desktop(s.h);const origin={x:100,y:100,w:600,h:400},w={...d.props.manager.windows[0],bounds:origin};const actions=[];const host={current:{offsetWidth:1200,offsetHeight:800,getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800}),closest:()=>false,querySelector:()=>null}};const node=captureNode();const h=harness(Window,{w,isActive:true,host,size:{width:1200,height:800},enabled:true,reduced:true,action:(type,id,extra)=>actions.push({type,id,...extra}),dismiss(){}});h.render({},true);let focus=0;h.tree.props.ref.current.focus=()=>focus++;const get=()=>find(h,n=>n.props?.className===(resize?'window-resize resize-se':'window-title'));const e={button:0,pointerId:7,clientX:400,clientY:110,currentTarget:node,target:{closest:()=>false},preventDefault(){},stopPropagation(){}};get().props.onPointerDown(e);assert.equal(resize?node.held:focus,resize?true:1);get().props.onPointerMove({...e,clientX:460,clientY:165});assert.notEqual(h.tree.props.ref.current.style[resize?'width':'left'],resize?'600px':'100px');press(s.h,[h.tree.props.onKeyDown]);assert.equal(view(s.h),'laptop');assert.deepEqual(actions.at(-1).position,origin);get().props.onLostPointerCapture({pointerId:7});get().props.onPointerUp({pointerId:7});assert.equal(actions.length,1);press(s.h,[h.tree.props.onKeyDown],{repeat:true});assert.equal(view(s.h),'laptop');press(s.h,[h.tree.props.onKeyDown]);assert.equal(view(s.h),'desk');}
});
check('round trip retains app manager, min/max/bounds, mail, phone navigation and mounted surfaces',()=>{
 const s=setup('#finder');let d=desktop(s.h);d.props.open('mail');s.render();d=desktop(s.h);const size=d.props.size;for(const action of [{type:'move',id:'finder',position:{x:220,y:130}},{type:'minimize',id:'finder'},{type:'maximize',id:'mail'}])d.props.dispatch({...action,size});d.props.setMail(m=>({...m,draft:{...m.draft,details:'Keep typed text'}}));phone(s.h).props.dispatch({type:'tab',tab:'tasks'});s.render();const before=desktop(s.h).props,notch=phone(s.h).props.state;const host=find(s.h,n=>n.props?.className==='screen-host laptop-host').props.ref.current;host.scrollTop=137;
 press(s.h);s.render();desktop(s.h).props.navigate('laptop');s.render();s.settle();assert.equal(desktop(s.h).props.manager,before.manager);assert.equal(desktop(s.h).props.mail,before.mail);assert.equal(phone(s.h).props.state,notch);assert.equal(find(s.h,n=>n.props?.className==='screen-host laptop-host').props.ref.current,host);assert.equal(host.scrollTop,137);assert.equal(focuses.at(-1).label,'.mac-desktop');assert.equal(focuses.at(-1).options.preventScroll,true);
 desktop(s.h).props.navigate('phone');s.render();s.settle();assert.equal(focuses.at(-1).label,'.notch-demo');assert.equal(phone(s.h).props.state.tab,'tasks');
});
check('resume Escape retains paper/zoom/scroll without reprint, and return focuses the visible sheet',()=>{
 const s=setup('#paper');const el=paper(s.h).props.ref.current;el.scrollTop=53;press(s.h);s.render();assert.equal(el.scrollTop,53);assert.equal(scene(s.h).props.completedPage,false);desktop(s.h).props.navigate('paper');s.render();s.settle();assert.equal(paper(s.h).props.ref.current,el);assert.equal(el.scrollTop,53);assert.equal(focuses.at(-1).label,'Résumé sheet. Scroll to pan when zoomed.');byText(s.h,'Zoom in').props.onClick();s.render();const zoom=paper(s.h).props.style['--paper-zoom'];el.scrollTop=211;press(s.h);s.render();assert.equal(paper(s.h).props.style['--paper-zoom'],zoom);assert.equal(el.scrollTop,211);assert.equal(find(s.h,n=>n.props?.className==='printer-context'),undefined);
});
console.log(count+' passed, '+failures+' failed. Callback/state/focus-call mocks only; real keyboard/DOM/visual verification pending.');if(failures)process.exitCode=1;
`;
const output = path.join(root, ".vite/escape-navigation-test.mjs");
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
