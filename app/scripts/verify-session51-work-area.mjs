// Actual React MacDesktop/Window + reducer; modeled border-box measurements/events, no browser.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {build} from 'esbuild';import {fileURLToPath,pathToFileURL} from 'node:url';import {mount,flush,nodes,text} from './support/react-host-renderer.mjs';
import {desktopWorkArea,measureDesktopChrome} from '../src/prototype/desktopWorkArea.js';import {fitBounds,resizeBounds,windowReducer} from '../src/prototype/windowState.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.resolve(root,'../docs/redesign/session-51-dock-work-area'),out=path.join(root,'.vite/session51-react.mjs'),results=[];
const check=async(name,fn)=>{await fn();results.push({name,pass:true});console.log('PASS '+name)};
const contains=(b,size)=>{const a=desktopWorkArea(size);for(const v of Object.values(b))assert.ok(Number.isFinite(v)&&v>=0);assert.ok(b.x>=a.x&&b.y>=a.y&&b.x+b.w<=a.x+a.w+1e-8&&b.y+b.h<=a.y+a.h+1e-8,JSON.stringify({b,a}));};
await check('shared declared border-box contract and measured chrome include padding/border once',()=>{
 const css=fs.readFileSync(path.join(root,'src/prototype/workspace.css'),'utf8');assert.match(css,/box-sizing: border-box/);assert.match(css,/height: var\(--desktop-dock-height\)/);assert.match(css,/bottom: var\(--desktop-dock-bottom\)/);assert.match(css,/height: var\(--desktop-menu-height\)/);const narrow=css.slice(css.indexOf('@media (max-width: 799px)')).match(/\.mac-window\.is-active\s*\{([^}]+)\}/)[1];assert.doesNotMatch(narrow,/\b(?:left|top|width|height):[^;]*!important/);
 assert.deepEqual(desktopWorkArea({width:1120,height:700}),{x:0,y:28,w:1120,h:601});assert.deepEqual(measureDesktopChrome({offsetTop:0,offsetHeight:34},{offsetTop:619,offsetHeight:72},{height:700}),{menuBottom:34,dockInset:81});assert.equal(measureDesktopChrome({}, {}, {height:0}),null);
});
await check('open/fit/reset/host resize and all eight edges remain contained without opposite-edge jumps',()=>{
 for(const size of [{width:1120,height:700},{width:376,height:600},{width:320,height:240},{width:800,height:240},{width:200,height:160},{width:0,height:0}]){
  let state={windows:[],active:null,serial:0};for(let i=0;i<5;i++){state=windowReducer(state,{type:'open',id:'window'+i,size});contains(state.windows.at(-1).bounds,size)}
  const start=fitBounds({x:100,y:100,w:600,h:400},size);for(const edge of ['n','ne','e','se','s','sw','w','nw']){assert.deepEqual(resizeBounds(start,edge,0,0,size),start);for(const delta of [-2000,-50,50,2000]){const b=resizeBounds(start,edge,delta,delta,size);contains(b,size);if(edge.includes('w'))assert.equal(b.x+b.w,start.x+start.w);if(edge.includes('n'))assert.equal(b.y+b.h,start.y+start.h);if(edge.includes('e'))assert.equal(b.x,start.x);if(edge.includes('s'))assert.equal(b.y,start.y)}}
  state=windowReducer(state,{type:'reset',size});for(const w of state.windows)contains(w.bounds,size);
 }
});
await build({entryPoints:[path.join(root,'src/prototype/MacDesktop.jsx')],bundle:true,platform:'node',format:'esm',packages:'external',outfile:out,loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl','.css':'empty'},plugins:[{name:'raw',setup(b){b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
const listeners=new Map(),on=(k,f)=>{if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},off=(k,f)=>listeners.get(k)?.delete(f),emit=k=>[...(listeners.get(k)||[])].forEach(f=>f({}));globalThis.addEventListener=on;globalThis.removeEventListener=off;globalThis.document={hidden:false,activeElement:null,addEventListener:on,removeEventListener:off,querySelector:()=>({focus(){}})};globalThis.window={addEventListener:on,removeEventListener:off};globalThis.innerWidth=1440;globalThis.getComputedStyle=()=>({transform:'none'});globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const observers=new Set();globalThis.ResizeObserver=class{constructor(f){this.f=f;observers.add(this)}observe(){}disconnect(){observers.delete(this)}};
const Mac=(await import(pathToFileURL(out))).default;let manager={windows:[],active:null,serial:0},h,props;
const dispatch=a=>{manager=windowReducer(manager,a);props={...props,manager};h.render(props)};
props={enabled:true,reduced:true,desktopBlocked:false,manager,dispatch,size:{width:1120,height:700},host:{current:{offsetWidth:1120,offsetHeight:700,closest:()=>false,getBoundingClientRect:()=>({left:0,top:0,width:1120,height:700})}},open(){},navigate(){},onResume(){},sound:{muted:true,volume:0},setSound(){},onSimple(){}};
h=mount(Mac,props);await flush();const find=fn=>nodes(h.container).find(fn),menu=()=>find(n=>n.props?.className==='mac-menu-bar'),dock=()=>find(n=>n.props?.className==='icon-dock'),win=()=>find(n=>n.props?.['aria-label']==='Controls window');
const painted=()=>{const s=win().style;return{x:parseFloat(s.left),y:parseFloat(s.top),w:parseFloat(s.width),h:parseFloat(s.height)}};
const measure=async(top=28,inset=65)=>{Object.assign(menu(),{offsetTop:0,offsetHeight:top});Object.assign(dock(),{offsetTop:props.size.height-inset,offsetHeight:inset-9});for(const o of [...observers])o.f([]);await flush()};
const size=()=>({...props.size,chrome:manager.chrome});const action=async(type,extra={})=>{dispatch({type,id:'controls',size:props.size,...extra});await flush()};
await check('actual chrome measurement reaches externally opened windows and repeated maximize/restore',async()=>{
 await measure();assert.deepEqual(manager.chrome,{menuBottom:28,dockInset:65});await action('open');contains(painted(),size());const original={...manager.windows[0].bounds};for(let i=0;i<12;i++){await action('maximize');assert.deepEqual(painted(),desktopWorkArea(size()));await action('maximize');assert.deepEqual(painted(),original)}
 await measure(34,81);assert.deepEqual(manager.chrome,{menuBottom:34,dockInset:81});contains(painted(),size());await action('maximize');assert.deepEqual(painted(),{x:0,y:34,w:1120,h:579});await action('maximize');
});
await check('actual menu movement/reset, eight resize keyboard handlers, and changed chrome during drag',async()=>{
 const command=async label=>{find(n=>n.props?.['data-menu']==='Window').props.onClick();await flush();const b=find(n=>n.type==='button'&&text(n)===label);assert.ok(b,label);b.props.onClick();await flush()};
 for(let i=0;i<8;i++)await command('Move down');contains(painted(),size());await command('Reset positions');contains(painted(),size());
 for(const edge of ['n','ne','e','se','s','sw','w','nw']){const n=find(n=>n.props?.className==='window-resize resize-'+edge);assert.ok(n);for(const key of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']){n.props.onKeyDown({key,shiftKey:true,preventDefault(){},stopPropagation(){}});await flush();contains(painted(),size())}}
 const title=find(n=>n.props?.className==='window-title');title.held=false;title.setPointerCapture=()=>title.held=true;title.hasPointerCapture=()=>title.held;title.releasePointerCapture=()=>title.held=false;
 const e={button:0,pointerId:1,clientX:200,clientY:60,currentTarget:title,target:{closest:()=>false},preventDefault(){},stopPropagation(){}};title.props.onPointerDown(e);assert.ok(title.held);title.props.onPointerMove({...e,clientY:160});await measure(38,97);assert.equal(title.held,false);const held={...painted()};title.props.onPointerMove({...e,clientY:1000});assert.deepEqual(painted(),held);contains(painted(),size());
});
await check('viewport breakpoint changes at fixed logical size; narrow and short windows fit measured dock',async()=>{
 innerWidth=799;emit('resize');await flush();assert.deepEqual(painted(),desktopWorkArea(size()));assert.ok(!find(n=>n.props?.className==='window-resize resize-e'));
 innerWidth=800;emit('resize');await flush();assert.ok(find(n=>n.props?.className==='window-resize resize-e'));assert.deepEqual(painted(),manager.windows[0].bounds);
 innerWidth=375;props={...props,size:{width:375,height:240}};h.render(props);emit('resize');await flush();await measure();dispatch({type:'resize',size:props.size});await flush();assert.deepEqual(painted(),{x:0,y:28,w:375,h:141});contains(painted(),size());
});
h.close();await flush();assert.equal(observers.size,0);assert.equal([...listeners.values()].reduce((n,s)=>n+s.size,0),0);
fs.writeFileSync(path.join(dir,'work-area-checks.json'),JSON.stringify({kind:'real React owner/reducer, modeled offset measurements and event delivery; not native CSS/layout/input',results},null,2)+'\n');
