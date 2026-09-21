// Actual component callbacks plus offline geometry/motion; no browser or live IO.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = `
import assert from 'node:assert/strict';
import * as T from 'three';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
import Prototype from './src/prototype/Prototype.jsx';
import Window from './src/prototype/WorkspaceWindow.jsx';
import MacDesktop from './src/prototype/MacDesktop.jsx';
import {Finder} from './src/prototype/apps/CareerApps.jsx';
import {initialWindows,windowReducer} from './src/prototype/windowState.js';
import {resolveRoute} from './src/prototype/workspaceState.js';
import {dockTarget,genieCorners,quadMatrix,stepGenie,paintGenie} from './src/prototype/genie.js';
import {FLOOR_Y,DESK,CHAIR,PRINTER} from './src/prototype/sceneScale.js';
import {PAPER_WIDTH,PAPER_HEIGHT,paperFeedPosition} from './src/prototype/paperGeometry.js';
import {maskPhone,occlusionPath} from './src/prototype/screenProjection.js';
import {PHONE,LAPTOP} from './src/prototype/deviceGeometry.js';
import hull from './src/prototype/assets/phone-hull.json';
import {keyboardKeys} from './src/prototype/keyboardLayout.js';
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const size={width:1200,height:750};
globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.location={hash:'',search:''};globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.window={};globalThis.history={pushState(){}};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};globalThis.document={activeElement:null};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join('');
const desktop=h=>find(h,n=>n.props?.manager&&n.props?.notchScreen);
const scene=h=>find(h,n=>n.props?.printMotion);
const event=(excluded=false)=>({button:0,clientX:100,clientY:100,pointerId:1,nativeEvent:{},target:{closest:()=>excluded},preventDefault(){},stopPropagation(){}});
check('Session 13 supersedes T05 auto-entry: ready waits, one confirmation arrives at desk',()=>{
 const h=harness(Prototype,{});h.flushEffects();h.render();assert.ok(find(h,n=>n.props?.className==='entry-layer'));assert.equal(desktop(h).props.manager.windows[0].initialSection,'about');
 for(const id of ['desk','workspace','phone','resources'])scene(h).props.onStageReady(id);h.render();h.flushEffects();h.render();assert.ok(find(h,n=>n.props?.className==='entry-layer'));
 scene(h).props.onStageReady('laptopModel');h.render();h.flushEffects();h.render();assert.ok(find(h,n=>n.props?.className==='entry-layer'));
 find(h,n=>n.props?.className==='entry-confirm').props.onClick(event());h.render();assert.equal(scene(h).props.entry.phase,'arriving');assert.equal(scene(h).props.view,'desk');
 scene(h).props.onArrivalComplete(scene(h).props.entry.token);h.render();assert.ok(!find(h,n=>n.props?.className==='arrival-shield'));assert.equal(scene(h).props.view,'desk');
 const e=event();h.tree.props.onPointerDownCapture(e);h.tree.props.onPointerDown(e);h.tree.props.onPointerUp(e);h.render();assert.equal(scene(h).props.view,'desk');
});
check('M3 loading failure reuses Simple view without duplicating or discarding the live desktop',()=>{
 const h=harness(Prototype,{});h.flushEffects();h.render();const initial=desktop(h),mail=initial.props.mail,ids=initial.props.manager.windows.map(w=>w.id);
 for(const id of ['workspace','desk','phone','resources'])scene(h).props.onStageReady(id);h.render();h.flushEffects();h.render();assert.ok(find(h,n=>n.props?.className==='entry-layer'));assert.equal(desktop(h).props.mail,mail);
 find(h,n=>typeof n.props?.onFailure==='function').props.onFailure();h.render();h.flushEffects();h.render();assert.ok(h.tree.props.className.includes('direct-view'));assert.ok(find(h,n=>n.props?.className==='entry-failure'));assert.equal(desktop(h).props.mail,mail);assert.deepEqual(desktop(h).props.manager.windows.map(w=>w.id),ids);assert.equal([...nodes(h.tree)].filter(n=>n.props?.manager&&n.props?.notchScreen).length,1);assert.ok(!scene(h));
});
check('T01/T05 menu, physical device and drag gestures are excluded; orbit controls moved to menu',()=>{
 for(const kind of ['control','object','drag']){
  const h=harness(Prototype,{});find(h,n=>n.props?.className==='entry-confirm').props.onClick();h.render();const e=event(kind==='control');h.tree.props.onPointerDownCapture(e);if(kind==='object')e.nativeEvent.sceneObject=true;h.tree.props.onPointerDown(e);if(kind==='drag')h.tree.props.onPointerMoveCapture({...e,buttons:1,clientX:180});h.tree.props.onPointerUp(e);h.render();assert.equal(scene(h).props.view,'desk',kind);
 }
 const h=harness(Prototype,{});find(h,n=>n.props?.className==='entry-confirm').props.onClick();h.render();assert.ok(!find(h,n=>n.props?.className==='object-hint'));assert.ok(!find(h,n=>n.props?.['aria-label']==='Orbit left'));
 find(h,n=>n.props?.['aria-label']==='Workspace navigation').props.onClick();h.render();const orbit=find(h,n=>n.props?.className==='orbit-controls');assert.ok(orbit);find(h,n=>n.props?.['aria-label']==='Orbit left').props.onClick();assert.ok(scene(h).props.orbit.current.yaw<0);
 find(h,n=>n.type==='button'&&text(n)==='Reset view').props.onClick();assert.equal(scene(h).props.orbit.current.yaw,0);
});
check('Session 13 explicit skip has no second gate; direct routes and accessibility retain exceptions',()=>{
 const h=harness(Prototype,{});find(h,n=>n.props?.className==='entry-confirm').props.onClick();h.render();h.tree.props.onKeyDownCapture({...event(),key:'Enter'});h.render();assert.equal(scene(h).props.view,'desk');
 for(const hash of ['#film','#portfolio','#notch','#animalfeed','#mail','#paper','#resume']){globalThis.location={hash,search:''};const h=harness(Prototype,{});assert.ok(!find(h,n=>n.props?.className==='entry-layer'));assert.ok(!find(h,n=>n.props?.className==='arrival-shield'));assert.equal(desktop(h).props.manager.windows.some(w=>w.id==='finder'),false);}
 globalThis.location={hash:'',search:'?simple'};let direct=harness(Prototype,{});assert.equal(scene(direct),undefined);assert.equal(desktop(direct).props.manager.windows.length,0);
 globalThis.location={hash:'',search:''};globalThis.matchMedia=()=>({matches:true});direct=harness(Prototype,{});assert.equal(scene(direct).props.view,'laptop');assert.ok(!find(direct,n=>n.props?.className==='arrival-shield'));globalThis.matchMedia=()=>({matches:false});
});
check('T06 Finder/About once per fresh mount; closing and device return never reseed it',()=>{
 const h=harness(Prototype,{});find(h,n=>n.props?.className==='entry-confirm').props.onClick();h.render();assert.equal(desktop(h).props.manager.windows.length,1);const w=desktop(h).props.manager.windows[0];assert.equal(w.id,'finder');assert.equal(w.initialSection,'about');const finder=harness(Finder,{initialSection:w.initialSection,open(){},onResume(){}});assert.equal(find(finder,n=>n.type==='button'&&text(n)==='About').props['aria-pressed'],true);find(finder,n=>n.type==='button'&&text(n)==='Work').props.onClick();finder.render();assert.equal(find(finder,n=>n.type==='button'&&text(n)==='Work').props['aria-pressed'],true);
 desktop(h).props.dispatch({type:'close',id:'finder',size});h.render();scene(h).props.onSelect('phone');h.render();scene(h).props.onSelect('laptop');h.render();assert.equal(desktop(h).props.manager.windows.length,0);
 for(const hash of ['#about','#projects','#film','#notch','#paper']){const r=resolveRoute(hash);const m=initialWindows(r,size,false);assert.deepEqual(m.windows.map(w=>w.id),r.app?[r.app]:[]);assert.ok(m.windows.every(w=>!w.initialSection));}
});
check('T08 every running app has its own dock target including Controls',()=>{
 const m=initialWindows(resolveRoute('#controls'),size,false);const h=harness(MacDesktop,{manager:m,size,host:{current:null},sound:{},open(){}});assert.ok(find(h,n=>n.props?.['data-dock']==='controls'));assert.equal(find(h,n=>n.props?.className==='dock-icon').type,'span');assert.equal([...nodes(h.tree)].filter(n=>n.props?.['data-dock']==='finder').length,1);
});
check('T08 dock target uses unprojected layout offsets, not global/viewport pixels',()=>{
 const dock={offsetLeft:600,offsetWidth:420,offsetTop:685,clientLeft:1,clientTop:1};const icon={offsetLeft:1,offsetTop:0,offsetWidth:39,offsetHeight:39};const button={offsetLeft:60,offsetTop:5,closest:()=>dock,querySelector:()=>icon};const host={querySelector:s=>s==='[data-dock="mail"]'?button:null,getBoundingClientRect(){throw Error('Projected coordinates forbidden');}};
 assert.deepEqual(dockTarget(host,'mail'),{x:452,y:691,w:39,h:39});assert.equal(dockTarget(host,'finder'),null);
});
check('T08 funnel keeps all four live corners registered at normal, moved and maximized bounds',()=>{
 for(const b of [{x:30,y:48,w:960,h:580},{x:-200,y:100,w:500,h:300},{x:0,y:28,w:1200,h:672}])for(const d of [{x:300,y:690,w:39,h:39},{x:750,y:690,w:39,h:39}])for(const p of [0,.2,.5,.8,1]){
  const q=genieCorners(b,d,p),m=quadMatrix(b.w,b.h,q);for(const [i,[x,y]] of [[0,[0,0]],[1,[b.w,0]],[2,[b.w,b.h]],[3,[0,b.h]]]){const w=m[3]*x+m[7]*y+m[15];assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/w-q[i][0])<1e-7);assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/w-q[i][1])<1e-7);}
  if(p===.5)assert.ok(q[1][0]-q[0][0]>q[2][0]-q[3][0]); // actual taper, not centered scale
  if(p===1)assert.deepEqual(q,[[d.x-b.x,d.y-b.y],[d.x+d.w-b.x,d.y-b.y],[d.x+d.w-b.x,d.y+d.h-b.y],[d.x-b.x,d.y+d.h-b.y]]);
 }
});
check('T08 critically damped reversal retains position and momentum and reaches both endpoints',()=>{
 let s={value:0,velocity:0};for(let i=0;i<12;i++)s=stepGenie(s,1,1/60);const before={...s};s=stepGenie(s,0,0);assert.equal(s.value,before.value);assert.equal(s.velocity,before.velocity);s=stepGenie(s,0,1/1000);assert.ok(Math.abs(s.value-before.value)<.01);for(let i=0;i<140;i++)s=stepGenie(s,0,1/60);assert.equal(s.value,0);assert.equal(s.done,true);for(let i=0;i<140;i++)s=stepGenie(s,1,1/60);assert.equal(s.value,1);
});
check('T08 component retains live content and scroll/draft through minimize, interruption and restore',()=>{
 let now=0,serial=0;const frames=new Map();globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};globalThis.cancelAnimationFrame=id=>frames.delete(id);const tick=()=>{now+=16;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
 const dock={offsetLeft:600,offsetWidth:420,offsetTop:685,clientLeft:1,clientTop:1},icon={offsetLeft:1,offsetTop:0,offsetWidth:39,offsetHeight:39},button={offsetLeft:60,offsetTop:5,closest:()=>dock,querySelector:()=>icon};const host={current:{querySelector:()=>button}};
 const mail={draft:{details:'Retain this draft'}},w={id:'mail',z:1,bounds:{x:100,y:100,w:600,h:400},minimized:false};const h=harness(Window,{w,size,host,reduced:false,enabled:true,mail,action(){},dismiss(){}});h.render({},true);const element=h.tree.props.ref.current;element.scrollTop=127;let focused=0;element.focus=()=>focused++;h.flushEffects();const content=()=>find(h,n=>n.props?.id==='mail'&&n.props?.onClose);
 h.render({w:{...w,minimized:true}},true);assert.equal(h.tree.props.inert,'');assert.notEqual(element.style.visibility,'hidden');assert.equal(content().props.mail,mail);assert.ok(!('display' in h.tree.props.style));for(let i=0;i<9;i++)tick();const before=element.style.transform;globalThis.document.activeElement={dataset:{dock:'mail'}};h.render({w},true);assert.equal(element.style.transform,before);for(let i=0;i<120;i++)tick();h.render();h.flushEffects();assert.equal(focused,1);globalThis.document.activeElement=null;assert.equal(element.style.transform,'');assert.equal(element.style.visibility,'visible');assert.equal(element.scrollTop,127);assert.equal(content().props.mail,mail);assert.equal([...nodes(h.tree)].filter(n=>n.props?.id==='mail'&&n.props?.onClose).length,1);
 h.render({w:{...w,minimized:true}},true);for(let i=0;i<120;i++)tick();assert.equal(element.style.visibility,'hidden');assert.equal(content().props.mail,mail);h.render({w,reduced:true},true);assert.equal(element.style.visibility,'visible');assert.equal(element.style.transform,'');assert.equal(frames.size,0);globalThis.innerWidth=799;h.render({w:{...w,minimized:true},reduced:false},true);assert.equal(element.style.visibility,'hidden');assert.equal(frames.size,0);h.render({w},true);assert.equal(element.style.visibility,'visible');globalThis.innerWidth=1440;
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
});
check('T03/T13 scale provides seat clearance, Letter paper and aligned feed at both edges',()=>{
 const unitCm=11.5;assert.ok(-FLOOR_Y*unitCm>70&&-FLOOR_Y*unitCm<76);assert.ok(CHAIR.seatWidth>3&&CHAIR.seatWidth<4.5);assert.ok(FLOOR_Y+CHAIR.seatHeight+CHAIR.seatThickness/2 < -DESK.thickness-1.5);assert.ok(PAPER_WIDTH<PRINTER.slotWidth*PRINTER.scale);assert.ok(Math.abs(PAPER_HEIGHT/PAPER_WIDTH-11/8.5)<1e-9);
 const axis=new T.Vector3(Math.sin(PRINTER.rotation),0,Math.cos(PRINTER.rotation)),slot=new T.Vector3(...PRINTER.position).addScaledVector(axis,PRINTER.slotZ*PRINTER.scale);slot.y+=PRINTER.sheetY*PRINTER.scale;
 for(const [p,edge] of [[0,1],[1,-1]]){const center=new T.Vector3(...paperFeedPosition(p));assert.ok(center.addScaledVector(axis,edge*PAPER_HEIGHT/2).distanceTo(slot)<1e-9);}
});
check('T10 key atlas layout has six non-overlapping rows, letters, modifiers and arrows',()=>{
 for(const key of ['A','Z','Q','M','esc','return','⌘','space','←','→','↑','↓'])assert.ok(keyboardKeys.some(k=>k.label===key),key);
 const rows=[...new Set(keyboardKeys.map(k=>k.z))];assert.equal(rows.length,6);for(const z of rows){const row=keyboardKeys.filter(k=>k.z===z).sort((a,b)=>a.x-b.x);for(let i=1;i<row.length;i++)assert.ok(row[i-1].x+row[i-1].w/2<row[i].x-row[i].w/2);}
});
check('T11 measured body silhouette follows phone pose while approved aperture remains fixed',()=>{
 assert.equal(PHONE.width,.6165377);assert.equal(PHONE.height,1.3323075);assert.ok(hull.length>100);const box=new T.Box3().setFromPoints(hull.map(p=>new T.Vector3(...p))),extent=box.getSize(new T.Vector3());assert.ok(Math.abs(extent.y-1.38)<1e-6);assert.ok(extent.x>PHONE.width&&extent.x<.68);
 const camera=new T.PerspectiveCamera(39,1.6,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();const rear=new T.Object3D(),phone=new T.Object3D(),el={style:{}},pixels={width:1200,height:750};phone.position.z=1;
 maskPhone(el,phone,camera,pixels,rear,pixels);assert.equal(el.style.clipPath,occlusionPath(phone,hull,camera,rear,[LAPTOP.width,LAPTOP.height],pixels));const first=el.style.clipPath;maskPhone(el,phone,camera,pixels,rear,pixels);assert.equal(el.style.clipPath,first);phone.rotation.y=.4;maskPhone(el,phone,camera,pixels,rear,pixels);assert.notEqual(el.style.clipPath,first);phone.position.x=10;maskPhone(el,phone,camera,pixels,rear,pixels);assert.equal(el.style.clipPath,'none');phone.position.set(0,0,-1);maskPhone(el,phone,camera,pixels,rear,pixels);assert.equal(el.style.clipPath,'none');
});
console.log(count+' third-recording source/callback/math cases passed. No post-fix visual evidence.');
`;
const output = path.join(root, ".vite/third-walkthrough-test.mjs");
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
