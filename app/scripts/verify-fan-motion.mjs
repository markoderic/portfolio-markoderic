import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {mountFan,nodes} from './support/fan-scene-fixture.mjs';
import {FAN,createFanMotion,advanceFan,fanAllowed,clearFanInput} from '../src/prototype/fanMotion.js';
import {fanHandlers,exposedFan} from '../src/prototype/fanInput.js';
import {Desk,Chair,Plant,Bin,harness,materialize} from './support/chair-scene-fixture.mjs';
import {createShadowCaptureState,captureSettledGround,groundCasterSnapshot} from '../src/prototype/groundShadowPass.js';
const checks=[],check=(n,f)=>{f();checks.push(n);console.log('PASS '+n)};
check('mounted fan starts on, owns head/rotor/strips and reaches bounded ninety-degree total sweep',()=>{
 const f=mountFan(),base=f.root.getObjectByName('fan-base'),initial=base.matrix.clone();let lo=Infinity,hi=-Infinity;
 for(let i=0;i<60*16;i++){f.frame(1/60);const a=f.root.getObjectByName('fan-yaw').rotation.y;lo=Math.min(lo,a);hi=Math.max(hi,a);assert.ok(Math.abs(a-FAN.direction)<=FAN.sweep);}
 assert.ok(hi-lo>Math.PI/2-.001);assert.notEqual(f.root.getObjectByName('fan-rotor').rotation.z,0);assert.deepEqual(base.matrix.toArray(),initial.toArray());
});
check('analytic power integration agrees at 30/60/120Hz, and rapid retargeting preserves pose',()=>{
 const results=[];for(const hz of [30,60,120]){const s=createFanMotion();advanceFan(s,true,false,true,0);for(let i=0;i<hz*4;i++)advanceFan(s,true,false,true,1/hz);results.push(s);}
 for(const p of ['spin','phase','yaw'])assert.ok(Math.abs(results[0][p]-results[2][p])<.002,p);
 const f=mountFan();f.run(2);for(let i=0;i<20;i++){const yaw=f.root.getObjectByName('fan-yaw').rotation.y,spin=f.root.getObjectByName('fan-rotor').rotation.z;f.render({on:i%2===0});f.frame(0);assert.equal(f.root.getObjectByName('fan-yaw').rotation.y,yaw);assert.equal(f.root.getObjectByName('fan-rotor').rotation.z,spin);f.frame(1/60);}
});
check('off decelerates near current heading, strips settle, then zero geometry or transform work',()=>{
 const f=mountFan();f.run(2);const before=f.root.getObjectByName('fan-yaw').rotation.y;f.render({on:false});f.frame(0);assert.equal(f.root.getObjectByName('fan-yaw').rotation.y,before);f.run(5);
 const strips=f.root.getObjectByName('fan-streamers').geometry,version=strips.attributes.position.version,yaw=f.root.getObjectByName('fan-yaw').rotation.y,spin=f.root.getObjectByName('fan-rotor').rotation.z;assert.ok(Math.abs(yaw-FAN.direction)>.1);
 f.run(30);assert.equal(strips.attributes.position.version,version);assert.equal(f.root.getObjectByName('fan-yaw').rotation.y,yaw);assert.equal(f.root.getObjectByName('fan-rotor').rotation.z,spin);
 f.render({on:true});f.frame(0);assert.equal(f.root.getObjectByName('fan-yaw').rotation.y,yaw);f.run(.3);assert.notEqual(f.root.getObjectByName('fan-rotor').rotation.z,spin);
});
check('hidden, direct view, entry and reduced motion freeze the actual mesh without catch-up',()=>{
 const f=mountFan();f.run(1);
 for(const patch of [{reduced:true},{active:false},{direct:true},{input:{hidden:true}}]){
  f.render(patch);const yaw=f.root.getObjectByName('fan-yaw').rotation.y,g=f.root.getObjectByName('fan-streamers').geometry,v=g.attributes.position.version;f.run(2);assert.equal(g.attributes.position.version,v);assert.equal(f.root.getObjectByName('fan-yaw').rotation.y,yaw);
  f.render({reduced:false,view:'desk',active:true,direct:false,input:{hidden:false}});f.frame(200);f.frame(1/60);assert.equal(g.attributes.position.version,v);f.frame(1/60);assert.ok(g.attributes.position.version>v);
 }
});
check('physical mouse/touch paths reject drag/cancel/exit/other press, repeats, occlusion and disabled contexts',()=>{
 for(const pointerType of ['mouse','touch'])for(const mode of ['click','drag','cancel','exit','right','nonprimary','disabled','occluded','orbit','no-press','wrong-pointer']){
  let count=0;const input={dragging:mode==='orbit'},h=fanHandlers(input,mode!=='disabled',()=>count++,()=>mode!=='occluded');
  const e={pointerType,clientX:20,clientY:20,pointerId:4,button:mode==='right'?2:0,isPrimary:mode!=='nonprimary',nativeEvent:{},stopPropagation(){this.stopped=true}};
  if(mode!=='no-press')h.onPointerDown(e);if(mode==='drag')h.onPointerMove({...e,clientX:30});if(mode==='cancel')h.onPointerCancel();if(mode==='exit'){h.onPointerOut();clearFanInput(input);} // Match scene-container leave cleanup.
h.onPointerUp(mode==='wrong-pointer'?{...e,pointerId:5}:e);const click=e;h.onClick(click);h.onClick(click);assert.equal(count,mode==='click'?1:0,mode);if(mode==='click')assert.ok(e.stopped&&e.nativeEvent.sceneObject);
 }
 const base={view:'desk',active:true,direct:false};assert.ok(fanAllowed(base));for(const p of [{view:'phone'},{active:false},{direct:true},{blocked:true},{dragging:true}])assert.equal(fanAllowed({...base,...p}),false);
});
check('actual switch/base rays are visible, passive blockers occlude them, strips have no ray hits',()=>{
 const f=mountFan(),scene=new T.Scene(),desk=materialize(harness(Desk,{}).tree);scene.add(desk,f.root);scene.updateMatrixWorld(true);const object=f.root.getObjectByName('fan-switch'),target=object.getWorldPosition(new T.Vector3()),origin=new T.Vector3(11,14,21),e={object,ray:new T.Ray(origin,target.clone().sub(origin).normalize())};assert.ok(exposedFan(e));
 const blocker=new T.Mesh(new T.BoxGeometry(.5,.5,.5));blocker.position.copy(origin.clone().lerp(target,.8));scene.add(blocker);assert.equal(exposedFan(e),false);
 const strip=f.root.getObjectByName('fan-streamers'),hits=[];strip.raycast(new T.Raycaster(),hits);assert.equal(hits.length,0);
 const button=nodes(f.h.tree).find(n=>n.props?.name==='desk-fan');assert.ok(button.props.onPointerDown&&button.props.onClick);
});
check('live fan and unchanged drawer geometry keep the ground-caster signature cached',()=>{
 const refs=Object.fromEntries([['desk',Desk],['chair',Chair],['plant',Plant],['bin',Bin]].map(([id,C])=>[id,{current:materialize(harness(C,{}).tree)}])),fan=mountFan(),scene=new T.Scene();scene.add(...Object.values(refs).map(r=>r.current),fan.root);
 // Only motion flags change here; Session36 caches unchanged layer geometry.
 // Actual moving drawer recapture is covered by verify-session56-shadows.mjs.
 const motion={moving:new Set(),revision:0},state=createShadowCaptureState();let captures=0;const resources={capture(){captures++}},key=groundCasterSnapshot(refs).key;
 for(let i=0;i<900;i++){fan.frame(1/60);if(i===10)motion.moving.add(0);if(i===40){motion.moving.clear();motion.revision++;}captureSettledGround(state,resources,{},refs,1/60,motion);}assert.equal(captures,1);assert.equal(groundCasterSnapshot(refs).key,key);
});
fs.writeFileSync(new URL('../../docs/redesign/session-17-desk-fan/motion-checks.json',import.meta.url),JSON.stringify({checks,note:'Actual JSX frame callbacks and actual geometry with mocked React/R3F/DOM, not native input or browser motion.'},null,2)+'\n');
