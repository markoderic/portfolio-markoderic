// Real component callbacks under hook/DOM mocks. Not native browser input.
import {build} from 'esbuild';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.vite/wallpaper-input.mjs');
const source=String.raw`
import assert from 'node:assert/strict';
import {harness,find,nodes,captureNode} from './scripts/support/hook-harness.js';
import Items from './src/prototype/DesktopItems.jsx';import Icon from './src/prototype/DesktopIcon.jsx';import Desktop from './src/prototype/MacDesktop.jsx';
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
globalThis.getComputedStyle=()=>({transform:'none'});
const size={width:1040,height:650};const host={current:{offsetWidth:1040,offsetHeight:650,getBoundingClientRect:()=>({left:0,top:0,width:1040,height:650})}};
check('Icon drag commits at bright/dark/opposite-edge positions; double click is suppressed after dragging',()=>{
 for(const target of [{x:690,y:60},{x:70,y:500},{x:950,y:480}]){let moved=null,launch=0;const node=captureNode(),h=harness(Icon,{id:'finder',position:{x:100,y:100},selected:false,select(){},activate(){},launch(){launch++},move:p=>moved=p,size,host});
 const e=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,pointerType:'mouse',currentTarget:node,preventDefault(){}});
 h.tree.props.onPointerDown(e(100,100));h.tree.props.onPointerMove(e(target.x,target.y));h.tree.props.onPointerUp(e(target.x,target.y));assert.deepEqual(moved,target);h.tree.props.onDoubleClick({preventDefault(){}});assert.equal(launch,0);
 }
});
check('Selection, double click, keyboard activation, Alt-arrow motion and touch launch retain their callbacks',()=>{
 let launch=0,selected=0,moved;const node=captureNode(),props={id:'preview',position:{x:100,y:100},selected:false,select(){selected++},activate(){},launch(){launch++},move:p=>moved=p,size,host},h=harness(Icon,props);
 h.tree.props.onClick({detail:1});assert.equal(selected,1);assert.equal(launch,0);h.tree.props.onDoubleClick({});assert.equal(launch,1);h.tree.props.onClick({detail:0});assert.equal(launch,2);
 h.tree.props.onKeyDown({key:'ArrowRight',altKey:true,preventDefault(){}});assert.deepEqual(moved,{x:112,y:100});
 const t=harness(Icon,props),e={button:0,pointerId:2,clientX:100,clientY:100,pointerType:'touch',currentTarget:node};t.tree.props.onPointerDown(e);t.tree.props.onPointerUp(e);assert.equal(launch,3);
});
check('Appearance preserves moved icons, menu callbacks and manager/draft props; Escape consumes local menu first',()=>{
 let themes=0;const manager={windows:[],active:null},mail={draft:{body:'Retain me'}};
 globalThis.document={querySelector:()=>({focus(){}})};
 const h=harness(Desktop,{manager,mail,size,host,enabled:true,night:false,onLamp(){themes++},sound:{muted:true}}),items=harness(Items,find(h,n=>n.type===Items).props),icons=()=>[...nodes(items.tree)].filter(n=>n.type===Icon);
 icons()[0].props.move({x:70,y:500});h.render({night:true});items.render(find(h,n=>n.type===Items).props);assert.deepEqual(icons()[0].props.position,{x:70,y:500});assert.equal(h.props.manager,manager);assert.equal(h.props.mail,mail);
 find(h,n=>n.props?.['data-menu']==='Control Center').props.onClick();h.render();const label=n=>Array.isArray(n.props?.children)?n.props.children.join(''):'';
 find(h,n=>n.type==='button'&&label(n)==='Dark appearance').props.onClick();assert.equal(themes,1);
 let stopped=0;h.tree.props.onKeyDown({key:'Escape',defaultPrevented:false,stopPropagation(){stopped++}});h.render();assert.equal(stopped,1);assert.ok(!find(h,n=>n.props?.className?.startsWith('mac-popover')));
});
console.log(count+' callback checks passed; browser drag, touch, focus and pointer propagation remain unverified.');
`;
await build({stdin:{contents:source,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:out,loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'hooks-and-raw',setup(b){b.onResolve({filter:/^react$/},()=>({path:path.join(root,'scripts/support/hook-harness.js')}));b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},async a=>({contents:await (await import('node:fs/promises')).readFile(a.path,'utf8'),loader:'text'}));}}]});
await import(pathToFileURL(out));
