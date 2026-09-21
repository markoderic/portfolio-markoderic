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
import * as T from 'three';
import Controls from './src/prototype/PaperTossControls.jsx';
import {createPaperToss,pullAim} from './src/prototype/paperToss.js';
import {deskPose} from './src/prototype/deskCamera.js';
import Prototype from './src/prototype/Prototype.jsx';
import {AudioMock} from './scripts/support/fan-audio-mock.mjs';
import {fanHandlers} from './src/prototype/fanInput.js';
import MacDesktop from './src/prototype/MacDesktop.jsx';
import Window from './src/prototype/WorkspaceWindow.jsx';
import Calendar from './src/prototype/apps/CalendarPanel.jsx';
import Code from './src/prototype/apps/CodeWorkspace.jsx';
import Mail from './src/prototype/apps/MailComposer.jsx';
import Notch from './src/prototype/notch/NotchDemo.jsx';
let count=0,failures=0;
const check=async(name,fn)=>{try{await fn();count++;console.log('PASS '+name);}catch(e){failures++;console.log('FAIL '+name+'\n'+e.stack);}};
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


const dispose=h=>h.slots.forEach(s=>s.cleanup?.());
const e=(extra={})=>({pointerId:1,pointerType:'mouse',isPrimary:true,button:0,clientX:100,clientY:100,detail:1,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra});
function controls(){const game=createPaperToss(),world=new T.Scene(),size={width:1440,height:900},camera=new T.PerspectiveCamera(39,1.6,.1,100),pose=deskPose(size);camera.position.copy(pose.position);camera.lookAt(pose.look);camera.updateMatrixWorld();game.available=true;game.enter();const input={pressing:false};game.releaseInput=()=>{input.pressing=false;};const frame={dt:0,time:0,camera,size,scene:world,eligible:true,settled:true};game.frame(frame);let exits=0;const h=harness(Controls,{game,onExit:()=>{exits++;game.exit();}});h.flushEffects();const pad=()=>byLabel(h,'Mouse or pen: pull back and release'),node=captureNode(),event=patch=>e({currentTarget:node,...patch});const render=()=>h.render();return {game,h,pad,node,event,frame,render,camera,input,dispose:()=>{dispose(h);game.dispose();},exits:()=>exits};}
await check('Mounted aim pad uses projection, consumes one release, cancels invalid/captured/secondary/resize paths',()=>{
 const s=controls(),{game,h,pad,node,event}=s;let valid;for(let x=-60;x<=60&&!valid;x+=4)for(let y=-60;y<=60;y+=4)if(pullAim(s.camera,s.frame.size,x,y)){valid={x,y};break;}assert.ok(valid);const down=()=>{s.input.pressing=true;pad().props.onPointerDown(event());};const move=()=>pad().props.onPointerMove(event({clientX:100+valid.x,clientY:100+valid.y}));const up=()=>pad().props.onPointerUp(event({clientX:100+valid.x,clientY:100+valid.y}));
 for(const bad of [{button:2},{isPrimary:false},{pointerType:'touch'},{pointerId:NaN}]){pad().props.onPointerDown(event(bad));assert.equal(node.held,false);assert.equal(game.phase,'ready');}
 down();assert.equal(node.held,true);pad().props.onPointerUp(event({pointerId:2}));assert.equal(game.phase,'aiming');move();up();assert.equal(game.phase,'flight');assert.equal(node.held,false);assert.equal(s.input.pressing,false);assert.equal(game.id,1);up();assert.equal(game.id,1);const click=event();pad().props.onClick(click);assert.ok(click.defaultPrevented);const fresh=event();pad().props.onClick(fresh);assert.equal(fresh.defaultPrevented,false);
 game.cancel();game.frame(s.frame);s.render();down();pad().props.onPointerCancel(event());assert.equal(game.phase,'ready');assert.equal(node.held,false);
 down();pad().props.onLostPointerCapture(event());assert.equal(game.phase,'ready');down();pad().props.onPointerUp(event());assert.equal(game.id,1);assert.equal(game.phase,'ready');
 down();pad().props.onPointerMove(event({clientX:NaN}));assert.equal(game.phase,'ready');down();s.camera.position.x+=.1;s.camera.updateMatrixWorld();move();assert.equal(node.held,false);assert.equal(game.phase,'ready');
 down();game.frame({...s.frame,size:{width:900,height:700},settled:false});assert.equal(node.held,false);assert.equal(game.phase,'entering');assert.equal(game.throw(),false);s.dispose();
});
await check('Native-control callbacks, local Escape, held-key/IME guards, next/exit and resolved cancellation',()=>{
 const s=controls();byLabel(s.h,'Throw direction').props.onChange({target:{value:'-7'}});byLabel(s.h,'Throw power').props.onChange({target:{value:'56'}});assert.equal(s.game.heading,-7);assert.equal(s.game.power,56);s.render();const esc=key();s.h.tree.props.onKeyDown(esc);assert.ok(esc.defaultPrevented&&esc.stopped);assert.equal(s.game.phase,'ready');assert.equal(s.game.heading,-8);
 for(const extra of [{repeat:true},{isComposing:true},{nativeEvent:{isComposing:true}}]){const k=key({key:'Enter',...extra});s.h.tree.props.onKeyDown(k);assert.ok(k.defaultPrevented);}
 byText(s.h,'Throw').props.onClick();assert.equal(s.game.phase,'flight');s.game.made=1;s.game.attempts=2;s.game.phase='outcome';s.game.status='In — 1/2';s.game.resize();s.game.resize();s.game.pageHidden(true);s.game.pageHidden(false);s.game.frame(s.frame);assert.equal(s.game.phase,'outcome');assert.equal(s.game.status,'In — 1/2');s.game.pageHidden(true);s.game.pageHidden(false);assert.equal(s.game.attempts,2);s.render();byText(s.h,'Next ball').props.onClick();assert.equal(s.game.phase,'ready');s.render();byText(s.h,'Exit').props.onClick();assert.equal(s.exits(),1);assert.equal(s.game.phase,'off');assert.equal(s.game.attempts,0);s.dispose();
});
await check('Actual Prototype entry/physical gates, menu Escape order, destination navigation, fan and print separation',()=>{
 const s=setup();desktop(s.h).props.navigate('desk');s.render();const g=scene(s.h).props.toss;const input=scene(s.h).props.deskInput.current;input.pressing=true;g.releaseInput();assert.equal(input.pressing,false);scene(s.h).props.tossReady(true);g.available=true;s.render();byLabel(s.h,'Workspace navigation').props.onClick();s.render();assert.equal(byText(s.h,'Paper toss').props.disabled,false);byText(s.h,'Paper toss').props.onClick();s.render();assert.equal(g.phase,'entering');assert.equal(view(s.h),'desk');
 scene(s.h).props.onSelect('phone');s.render();assert.equal(view(s.h),'desk');scene(s.h).props.onTrackpad();s.render();assert.equal(view(s.h),'desk');const before=scene(s.h).props.fanOn;scene(s.h).props.onFanToggle();s.render();assert.equal(scene(s.h).props.fanOn,!before);
 g.phase='aiming';scene(s.h).props.onFanToggle();s.render();assert.equal(scene(s.h).props.fanOn,!before);press(s.h);assert.equal(g.phase,'ready');assert.equal(view(s.h),'desk');g.phase='flight';desktop(s.h).props.setSound({muted:true,volume:.4});s.render();assert.equal(g.phase,'entering');assert.equal(g.flight,null);
 byLabel(s.h,'Workspace navigation').props.onClick();s.render();press(s.h);assert.ok(g.active());press(s.h);assert.equal(g.phase,'off');assert.ok(focuses.some(f=>f.label==='Workspace navigation'));
 g.available=true;g.enter();s.render();desktop(s.h).props.navigate('phone');s.render();assert.equal(g.phase,'off');assert.equal(view(s.h),'phone');desktop(s.h).props.navigate('desk');s.render();g.available=true;g.enter();s.render();scene(s.h).props.onResume();s.render();assert.equal(g.phase,'off');assert.ok(scene(s.h).props.printMotion.current.job);dispose(s.h);
 const simple=setup('#desk',{simple:true});byLabel(simple.h,'Workspace navigation').props.onClick();simple.render();assert.equal(byText(simple.h,'Paper toss').props.disabled,true);assert.ok(text(simple.h.tree).includes('requires the 3D motion view'));dispose(simple.h);
});
console.log(count+' mounted callback groups passed, '+failures+' failed; mocked event routing/focus, not native input.');if(failures)process.exitCode=1;

`;
const output = path.join(root, ".vite/paper-toss-wiring-test.mjs");
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
