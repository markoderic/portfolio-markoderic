// Actual current geometry and shadow resources; mocked GPU submission, not native WebGL.
import {build} from 'esbuild';import {fileURLToPath} from 'node:url';import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {lampFixture} from './support/brighter-lamp-fixture.mjs';import {loadLaptop} from './support/laptop-lighting-fixture.mjs';
import {createLitLaptop} from '../src/prototype/laptopLighting.js';import {LAPTOP} from '../src/prototype/deviceGeometry.js';
import {GROUND_SHADOW,createGroundShadowResources,createShadowCaptureState,ignoreShadowRay,captureSettledGround} from '../src/prototype/groundShadowPass.js';
import {TABLETOP_SHADOW,tabletopCasterSnapshot,captureTabletopIfNeeded} from '../src/prototype/tabletopShadowPass.js';
import {DESK,FLOOR_Y,PRINTER} from '../src/prototype/sceneScale.js';
const dir=new URL('../../docs/redesign/session-39-depth-shadows/',import.meta.url),api=await lampFixture(false),h=api.mount({night:true,reduced:true}),refs={lamp:{current:h.object}},results=[],details={};
for(const [name,C,props] of [['fan',api.DeskFan,{}],['production',api.ProductionProps,{}],['clock',api.DeskClock,{enabled:false}],['printer',api.Printer,{progress:{current:0}}]]){refs[name]={current:api.materialize(api.harness(C,props).tree)};h.scene.add(refs[name].current)}
const laptop=createLitLaptop(await loadLaptop());laptop.model.scale.setScalar(LAPTOP.modelScale);laptop.model.position.fromArray(LAPTOP.position);h.scene.add(laptop.model);refs.laptop={current:laptop.model};h.frame();h.scene.updateMatrixWorld(true);
const bounds=o=>new T.Box3().setFromObject(o),check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name)};
function gpu(){return {target:null,autoClear:false,clear:new T.Color('#abcdef'),alpha:.2,renders:[],getRenderTarget(){return this.target},setRenderTarget(t){this.target=t},getClearColor(c){return c.copy(this.clear)},getClearAlpha(){return this.alpha},setClearColor(c,a){this.clear.set(c);this.alpha=a},render(s,c){this.renders.push({count:s.children.length,camera:c,target:this.target})}}}
check('measured printer gap closed by four local support feet, without moving casing/feed/light or props',()=>{
 const before=JSON.parse(fs.readFileSync(new URL('before-scene.json',dir))),old=before.meshes.filter(m=>m.root==='printer').flatMap(m=>m.positions);const feet=[];refs.printer.current.traverse(o=>{if(o.name==='printer-foot')feet.push(bounds(o))});assert.equal(feet.length,4);feet.forEach(b=>{assert.ok(Math.abs(b.min.y)<.00002);assert.ok(b.max.y>.0725);assert.ok(b.min.x>-5.4&&b.max.x<5.4&&b.min.z>-3&&b.max.z<3)});
 assert.deepEqual(refs.printer.current.position.toArray(),PRINTER.position);details.printer={beforeMinimumY:Math.min(...old.map(v=>v[1])),afterMinimumY:bounds(refs.printer.current).min.y,feet:feet.map(b=>({min:b.min.toArray(),max:b.max.toArray()}))};
 assert.ok(details.printer.beforeMinimumY>.0724);assert.ok(Math.abs(details.printer.afterMinimumY)<.00002);
});
check('existing key shadow frustum covers all tabletop supports; direction/output/exposure unchanged',()=>{
 let key;h.scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)key=o});key.shadow.camera.updateProjectionMatrix();key.shadow.updateMatrices(key);const samples=[];
 for(const [name,ref]of Object.entries(refs)){const box=bounds(ref.current);let p=box.getCenter(new T.Vector3());if(name==='production')p.set(4.7,0,2.2);p.y=0;const q=p.clone().project(key.shadow.camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&Math.abs(q.z)<1,name);samples.push({name,point:p.toArray(),shadowNDC:q.toArray()})}
 assert.equal(key.shadow.normalBias,.004);assert.equal(key.shadow.radius,2);assert.equal(key.shadow.mapSize.x,2048);assert.ok(Math.abs(key.intensity-.42)<1e-10);assert.ok(Math.abs(h.gl.toneMappingExposure-.82)<1e-10);details.key={samples,position:key.position.toArray(),normalBias:key.shadow.normalBias,radius:key.shadow.radius};
 const before=JSON.parse(fs.readFileSync(new URL('before-measurements.json',dir))),after=JSON.parse(fs.readFileSync(new URL('after-measurements.json',dir)));assert.deepEqual(after.room,before.room);assert.deepEqual(after.spot,before.spot);assert.deepEqual(after.screen,before.screen);
});
check('table cache waits for imported geometry; selects static near supports, never moving head/ribbons/phone/page/drawers',()=>{
 const s=tabletopCasterSnapshot(refs);assert.ok(s);assert.equal(tabletopCasterSnapshot({...refs,laptop:{current:new T.Group()}}),null);const fan=s.meshes.filter(o=>o.name.startsWith('fan-'));assert.deepEqual(fan.map(o=>o.name),['fan-base']);
 const old=s.key;refs.fan.current.getObjectByName('fan-yaw').rotation.y+=.4;refs.fan.current.getObjectByName('fan-rotor').rotation.z+=.7;refs.fan.current.getObjectByName('fan-streamers').geometry.attributes.position.needsUpdate=true;assert.equal(tabletopCasterSnapshot(refs).key,old);
 details.tableCasters=s.meshes.map(o=>({name:o.name,uuid:o.uuid,minimumY:bounds(o).min.y}));assert.equal(s.meshes.filter(o=>o.name==='printer-foot').length,4);
});
check('table resources: three renders per bake, no idle recapture, replacement/geometry invalidation and state restoration',()=>{
 const resources=createGroundShadowResources(TABLETOP_SHADOW),state=createShadowCaptureState(),gl=gpu();captureTabletopIfNeeded(state,resources,gl,refs,1/60);assert.equal(gl.renders.length,3);assert.equal(gl.target,null);assert.equal(gl.autoClear,false);assert.equal(gl.clear.getHex(),0xabcdef);assert.equal(gl.alpha,.2);
 for(let i=0;i<3600;i++)captureTabletopIfNeeded(state,resources,gl,refs,1/60);assert.equal(gl.renders.length,3);
 refs.fan.current.getObjectByName('fan-base').geometry.attributes.position.needsUpdate=true;captureTabletopIfNeeded(state,resources,gl,refs,.5);assert.equal(gl.renders.length,6);state.dirty=true;captureTabletopIfNeeded(state,resources,gl,refs,0);assert.equal(gl.renders.length,9);
 let disposed=0,borrowed=0;for(const layer of resources.layers)for(const o of [layer.target,layer.scratch,layer.material])o.addEventListener('dispose',()=>disposed++);refs.fan.current.getObjectByName('fan-base').geometry.addEventListener('dispose',()=>borrowed++);resources.dispose();assert.equal(disposed,3);assert.equal(borrowed,0);
});
check('receiver/capture UV registration, mat height, bevel containment, zero ray hits and depth-only material',()=>{
 assert.ok(TABLETOP_SHADOW.width<DESK.width-.11&&TABLETOP_SHADOW.depth<DESK.depth-.11);assert.equal(TABLETOP_SHADOW.receiver[1],.014);
 const r=createGroundShadowResources(TABLETOP_SHADOW),g=r.geometry,a=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).add(new T.Vector3(...TABLETOP_SHADOW.receiver)),q=p.clone().project(r.layers[0].camera);assert.ok(Math.abs((q.x+1)/2-uv.getX(i))<1e-6);assert.ok(Math.abs((q.y+1)/2-uv.getY(i))<1e-6)}
 const mesh=new T.Mesh(g,r.layers[0].material);mesh.position.fromArray(TABLETOP_SHADOW.receiver);mesh.userData.shadowOnly=true;mesh.raycast=ignoreShadowRay;mesh.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,5,0),new T.Vector3(0,-1,0)).intersectObject(mesh).length,0);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.toneMapped,false);r.dispose();
});
check('ground maps retain transparent borders; tight footprint is stronger/narrower, no larger blob',()=>{
 const before=JSON.parse(fs.readFileSync(new URL('before-maps/offline-maps.json',dir))).maps,after=JSON.parse(fs.readFileSync(new URL('after-maps/offline-maps.json',dir))).maps;
 for(const m of after.filter(m=>m.name!=='table-contact'))assert.equal(m.edgeAlpha,0);
 const b=before.find(m=>m.name==='contact'),a=after.find(m=>m.name==='contact');assert.equal(a.resolution,b.resolution);assert.ok(a.blurStep<b.blurStep);assert.ok(a.day>b.day&&a.night>b.night);assert.equal(GROUND_SHADOW.center[1],FLOOR_Y-.01);details.ground={before:b,after:a};
});
// Run the actual shared component with the tabletop configuration and live caster refs.
const output=new URL('../.vite/session39-shadow-component.mjs',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
await build({stdin:{contents:"export {default as Ground} from './src/prototype/GroundShadows.jsx';export {default as Table} from './src/prototype/TabletopShadows.jsx';export {harness,nodes} from './scripts/support/hook-harness.js';",resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(output),plugins:[{name:'mock-renderer',setup(b){b.onResolve({filter:/^react$/},()=>({path:root+'scripts/support/hook-harness.js'}));b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useFrame=fn=>globalThis.shadowFrame=fn;'}))}}]});
const component=await import(output.href);
check('actual table wrapper/shared lifecycle: stable view/theme resource reuse, context recovery and cleanup',()=>{
 const wrapper=component.harness(component.Table,{casters:refs,night:false,reduced:false});assert.equal(wrapper.tree.type,component.Ground);
 const mounted=component.harness(component.Ground,wrapper.tree.props),gl=gpu(),listeners=new Map();gl.domElement={addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};gl.getContext=()=>({isContextLost:()=>!!gl.lost});mounted.tree.props.ref.current=new T.Group();mounted.flushEffects();
 globalThis.shadowFrame({gl},1/60);assert.equal(gl.renders.length,3);const mesh=[...component.nodes(mounted.tree)].find(n=>n.type==='mesh'),material=mesh.props.material;assert.equal(mesh.props.userData.shadowOnly,true);assert.equal(mesh.props.raycast.toString().replace(/\s/g,''),ignoreShadowRay.toString().replace(/\s/g,''));assert.deepEqual(mounted.tree.props.position,TABLETOP_SHADOW.receiver);
 mounted.render({night:true});for(let i=0;i<120;i++)globalThis.shadowFrame({gl},1/60);assert.equal(gl.renders.length,3);assert.ok(Math.abs(material.opacity-.27)<1e-4);assert.equal([...component.nodes(mounted.tree)].find(n=>n.type==='mesh').props.material,material);
 gl.lost=true;listeners.get('webglcontextlost')();globalThis.shadowFrame({gl},1/60);assert.equal(mounted.tree.props.ref.current.visible,false);gl.lost=false;listeners.get('webglcontextrestored')();globalThis.shadowFrame({gl},1/60);assert.equal(gl.renders.length,6);assert.equal(mounted.tree.props.ref.current.visible,true);
 mounted.render({night:false,reduced:true});globalThis.shadowFrame({gl},1/60);assert.equal(material.opacity,.34);assert.equal(gl.renders.length,6);mounted.slots.forEach(s=>s.cleanup?.());assert.equal(listeners.size,0);
});
fs.writeFileSync(new URL('shadow-checks.json',dir),JSON.stringify({evidence:'Actual Three resources/current geometry; GPU calls mocked, no native rendering',checks:results,details},null,2)+'\n');
