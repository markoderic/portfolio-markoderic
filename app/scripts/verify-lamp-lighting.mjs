import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {lampFixture} from './support/lamp-scene-fixture.mjs';
import {LAMP_LIGHT} from '../src/prototype/lampLighting.js';
import {deskHit,createDeskMotion,deskPose,deskAngles} from '../src/prototype/deskCamera.js';
const dir=new URL('../../docs/redesign/session-10-lamp-lighting/',import.meta.url),api=await lampFixture(),old=await lampFixture(true);
const results=[],details={},check=(name,fn)=>{fn();results.push(name);console.log('PASS '+name);};
function parts(h){let emitter,spot;h.scene.traverse(o=>{if(o.isMesh&&o.geometry.type==='CircleGeometry')emitter=o;if(o.isSpotLight)spot=o;});return {emitter,spot,head:emitter.parent};}
const after=api.mount({night:true,reduced:true}),before=old.mount({night:true,reduced:true});after.frame();before.frame();
const a=parts(after),b=parts(before),v=x=>new T.Vector3(...x),pos=o=>o.getWorldPosition(new T.Vector3());
const axis=pos(a.spot.target).sub(pos(a.spot)).normalize(),ray=new T.Raycaster();
check('actual front face points through the opening; under-head rays reach it, upper rays do not',()=>{
 const normal=v([0,0,1]).transformDirection(a.emitter.matrixWorld);assert.ok(normal.dot(axis)>.999999);assert.equal(a.emitter.material.side,T.FrontSide);
 for(const angle of [0,30,60,75]){const d=axis.clone().multiplyScalar(Math.cos(angle*Math.PI/180)).add(v([0,0,Math.sin(angle*Math.PI/180)])),eye=pos(a.emitter).addScaledVector(d,2);ray.set(eye,pos(a.emitter).sub(eye).normalize());assert.equal(ray.intersectObject(after.object,true)[0]?.object,a.emitter);}
 const eye=pos(a.emitter).addScaledVector(axis,-2);ray.set(eye,pos(a.emitter).sub(eye).normalize());assert.equal(ray.intersectObject(a.emitter,false).length,0);assert.ok(ray.intersectObject(after.object,true).length>0);
 const oldEye=pos(b.emitter).addScaledVector(axis,2);ray.set(oldEye,pos(b.emitter).sub(oldEye).normalize());assert.equal(ray.intersectObject(b.emitter,false).length,0);
 const innerRadius=.28+(.09-.28)*(LAMP_LIGHT.diffuserY+.26)/(.045+.26);assert.ok(LAMP_LIGHT.diffuserRadius<innerRadius);details.innerRadialClearance=innerRadius-LAMP_LIGHT.diffuserRadius;
});
check('one source lies just outside the shade; cone rays clear the lip before reaching nearby objects',()=>{
 assert.equal(a.spot.parent,a.head);assert.equal(a.spot.target.parent,a.head);assert.equal(a.spot.position.y,LAMP_LIGHT.source[1]);assert.ok(a.spot.position.y<LAMP_LIGHT.openingY);
 const meshes=[];after.object.traverse(o=>{if(o.isMesh)meshes.push(o)});
 for(const polar of [0,.2,.5,.95])for(let i=0;i<24;i++){const az=i*Math.PI/12,d=v([Math.sin(polar)*Math.cos(az),-Math.cos(polar),Math.sin(polar)*Math.sin(az)]).transformDirection(a.head.matrixWorld);ray.set(pos(a.spot),d);assert.equal(ray.intersectObjects(meshes,false).filter(h=>h.distance<.35).length,0);}
 assert.equal(a.spot.shadow.mapSize.x,1024);assert.equal(a.spot.shadow.camera.near,.035);assert.equal(a.spot.castShadow,true);
});
function direct(spot,point){const delta=v(point).sub(pos(spot)),distance=delta.length(),direction=pos(spot.target).sub(pos(spot)).normalize(),cos=delta.normalize().dot(direction),edge=Math.cos(spot.angle),core=Math.cos(spot.angle*(1-spot.penumbra)),t=T.MathUtils.clamp((cos-edge)/(core-edge),0,1);return spot.intensity*t*t*(3-2*t)/Math.max(distance**spot.decay,.01)*Math.max(0,1-(distance/spot.distance)**4)**2*Math.max(0,-delta.y);}
check('cone provides local desk/book coverage with smooth falloff and no far-room contribution',()=>{
 const samples={pool:[2.4,.02,-1.2],books:[2.55,.27,-1.2],nearDesk:[1.3,.02,-.6],edgeDesk:[.8,.02,0],farDesk:[-4,.02,2],floor:[2.4,-6.3,-1.2]};details.analyticDiffuse={};
 for(const [name,p]of Object.entries(samples))details.analyticDiffuse[name]={before:direct(b.spot,p),after:direct(a.spot,p)};
 assert.ok(details.analyticDiffuse.pool.after>details.analyticDiffuse.pool.before*2);assert.ok(details.analyticDiffuse.books.after>1);assert.ok(details.analyticDiffuse.nearDesk.after>0);assert.ok(details.analyticDiffuse.nearDesk.after<details.analyticDiffuse.pool.after);assert.equal(details.analyticDiffuse.farDesk.after,0);assert.equal(details.analyticDiffuse.floor.after,0);
 // Actual desk material receives shadows, and blocks the source-to-under-table path.
 const desk=api.materialize(api.harness(api.Desk,{}).tree);desk.updateMatrixWorld(true);const under=v([2.4,-1,-1.2]);ray.set(pos(a.spot),under.clone().sub(pos(a.spot)).normalize());const hit=ray.intersectObject(desk,true)[0];assert.ok(hit&&hit.distance<under.distanceTo(pos(a.spot)));assert.equal(hit.object.castShadow,true);assert.equal(hit.object.receiveShadow,true);
});
check('emission and illumination share one transition during rapid toggles, reduced motion and initial mounts',()=>{
 for(const initialNight of [false,true]){const h=api.mount({night:initialNight}),p=parts(h);assert.equal(p.spot.intensity/LAMP_LIGHT.intensity,p.emitter.material.emissiveIntensity/LAMP_LIGHT.emission);assert.equal(p.spot.intensity,initialNight?32:0);
 for(let i=0;i<40;i++){const night=i%3!==0;h.render({night});h.frame(i%2?.016:.04);const value=p.spot.intensity/32;assert.ok(value>=0&&value<=1);assert.ok(Math.abs(value-p.emitter.material.emissiveIntensity/3)<1e-12);}
 for(const night of [true,false,true,false]){h.render({night,reduced:true});h.frame();assert.equal(p.spot.intensity,night?32:0);assert.equal(p.emitter.material.emissiveIntensity,night?3:0);}
 }
});
check('shade/support geometry and all global lighting/exposure are preserved; exterior never becomes emissive',()=>{
 function shell(h){const list=[];h.object.traverse(o=>{if(o.isMesh&&o.geometry.type!=='CircleGeometry')list.push({positions:[...o.geometry.attributes.position.array],matrix:o.matrixWorld.toArray(),color:o.material.color.toArray()});});return list;}
 assert.deepEqual(shell(after),shell(before));const boxA=new T.Box3().setFromObject(after.object),boxB=new T.Box3().setFromObject(before.object);assert.ok(boxA.min.distanceTo(boxB.min)<1e-8&&boxA.max.distanceTo(boxB.max)<1e-8);
 for(const night of [false,true]){const h=api.mount({night,reduced:true}),oldH=old.mount({night,reduced:true});h.frame();oldH.frame();const levels=x=>{const list=[];x.scene.traverse(o=>{if(o.isLight&&!o.isSpotLight)list.push([o.type,o.intensity,o.color.toArray(),pos(o).toArray()])});return list;};assert.deepEqual(levels(h),levels(oldH));assert.equal(h.gl.toneMappingExposure,oldH.gl.toneMappingExposure);h.object.traverse(o=>{if(o.isMesh&&o.geometry.type!=='CircleGeometry')assert.equal(o.material.emissive.getHex(),0);});}
 details.outerBounds={min:boxA.min.toArray(),max:boxA.max.toArray()};
});
check('lamp remains actionable across camera poses and hovering cannot invoke its toggle',()=>{
 let toggles=0;const h=api.mount({onToggle:()=>toggles++});h.object.userData.deskTarget='lamp';const target=pos(parts(h).head);
 for(const angle of [deskAngles(0),deskAngles(10),{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}]){const c=new T.PerspectiveCamera(39,1.6,.1,100),pose=deskPose({width:1440,height:900},angle);c.position.copy(pose.position);c.lookAt(pose.look);c.updateMatrixWorld();const p=target.clone().project(c);assert.equal(deskHit(createDeskMotion(),c,h.scene,{x:(p.x+1)*720,y:(1-p.y)*450,width:1440,height:900})?.id,'lamp');}
 assert.equal(toggles,0);assert.equal(h.lamp.tree.props.onPointerOver,undefined);h.lamp.tree.props.onClick({stopPropagation(){},delta:0});assert.equal(toggles,1);h.lamp.tree.props.onClick({stopPropagation(){},delta:8});assert.equal(toggles,1);
 details.neutralOpeningFacing=axis.dot(v([11,14,21]).sub(pos(a.emitter)).normalize());
});
fs.writeFileSync(new URL('lamp-checks.json',dir),JSON.stringify({checks:results,details,evidence:'Actual JSX/Three geometry and mocked callback state; analytic diffuse excludes shadows, BRDF, tone mapping and exposure. Not rendered brightness.'},null,2)+'\n');console.log(results.length+' lamp checks passed');
