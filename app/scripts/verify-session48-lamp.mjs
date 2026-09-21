import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {lampFixture} from './support/brighter-lamp-fixture.mjs';import {LAMP_LIGHT} from '../src/prototype/lampLighting.js';
const dir=new URL('../../docs/redesign/session-48-lamp-coverage/',import.meta.url),api=await lampFixture(),results=[],details={};const check=(n,fn)=>{fn();results.push(n);console.log('PASS '+n)};
const pos=o=>o.getWorldPosition(new T.Vector3());const get=h=>{let spot;h.object.traverse(o=>{if(o.isSpotLight)spot=o});return {spot,emitter:h.object.getObjectByName('lamp-diffuser'),head:h.object.getObjectByName('lamp-head')}};
const h=api.mount({night:true,reduced:true});h.frame();const {spot,emitter,head}=get(h),axis=pos(spot.target).sub(pos(spot)).normalize();
check('physical head, diffuser and spotlight share outward direction; full cone clears the shade lip',()=>{
 assert.equal(spot.parent,head);assert.equal(spot.target.parent,head);assert.ok(new T.Vector3(0,0,1).transformDirection(emitter.matrixWorld).dot(axis)>1-1e-12);assert.ok(spot.position.y<LAMP_LIGHT.openingY);
 const ray=new T.Raycaster();let rays=0;for(const polar of [0,.2,.5,.9,LAMP_LIGHT.angle])for(let i=0;i<32;i++){const az=i*Math.PI/16,d=new T.Vector3(Math.sin(polar)*Math.cos(az),-Math.cos(polar),Math.sin(polar)*Math.sin(az)).transformDirection(head.matrixWorld);ray.set(pos(spot),d);assert.equal(ray.intersectObject(head,true).filter(x=>x.distance<.35).length,0);rays++}
 const normal=new T.Vector3(0,0,1).transformDirection(emitter.matrixWorld);ray.set(pos(emitter).addScaledVector(normal,1),normal.clone().negate());assert.equal(ray.intersectObject(head,true)[0].object,emitter);
 details.head={source:pos(spot).toArray(),target:pos(spot.target).toArray(),axis:axis.toArray(),rays,rotation:head.rotation.toArray(),shadowMap:spot.shadow.mapSize.toArray()};
});
check('selected actual transform matches candidate B; useful center/front/left coverage grows without a concentrated book hotspot',()=>{
 const all=JSON.parse(fs.readFileSync(new URL('candidate-coverage.json',dir))).results,before=all.find(x=>x.name==='before'),after=all.find(x=>x.name==='B');assert.ok(pos(spot).distanceTo(new T.Vector3(...after.source))<1e-10);assert.ok(axis.distanceTo(new T.Vector3(...after.axis))<1e-10);
 for(const n of ['angle','penumbra','distance','intensity'])assert.equal(spot[n],after[n]);assert.ok(after.coverage[.5]>before.coverage[.5]*2);assert.ok(after.samples.books.value<before.samples.books.value*.5);assert.ok(after.max<before.max*1.1);for(const n of ['phone','keyboard','centerDesk','printerSide','frontWork'])assert.ok(after.samples[n].value>before.samples[n].value);
 details.coverage={before:before.coverage,after:after.coverage,oldGridMaximum:before.max,newGridMaximum:after.max};spot.shadow.updateMatrices(spot);const frustumSamples={};for(const [name,sample]of Object.entries(after.samples)){if(sample.value<=0)continue;const q=new T.Vector3(...sample.point).project(spot.shadow.camera);assert.ok(Math.abs(q.x)<=1&&Math.abs(q.y)<=1&&Math.abs(q.z)<=1,name);frustumSamples[name]=q.toArray()}details.shadowFrustum=frustumSamples;
});
check('current actual geometry retains occlusion; sampled light is not credited through laptop/shade/furniture',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('after-scene.json',dir))),scene=new T.Scene();for(const m of data.meshes){if(!m.castShadow)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.positions.flat(),3));g.setIndex(m.indices);const o=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));o.name=m.root+'/'+m.name;scene.add(o)}scene.updateMatrixWorld(true);
 const selected=JSON.parse(fs.readFileSync(new URL('candidate-coverage.json',dir))).results.find(x=>x.name==='B');details.occlusion={};for(const [name,{point,value}]of Object.entries(selected.samples)){const delta=new T.Vector3(...point).sub(pos(spot));const ray=new T.Raycaster(pos(spot),delta.clone().normalize(),.035,delta.length()-.025),hit=ray.intersectObject(scene,true)[0];details.occlusion[name]={point,preShadowDiffuse:value,blocker:hit?.object.name??null,distance:hit?.distance??null}}
 assert.ok(Object.values(details.occlusion).some(x=>x.blocker));assert.ok(Object.values(details.occlusion).some(x=>!x.blocker&&x.preShadowDiffuse>1));
 scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
});
check('current-state reversals, reduced motion and owned resources stay synchronized with unchanged room settings',()=>{
 for(const initial of [false,true]){const x=api.mount({night:initial}),p=get(x),target=p.spot.target,shadow=p.spot.shadow,materials=[];x.object.traverse(o=>{if(o.isMesh)materials.push(o.material)});x.frame();
 for(let i=0;i<80;i++){x.render({night:i%3!==0});x.frame(i%2?.016:.04);const mix=p.spot.intensity/LAMP_LIGHT.intensity;assert.ok(mix>=0&&mix<=1);assert.ok(Math.abs(mix-p.emitter.material.emissiveIntensity/3)<1e-12);const levels=[];x.scene.traverse(o=>{if(o.isLight&&!o.isSpotLight)levels.push(o.intensity)});for(const [a,b]of [[levels[0],1.1-.72*mix],[levels[1],4-3.58*mix],[levels[2],1.1-.38*mix],[x.gl.toneMappingExposure,1-.18*mix]])assert.ok(Math.abs(a-b)<1e-10);assert.equal(p.spot.target,target);assert.equal(p.spot.shadow,shadow)}
 for(const night of [false,true,false]){x.render({night,reduced:true});x.frame();assert.equal(p.spot.intensity,night?96:0);assert.equal(p.emitter.material.emissiveIntensity,night?3:0)}
 const now=[];x.object.traverse(o=>{if(o.isMesh)now.push(o.material)});assert.deepEqual(now,materials);
 }
});
check('day/room/exposure and light allocations unchanged; only articulated head and local beam differ',()=>{
 const before=JSON.parse(fs.readFileSync(new URL('before-measurements.json',dir))),after=JSON.parse(fs.readFileSync(new URL('after-measurements.json',dir)));const room=r=>Object.fromEntries(Object.entries(r).map(([key,value])=>[key,{...value,lights:value.lights.filter(l=>l.type!=='SpotLight')} ]));assert.deepEqual(room(after.room),room(before.room));assert.deepEqual(after.screen,before.screen);
 const x=api.mount({night:false,reduced:true});x.frame();assert.equal(get(x).spot.intensity,0);assert.equal(get(x).emitter.material.emissiveIntensity,0);assert.equal(x.gl.toneMappingExposure,1);
 assert.equal(spot.shadow.mapSize.x,1024);assert.equal(spot.shadow.camera.near,.035);assert.equal(spot.shadow.normalBias,.008);assert.equal(spot.shadow.bias,-.0001);assert.equal(spot.shadow.radius,4);
 const lights=[];h.scene.traverse(o=>{if(o.isLight)lights.push({type:o.type,cast:o.castShadow,map:o.shadow?.mapSize.toArray()})});assert.equal(lights.filter(x=>x.type==='SpotLight').length,1);assert.equal(lights.filter(x=>x.cast).length,2);details.budget=lights;
 let toggles=0;const click=api.mount({onToggle:()=>toggles++});click.lamp.tree.props.onClick({delta:0,stopPropagation(){}});click.lamp.tree.props.onClick({delta:8,stopPropagation(){}});assert.equal(toggles,1);
});
fs.writeFileSync(new URL('lamp-checks.json',dir),JSON.stringify({results,details,boundary:'Actual Three source/geometry; modeled frames/renderer and analytic pre-material inputs, not native brightness, GPU time or raytraced illuminance.'},null,2));
