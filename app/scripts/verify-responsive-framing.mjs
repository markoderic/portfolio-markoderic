// Current actual mesh vertices and real camera/projection math. No native GPU/DOM.
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {deskPose,deskAngles,DESK_CAMERA} from '../src/prototype/deskCamera.js';
import {arrivalPose} from '../src/prototype/entryCamera.js';
import {LAPTOP,PHONE,fitPhone} from '../src/prototype/deviceGeometry.js';
import {fitPaper,PAPER_WIDTH,PAPER_HEIGHT} from '../src/prototype/paperGeometry.js';
import {projectScreen} from '../src/prototype/screenProjection.js';
import {unprojectPoint} from '../src/prototype/windowState.js';
import {fanEnvelopes} from './support/fan-envelope.mjs';
const dir=new URL('../../docs/redesign/session-35-framing/',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('after-scene.json',dir)));
for(const m of data.meshes){for(const k of Object.keys(m))if(!['positions','indices','name','root','side'].includes(k))delete m[k];}
const sizes=[[1440,900],[1920,1080],[900,700],[800,500]].map(([width,height])=>({width,height}));
const corners=b=>Array.from({length:8},(_,i)=>new T.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z));
const objects={};for(const m of data.meshes)(objects[m.root]??=[]).push(...m.positions.map(p=>new T.Vector3(...p)));
const all=Object.values(objects).flat();
const fan=Object.values(fanEnvelopes()).flatMap(corners);
const open=JSON.parse(fs.readFileSync(new URL('../session-15-drawers/open-desk.json',dir))).meshes.flatMap(m=>m.positions.map(p=>new T.Vector3(...p)));
const context=[...all,...fan,...open];
function camera(size,p){const c=new T.PerspectiveCamera(39,size.width/size.height,.1,100);c.position.copy(p.position);c.lookAt(p.look);c.updateMatrixWorld();return c;}
function bounds(points,size,c){let min=[Infinity,Infinity],max=[-Infinity,-Infinity];for(const p of points){const v=p.clone().project(c);const x=(v.x+1)*size.width/2,y=(1-v.y)*size.height/2;min[0]=Math.min(min[0],x);min[1]=Math.min(min[1],y);max[0]=Math.max(max[0],x);max[1]=Math.max(max[1],y);}return{width:max[0]-min[0],height:max[1]-min[1],margins:[min[0],min[1],size.width-max[0],size.height-max[1]]};}
function rect(w,h,p,q=new T.Quaternion()){return [-1,1].flatMap(x=>[-1,1].map(y=>new T.Vector3(x*w/2,y*h/2,0).applyQuaternion(q).add(p)));}
const rows=[],checks=[];function check(n,f){f();checks.push(n);console.log('PASS '+n);}
check('current furniture, fully open drawers and full fan envelope fit neutral/passive/hover/manual matrix',()=>{
 for(const size of sizes){const row={size,overview:bounds(all,size,camera(size,deskPose(size))),objects:{},minimumMargin:Infinity};
 for(const [name,points]of Object.entries(objects))row.objects[name]=bounds(points,size,camera(size,deskPose(size)));
 const passive=Array.from({length:81},(_,i)=>deskAngles(i*.5)),manual=Array.from({length:9},(_,x)=>Array.from({length:7},(_,y)=>({yaw:-.48+x*.12,pitch:-.16+y*.38/6}))).flat();
 // Project every actual vertex, plus conservative full-motion fan and open drawers.
 for(const [kind,angles]of [...passive.map(a=>['passive',a]),...manual.map(a=>['manual',a])]){
  const b=bounds(context,size,camera(size,deskPose(size,angles)));const margin=Math.min(...b.margins);if(margin<row.minimumMargin){row.minimumMargin=margin;row.worst={kind,angles,...b};}assert.ok(margin>8,JSON.stringify({size,kind,angles,b}));
 }
 for(const angles of passive.filter((_,i)=>i%10===0))for(const key of ['laptop','phone','lamp','printer','fan']){
  const target=new T.Box3().setFromPoints(objects[key]).getCenter(new T.Vector3()),b=bounds(context,size,camera(size,deskPose(size,angles,target)));assert.ok(Math.min(...b.margins)>8,JSON.stringify({size,key,b}));row.minimumHoverMargin=Math.min(row.minimumHoverMargin??Infinity,...b.margins);
 }
 rows.push(row);
 }
});
check('arrival endpoint is exact updated overview; descent and all geometry remain bounded',()=>{
 for(const size of sizes){let y=Infinity;for(let i=0;i<=40;i++){const p=arrivalPose(size,i/40);assert.ok(p.position.y<=y+1e-10);y=p.position.y;assert.ok(Math.min(...bounds(context,size,camera(size,p)).margins)>8);}assert.ok(arrivalPose(size,1).position.distanceTo(deskPose(size).position)<1e-12);}
 // Continuous aspect compensation at its knee, including logical CSS boundaries.
 const a=deskPose({width:1450-1e-4,height:1000}),b=deskPose({width:1450+1e-4,height:1000});assert.ok(a.position.distanceTo(b.position)<1e-5);
});
check('focused physical apertures and outer phone remain complete, independently from overview',()=>{
 const inv=new T.Matrix4().compose(new T.Vector3(...PHONE.desk),new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,-.23)),new T.Vector3(1,1,1)).invert();
 const phonePoints=objects.phone.map(v=>v.clone().applyMatrix4(inv).add(new T.Vector3(...PHONE.picked)));
 for(const row of rows){const size=row.size;row.focus={};for(const mode of ['laptop','phone','paper']){
  const fit=mode==='laptop'?{height:Math.max(220,Math.min(size.height-110,(size.width-96)/1.6,(size.height-32)/1.118))}:mode==='phone'?fitPhone(size):fitPaper(size);
  const w=mode==='laptop'?LAPTOP.width:mode==='phone'?PHONE.width:PAPER_WIDTH,h=mode==='laptop'?LAPTOP.height:mode==='phone'?PHONE.height:PAPER_HEIGHT;
  const q=mode==='laptop'?new T.Quaternion().setFromEuler(new T.Euler(...LAPTOP.screenRotation)):new T.Quaternion();
  const look=new T.Vector3(...(mode==='laptop'?LAPTOP.position:mode==='phone'?PHONE.picked:[-2.2,1.15,1.7]));if(mode==='laptop')look.add(new T.Vector3(...LAPTOP.screenPosition));if(mode==='phone')look.add(new T.Vector3(...PHONE.position));
  const distance=h*size.height/(2*Math.tan(T.MathUtils.degToRad(39/2))*fit.height),p={look,position:look.clone().add(new T.Vector3(0,0,distance).applyQuaternion(q))},c=camera(size,p),aperture=bounds(rect(w,h,look,q),size,c);
  assert.ok(Math.abs(aperture.height-fit.height)<1e-7);assert.ok(Math.min(...aperture.margins)>=47-1e-7);
  row.focus[mode]={aperture,eye:p.position.toArray(),look:p.look.toArray()};
  if(mode==='phone'){const outer=bounds(phonePoints,size,c);assert.ok(Math.min(...outer.margins)>35);row.focus[mode].outer=outer;row.focus[mode].logicalScale=fit.height/(PHONE.logicalWidth/(PHONE.width/PHONE.height));}
  if(mode==='laptop'){row.focus[mode].fullBody=bounds(objects.laptop,size,c);const lid=bounds(objects.laptop.filter(v=>v.y>.18),size,c);assert.ok(Math.min(...lid.margins)>8);row.focus[mode].lid=lid;}
 }
 }
});
check('actual aperture CSS homography and pointer inverse agree throughout the updated transition matrix',()=>{
 let samples=0;
 for(const row of rows){const size=row.size,neutral=deskPose(size);for(const mode of ['laptop','phone','paper']){
  const focus=row.focus[mode],target=new T.Vector3(...focus.look),end=new T.Vector3(...focus.eye);
  const width=mode==='laptop'?LAPTOP.width:mode==='phone'?PHONE.width:PAPER_WIDTH,height=mode==='laptop'?LAPTOP.height:mode==='phone'?PHONE.height:PAPER_HEIGHT;
  const plane=new T.Object3D();plane.position.copy(target);if(mode==='laptop')plane.rotation.set(...LAPTOP.screenRotation);plane.updateMatrixWorld();
  const pixels=mode==='paper'?{width:850,height:1100}:{width:focus.aperture.width,height:focus.aperture.height};
  for(let step=0;step<=24;step++){const t=step/24,c=camera(size,{position:neutral.position.clone().lerp(end,t),look:neutral.look.clone().lerp(target,t)}),host={style:{}};projectScreen(host,plane,c,size,[width,height],pixels);assert.equal(host.style.visibility,'visible');
   const m=host.style.transform.slice(9,-1).split(',').map(Number),css=new T.Matrix4().fromArray(m);
   for(const [u,v]of [[0,0],[1,0],[0,1],[1,1],[.08,.06],[.5,.97],[.75,.43]]){const projected=new T.Vector4(u*pixels.width,v*pixels.height,0,1).applyMatrix4(css),x=projected.x/projected.w,y=projected.y/projected.w,world=new T.Vector3((u-.5)*width,(.5-v)*height,0).applyMatrix4(plane.matrixWorld).project(c),inverse=unprojectPoint(m,x,y);assert.ok(Math.hypot(x-(world.x+1)*size.width/2,y-(1-world.y)*size.height/2)<1e-7);assert.ok(Math.hypot(inverse.x-u*pixels.width,inverse.y-v*pixels.height)<1e-6);samples++;}
  }
 }}console.log(samples+' forward/inverse samples');
});
check('current complete scene has exposed laptop, phone, fan, lamp, printer and drawer rays',()=>{
 const world=new T.Scene();for(const m of data.meshes){const g=new T.BufferGeometry();const xyz=new Float32Array(m.positions.length*3);for(let i=0;i<m.positions.length;i++)xyz.set(m.positions[i],i*3);g.setAttribute('position',new T.BufferAttribute(xyz,3));g.computeBoundingBox();g.computeBoundingSphere();g.setIndex(m.indices);const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:m.side}));mesh.userData.root=m.root;mesh.name=m.name;world.add(mesh);}world.updateMatrixWorld(true);const ray=new T.Raycaster();
 for(const row of rows){const size=row.size,c=camera(size,deskPose(size));row.exposed={};for(const root of ['laptop','phone','fan','lamp','printer','desk']){
  const b=row.objects[root],left=b.margins[0],top=b.margins[1];let witness;
  if(root==='desk'){const handles=world.children.filter(m=>m.name==='drawer-front');assert.equal(handles.length,3);row.drawerControls=[];for(const h of handles){let exposed;const index=h.geometry.index,pos=h.geometry.attributes.position;for(let i=0;i<index.count&&!exposed;i+=3){const target=new T.Vector3();for(let j=0;j<3;j++)target.add(new T.Vector3().fromBufferAttribute(pos,index.getX(i+j)));const q=target.multiplyScalar(1/3).project(c),x=(q.x+1)*size.width/2,y=(1-q.y)*size.height/2;ray.setFromCamera(new T.Vector2(q.x,q.y),c);const hit=ray.intersectObjects(world.children)[0];if(hit?.object===h)exposed={x,y};}assert.ok(exposed,'actual drawer-front triangle exposed');assert.ok(exposed.x>8&&exposed.y>8&&exposed.x<size.width-8&&exposed.y<size.height-8);row.drawerControls.push(exposed);}witness={handles:row.drawerControls};}

  for(const mesh of world.children.filter(m=>m.userData.root===root)){if(witness)break;const q=new T.Box3().setFromObject(mesh).getCenter(new T.Vector3()).project(c),x=(q.x+1)*size.width/2,y=(1-q.y)*size.height/2;ray.setFromCamera(new T.Vector2(q.x,q.y),c);const hit=ray.intersectObjects(world.children)[0];if(hit?.object.userData.root===root)witness={x,y,mesh:hit.object.name};}

  assert.ok(witness,'exposed '+root+' '+JSON.stringify(size));row.exposed[root]=witness;
 }}world.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});
});
fs.writeFileSync(new URL('responsive-measurements.json',dir),JSON.stringify({checks,rows,evidence:'Actual geometry and conservative moving envelope/open drawers; projection math. Not rendered DOM, native controls or browser zoom.'},null,2));
console.log(rows.map(r=>({size:r.size,overview:r.overview,min:r.minimumMargin,hover:r.minimumHoverMargin,focus:r.focus}))); 
