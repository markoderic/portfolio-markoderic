import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {fanParts,streamerGeometry,deformStreamers,fanTabAnchor,FAN_STRIPS,STRIP_ROWS,STRIP_WIDTH} from '../src/prototype/fanGeometry.js';
import {FAN} from '../src/prototype/fanMotion.js';import {fanEnvelope} from './support/fan-envelope.mjs';
const dir=new URL('../../docs/redesign/session-17-desk-fan/',import.meta.url),envelope=fanEnvelope(),parts=fanParts(),g=streamerGeometry();
const checks=[];function check(n,f){f();checks.push(n);console.log('PASS '+n)}
const vertices=g=>Array.from({length:g.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i));
let radial=0,front=-Infinity,back=Infinity,attachmentError=0,lengthError=0;
check('entire rotor clears casing/front/back guard throughout every blade angle',()=>{
 for(const p of vertices(parts.find(p=>p.owner==='rotor').geometry)){radial=Math.max(radial,Math.hypot(p.x,p.y));front=Math.max(front,p.z);back=Math.min(back,p.z);}
 assert.ok(radial<.565-.015);assert.ok(front<.131-.02);assert.ok(back>-.171+.02);
});
check('all-power strip envelope, fixed root, exact segment lengths and downstream-only shapes',()=>{
 for(let power=0;power<=100;power++)for(let frame=0;frame<60;frame++){
  deformStreamers(g,power/100,frame*Math.PI/30);const a=g.attributes.position;
  for(let k=0;k<3;k++){const spec=FAN_STRIPS[k];for(let i=0;i<=STRIP_ROWS;i++){
   const j=k*(STRIP_ROWS+1)*2+i*2,p=new T.Vector3().fromBufferAttribute(a,j),q=new T.Vector3().fromBufferAttribute(a,j+1);
   assert.ok(g.boundingBox.containsPoint(p)&&g.boundingBox.containsPoint(q));assert.ok(p.z>=.3119999);assert.ok(Math.abs(p.distanceTo(q)-STRIP_WIDTH)<1e-7);
   if(!i){attachmentError=Math.max(attachmentError,p.distanceTo(new T.Vector3(spec.x-STRIP_WIDTH/2,spec.y,spec.z)));}
   else {const old=new T.Vector3().fromBufferAttribute(a,j-2);lengthError=Math.max(lengthError,Math.abs(p.distanceTo(old)-spec.length/STRIP_ROWS));}
  }}
 }assert.ok(attachmentError<1e-7&&lengthError<1e-7);
 // Off pose: vertical gravity, not a sheet behind/inside the guard.
 deformStreamers(g,0,5);const a=g.attributes.position;for(let k=0;k<3;k++){const s=FAN_STRIPS[k],end=(k*(STRIP_ROWS+1)+STRIP_ROWS)*2;assert.ok(Math.abs(a.getY(end)-(s.y-s.length))<1e-7);}
});
check('tabs physically meet actual guard spokes and streamer roots lie on each tab',()=>{
 const guard=parts.find(p=>p.name==='fan-guard').geometry,mesh=new T.Mesh(guard,new T.MeshBasicMaterial({side:T.DoubleSide})),tabs=parts.find(p=>p.name==='fan-strip-tabs').geometry;
 const tabMesh=new T.Mesh(tabs,new T.MeshBasicMaterial({side:T.DoubleSide}));
 for(const strip of FAN_STRIPS){const anchor=new T.Vector3(...fanTabAnchor(strip)),ray=new T.Raycaster(anchor.clone().add(new T.Vector3(0,0,.04)),new T.Vector3(0,0,-1),0,.08);assert.ok(ray.intersectObject(mesh).length,'tab meets guard');ray.set(new T.Vector3(strip.x,strip.y-.001,.35),new T.Vector3(0,0,-1));assert.ok(ray.intersectObject(tabMesh).length,'root meets tab');}
});
let minimumGap=Infinity;
check('full moving envelope fits tabletop and clears existing props, chair and all-open drawers',()=>{
 assert.ok(envelope.min.x>-5.4&&envelope.max.x<5.4&&envelope.min.z>-3&&envelope.max.z<3);assert.equal(envelope.min.y,0);
 const sources=[['session-15-drawers/open-desk.json',()=>true],['session-07-chair-refinement/after-render.json',m=>['chair','phone'].includes(m.root)],['session-11-laptop-lighting/laptop-render.json',()=>true],['session-12-plant/after-plant.json',()=>true],['session-16-palette-bin/rose-props.json',()=>true]];
 for(const [path,filter]of sources)for(const m of JSON.parse(fs.readFileSync(new URL('../../docs/redesign/'+path,import.meta.url))).meshes.filter(filter)){
  const b=new T.Box3().setFromPoints(m.positions.map(p=>new T.Vector3(...p)));if(m.root==='desk'&&b.max.y<=.00001)continue; // tabletop support and structure below it
  const gap=Math.max(b.min.x-envelope.max.x,envelope.min.x-b.max.x,b.min.y-envelope.max.y,envelope.min.y-b.max.y,b.min.z-envelope.max.z,envelope.min.z-b.max.z);
  assert.ok(gap>.01,`${m.root}/${m.name}: ${gap}`);minimumGap=Math.min(minimumGap,gap);
 }
});
check('sampled moving geometry lies within the analytic enclosure and base remains supported',()=>{
 for(const p of vertices(parts.find(p=>p.name==='fan-base').geometry))assert.ok(p.y>=0);
 for(let i=0;i<=90;i++){const yaw=FAN.direction-FAN.sweep+i*Math.PI/180;deformStreamers(g,i%2,(i*1.23));for(const p of vertices(g)){p.add(new T.Vector3(...FAN.head)).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(...FAN.pivot)).add(new T.Vector3(...FAN.position));assert.ok(envelope.containsPoint(p));}}
});
fs.writeFileSync(new URL('geometry-checks.json',dir),JSON.stringify({checks,envelope:{min:envelope.min.toArray(),max:envelope.max.toArray()},minimumGap,rotor:{radius:radial,zMin:back,zMax:front,radialClearance:.565-radial,frontGuardGap:.131-front,backGuardGap:back+.171},attachmentError,lengthError,stripSamples:6060,meshes:11,triangles:parts.reduce((n,p)=>n+(p.geometry.index?.count??p.geometry.attributes.position.count)/3,0)+g.index.count/3,note:'Exact yaw extrema + enclosing rotor/strip volumes; actual geometry, static source/offline evidence only.'},null,2)+'\n');
