import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {Drawer,Desk,harness,materialize} from './support/chair-scene-fixture.mjs';
import {DRAWERS,CABINET,createDrawerMotion,advanceDrawer,drawerHandlers,drawerAllowed,exposedDrawer} from '../src/prototype/drawers.js';
import {createShadowCaptureState,captureSettledGround} from '../src/prototype/groundShadowPass.js';
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
check('Actual Drawer frame writes a complete tray once per moving frame; idle does not mutate or recapture',()=>{
 const shadow={current:{moving:new Set(),revision:0}},h=harness(Drawer,{spec:DRAWERS[0],open:false,shadow}),group=materialize(h.tree);assert.equal(group.position.z,0);
 h.render({open:true});const frame=()=>globalThis.__printerFrames.at(-1)({},1/60);for(let i=0;i<23;i++)frame();assert.equal(group.position.z,CABINET.travel);assert.equal(shadow.current.moving.size,0);assert.equal(shadow.current.revision,1);
 for(let i=0;i<100;i++)frame();assert.equal(shadow.current.revision,1);
 h.render({open:false});frame();const current=group.position.z;assert.ok(current<CABINET.travel);h.render({open:true});globalThis.__printerFrames.at(-1)({},0);assert.equal(group.position.z,current);h.render({open:false,reduced:true});frame();assert.equal(group.position.z,0);
});
check('30/60/120Hz endpoint, no overshoot, rapid reversals retain rendered position, reduced motion snaps',()=>{
 for(const hz of [30,60,120]){const s=createDrawerMotion();for(let i=0;i<Math.ceil(.38*hz);i++){advanceDrawer(s,true,false,1/hz);assert.ok(s.value>=0&&s.value<=1)}assert.equal(s.value,1);for(let i=0;i<17;i++){const before=s.value;advanceDrawer(s,i%2===0,false,0);assert.equal(s.value,before);advanceDrawer(s,i%2===0,false,1/hz);}advanceDrawer(s,false,true,0);assert.equal(s.value,0);assert.equal(s.moving,false);}
});
check('Real drawer handlers consume mouse/touch click once, reject drag, cancellation, exits, nonprimary or disabled events',()=>{
 for(const pointerType of ['mouse','touch'])for(const type of ['click','drag','cancel','exit','right','disabled','occluded','orbit']){
  let toggles=0;const input={dragging:type==='orbit'},handlers=drawerHandlers(0,input,type!=='disabled',()=>toggles++,()=>type!=='occluded');
  const e={clientX:50,clientY:50,pointerId:1,button:type==='right'?2:0,pointerType,nativeEvent:{},stopPropagation(){this.stopped=true}};
  handlers.onPointerDown(e);if(type==='drag')handlers.onPointerMove({...e,clientX:70});if(type==='cancel')handlers.onPointerCancel();if(type==='exit')handlers.onPointerOut();handlers.onPointerUp(e);handlers.onClick(e);handlers.onClick(e);
  assert.equal(toggles,type==='click'?1:0,type);if(type==='click'){assert.ok(e.stopped&&e.nativeEvent.sceneObject)}
 }
 const input={},h=drawerHandlers(0,input,true,()=>{},()=>true),e={pointerType:'mouse',stopPropagation(){}};h.onPointerOver(e);assert.equal(input.drawerHover,0);h.onPointerOut();assert.equal(input.drawerHover,null);
});
check('Active desk-only predicate rejects device, entry, Simple, menu and camera-drag contexts',()=>{
 const base={view:'desk',active:true,direct:false};assert.ok(drawerAllowed(base));for(const patch of [{view:'laptop'},{view:'phone'},{view:'paper'},{active:false},{direct:true},{blocked:true},{dragging:true}])assert.equal(drawerAllowed({...base,...patch}),false);
});
check('Actual whole-scene ray gate sees exposed fronts and rejects opaque tabletop/back/side/other-drawer hits',()=>{
 const desk=materialize(harness(Desk,{}).tree);desk.updateMatrixWorld(true);const front=desk.getObjectByName('drawer-0').getObjectByName('drawer-front');const target=new T.Vector3(CABINET.x,DRAWERS[0].y,1.3);
 const e=origin=>({object:front,ray:new T.Ray(origin,target.clone().sub(origin).normalize())});
 assert.ok(exposedDrawer(e(new T.Vector3(CABINET.x,DRAWERS[0].y,8)),0));
 for(const origin of [new T.Vector3(CABINET.x,8,0),new T.Vector3(CABINET.x,DRAWERS[0].y,-8),new T.Vector3(8,DRAWERS[0].y,0)])assert.equal(exposedDrawer(e(origin),0),false);
 assert.equal(exposedDrawer(e(new T.Vector3(CABINET.x,DRAWERS[0].y,8)),1),false);
});
// Session44/W08 supersedes the former settled-only budget. Exercise a low
// caster so the ground capture band actually changes, not an out-of-band box.
check('Ground shadow budget: bounded intermediate updates, exact final capture, no idle recapture',()=>{
 const refs=Object.fromEntries(['desk','chair','plant','bin'].map(k=>{const m=new T.Mesh(new T.BoxGeometry(1,1,1));m.position.y=-5.8;return [k,{current:m}]})),motion={moving:new Set(),revision:0},state=createShadowCaptureState();let captures=0;const resources={capture(){captures++}};
 captureSettledGround(state,resources,{},refs,1/60,motion);assert.equal(captures,1);
 motion.moving.add(0);motion.moving.add(1);motion.moving.add(2);
 for(let i=0;i<100;i++){refs.desk.current.position.z=i/100;captureSettledGround(state,resources,{},refs,1/60,motion)}
 assert.ok(captures>1&&captures<=52);const movingCount=captures;
 refs.desk.current.position.z=1;motion.moving.clear();motion.revision+=3;captureSettledGround(state,resources,{},refs,1/60,motion);assert.equal(captures,movingCount+1);
 for(let i=0;i<300;i++)captureSettledGround(state,resources,{},refs,1/60,motion);assert.equal(captures,movingCount+1);
});
console.log(count+' geometry/callback/frame/shadow checks passed; no browser input or WebGL.');
