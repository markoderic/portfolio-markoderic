import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {lampFixture} from './support/brighter-lamp-fixture.mjs';import {LAMP_LIGHT} from '../src/prototype/lampLighting.js';import {deskHit,createDeskMotion,deskPose,deskAngles} from '../src/prototype/deskCamera.js';
const dir=new URL('../../docs/redesign/session-34-brighter-lamp/',import.meta.url),api=await lampFixture(),prior=await lampFixture(true),checks=[];
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);},pos=o=>o.getWorldPosition(new T.Vector3());
const parts=h=>{let spot;h.object.traverse(o=>{if(o.isSpotLight)spot=o});return {spot,emitter:h.object.getObjectByName('lamp-diffuser')};};
const a=api.mount({night:true,reduced:true}),b=prior.mount({night:true,reduced:true});a.frame();b.frame();const A=parts(a),B=parts(b),axis=pos(A.spot.target).sub(pos(A.spot)).normalize();
const snapshot=h=>{const out=[];h.object.traverse(o=>{if(o.isMesh)out.push({name:o.name,vertices:[...o.geometry.attributes.position.array],matrix:o.matrixWorld.toArray(),color:o.material.color.toArray(),emissive:o.material.emissive.toArray(),emission:o.material.emissiveIntensity,roughness:o.material.roughness,metalness:o.material.metalness,side:o.material.side,cast:o.castShadow,receive:o.receiveShadow});});return out;};
check('same real source/diffuser/target/shape; outward rays clear shade and front face remains visible',()=>{
 assert.deepEqual(snapshot(a),snapshot(b));assert.deepEqual(pos(A.spot).toArray(),pos(B.spot).toArray());assert.deepEqual(pos(A.spot.target).toArray(),pos(B.spot.target).toArray());assert.equal(A.spot.parent,A.emitter.parent);assert.equal(A.spot.target.parent,A.emitter.parent);
 const normal=new T.Vector3(0,0,1).transformDirection(A.emitter.matrixWorld);assert.ok(normal.dot(axis)>.999999);const ray=new T.Raycaster();
 for(const polar of [0,.2,.5,LAMP_LIGHT.angle])for(let i=0;i<24;i++){const az=i*Math.PI/12,d=new T.Vector3(Math.sin(polar)*Math.cos(az),-Math.cos(polar),Math.sin(polar)*Math.sin(az)).transformDirection(A.emitter.parent.matrixWorld);ray.set(pos(A.spot),d);assert.equal(ray.intersectObject(a.object,true).filter(h=>h.distance<.35).length,0);}
 for(const angle of [0,30,60,75]){const d=axis.clone().multiplyScalar(Math.cos(angle*Math.PI/180)).add(new T.Vector3(0,0,Math.sin(angle*Math.PI/180))),eye=pos(A.emitter).addScaledVector(d,2);ray.set(eye,pos(A.emitter).sub(eye).normalize());assert.equal(ray.intersectObject(a.object,true)[0]?.object,A.emitter);}
 const inner=.28+(.09-.28)*(LAMP_LIGHT.diffuserY+.26)/(.045+.26);assert.ok(LAMP_LIGHT.diffuserRadius<inner);
});
check('finite local falloff strengthens nearby coverage while respecting actual blockers and finite reach',()=>{
 const old=JSON.parse(fs.readFileSync(new URL('before-measurements.json',dir))),next=JSON.parse(fs.readFileSync(new URL('after-measurements.json',dir)));
 for(const n of ['pool','bookTop','nearDesk'])assert.ok(next.samples[n].preShadowDiffuse>=old.samples[n].preShadowDiffuse*1.99,n);
 assert.equal(next.samples.farFloor.preShadowDiffuse,0);assert.equal(next.samples.printerTop.preShadowDiffuse,0);assert.equal(next.samples.fanBase.preShadowDiffuse,0);
 assert.equal(next.samples.nearDesk.blocker,null);assert.equal(next.samples.bookTop.blocker,null);assert.equal(next.samples.underDesk.blocker,'desk');assert.equal(next.samples.leftDesk.blocker,'laptop');
 for(const key of ['intensity','angle','penumbra','distance','decay'])assert.ok(Number.isFinite(A.spot[key])&&A.spot[key]>0);assert.ok(A.spot.angle<Math.PI/2&&A.spot.penumbra<1);assert.equal(A.spot.distance,B.spot.distance);assert.equal(A.spot.decay,2);
});
check('initial day/night, rapid reversal and reduced motion synchronize local output, emitter and whole room',()=>{
 for(const initial of [false,true]){const h=api.mount({night:initial}),p=parts(h);assert.equal(p.spot.intensity,initial?64:0);const levels=()=>{const a=[];h.scene.traverse(o=>{if(o.isLight&&!o.isSpotLight)a.push(o.intensity)});return a;};h.frame();
 for(let i=0;i<80;i++){h.render({night:i%3!==0});h.frame(i%2?.016:.04);const t=p.spot.intensity/64;assert.ok(t>=0&&t<=1);assert.ok(Math.abs(t-p.emitter.material.emissiveIntensity/3)<1e-12);const [ambient,key,fill]=levels();for(const [actual,expected]of [[ambient,1.1-.72*t],[key,4-3.58*t],[fill,1.1-.38*t],[h.gl.toneMappingExposure,1-.18*t],[p.emitter.material.envMapIntensity,.65-.47*t]])assert.ok(Math.abs(actual-expected)<1e-10);}
 for(const night of [true,false,true,false]){h.render({night,reduced:true});h.frame();assert.equal(p.spot.intensity,night?64:0);assert.equal(p.emitter.material.emissiveIntensity,night?3:0);}
 }
});
check('day unchanged, night retains dark exposure; shared environment never multiplies emission or recolors props',()=>{
 const levels=h=>{const out=[];h.scene.traverse(o=>{if(o.isLight&&!o.isSpotLight)out.push([o.intensity,o.color.toArray(),pos(o).toArray()]);});return out;};
 const day=api.mount({night:false,reduced:true}),old=prior.mount({night:false,reduced:true});day.frame();old.frame();assert.deepEqual(levels(day),levels(old));assert.deepEqual(snapshot(day),snapshot(old));assert.equal(day.gl.toneMappingExposure,old.gl.toneMappingExposure);assert.equal(parts(day).emitter.material.envMapIntensity,parts(old).emitter.material.envMapIntensity);
 assert.equal(a.gl.toneMappingExposure,b.gl.toneMappingExposure);assert.ok(a.gl.toneMappingExposure<1);assert.ok(Math.abs(A.emitter.material.envMapIntensity-.18)<1e-10);
 const m=new T.MeshStandardMaterial({emissive:'#e0e9ff',emissiveIntensity:.7}),mesh=new T.Mesh(new T.BoxGeometry(),m);a.scene.add(mesh);a.frame(1.1);assert.equal(m.emissiveIntensity,.7);assert.equal(m.emissive.getHexString(),'e0e9ff');
 a.object.traverse(o=>{if(o.isMesh&&o!==A.emitter)assert.equal(o.material.emissive.getHex(),0);});
});
check('light/shadow allocation and source directions unchanged; no renderer/environment frequency change',()=>{
 const budget=h=>{const out=[];h.scene.traverse(o=>{if(o.isLight)out.push({type:o.type,cast:o.castShadow,size:o.castShadow?o.shadow.mapSize.toArray():null,position:pos(o).toArray(),near:o.shadow?.camera.near,bias:o.shadow?.bias,normalBias:o.shadow?.normalBias,radius:o.shadow?.radius});});return out;};assert.deepEqual(budget(a),budget(b));assert.equal(budget(a).filter(o=>o.cast).length,2);assert.deepEqual(A.spot.shadow.mapSize.toArray(),[1024,1024]);
 const scene=fs.readFileSync(new URL('../src/prototype/Scene.jsx',import.meta.url),'utf8');assert.match(scene,/Environment resolution=\{128\} frames=\{Infinity\}/);assert.match(scene,/shadows="percentage"/);
});
check('physical lamp click retains drag rejection and hover/camera ray selection',()=>{
 let toggles=0;const h=api.mount({onToggle:()=>toggles++});h.object.userData.deskTarget='lamp';const target=pos(parts(h).emitter.parent);
 for(const angle of [deskAngles(0),deskAngles(10),{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}]){const c=new T.PerspectiveCamera(39,1.6,.1,100),pose=deskPose({width:1440,height:900},angle);c.position.copy(pose.position);c.lookAt(pose.look);c.updateMatrixWorld();const p=target.clone().project(c);assert.equal(deskHit(createDeskMotion(),c,h.scene,{x:(p.x+1)*720,y:(1-p.y)*450,width:1440,height:900})?.id,'lamp');}
 assert.equal(toggles,0);h.lamp.tree.props.onClick({stopPropagation(){},delta:0});assert.equal(toggles,1);h.lamp.tree.props.onClick({stopPropagation(){},delta:8});assert.equal(toggles,1);
});
fs.writeFileSync(new URL('lighting-checks.json',dir),JSON.stringify({checks,passed:true,evidence:'Actual Three geometry and mocked Lamp/Lighting frame callbacks; analytic inputs, not GPU brightness'},null,2)+'\n');console.log(checks.length+' focused lighting groups passed');
