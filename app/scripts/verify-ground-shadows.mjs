// Real Three geometry/resources; mocked GPU calls and R3F lifecycle, no browser.
import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {build} from 'esbuild';import {fileURLToPath} from 'node:url';
import {Desk,Chair,Plant,Bin,harness,materialize} from './support/paper-scene-fixture.mjs';
import {GROUND_SHADOW,ignoreShadowRay,createShadowCaptureState,captureGroundIfNeeded,createGroundShadowResources,groundCasterSnapshot} from '../src/prototype/groundShadowPass.js';
import {deskHit,createDeskMotion,deskPose,deskAngles} from '../src/prototype/deskCamera.js';
import {FLOOR_Y,CHAIR} from '../src/prototype/sceneScale.js';
const dir=new URL('../../docs/redesign/session-09-ground-shadows/',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const refs=Object.fromEntries([['desk',Desk],['chair',Chair],['plant',Plant],['bin',Bin]].map(([key,Component])=>[key,{current:materialize(harness(Component,{}).tree)}]));
const snapshot=groundCasterSnapshot(refs),results=[],details={};
const check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name)};
function gpu(){return {target:{name:'prior'},clear:new T.Color('#abcdef'),alpha:.3,autoClear:false,renders:[],listeners:new Map(),getRenderTarget(){return this.target},setRenderTarget(v){this.target=v},getClearColor(out){return out.copy(this.clear)},getClearAlpha(){return this.alpha},setClearColor(c,a){this.clear.set(c);this.alpha=a},render(scene,camera){this.renders.push({scene,camera,target:this.target,material:scene.children[0].material,clear:this.clear.clone(),alpha:this.alpha});assert.equal(scene.children.length>0,true)},domElement:{addEventListener(type,fn){this.listeners||=new Map();this.listeners.set(type,fn)},removeEventListener(type){this.listeners.delete(type)}},getContext(){return {isContextLost:()=>this.lost||false}}}}
check('actual desk feet, five casters, pot and bin share the existing floor and enter the contact band',()=>{
 const supports=[...[-4.85,4.85].flatMap(x=>[-2.45,2.45].map(z=>[x,z])),...[-.65,.65].flatMap(x=>[-1.35,1.35].map(z=>[3.64+x,-.5+z])),...Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5,p=new T.Vector3(Math.sin(a)*CHAIR.baseRadius,0,Math.cos(a)*CHAIR.baseRadius).applyEuler(new T.Euler(0,CHAIR.yaw,0)).add(new T.Vector3(...CHAIR.position));return [p.x,p.z]}),[7,-1],[-5.95,3.1]];
 const ray=new T.Raycaster(),heights=[];for(const [x,z]of supports){ray.set(new T.Vector3(x,GROUND_SHADOW.center[1],z),new T.Vector3(0,1,0));const hit=ray.intersectObjects(snapshot.meshes,false)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-FLOOR_Y)<1e-5);heights.push(hit.point.y)}details.supports=supports;details.supportHeights=heights;
 for(const layer of GROUND_SHADOW.layers)for(const y of heights)assert.ok(y-GROUND_SHADOW.center[1]>.001&&y-GROUND_SHADOW.center[1]<layer.far);
});
check('capture and receiver bounds leave transparent margins beyond all low caster geometry and blur taps',()=>{
 let margin=Infinity;for(const layer of GROUND_SHADOW.layers)for(const mesh of snapshot.meshes){const box=new T.Box3().setFromObject(mesh);if(box.min.y>GROUND_SHADOW.center[1]+layer.far)continue;const support=layer.blurStep*4;for(const gap of [box.min.x-(GROUND_SHADOW.center[0]-11),GROUND_SHADOW.center[0]+11-box.max.x,box.min.z-(GROUND_SHADOW.center[2]-9),GROUND_SHADOW.center[2]+9-box.max.z]){assert.ok(gap>support);margin=Math.min(margin,gap-support)}}details.minimumConservativeEdgeMargin=margin;
});
check('static capture waits for all four mounts, invalidates late/replaced/changed geometry, ignores camera and opacity',()=>{
 const state=createShadowCaptureState(),late={...refs,plant:{current:null}};let captures=0;const resources={capture(){captures++}};
 for(let i=0;i<8;i++)captureGroundIfNeeded(state,resources,{},late,1/60);assert.equal(captures,0);late.plant.current=refs.plant.current;captureGroundIfNeeded(state,resources,{},late,1/60);assert.equal(captures,1);
 for(let i=0;i<3600;i++)captureGroundIfNeeded(state,resources,{},late,1/60);assert.equal(captures,1);
 const added=new T.Mesh(new T.BoxGeometry(.1,.1,.1));late.plant.current.add(added);captureGroundIfNeeded(state,resources,{},late,.5);assert.equal(captures,2);late.plant.current.remove(added);added.geometry.dispose();added.material.dispose();captureGroundIfNeeded(state,resources,{},late,.5);assert.equal(captures,3);
 const m=snapshot.meshes[0];m.geometry.attributes.position.needsUpdate=true;captureGroundIfNeeded(state,resources,{},late,.5);assert.equal(captures,4);state.dirty=true;captureGroundIfNeeded(state,resources,{},late,0);assert.equal(captures,5);
});
check('a bake has exactly six renders, nearest-depth testing, transparent black clears and restores GPU state',()=>{
 const r=createGroundShadowResources(),gl=gpu(),target=gl.target,color=gl.clear.clone();r.capture(gl,snapshot.meshes);assert.equal(gl.renders.length,6);assert.equal(gl.target,target);assert.ok(gl.clear.equals(color));assert.equal(gl.alpha,.3);assert.equal(gl.autoClear,false);
 for(const call of gl.renders){assert.equal(call.alpha,0);assert.equal(call.clear.getHex(),0);}
 for(const i of [0,3]){assert.equal(gl.renders[i].material.depthTest,true);assert.equal(gl.renders[i].material.depthWrite,true);assert.equal(gl.renders[i].material.blending,T.NoBlending);assert.match(gl.renders[i].material.fragmentShader,/vec4\(0.0,0.0,0.0,a\)/);}
 for(const layer of r.layers){assert.equal(layer.material.forceSinglePass,true);assert.equal(layer.material.transparent,true);assert.equal(layer.material.depthWrite,false);assert.equal(layer.material.toneMapped,false);assert.equal(layer.target.texture.generateMipmaps,false);assert.equal(layer.target.width,layer.config.resolution);assert.equal(layer.camera.position.y,GROUND_SHADOW.center[1]);}
 let disposed=0;for(const layer of r.layers)for(const obj of [layer.target,layer.scratch,layer.material])obj.addEventListener('dispose',()=>disposed++);r.dispose();assert.equal(disposed,6);
});
check('capture camera and receiver UVs align without mirroring world contacts',()=>{
 const r=createGroundShadowResources(),p=r.geometry.attributes.position,uv=r.geometry.attributes.uv;for(const layer of r.layers)for(let i=0;i<p.count;i++){const world=new T.Vector3().fromBufferAttribute(p,i).add(new T.Vector3(...GROUND_SHADOW.center));const ndc=world.project(layer.camera);assert.ok(Math.abs((ndc.x+1)/2-uv.getX(i))<1e-6);assert.ok(Math.abs((ndc.y+1)/2-uv.getY(i))<1e-6);}r.dispose();
});
check('shadow receivers cannot intercept direct rays or desk hover across the camera range',()=>{
 const r=createGroundShadowResources(),scene=new T.Scene();for(const layer of r.layers){const m=new T.Mesh(r.geometry,layer.material);m.position.fromArray(GROUND_SHADOW.center);m.raycast=ignoreShadowRay;scene.add(m)}
 const action=new T.Mesh(new T.BoxGeometry(.4,.4,.4),new T.MeshBasicMaterial());action.position.set(0,-6.8,0);action.userData.deskTarget='test-action-below-receiver';scene.add(action);scene.updateMatrixWorld(true);
 for(const angle of [deskAngles(0),deskAngles(5),deskAngles(10),deskAngles(30),{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}]){const c=new T.PerspectiveCamera(39,1.6,.1,100),pose=deskPose({width:1440,height:900},angle);c.position.copy(pose.position);c.lookAt(pose.look);c.updateMatrixWorld();const ndc=action.position.clone().project(c),hit=deskHit(createDeskMotion(),c,scene,{x:(ndc.x+1)*720,y:(1-ndc.y)*450,width:1440,height:900});assert.equal(hit?.id,'test-action-below-receiver');}r.dispose();
});
// Execute the actual new component with the existing explicit hook harness.
const output=new URL('../.vite/ground-shadow-fixture.mjs',import.meta.url);
await build({stdin:{contents:"export {default as Ground} from './src/prototype/GroundShadows.jsx';export {harness,nodes} from './scripts/support/hook-harness.js';",resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:fileURLToPath(output),plugins:[{name:'mock-hooks',setup(b){b.onResolve({filter:/^react$/},()=>({path:root+'scripts/support/hook-harness.js'}));b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useFrame=fn=>globalThis.shadowFrame=fn;'}))}}]});
const {Ground,harness:mount,nodes}=await import(output.href);
check('actual component bakes once, interpolates black-only day/night without recapture, restores context, cleans up',()=>{
 const h=mount(Ground,{casters:refs,night:false,reduced:false}),gl=gpu();const group=h.tree.props.ref;group.current=new T.Group();group.current.visible=false;h.flushEffects();
 globalThis.shadowFrame({gl},1/60);assert.equal(group.current.visible,true);assert.equal(gl.renders.length,6);const receivers=[...nodes(h.tree)].filter(n=>n.type==='mesh' && n.props.material.map); // Cached layers; directional receiver has its own Session56 lifecycle checks.
 for(const n of receivers)assert.equal(n.props.raycast.toString().replace(/\s/g,''),ignoreShadowRay.toString().replace(/\s/g,''));
 h.render({night:true});for(let i=0;i<180;i++)globalThis.shadowFrame({gl},1/60);assert.equal(gl.renders.length,6);receivers.forEach((n,i)=>assert.ok(Math.abs(n.props.material.opacity-GROUND_SHADOW.layers[i].night)<1e-6));
 gl.lost=true;gl.domElement.listeners.get('webglcontextlost')();globalThis.shadowFrame({gl},1/60);assert.equal(group.current.visible,false);assert.equal(gl.renders.length,6);gl.lost=false;gl.domElement.listeners.get('webglcontextrestored')();globalThis.shadowFrame({gl},1/60);assert.equal(group.current.visible,true);assert.equal(gl.renders.length,12);
 h.render({night:false,reduced:true});globalThis.shadowFrame({gl},1/60);receivers.forEach((n,i)=>assert.equal(n.props.material.opacity,GROUND_SHADOW.layers[i].day));assert.equal(gl.renders.length,12);for(const slot of h.slots)slot.cleanup?.();assert.equal(gl.domElement.listeners.size,0);
});
fs.writeFileSync(new URL('checks.json',dir),JSON.stringify({checks:results,details,staticMeshes:snapshot.meshes.length,offscreenRendersPerBake:6,evidence:'Actual source/Three geometry and mocked GPU lifecycle, not rendered WebGL'},null,2)+'\n');console.log(results.length+' shadow checks passed');
