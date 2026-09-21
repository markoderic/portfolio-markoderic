// Local math, component-callback and state checks. No browser, visual proof or live IO.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = `
import assert from 'node:assert/strict';
import * as T from 'three';
import {harness,find,captureNode} from './scripts/support/hook-harness.js';
import Mail from './src/prototype/apps/MailComposer.jsx';
import Window from './src/prototype/WorkspaceWindow.jsx';
import Icon from './src/prototype/DesktopIcon.jsx';
import Prototype from './src/prototype/Prototype.jsx';
import {emptyDraft,meetingDraft} from './src/prototype/apps/mailState.js';
import {windowReducer,resizeBounds,unprojectPoint} from './src/prototype/windowState.js';
import {advancePrintJob,printTimeline,paperState,trackpadTarget} from './src/prototype/sceneInteraction.js';
import {occlusionPath,projectScreen,maskPaper,convexHull} from './src/prototype/screenProjection.js';
let count=0;const check=(name,fn)=>{if(process.argv.includes('--paper-only')&&!/reprint|S06/.test(name))return;fn();count++;console.log('PASS '+name);};
globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.location={hash:'#laptop',search:''};globalThis.matchMedia=()=>({matches:false});globalThis.localStorage={getItem:()=>null};globalThis.sessionStorage={getItem:()=>null};globalThis.window={};globalThis.history={pushState(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.getComputedStyle=()=>({transform:'none'});
check('lamp and desktop appearance independent; window and Notch state retained',()=>{
 const h=harness(Prototype,{});const desktop=()=>find(h,n=>n.props?.manager&&n.props?.notchScreen);const scene=()=>find(h,n=>n.props?.printMotion&&n.props?.onLamp);
 desktop().props.dispatch({type:'open',id:'mail',size:{width:1000,height:650}});h.render();const manager=desktop().props.manager;
 const notch=()=>find(h,n=>n.props?.state?.today);const state=notch().props.state;
 scene().props.onLamp();h.render();assert.equal(scene().props.night,true);assert.equal(desktop().props.night,false);assert.equal(desktop().props.manager,manager);assert.equal(notch().props.state,state);
 desktop().props.onLamp();h.render();assert.equal(scene().props.night,true);assert.equal(desktop().props.night,true);assert.equal(desktop().props.manager,manager);
});
check('base and desk refresh repeat entry despite old cache; deep links and accessibility exceptions bypass',()=>{
 for(const cache of [null,'yes']) for(const hash of ['', '#desk']) {
  globalThis.sessionStorage={getItem:()=>cache};globalThis.location={hash,search:''};const h=harness(Prototype,{});
  assert.ok(find(h,n=>n.props?.className==='entry-layer'));
  const start=find(h,n=>n.type==='button'&&n.props?.['data-entry-confirm']);assert.ok(!start.props.disabled);assert.ok(start.props.children.includes('Skip loading'));start.props.onClick();h.render();assert.ok(!find(h,n=>n.props?.className==='entry-layer'));
 }
 for(const hash of ['#resume','#paper','#film','#portfolio','#notch','#animalfeed','#mail','#phone','#laptop']){
  globalThis.location={hash,search:''};const h=harness(Prototype,{});assert.ok(!find(h,n=>n.props?.className==='entry-layer'),hash);
 }
 globalThis.location={hash:'#desk',search:'?simple'};assert.ok(!find(harness(Prototype,{}),n=>n.props?.className==='entry-layer'));
 globalThis.location={hash:'',search:''};globalThis.matchMedia=()=>({matches:true});assert.ok(!find(harness(Prototype,{}),n=>n.props?.className==='entry-layer'));globalThis.matchMedia=()=>({matches:false});globalThis.sessionStorage={getItem:()=>null};
});
check('real milestone callbacks govern readiness; cold failure stays visible before and after skip',()=>{
 globalThis.location={hash:'',search:''};const h=harness(Prototype,{});
 const boot=()=>find(h,n=>n.props?.stages);const scene=()=>find(h,n=>n.props?.printMotion);const desktop=()=>find(h,n=>n.props?.manager&&n.props?.notchScreen);
 assert.deepEqual(boot().props.stages,{});desktop().props.onStageReady('laptop');h.render();assert.deepEqual(boot().props.stages,{laptop:true});
 for(const id of ['desk','phone','resources'])scene().props.onStageReady(id);h.render();assert.equal(Object.keys(boot().props.stages).length,4);
 const stages=boot().props.stages;scene().props.onStageReady('phone');h.render();assert.equal(boot().props.stages,stages);
 find(h,n=>n.props?.onFailure).props.onFailure();h.render();assert.ok(find(h,n=>n.props?.className==='entry-layer'));assert.equal(boot().props.failed,true);
 find(h,n=>n.type==='button'&&n.props?.['data-entry-confirm']).props.onClick();h.render();assert.ok(find(h,n=>n.props?.className==='entry-failure'));assert.ok(!find(h,n=>n.props?.className==='entry-layer'));
});
check('rapid reprint requests cannot start duplicate jobs',()=>{
 let h;
 globalThis.location={hash:'#paper',search:''};let calls=0;globalThis.history={pushState:()=>calls++};h=harness(Prototype,{});const reprint=find(h,n=>n.type==='button'&&n.props.children.includes('Reprint'));reprint.props.onClick();reprint.props.onClick();h.render();assert.equal(calls,1);assert.equal(find(h,n=>n.props?.printMotion).props.printMotion.current.phase,'crumple');
 const scene=find(h,n=>n.props?.printMotion);scene.props.onResume();assert.equal(calls,1);globalThis.location={hash:'#laptop',search:''};
});
check('Mail cancel preserves content; confirmed discard empties and closes exactly once',()=>{
 let mail={draft:{...emptyDraft(),name:'Fixture',email:'fixture@example.test',subject:'Hello',details:'Retain me'},sending:false,status:''},closed=0;
 const h=harness(Mail,{mail,setMail:fn=>{mail=fn(mail);},onClose:()=>closed++,sendMail:()=>{throw Error('No send');}});
 const button=text=>find(h,n=>n.type==='button'&&n.props.children.includes(text));
 button('Discard draft').props.onClick();h.render();button('Keep writing').props.onClick();h.render();assert.equal(mail.draft.details,'Retain me');assert.equal(closed,0);
 button('Discard draft').props.onClick();h.render();button('Discard').props.onClick();assert.deepEqual(mail.draft,emptyDraft());assert.equal(closed,1);
});
check('eight resize directions preserve opposite edges and enforce minimums',()=>{
 const s={x:100,y:100,w:600,h:400},v={width:1200,height:800};
 for(const edge of ['n','s','e','w','ne','nw','se','sw']){
  const b=resizeBounds(s,edge,35,25,v);
  if(edge.includes('w'))assert.equal(b.x+b.w,s.x+s.w);else assert.equal(b.x,s.x);
  if(edge.includes('n'))assert.equal(b.y+b.h,s.y+s.h);else assert.equal(b.y,s.y);
  assert.ok(b.w>=360&&b.h>=240);
 }
 assert.equal(resizeBounds(s,'se',-500,-500,v).w,360);assert.equal(resizeBounds(s,'se',-500,-500,v).h,240);
 const small=resizeBounds({x:0,y:28,w:300,h:160},'se',900,900,{width:300,height:238});assert.deepEqual(small,{x:0,y:28,w:300,h:139});
});
check('resize pointer tracks direct pixels, cancel restores original, release persists max/restore',()=>{
 const size={width:1200,height:800},bounds={x:100,y:100,w:600,h:400};let state={windows:[{id:'mail',bounds,z:1}],serial:1,active:'mail'};
 const host={current:{offsetWidth:1200,offsetHeight:800,getBoundingClientRect:()=>({left:20,top:10,width:600,height:400})}};
 const h=harness(Window,{w:state.windows[0],size,host,isActive:true,enabled:true,reduced:true,dismiss:()=>{},action:(type,id,extra)=>{state=windowReducer(state,{type,id,size,...extra});}});h.render({},true);
 const handle=()=>find(h,n=>n.props?.className==='window-resize resize-se');const node=captureNode();const event=(x,y)=>({button:0,pointerId:7,clientX:20+x/2,clientY:10+y/2,currentTarget:node,preventDefault(){},stopPropagation(){}});
 handle().props.onPointerDown(event(698,498));handle().props.onPointerMove(event(738,528));const section=find(h,n=>n.type==='section');assert.equal(section.props.ref.current.style.width,'640px');assert.equal(section.props.ref.current.style.height,'430px');
 handle().props.onPointerCancel();assert.deepEqual(state.windows[0].bounds,bounds);
 handle().props.onPointerDown(event(698,498));handle().props.onPointerMove(event(738,528));handle().props.onPointerUp();assert.equal(state.windows[0].bounds.w,640);
 state=windowReducer(state,{type:'maximize',id:'mail',size});state=windowReducer(state,{type:'maximize',id:'mail',size});assert.equal(state.windows[0].bounds.w,640);
});
check('desktop leaf delegates gestures; click and keyboard routes retained; group owner covered by Session53',()=>{
 // Actual parent/group drag, touch, cancellation and audio composition are exercised
 // by verify-session53-group-drag and verify-desktop-pair-react, not a leaf owner mock.
 let sound=0,launch=0,starts=0,keyMove=0,blocked=false;
 const h=harness(Icon,{id:'preview',position:{x:100,y:100},selected:false,select:()=>{},activate:()=>sound++,launch:()=>launch++,
  begin:(id,e)=>{assert.equal(id,'preview');starts++;},keyboardMove:(id,key)=>{assert.equal(id,'preview');assert.equal(key,'ArrowLeft');keyMove++;},
  suppress:e=>{if(blocked){e.preventDefault();return true;}return false;}});
 h.tree.props.onClick({detail:1});h.tree.props.onClick({detail:2});h.tree.props.onDoubleClick({});assert.equal(sound,1);assert.equal(launch,1);
 h.tree.props.onClick({detail:0});assert.equal(sound,2);assert.equal(launch,2);
 h.tree.props.onPointerDown({button:0});assert.equal(starts,1);assert.equal(h.tree.props.onPointerMove,undefined);
 blocked=true;let prevented=0;h.tree.props.onClick({detail:1,shiftKey:true,preventDefault(){prevented++;}});h.tree.props.onDoubleClick({preventDefault(){prevented++;}});assert.equal(prevented,2);assert.equal(sound,2);assert.equal(launch,2);
 h.tree.props.onKeyDown({altKey:true,key:'ArrowLeft',preventDefault(){}});assert.equal(keyMove,1);
 assert.equal(trackpadTarget({closest:s=>s==='.mac-desktop'?true:s.startsWith('.phone-host')?true:true}),false);
});
check('reprint has ordered disposal then feed; reduced mode is immediate',()=>{
 const job={replace:true};assert.equal(advancePrintJob(job,100,false),null);assert.equal(advancePrintJob(job,300,true).phase,'crumple');assert.equal(advancePrintJob(job,1400,false).phase,'feed');assert.equal(advancePrintJob(job,3400,true).phase,'complete');assert.equal(job.startedAt,300);
 for(const [ms,phase] of [[0,'crumple'],[199,'crumple'],[200,'toss'],[999,'toss'],[1000,'feed'],[2999,'feed'],[3000,'complete']])assert.equal(printTimeline(ms,true).phase,phase);
 assert.equal(printTimeline(0,false).phase,'feed');assert.equal(printTimeline(2000,false).phase,'complete');assert.equal(printTimeline(0,true,true).phase,'complete');
 let p={printing:false,completed:true,progress:1};assert.equal(paperState(p,'open').completed,true);p=paperState(p,'start');assert.equal(p.completed,true);p=paperState(p,'disposed');assert.equal(p.completed,false);assert.equal(paperState(p,'cancel').progress,0);assert.equal(paperState(p,'complete').completed,true);
});
check('occlusion uses actual local silhouette; rear/invisible/outside surfaces do not erase desktop',()=>{
 const camera=new T.PerspectiveCamera(39,1.6,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();const rear=new T.Object3D(),front=new T.Object3D();front.position.z=1;
 const outline=[[-.2,-.2],[.2,-.2],[.2,.2],[-.2,.2]],pixels={width:1000,height:625};const cut=occlusionPath(front,outline,camera,rear,[2,1.25],pixels);
 assert.match(cut,/375.000 187.500/);assert.match(cut,/625.000 437.500/);
 front.position.z=-1;assert.equal(occlusionPath(front,outline,camera,rear,[2,1.25],pixels),'none');front.position.set(10,0,1);assert.equal(occlusionPath(front,outline,camera,rear,[2,1.25],pixels),'none');front.visible=false;assert.equal(occlusionPath(front,outline,camera,rear,[2,1.25],pixels),'none');
 assert.equal(convexHull([[0,0],[1,0],[1,1],[0,1],[.5,.5]]).length,4);
});
check('projective pointer registration across layout resize and common browser zoom',()=>{
 for(const width of [640,800,1024,1440,1920])for(const zoom of [.8,1,1.25,2]){
  const height=width*.625,camera=new T.PerspectiveCamera(39,width/height,.1,100);camera.position.set(3,2,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();const plane=new T.Object3D(),el={style:{}};projectScreen(el,plane,camera,{width,height},[2.91,1.819],{width:1000,height:625});const m=el.style.transform.slice(9,-1).split(',').map(Number);
  const p=new T.Vector4(370,225,0,1).applyMatrix4(new T.Matrix4().fromArray(m));const visible={x:p.x/p.w*zoom-32,y:p.y/p.w*zoom-14};const local=unprojectPoint(m,(visible.x+32)/zoom,(visible.y+14)/zoom);assert.ok(Math.abs(local.x-370)<1e-8&&Math.abs(local.y-225)<1e-8);
 }
});
check('calendar notes preserved as preferences without fabricating availability',()=>{const d=meetingDraft(emptyDraft(),{date:'2026-10-01',time:'10:00',timezone:'UTC',notes:'Discuss design'});assert.match(d.details,/Notes: Discuss design/);assert.match(d.details,/not confirmed availability/);});
console.log(count+' callback/math cases passed; post-fix browser/input/audio verification remains pending.');
`;
const output = path.join(root, ".vite/recorded-walkthrough-test.mjs");
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
