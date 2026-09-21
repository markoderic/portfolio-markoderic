// Session 01 only: component event sequences and geometry with mock capture/layout.
// No browser automation, DOM rendering, native input or external IO.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = String.raw`
import assert from 'node:assert/strict';
import {harness,find,captureNode} from './scripts/support/hook-harness.js';
import Window from './src/prototype/WorkspaceWindow.jsx';
import {windowReducer,fitBounds} from './src/prototype/windowState.js';
import {genieCorners,quadMatrix} from './src/prototype/genie.js';
let count=0,failures=0;
const check=(name,fn)=>{try{fn();count++;console.log('PASS '+name);}catch(e){failures++;console.log('FAIL '+name+'\n'+e.stack);}};
globalThis.innerWidth=1440;globalThis.document={activeElement:null};
let now=0,serial=0;const frames=new Map();
globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
const tick=()=>{now+=16;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};const settle=()=>{for(let i=0;i<160&&frames.size;i++)tick();};
globalThis.getComputedStyle=host=>({transform:host.transform||'none'});
globalThis.DOMMatrix=class{constructor(value){this.values=value.slice(9,-1).split(',').map(Number);}toFloat64Array(){return this.values;}};
function setup({inactive=false,projected=false}={}){
 frames.clear();let size={width:1200,height:800};const origin={x:100,y:100,w:600,h:420};
 let manager={windows:[{id:'finder',z:1,bounds:origin,minimized:false,max:false},{id:'mail',z:2,bounds:{x:140,y:130,w:650,h:450},minimized:false,max:false}],active:inactive?'mail':'finder',serial:2};
 let matrix=[.83,.04,0,.00008,-.03,.81,0,.00004,0,0,1,0,145,62,0,1];
 const icon={offsetLeft:1,offsetTop:0,offsetWidth:39,offsetHeight:39},dock={offsetLeft:600,offsetWidth:420,offsetTop:735,clientLeft:1,clientTop:1},button={offsetLeft:9,offsetTop:5,closest:()=>dock,querySelector:()=>icon};
 const surface={offsetWidth:size.width,offsetHeight:size.height,rect:{left:20,top:10,width:600,height:400},closest:()=>false,querySelector:()=>button,getBoundingClientRect(){return this.rect;}};
 if(projected)surface.transform='matrix3d('+matrix.join(',')+')';
 const host={current:surface},actions=[],draft={details:'Keep this draft'};
 const action=(type,id,extra={})=>{actions.push({type,id,...extra});manager=windowReducer(manager,{type,id,size,...extra});};
 const h=harness(Window,{w:manager.windows[0],size,host,isActive:!inactive,enabled:true,reduced:false,action,dismiss:action,mail:{draft}});
 const render=(extra={})=>{h.render({w:manager.windows[0],isActive:manager.active==='finder',size,...extra},true);h.flushEffects();};render();
 const title=()=>find(h,n=>n.props?.className==='window-title'),node=title().props.ref?.current||captureNode(),element=h.tree.props.ref.current;
 // Store a mock scroll position on the same retained content surface.
 element.scrollTop=79;
 node.releasePointerCapture=function(id){this.held=false;title().props.onLostPointerCapture({pointerId:id});};
 const toClient=(x,y)=>{if(projected){const m=matrix,w=m[3]*x+m[7]*y+m[15];return[(m[0]*x+m[4]*y+m[12])/w,(m[1]*x+m[5]*y+m[13])/w];}return[surface.rect.left+x*surface.rect.width/surface.offsetWidth,surface.rect.top+y*surface.rect.height/surface.offsetHeight];};
 const event=(x,y,id=7)=>{const [clientX,clientY]=toClient(x,y);return{button:0,buttons:1,pointerId:id,clientX,clientY,currentTarget:node,target:{closest:()=>false},preventDefault(){},stopPropagation(){}};};
 const down=(x,y,id=7)=>{const e=event(x,y,id);h.tree.props.onPointerDownCapture(e);title().props.onPointerDown(e);render();};
 const move=(x,y,id=7)=>title().props.onPointerMove(event(x,y,id));
 const up=(x,y,id=7)=>{title().props.onPointerUp(event(x,y,id));render();};
 const loss=(id=7)=>{node.held=false;title().props.onLostPointerCapture({pointerId:id});render();};
 const bounds=()=>manager.windows[0].bounds;
 const painted=()=>({x:parseFloat(element.style.left),y:parseFloat(element.style.top),w:parseFloat(element.style.width),h:parseFloat(element.style.height)});
 const near=(a,b)=>{for(const k of ['x','y','w','h'])assert.ok(Math.abs(a[k]-b[k])<1e-7,k+': '+a[k]+' vs '+b[k]);};
 return {h,origin,render,down,move,up,loss,event,node,element,title,action,actions,bounds,painted,near,draft,
 resize(next){size=next;surface.offsetWidth=next.width;surface.offsetHeight=next.height;action('resize');render();},
 projection(next){matrix=next;surface.transform='matrix3d('+matrix.join(',')+')';},surface};
}
check('capture loss ends the move at its last valid position; late release/render cannot reset it',()=>{
 const s=setup();s.down(420,112);s.move(535,172);const final={...s.origin,x:215,y:160};s.near(s.painted(),final);
 s.loss();s.up(535,172);s.h.tree.props.onFocusCapture();s.render();s.near(s.bounds(),final);s.near(s.painted(),final);assert.equal(s.actions.filter(a=>a.type==='move').length,1);
});
check('active and inactive windows keep arbitrary grab offsets across move, release and content/focus renders',()=>{
 for(const inactive of [false,true])for(const grab of [15,300,575]){
  const s=setup({inactive});s.down(100+grab,111);s.move(100+grab,111);s.near(s.painted(),s.origin);s.move(180+grab,159);const final={...s.origin,x:180,y:148};s.near(s.painted(),final);s.up(180+grab,159);
  s.action('focus','mail');s.render();s.h.tree.props.onPointerDownCapture({});s.h.tree.props.onFocusCapture();s.render({mail:{draft:s.draft,status:'Content render'}});s.render({enabled:false});s.render({enabled:true});s.near(s.bounds(),final);s.near(s.painted(),final);assert.equal(s.element.scrollTop,79);
 }
});
check('ordinary release commits once even when releasePointerCapture synchronously emits capture loss',()=>{
 const s=setup();s.down(400,110);s.move(480,180);s.up(480,180);s.loss();s.near(s.bounds(),{...s.origin,x:180,y:170});assert.equal(s.actions.filter(a=>a.type==='move').length,1);
});
check('pointercancel, Escape and disabling revert only the active operation, not an earlier committed move',()=>{
 for(const cancel of ['pointer','escape','disabled','disabled-before-effect']){
  const s=setup();s.down(400,110);s.move(470,140);s.up(470,140);const committed={...s.bounds()};s.down(470,140);s.move(530,195);
  if(cancel==='pointer')s.title().props.onPointerCancel({pointerId:7});if(cancel==='escape')s.h.tree.props.onKeyDown({key:'Escape',preventDefault(){}});if(cancel==='disabled')s.render({enabled:false});if(cancel==='disabled-before-effect'){s.h.render({enabled:false},true);s.loss();}s.render();s.loss();s.near(s.bounds(),committed);s.near(s.painted(),committed);
 }
});
check('events from another pointer cannot replace or finish the owned gesture',()=>{
 const s=setup();s.down(400,110);s.move(460,140);s.title().props.onPointerDown(s.event(800,160,9));s.title().props.onPointerCancel({pointerId:9});s.loss(9);s.up(800,160,9);s.move(500,175);s.up(500,175);s.near(s.bounds(),{...s.origin,x:200,y:165});assert.equal(s.actions.filter(a=>a.type==='move').length,1);
});
check('move then Genie minimize/restore keeps bounds, live content and scroll; next drag has no jump',()=>{
 const s=setup();s.down(400,110);s.move(490,160);s.up(490,160);const moved={...s.bounds()},content=()=>find(s.h,n=>n.props?.id==='finder'&&n.props?.onClose);const type=content().type;
 s.action('minimize','finder');s.render();for(let i=0;i<10;i++)tick();const transform=s.element.style.transform;assert.match(transform,/matrix3d/);s.action('open','finder');s.render();assert.equal(s.element.style.transform,transform);settle();s.render();s.near(s.bounds(),moved);s.near(s.painted(),moved);assert.equal(s.element.style.transform,'');assert.equal(content().type,type);assert.equal(content().props.mail.draft,s.draft);assert.equal(s.element.scrollTop,79);
 s.down(moved.x+130,moved.y+12);s.move(moved.x+130,moved.y+12);s.near(s.painted(),moved);s.move(moved.x+160,moved.y+32);s.up(moved.x+160,moved.y+32);s.near(s.bounds(),{...moved,x:moved.x+30,y:moved.y+20});
 s.action('minimize','finder');s.render();settle();s.render();assert.equal(s.element.style.visibility,'hidden');s.action('open','finder');s.render();settle();s.render();s.near(s.painted(),s.bounds());
});
check('moved window resizes then maximizes/restores with committed geometry retained',()=>{
 const s=setup();s.down(400,110);s.move(440,140);s.up(440,140);const handle=()=>find(s.h,n=>n.props?.className==='window-resize resize-se');
 handle().props.onPointerDown(s.event(740,550));handle().props.onPointerMove(s.event(795,590));handle().props.onPointerUp(s.event(795,590));s.render();const resized={...s.origin,x:140,y:130,w:655,h:460};s.near(s.bounds(),resized);
 s.action('maximize','finder');s.render();settle();s.near(s.painted(),{x:0,y:28,w:1200,h:701});s.action('maximize','finder');s.render();settle();s.near(s.painted(),resized);s.near(s.bounds(),resized);
});
check('resize cancellation still reverts; title dragging alone treats unexpected capture loss as commit',()=>{
 const s=setup();const handle=find(s.h,n=>n.props?.className==='window-resize resize-se');handle.props.onPointerDown(s.event(700,520));handle.props.onPointerMove(s.event(770,550));handle.props.onLostPointerCapture({pointerId:7});s.render();s.near(s.bounds(),s.origin);s.near(s.painted(),s.origin);
});
check('projection and common browser-scale changes use fresh coordinates through complete drag/release/render',()=>{
 for(const zoom of [.8,1,1.25,2]){
  const s=setup({projected:true});s.down(370,114);s.move(410,150);s.near(s.painted(),{...s.origin,x:140,y:136});
  const m=[.83*zoom,.04*zoom,0,.00008,-.03*zoom,.81*zoom,0,.00004,0,0,1,0,145*zoom-24,62*zoom-12,0,1];s.projection(m);s.move(430,180);s.up(430,180);s.near(s.bounds(),{...s.origin,x:160,y:166});s.render();s.near(s.painted(),s.bounds());
  s.resize({width:1100,height:760});s.down(430,180);s.move(460,190);s.up(460,190);s.near(s.bounds(),{...s.origin,x:190,y:176});
 }
});
check('existing reachable-edge limits clamp only the requested position, with no recentering',()=>{
 const s=setup();s.down(400,110);s.move(-1000,-100);s.up(-1000,-100);s.near(s.bounds(),fitBounds({...s.origin,x:-1300,y:-110},{width:1200,height:800}));s.down(-220,38);s.move(-180,58);s.up(-180,58);s.near(s.bounds(),{...s.origin,x:40,y:48});
});
console.log(count+' passed; '+failures+' failed. Mock component lifecycle/geometry only; real browser input unverified.');
if(failures)process.exitCode=1;
`;
const before = process.argv.includes("--before");
const output = path.join(root, before ? ".vite/window-drag-before-test.mjs" : ".vite/window-drag-test.mjs");
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
        // Replay the unchanged pre-fix component against the exact same assertions.
        // No source-file swap, browser or server access.
        if (before) b.onLoad({ filter: /\/WorkspaceWindow\.jsx$/ }, async a => ({
          contents: await (await import("node:fs/promises")).readFile(
            path.join(root, "../docs/redesign/session-01-window-drag-evidence/WorkspaceWindow.before.jsx"), "utf8"),
          resolveDir: path.dirname(a.path), loader: "jsx",
        }));
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
