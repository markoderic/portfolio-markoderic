// Installed R3F event bridge + actual Three geometry. Native-shaped inputs are
// modeled (including isTrusted); this is NOT browser/native event verification.
import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';import {createEvents} from '@react-three/fiber';import * as T from 'three';
import {loadLaptop} from './support/laptop-lighting-fixture.mjs';import {mountFan} from './support/fan-scene-fixture.mjs';
const before=process.argv.includes('--before'),root=new URL('../',import.meta.url),dir=new URL('../../docs/redesign/session-36-runtime/',import.meta.url);
await build({stdin:{contents:"export {laptopHandlers} from './src/prototype/trackpadInput.js';export {fanHandlers} from './src/prototype/fanInput.js';export {createFanMotion,advanceFan} from './src/prototype/fanMotion.js';",resolveDir:fileURLToPath(root)},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(new URL('.vite/runtime-dispatch.mjs',root)),plugins:[{name:'saved-before',setup(b){if(before)b.onLoad({filter:/src\/prototype\/(trackpadInput|fanInput|physicalPress|fanMotion)\.js$/},a=>({contents:fs.readFileSync(new URL('before-'+a.path.split('/').at(-1),dir),'utf8'),resolveDir:fileURLToPath(new URL('src/prototype/',root))}));}}]});
const api=await import(new URL('.vite/runtime-dispatch.mjs',root));let count=0,failed=0,results=[];
function check(name,fn){try{fn();count++;results.push({name,pass:true});console.log('PASS',name);}catch(e){failed++;results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);}}
function setup(object,kind){
 const scene=new T.Scene();scene.add(object);scene.updateMatrixWorld(true);let hits=0;const input={},owner={current:object};
 const handlers=kind==='laptop'?api.laptopHandlers(input,true,owner,()=>hits++):api.fanHandlers(input,true,()=>hits++);
 const box=new T.Box3().setFromObject(kind==='fan'?object.getObjectByName('fan-switch'):object),center=box.getCenter(new T.Vector3());
 const camera=new T.PerspectiveCamera(39,1,.01,1000);camera.position.copy(center).add(new T.Vector3(0,10,kind==='fan'?10:0));camera.lookAt(center);camera.updateMatrixWorld(true);
 const state={camera,pointer:new T.Vector2(),raycaster:new T.Raycaster(),internal:{interaction:[object],initialClick:[0,0],initialHits:[],capturedMap:new Map(),hovered:new Map(),lastEvent:{current:null}},events:{enabled:true,priority:1,compute(e,s){s.pointer.set(e.offsetX/50-1,1-e.offsetY/50);s.raycaster.setFromCamera(s.pointer,camera);}}};
 const store={getState:()=>state};object.traverse(o=>o.__r3f={root:store,handlers:o===object?handlers:{},eventCount:o===object?Object.keys(handlers).length:0});
 const bridge=createEvents(store),target={},send=(name,extra={})=>bridge.handlePointer(name)({type:{onPointerDown:'pointerdown',onPointerUp:'pointerup',onClick:'click',onPointerMove:'pointermove'}[name],pointerId:7,pointerType:'mouse',isPrimary:true,button:0,clientX:50,clientY:50,offsetX:50,offsetY:50,isTrusted:true,timeStamp:100,detail:1,target,...extra});
 return {send,get hits(){return hits;},input,object,scene};
}
const laptop=await loadLaptop(),fan=mountFan();
for(const [kind,obj]of [['laptop',laptop],['fan',fan.root]]){
 for(const id of [undefined,0,-1,99])check(kind+' valid paired release survives compatibility click ID '+id,()=>{const s=setup(obj,kind);s.send('onPointerDown');s.send('onPointerUp');s.send('onClick',{pointerId:id,timeStamp:110});s.send('onClick',{pointerId:id,timeStamp:120});assert.equal(s.hits,1);});
 check(kind+' valid release does not depend on a later geometry hit',()=>{const s=setup(obj,kind);s.send('onPointerDown');s.send('onPointerUp');obj.position.x+=1000;obj.updateMatrixWorld(true);s.send('onClick');obj.position.x-=1000;obj.updateMatrixWorld(true);assert.equal(s.hits,1);});
 for(const mode of ['wrong-release','untrusted','drag-return','secondary','unpaired'])check(kind+' rejects '+mode,()=>{const s=setup(obj,kind);if(mode!=='unpaired')s.send('onPointerDown',{isTrusted:mode!=='untrusted',isPrimary:mode!=='secondary'});if(mode==='drag-return'){s.send('onPointerMove',{clientX:90});s.send('onPointerMove');}s.send('onPointerUp',{pointerId:mode==='wrong-release'?99:7,isTrusted:mode!=='untrusted',isPrimary:mode!=='secondary'});s.send('onClick',{isTrusted:mode!=='untrusted'});assert.equal(s.hits,0);});
}
check('sustained 120ms active frames advance and coast exactly to zero',()=>{const m=api.createFanMotion();for(let i=0;i<30;i++)api.advanceFan(m,true,false,true,.12);assert.ok(m.power>.99);const phase=m.phase;for(let i=0;i<60;i++)api.advanceFan(m,false,false,true,.12);assert.equal(m.power,0);assert.notEqual(m.phase,phase);});
fs.writeFileSync(new URL(before?'dispatch-before.json':'dispatch-after.json',dir),JSON.stringify({boundary:'Actual installed R3F dispatch/Three geometry, modeled native-shaped events; no browser',passed:count,failed,results},null,2)+'\n');if(failed)process.exitCode=1;
