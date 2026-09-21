// Actual component callbacks with mocked hooks, DOM metrics and capture. No browser.
import {build} from 'esbuild';import path from 'node:path';import fs from 'node:fs';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=new URL('../../.vite/desktop-selection-fixture.mjs',import.meta.url);
await build({stdin:{contents:"export {default as DesktopItems} from './src/prototype/DesktopItems.jsx';export {default as DesktopIcon} from './src/prototype/DesktopIcon.jsx';export {default as MacDesktop} from './src/prototype/MacDesktop.jsx';export * from './scripts/support/hook-harness.js';export * from './src/prototype/desktopSelection';",resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(out),loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'mock-react',setup(b){b.onResolve({filter:/^react$/},()=>({path:path.join(root,'scripts/support/hook-harness.js')}));b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
export const {DesktopItems,DesktopIcon,MacDesktop,harness,nodes,find,desktopPoint,selectedIn,selectionRect}=await import(out.href+'?'+Date.now());
export function fixture(size={width:1040,height:650},options={}){
 const host={current:{offsetWidth:size.width,offsetHeight:size.height,transform:'none',closest:()=>true,getBoundingClientRect:()=>({left:40,top:20,width:size.width/2,height:size.height/2}),...options.host}};
 const props={size,host,enabled:true,controller:{current:null},launch(){},activate(){},...options.props},h=harness(DesktopItems,props);
 const icons=()=>[...nodes(h.tree)].filter(n=>n.type===DesktopIcon);
 const root={style:{},held:null,focus(){this.focused=true},contains:node=>node===root,querySelectorAll:()=>icons().map(n=>({style:{},dataset:{launcher:n.props.id},offsetLeft:n.props.position.x,offsetTop:n.props.position.y,offsetWidth:80,offsetHeight:82})),setPointerCapture(id){this.held=id},hasPointerCapture(id){return this.held===id},releasePointerCapture(id){this.held=null;h.tree.props.onLostPointerCapture(event(0,0,{pointerId:id}));}};
 h.tree.props.ref.current=root;const render=patch=>{h.render(patch);h.flushEffects();h.render();};render();
 const client=options.client||((x,y)=>({x:40+x/2,y:20+y/2}));
 function event(x,y,extra={}){const c=client(x,y);return {target:root,currentTarget:root,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,clientX:c.x,clientY:c.y,detail:1,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},...extra};}
 const down=(x,y,extra={})=>{const e=event(x,y,extra);h.tree.props.onPointerDownCapture(e);h.tree.props.onPointerDown(e);render();return e;};
 const move=(x,y,extra={})=>{const e=event(x,y,extra);h.tree.props.onPointerMove(e);render();return e;};
 const up=(x,y,extra={})=>{const e=event(x,y,extra);h.tree.props.onPointerUp(e);render();return e;};
 return {h,root,host,props,render,icons,event,down,move,up,selected:()=>icons().filter(n=>n.props.selected).map(n=>n.props.id),rect:()=>find(h,n=>n.props?.className==='desktop-marquee'),dispose(){h.slots.forEach(s=>s.cleanup?.());}};
}
