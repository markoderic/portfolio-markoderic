// Actual component callbacks and geometry/state checks in Node, never a browser.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = `
import assert from 'node:assert/strict';
import * as T from 'three';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
import Prototype from './src/prototype/Prototype.jsx';
import Chart from './src/prototype/charts/LineChart.jsx';
import Notch from './src/prototype/notch/NotchDemo.jsx';
import {seedDemo,demoReducer} from './src/prototype/notch/demoState.js';
import {advancePrintJob,printTimeline,paperState} from './src/prototype/sceneInteraction.js';
import {PHONE,LAPTOP,phoneLogicalHeight,phoneAspect} from './src/prototype/deviceGeometry.js';
let count=0;const check=(name,fn)=>{if(process.argv.includes('--paper-only')&&!/reprint|S06/.test(name))return;fn();count++;console.log('PASS '+name);};
globalThis.document={activeElement:null};globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.location={hash:'#laptop',search:''};globalThis.matchMedia=()=>({matches:false});globalThis.localStorage={getItem:()=>null};globalThis.window={};globalThis.history={pushState(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const textOf=n=>typeof n==='string'?n:typeof n==='number'?String(n):(n?.props?.children||[]).map(textOf).join('');
check('S01 internal device and application routes retain the full private pathname',()=>{
 let url=new URL('http://127.0.0.1:5175/prototype.html#laptop');globalThis.history={pushState:(_,__,next)=>{url=new URL(next,url);assert.equal(url.pathname,'/prototype.html');}};
 const h=harness(Prototype,{});for(const view of ['desk','phone','laptop']){find(h,n=>n.props?.printMotion).props.onSelect(view);h.render();assert.equal(url.hash,'#'+view);}
 find(h,n=>n.props?.manager&&n.props?.notchScreen).props.open('youtube');h.render();assert.equal(url.hash,'#youtube');
 globalThis.history={pushState(){}};
});
check('S02 one accessible confirmation skips pending loading; terminal and alternate access remain',()=>{
 globalThis.location={hash:'',search:''};const h=harness(Prototype,{});const terminal=find(h,n=>n.props?.className==='entry-terminal');const all=[...nodes(terminal)];assert.equal(all.filter(n=>n.props?.stages).length,1);assert.equal(all.filter(n=>n.type==='button'&&n.props?.['data-entry-confirm']).length,1);assert.ok(all.some(n=>textOf(n)==='Simple view'));const confirm=all.find(n=>n.type==='button'&&n.props?.['data-entry-confirm']);assert.equal(confirm.props.disabled,undefined);assert.ok(textOf(confirm).includes('Skip loading'));confirm.props.onClick();h.render();assert.ok(!find(h,n=>n.props?.className==='entry-layer'));assert.ok(find(h,n=>n.props?.className==='entry-pending'));
});
check('S06 discard starts the same physical disposal once; navigation cancels without new print',()=>{
 globalThis.location={hash:'#paper',search:''};let writes=0;globalThis.history={pushState:()=>writes++};const h=harness(Prototype,{});const discard=find(h,n=>n.type==='button'&&textOf(n)==='Discard paper');discard.props.onClick();discard.props.onClick();h.render();assert.equal(writes,1);const scene=()=>find(h,n=>n.props?.printMotion);assert.equal(scene().props.printMotion.current.phase,'crumple');scene().props.onSelect('desk');h.render();assert.equal(scene().props.printMotion.current.phase,'idle');assert.equal(writes,2);globalThis.history={pushState(){}};
});
check('S06 discard timeline completes at 1000 ms without feed; subsequent resume state requires printing',()=>{
 const job={replace:true,discardOnly:true,startedAt:100};for(const ms of [100,299,300,1099])assert.ok(['crumple','toss'].includes(advancePrintJob(job,ms,false).phase));assert.equal(advancePrintJob(job,1100,false).phase,'complete');assert.equal(printTimeline(0,true,true,true).phase,'complete');
 let page={completed:true,printing:false,progress:1};page=paperState(page,'start');page=paperState(page,'disposed');page=paperState(page,'cancel');assert.equal(page.completed,false);assert.equal(page.printing,false);page=paperState(page,'start');assert.equal(page.printing,true);page=paperState(page,'complete');assert.equal(page.completed,true);
});
check('S07 physical phone aspect and fixed logical app viewport survive window sizes',()=>{
 for(const [width,height] of [[320,640],[800,600],[1440,900],[1920,1080],[568,300],[100,480]]){globalThis.innerWidth=width;globalThis.innerHeight=height;globalThis.location={hash:'#phone',search:''};const h=harness(Prototype,{});const host=find(h,n=>n.props?.className==='screen-host phone-host'),logical=find(h,n=>n.props?.className==='phone-logical-viewport');assert.ok(Math.abs(host.props.style.width/host.props.style.height-phoneAspect)<1e-9);assert.ok(host.props.style.width<=width-24);assert.ok(host.props.style.height<=height-95);assert.equal(host.props.style.borderRadius,0);assert.ok(host.props.style.clipPath.startsWith("polygon("));assert.equal(logical.props.style.width,430);assert.equal(logical.props.style.height,phoneLogicalHeight);assert.ok(PHONE.outline.length>100);}
 for(const mode of ['simple','reduced']){globalThis.innerWidth=1024;globalThis.innerHeight=600;globalThis.location={hash:'#phone',search:mode==='simple'?'?simple':''};globalThis.matchMedia=()=>({matches:mode==='reduced'});const h=harness(Prototype,{}),host=find(h,n=>n.props?.className==='screen-host phone-host');assert.ok(h.tree.props.className.includes('direct-view'));assert.equal(host.props['data-enabled'],true);assert.ok(host.props.style.height<=505);assert.equal(host.props.style.borderRadius,0);assert.ok(host.props.style.clipPath.startsWith('polygon('));}
 globalThis.matchMedia=()=>({matches:false});globalThis.location={hash:'#phone',search:''};globalThis.innerWidth=1440;globalThis.innerHeight=900;
});
check('B15 phone host, demo state, scroll ref and draft survive pickup, laptop switch, return and wake',()=>{
 globalThis.location={hash:'#phone',search:''};globalThis.innerWidth=1440;globalThis.innerHeight=900;
 const h=harness(Prototype,{}),phone=()=>find(h,n=>n.type===Notch),host=()=>find(h,n=>n.props?.className==='screen-host phone-host'),scene=()=>find(h,n=>n.props?.printMotion);
 phone().props.dispatch({type:'tab',tab:'reminders'});h.render();scene().props.onSettled('phone');h.render();const state=phone().props.state,ref=host().props.ref;
 const demo=harness(Notch,phone().props);demo.flushEffects();demo.render();const scroll=find(demo,n=>n.props?.className==='n-scroll').props.ref;scroll.current={scrollTop:173,scrollTo(){this.scrollTop=0}};
 find(demo,n=>n.props?.['aria-label']==='Capture reminder').props.onChange({target:{value:'Keep this local draft'}});demo.render();
 for(const view of ['laptop','phone','desk','phone']){
  scene().props.onSelect(view);h.render();scene().props.onSettled(view);h.render();assert.equal(phone().props.state,state);assert.equal(host().props.ref,ref);assert.equal(host().props['data-awake'],view==='phone');assert.equal(host().props['data-enabled'],view==='phone');assert.equal([...nodes(h.tree)].filter(n=>n.type===Notch).length,1);assert.equal(phone().props.key,undefined);
  demo.render(phone().props);demo.flushEffects();demo.render();assert.equal(find(demo,n=>n.props?.className==='n-scroll').props.ref,scroll);assert.equal(scroll.current.scrollTop,173);assert.equal(find(demo,n=>n.props?.['aria-label']==='Capture reminder').props.value,'Keep this local draft');
 }
});
check('S08 released Reminders home counts and lists open editable existing sample records',()=>{
 let state=seedDemo('2026-09-17');state={...state,tab:'reminders'};const h=harness(Notch,{state,enabled:true,dispatch:a=>{state=demoReducer(state,a);}});
 const counts=find(h,n=>n.props?.className==='n-reminder-counts');const all=[...nodes(counts)].find(n=>n.type==='button'&&textOf(n).endsWith('All'));assert.equal(Number(textOf(all).replace('All','')),state.reminders.filter(r=>!r.completed).length);all.props.onClick();h.render();assert.ok(find(h,n=>n.props?.title==='All'));
 const capture=find(h,n=>n.props?.className==='n-capture');find(h,n=>n.props?.['aria-label']==='Capture reminder').props.onChange({target:{value:'Example reminder'}});h.render();find(h,n=>n.props?.className==='n-capture').props.onSubmit({preventDefault(){}});h.render();assert.equal(find(h,n=>n.props?.sheet?.collection==='reminders').props.sheet.value.title,'Example reminder');
});
check('S08 native tab navigation preserves the same shared mutable demo state',()=>{
 let state=seedDemo('2026-09-17');const h=harness(Notch,{state,enabled:true,dispatch:a=>{state=demoReducer(state,a);}});for(const tab of ['Finance','School','Reminders','Dashboard']){find(h,n=>n.type==='button'&&textOf(n)===tab).props.onClick();h.render({state});assert.equal(state.tab,tab.toLowerCase());}assert.equal(state.tasks.length,seedDemo('2026-09-17').tasks.length);
});
const props={rows:[{date:'2026-09-01',value:5},{date:'2026-09-10',value:null},{date:'2026-09-20',value:-3}],metrics:[{key:'value',label:'Fixture'}],title:'Sparse fixture',provenance:'Synthetic test'};
check('S11 pointer guide follows between sparse points without inventing metric values',()=>{
 const h=harness(Chart,props),svg=()=>find(h,n=>n.type==='svg');svg().props.onPointerMove({clientX:240,clientY:100,currentTarget:{getBoundingClientRect:()=>({left:0,width:600})}});h.render();assert.equal(find(h,n=>n.props?.className==='chart-guide').props.d,'M240,16V192');assert.match(svg().props['aria-valuetext'],/2026-09-10 · No observation/);assert.ok(!find(h,n=>n.type==='input'&&n.props.type==='range'));
});
check('S11 keyboard Arrow/Home/End exposes exact observations and clamps endpoints',()=>{
 const h=harness(Chart,props),svg=()=>find(h,n=>n.type==='svg');let prevented=0;const key=k=>{svg().props.onKeyDown({key:k,preventDefault(){prevented++;},stopPropagation(){}});h.render();};
 key('End');assert.equal(svg().props['aria-valuenow'],2);assert.match(svg().props['aria-valuetext'],/-3 Fixture/);key('ArrowRight');assert.equal(svg().props['aria-valuenow'],2);key('ArrowLeft');assert.match(svg().props['aria-valuetext'],/No observation/);key('Home');assert.equal(svg().props['aria-valuenow'],0);key('ArrowDown');assert.equal(svg().props['aria-valuenow'],0);key('ArrowUp');assert.equal(svg().props['aria-valuenow'],1);key('Tab');assert.equal(prevented,6);assert.equal(svg().props.tabIndex,0);assert.ok(find(h,n=>n.type==='table'));
});
check('S11 scaled SVG pointer mapping uses its inverse screen transform; pointer down also focuses',()=>{
 const h=harness(Chart,props);let inverse=false,focused=false;const svg=()=>find(h,n=>n.type==='svg');const node={getScreenCTM:()=>({inverse(){inverse=true;return {};}}),createSVGPoint:()=>({matrixTransform(){return {x:321};}}),focus(){focused=true;}};svg().props.onPointerMove({clientX:962,clientY:300,currentTarget:node});svg().props.onPointerDown({currentTarget:node});h.render();assert.ok(inverse&&focused);assert.equal(find(h,n=>n.props?.className==='chart-guide').props.d,'M321,16V192');
});
// Physical aperture containment now measured against the loaded GLB in verify-laptop-asset.mjs.
check('S16 shared 16:10 screen reference retains a forward-facing orthonormal frame',()=>{assert.equal(LAPTOP.width/LAPTOP.height,1.6);const rotation=new T.Euler(...LAPTOP.screenRotation),normal=new T.Vector3(0,0,1).applyEuler(rotation),up=new T.Vector3(0,1,0).applyEuler(rotation);assert.ok(normal.z>0&&normal.y>0);assert.ok(Math.abs(normal.dot(up))<1e-10);assert.ok(Math.abs(normal.length()-1)<1e-10);});
console.log(count+' second-walkthrough callback/state cases passed. No browser, CSS layout, touch hardware or visual verification.');
`;
const output = path.join(root, ".vite/second-walkthrough-test.mjs");
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
