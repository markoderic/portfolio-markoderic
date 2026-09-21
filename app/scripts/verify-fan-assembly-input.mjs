// Actual mounted handlers + actual rays, mocked event delivery; not native input.
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {mountFan,nodes} from './support/fan-scene-fixture.mjs';import {fanHandlers,exposedFan} from '../src/prototype/fanInput.js';import {fanParts} from '../src/prototype/fanGeometry.js';import {FAN} from '../src/prototype/fanMotion.js';
const dir=new URL('../../docs/redesign/session-24-fan-placement-activation/',import.meta.url),results=[];
const oldFile=new URL('../.vite/session24-before-fanInput.mjs',import.meta.url);fs.writeFileSync(oldFile,fs.readFileSync(new URL('before-fanInput.js',dir),'utf8').replace("'./fanMotion.js'","'../src/prototype/fanMotion.js'"));const old=await import(oldFile);
const check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name)};
const event=(extra={})=>({pointerType:'mouse',pointerId:1,button:0,isPrimary:true,clientX:20,clientY:20,delta:0,nativeEvent:{},stopPropagation(){this.stopped=true},...extra});
const f=mountFan(),scene=new T.Scene();scene.add(f.root);scene.updateMatrixWorld(true);const parts=fanParts(),legacy=new Set(parts.filter(p=>p.trigger).map(p=>p.name));parts.forEach(p=>p.geometry.dispose());f.root.traverse(o=>{if(o.isMesh)o.userData.fanTrigger=legacy.has(o.name)});
const raycaster=new T.Raycaster(),witnesses={};
// Surface-normal probes find real visible faces (including rotor through gaps).
for(const name of ['fan-base','fan-neck','fan-housing','fan-guard','fan-front-cap','fan-blades','fan-motor','fan-switch']){
 const m=f.root.getObjectByName(name),a=m.geometry.attributes.position,n=m.geometry.attributes.normal,nm=new T.Matrix3().getNormalMatrix(m.matrixWorld);
 for(let i=0;i<a.count&&!witnesses[name];i+=3){const target=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld),normal=new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm),origin=target.clone().addScaledVector(normal,1);raycaster.set(origin,target.clone().sub(origin).normalize());const hit=raycaster.intersectObject(f.root,true)[0];if(hit?.object===m)witnesses[name]={object:m,ray:raycaster.ray.clone()};}
 assert.ok(witnesses[name],'no surface witness for '+name);
}
check('one mounted group owns handlers; all ten structural/rotor children participate without child handlers',()=>{
 const targets=[...nodes(f.h.tree)].filter(n=>n.props?.onPointerDown);assert.equal(targets.length,1);assert.equal(targets[0].props.name,'desk-fan');for(const n of nodes(f.h.tree).filter(n=>n.type==='mesh'&&n.props.name!=='fan-streamers')){assert.ok(n.props.userData.fanOwned);assert.equal(n.props.onClick,undefined)}
 const strip=f.root.getObjectByName('fan-streamers'),hits=[];strip.raycast(raycaster,hits);assert.equal(hits.length,0);
});
const failedBefore=[];
check('base/stem/housing/guard/hub/blade/motor/switch actual exposed rays toggle once; old exposure rejects expanded targets',()=>{
 for(const [name,w]of Object.entries(witnesses)){let count=0;const mounted=mountFan({onToggle:()=>count++});const h=mounted.h.tree.props,e=event(w);assert.ok(exposedFan(e),name);h.onPointerOver(e);h.onPointerDown(e);h.onPointerUp(e);h.onClick(e);h.onClick(e);assert.equal(count,1,name);assert.ok(e.stopped&&e.nativeEvent.sceneObject);if(!old.exposedFan(e))failedBefore.push(name);}
 for(const name of ['fan-neck','fan-housing','fan-guard','fan-front-cap','fan-blades','fan-motor'])assert.ok(failedBefore.includes(name));
});
check('cross-child out retains assembly hover/press; actual head motion before release still toggles once',()=>{
 let count=0;const input={},h=fanHandlers(input,true,()=>count++),base=event(witnesses['fan-base']);h.onPointerOver(base);h.onPointerDown(base);h.onPointerOut({...base,intersections:[{object:f.root.getObjectByName('fan-housing')}]});assert.ok(input.fanPress&&input.fanHover);
 f.root.getObjectByName('fan-yaw').rotation.y=FAN.direction+.5;scene.updateMatrixWorld(true);const point=new T.Box3().setFromObject(f.root.getObjectByName('fan-motor')).getCenter(new T.Vector3()),origin=point.clone().add(new T.Vector3(2,2,2)),up=event({object:f.root.getObjectByName('fan-motor'),ray:new T.Ray(origin,point.sub(origin).normalize())});assert.ok(exposedFan(up));h.onPointerUp(up);h.onClick(up);h.onClick(up);assert.equal(count,1);f.root.getObjectByName('fan-yaw').rotation.y=FAN.direction;scene.updateMatrixWorld(true);
});
check('a stationary ray can change head children through oscillation without canceling or double toggling',()=>{
 const yaw=f.root.getObjectByName('fan-yaw'),origin=new T.Vector3(11,14,21),pivot=new T.Vector3(...FAN.position).add(new T.Vector3(...FAN.pivot));let witness;
 for(let x=-8;x<=8&&!witness;x++)for(let y=-8;y<=8&&!witness;y++){
  const target=pivot.clone().add(new T.Vector3(x*.075,.23+y*.075,0));raycaster.set(origin,target.sub(origin).normalize());yaw.rotation.y=FAN.direction;scene.updateMatrixWorld(true);const a=raycaster.intersectObject(f.root,true)[0];
  yaw.rotation.y=FAN.direction+.2;scene.updateMatrixWorld(true);const b=raycaster.intersectObject(f.root,true)[0];if(a&&b&&a.object!==b.object&&a.object.userData.fanOwned&&b.object.userData.fanOwned)witness={a,b,ray:raycaster.ray.clone()};
 }
 assert.ok(witness);let count=0;const input={},h=fanHandlers(input,true,()=>count++);yaw.rotation.y=FAN.direction;scene.updateMatrixWorld(true);const down=event({object:witness.a.object,ray:witness.ray});h.onPointerDown(down);yaw.rotation.y=FAN.direction+.2;scene.updateMatrixWorld(true);h.onPointerOut({...down,intersections:[{object:witness.b.object}]});const up=event({object:witness.b.object,ray:witness.ray});h.onPointerUp(up);h.onClick(up);h.onClick(up);assert.equal(count,1);yaw.rotation.y=FAN.direction;scene.updateMatrixWorld(true);
});
check('primary mouse/touch reject exit/cancel/drag/orbit/occlusion/disabled/hidden/wrong pointer/right/nonprimary/held click',()=>{
 for(const pointerType of ['mouse','touch'])for(const mode of ['click','exit','cancel','drag','orbit','occluded','disabled','hidden','wrong-up','right','nonprimary','held','release-outside']){
 let count=0,exposed=true;const input={},h=fanHandlers(input,mode!=='disabled',()=>count++,()=>exposed),e=event({pointerType,button:mode==='right'?2:0,isPrimary:mode!=='nonprimary'});
 h.onPointerDown(e);if(mode==='exit'){h.onPointerOut({...e,intersections:[]});exposed=false;} // Remains outside at release, rather than simulating a grille gap.
if(mode==='cancel')h.onPointerCancel(e);if(mode==='drag')h.onPointerMove({...e,clientX:27});if(mode==='orbit'){input.dragging=true;h.onPointerMove(e);input.dragging=false;}if(mode==='hidden')input.hidden=true;if(mode==='occluded'||mode==='release-outside')exposed=false;
 if(mode!=='held')h.onPointerUp(mode==='wrong-up'?{...e,pointerId:2}:e);h.onClick(e);h.onClick(e);assert.equal(count,mode==='click'?1:0,pointerType+'/'+mode);
 }
});
check('second pointer and duplicate child dispatch cannot replace or repeat primary gesture',()=>{
 let count=0;const input={},h=fanHandlers(input,true,()=>count++,()=>true),e=event();h.onPointerDown(e);const p=input.fanPress;h.onPointerDown(e);const secondary=event({pointerId:2,isPrimary:false});h.onPointerDown(secondary);assert.ok(secondary.nativeEvent.sceneObject);h.onPointerCancel({...e,pointerId:2});assert.equal(input.fanPress,p);h.onPointerUp({...e,pointerId:2});h.onClick({...e,pointerId:2});assert.equal(count,0);assert.equal(input.fanPress,p);h.onPointerUp(e);h.onClick(e);h.onClick(e);assert.equal(count,1);
});
check('nearest unrelated mesh physically occludes fan, hidden/shadow-only meshes do not; no camera target',()=>{
 const e=event(witnesses['fan-base']),block=new T.Mesh(new T.BoxGeometry(.1,.1,.1));block.position.copy(e.ray.origin).addScaledVector(e.ray.direction,.1);scene.add(block);assert.equal(exposedFan(e),false);block.visible=false;assert.ok(exposedFan(e));block.visible=true;block.userData.shadowOnly=true;assert.ok(exposedFan(e));scene.remove(block);f.root.traverse(o=>assert.equal(o.userData.deskTarget,undefined));
});
fs.writeFileSync(new URL('assembly-input.json',dir),JSON.stringify({checks:results,failedBefore,witnessParts:Object.keys(witnesses),note:'Actual current fan JSX/rays and old exposure function. Explicit mocked event delivery, not R3F DOM/native pointer reliability.'},null,2)+'\n');
