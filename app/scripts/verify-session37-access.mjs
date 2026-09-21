import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {deskPose} from '../src/prototype/deskCamera.js';import {FAN} from '../src/prototype/fanMotion.js';import {mountFan} from './support/fan-scene-fixture.mjs';import {fanProjection} from './support/fan-projection.mjs';
const dir=new URL('../../docs/redesign/session-37-props/',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('after-scene.json',dir))),scene=new T.Scene(),fan=mountFan(),oracle=fanProjection(),ray=new T.Raycaster(),rows=[];
for(const m of data.meshes.filter(m=>m.root!=='fan')){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(m.positions.flat(),3));g.setIndex(m.indices);g.computeBoundingSphere();const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.name=m.name;mesh.userData.root=m.root;scene.add(mesh);}scene.add(fan.root);scene.updateMatrixWorld(true);
for(const size of [{width:1440,height:900},{width:800,height:500}]){const eye=deskPose(size).position;
 for(let i=0;i<=18;i++){fan.root.getObjectByName('fan-yaw').rotation.y=FAN.direction-FAN.sweep+i*Math.PI/36;scene.updateMatrixWorld(true);const witnesses={};
 for(const root of ['fan','lamp','clock','printer','phone','laptop']){const targets=root==='fan'?['fan-base','fan-guard','fan-housing'].map(n=>fan.root.getObjectByName(n)):scene.children.filter(o=>o.userData.root===root&&(root!=='clock'||o.name==='clock-smoked-lens'));let witness;
 for(const m of targets){const box=new T.Box3().setFromObject(m),target=box.getCenter(new T.Vector3());ray.set(eye,target.sub(eye).normalize());const h=ray.intersectObject(scene,true)[0];if(h&&(root==='fan'?h.object.userData.fanOwned:h.object.userData.root===root)){witness={part:h.object.name,point:h.point.toArray()};break;}}
 assert.ok(witness,root+' accessible at yaw '+fan.root.getObjectByName('fan-yaw').rotation.y);witnesses[root]=witness;
 }
 rows.push({size,yaw:fan.root.getObjectByName('fan-yaw').rotation.y,witnesses});
 }
 // Full fan sweep cannot cross rays to the actual clock lens / printer front / paper center.
 for(const m of scene.children.filter(o=>o.name==='clock-smoked-lens'||o.userData.root==='printer')){const p=new T.Box3().setFromObject(m).getCenter(new T.Vector3());const r=new T.Ray(eye,p.clone().sub(eye).normalize());assert.equal(oracle.hit(r,p.distanceTo(eye)),null);}
}
fs.writeFileSync(new URL('access-checks.json',dir),JSON.stringify({pass:true,rows,fullSweepRayStats:oracle.stats(),note:'Actual triangle first-hit witnesses at 19 yaw poses and two overview sizes; current source geometry; no native input'},null,2)+'\n');console.log('PASS exposed fan/lamp/clock/printer/phone/laptop in 38 poses; full moving enclosure clears clock/printer rays.');
