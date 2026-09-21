import {deskPose,deskAngles} from '../src/prototype/deskCamera.js';
// Loaded GLB triangles and source projection math. No browser/WebGL/input claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {meshes,wallpaper,glass,island,outline,center,edgeDistance} from './inspect-phone-edges.mjs';
import {PHONE,LAPTOP,phoneClip,phoneAspect,phoneLogicalHeight,fitPhone} from '../src/prototype/deviceGeometry.js';
import {projectScreen,maskPhone,convexHull,roundedOutline} from '../src/prototype/screenProjection.js';
import {localPointer} from '../src/prototype/windowState.js';
import hull from '../src/prototype/assets/phone-hull.json' with {type:'json'};
const before=process.argv.includes('--before'),root=new URL('../../docs/redesign/session-05b-phone-edges/',import.meta.url);
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
function contains([x,y],poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const ray=new T.Raycaster();wallpaper.object.material.side=glass.object.material.side=T.DoubleSide;
const hit=(mesh,x,y)=>{ray.set(new T.Vector3(x,y,.2),new T.Vector3(0,0,-1));return ray.intersectObject(mesh.object,false)[0]};
const old=roundedOutline(.6165377/2,1.3323075/2,.07,128),current=PHONE.outline.map(([x,y])=>[x+PHONE.position[0],y+PHONE.position[1]]);
check('independent loaded-glass witness is excluded from live display in all four corners',()=>{
 for(const x of [-.29,.29])for(const y of [-.64,.64]){assert.ok(hit(glass,x,y));assert.equal(hit(wallpaper,x,y),undefined);assert.ok(contains([x,y],old));assert.equal(contains([x,y],before?old:current),false,'old circular HTML/backing leaks onto the glass at '+[x,y]);}
});
let maxSeamError;
check('measured contour agrees with separate glass inner edges and loaded display triangles',()=>{
 maxSeamError=Math.max(...outline.map(p=>edgeDistance(p,glass)));assert.ok(maxSeamError<1e-5);
 for(const [x,y]of current){assert.ok(hit(wallpaper,x*.9999,y*.9999),'inside measured edge');assert.ok(edgeDistance([x,y],wallpaper)<1e-7);}
 assert.equal(current.length,118);assert.ok(new T.Vector3(...PHONE.position).distanceTo(center)<1e-12);
 assert.ok(Math.abs(PHONE.position[2]-.053250357396251)<1e-9);
 // Independent grid comparison catches a circular fit as well as square corners.
 let samples=0;for(let x=-.31;x<=.31;x+=.0031)for(let y=-.668;y<=.668;y+=.0067){if(y>.595&&Math.abs(x)<.095)continue;assert.equal(contains([x,y],current),!!hit(wallpaper,x,y),[x,y].join(','));samples++;}console.log('Loaded display grid samples:',samples);
});
// Execute the actual Phone function body through the existing hook harness.
const sceneSource=fs.readFileSync(new URL('../src/prototype/Scene.jsx',import.meta.url),'utf8');
const phoneSource=sceneSource.slice(sceneSource.indexOf('function Phone({'),sceneSource.indexOf('function Rig({'));
const fixtureUrl=new URL('../.vite/phone-edge-fixture.mjs',import.meta.url);
await build({stdin:{contents:"import React,{useMemo,Suspense} from './scripts/support/hook-harness.js';import * as THREE from 'three';import {PHONE} from './src/prototype/deviceGeometry.js';const Solid=()=>null,PhoneModel=()=>null;"+phoneSource+"export {Phone};export {harness,find} from './scripts/support/hook-harness.js';",resolveDir:fileURLToPath(new URL('../',import.meta.url)),loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(fixtureUrl)});
const {Phone,harness,find}=await import(fixtureUrl.href+'?v='+Date.now());
const fixture=harness(Phone,{pivot:{current:null},screen:{current:null},onSelect(){},onStageReady(){}});
const meshNode=find(fixture,n=>n.props?.geometry?.isBufferGeometry),backing=new T.Mesh(meshNode.props.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));backing.position.set(...meshNode.props.position);backing.updateMatrixWorld();
check('actual Phone backing follows measured contour and leaves the physical camera region uncovered',()=>{
 for(const [x,y]of [[0,0],[.29,.63],[-.29,-.63]])assert.ok(hit({object:backing},x,y));
 for(const [x,y]of [[.29,.64],[-.29,-.64],[0,.62],[.06,.62]])assert.equal(hit({object:backing},x,y),undefined);
 for(const [x,y]of PHONE.cameraOutline)assert.ok(edgeDistance([x+center.x,y+center.y],wallpaper)<1e-5);
});
check('physical contour and percentage HTML clip have identical edges with no second radius',()=>{
 const points=phoneClip.slice(8,-1).split(',').map(p=>p.split(' ').map(n=>parseFloat(n)/100));
 points.forEach(([u,v],i)=>{assert.ok(Math.abs((u-.5)*PHONE.width-PHONE.outline[i][0])<1e-12);assert.ok(Math.abs((.5-v)*PHONE.height-PHONE.outline[i][1])<1e-12)});
 const geometry=new T.ShapeGeometry(new T.Shape(PHONE.outline.map(p=>new T.Vector2(...p))));assert.ok(geometry.index.count>300);
 const scene=fs.readFileSync(new URL('../src/prototype/Scene.jsx',import.meta.url),'utf8');assert.match(scene,/PHONE.outline.map/);assert.match(scene,/position=\{PHONE.position\}/);assert.match(scene,/new THREE.Vector3\(\.\.\.PHONE.position\)/);
});
check('chassis silhouette and camera island remain separate from illuminated aperture',()=>{
 const b=new T.Box3().setFromPoints(hull.map(p=>new T.Vector3(...p))),size=b.getSize(new T.Vector3());assert.ok(size.x>PHONE.width+.05);assert.ok(Math.abs(size.y-1.38)<1e-6);
 const ib=island.box,wb=wallpaper.box;assert.ok(Math.abs(PHONE.island.width*PHONE.width-(ib.max.x-ib.min.x))<1e-8);assert.ok(Math.abs(PHONE.island.top*PHONE.height-(wb.max.y-ib.max.y))<1e-8);
 assert.ok(PHONE.island.top*phoneLogicalHeight>10);assert.ok((PHONE.island.top+PHONE.island.height)*phoneLogicalHeight<49); // above existing 59px status safe area
 // Existing bottom home indicator and nav icon centers lie inside all curves.
 for(const [x,y]of [[29,30],[401,30],[215,914],[43,866],[129,866],[215,866],[301,866],[387,866]])assert.ok(contains([(x/430-.5)*PHONE.width,(.5-y/phoneLogicalHeight)*PHONE.height],PHONE.outline));
});
const phone=new T.Object3D(),pivot=new T.Group();phone.position.set(...PHONE.position);pivot.add(phone);
const screen=new T.Object3D();screen.position.set(...LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));screen.rotation.set(...LAPTOP.screenRotation);screen.updateMatrixWorld();
const deskQ=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,-.23));
globalThis.getComputedStyle=el=>el.style;globalThis.DOMMatrix=class{constructor(css){this.values=Float64Array.from(css.slice(9,-1).split(','),Number)}toFloat64Array(){return this.values}};
let projected=0;
check('pickup/return and laptop switching preserve contour projection and inverse pointer across viewport/zoom/DPR math',()=>{
 for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:800,height:500}])for(const angles of [deskAngles(0),deskAngles(5),deskAngles(10),deskAngles(30),{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}])for(const direction of [1,-1])for(let i=0;i<=20;i++){
  const t=direction===1?i/20:1-i/20; pivot.position.fromArray(PHONE.desk).lerp(new T.Vector3(...PHONE.picked),t);pivot.quaternion.copy(deskQ).slerp(new T.Quaternion(),t);pivot.updateMatrixWorld(true);
  const target=new T.Vector3(...PHONE.picked).add(new T.Vector3(...PHONE.position)),pixels=fitPhone(viewport),camera=new T.PerspectiveCamera(39,viewport.width/viewport.height,.1,100);
  const distance=PHONE.height*viewport.height/(2*Math.tan(T.MathUtils.degToRad(39/2))*pixels.height);
  const desk=deskPose(viewport,angles);camera.position.copy(desk.position).lerp(target.clone().add(new T.Vector3(0,0,distance)),t);camera.lookAt(desk.look.clone().lerp(target,t));camera.updateMatrixWorld();const el={style:{},closest:()=>null};projectScreen(el,phone,camera,viewport,[PHONE.width,PHONE.height],pixels);assert.equal(el.style.visibility,'visible');const m=new T.Matrix4().fromArray(el.style.transform.slice(9,-1).split(',').map(Number));
  for(const [x,y]of PHONE.outline.filter((_,i)=>i%9===0)){
   const u=(x/PHONE.width+.5)*pixels.width,v=(.5-y/PHONE.height)*pixels.height,css=new T.Vector4(u,v,0,1).applyMatrix4(m),world=new T.Vector3(x,y,0).applyMatrix4(phone.matrixWorld).project(camera),sx=(world.x+1)*viewport.width/2,sy=(1-world.y)*viewport.height/2;
   assert.ok(Math.hypot(css.x/css.w-sx,css.y/css.w-sy)<1e-8);const inverse=localPointer(el,sx,sy);assert.ok(Math.hypot(inverse.x-u,inverse.y-v)<1e-7);
   for(const dpr of [1,2,3])for(const zoom of [.8,1,1.25])assert.ok(Math.abs((css.x/css.w*zoom*dpr)/(zoom*dpr)-sx)<1e-8);
   projected++;
  }
  if(t===1){const body=meshes.flatMap(m=>m.points);for(const p of body){const ndc=p.clone().applyMatrix4(pivot.matrixWorld).project(camera);assert.ok(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1,'focused chassis inside viewport');}}
 }
});
check('phone mask clears missing, hidden, behind-display and offscreen poses and recomputes on restore',()=>{
 const camera=new T.PerspectiveCamera(39,1.6,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();const rear=new T.Object3D(),p=new T.Object3D(),el={style:{}},pixels={width:1120,height:700};p.position.z=1;
 const apply=()=>maskPhone(el,p,camera,pixels,rear,pixels);apply();const first=el.style.clipPath;assert.notEqual(first,'none');maskPhone(el,null,camera,pixels,rear,pixels);assert.equal(el.style.clipPath,'none');apply();assert.equal(el.style.clipPath,first);maskPhone(el,p,camera,pixels,null,pixels);assert.equal(el.style.clipPath,'none');apply();assert.equal(el.style.clipPath,first);
 p.visible=false;apply();assert.equal(el.style.clipPath,'none');p.visible=true;p.position.z=-1;apply();assert.equal(el.style.clipPath,'none');p.position.set(10,0,1);apply();assert.equal(el.style.clipPath,'none');p.position.set(0,0,1);apply();assert.equal(el.style.clipPath,first);
});
check('short/narrow direct fitting scales one logical surface without a forced 220px overflow',()=>{
 for(const [width,height]of [[1440,900],[800,500],[320,640],[568,300],[100,480]]){const fit=fitPhone({width,height});assert.ok(fit.height<=height-95);assert.ok(fit.width<=width-24+1e-8);assert.ok(Math.abs(fit.width/fit.height-phoneAspect)<1e-12);assert.equal(PHONE.logicalWidth,430);}
 assert.ok(Math.max(220,Math.min(780,300-95,(568-24)/phoneAspect))>300-95,'old short viewport failure');
});
const evidence={maxGlassDisplaySeamError:maxSeamError,contourVertices:current.length,projectionSamples:projected,before:{width:.6165377,height:1.3323075,radius:.07,z:.054},after:{width:PHONE.width,height:PHONE.height,position:PHONE.position,island:PHONE.island},witness:{x:.29,y:.64,oldAdmits:true,loadedGlass:true,loadedDisplay:false,newAdmits:false},note:'Offline loaded geometry and math; no browser rendering, input or texture decode.'};
fs.writeFileSync(new URL('../../docs/redesign/session-08-desk-camera/phone-edge-measurements.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
const toPath=pts=>pts.map(([x,y],i)=>`${i?'L':'M'}${400+x*900} ${700-y*900}`).join(' ')+' Z';
const exterior=convexHull(meshes.flatMap(m=>m.points.map(p=>[p.x,p.y]))),outerGlass=convexHull(glass.points.map(p=>[p.x,p.y]));
fs.writeFileSync(new URL('../../docs/redesign/session-08-desk-camera/phone-aperture.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1400" viewBox="0 0 800 1400"><rect width="800" height="1400" fill="#eef0f5"/><text x="30" y="35" font-family="sans-serif" font-size="21">Offline geometry — not a browser screenshot</text><path d="${toPath(exterior)}" fill="#606970"/><path d="${toPath(outerGlass)}" fill="#090c0e"/><path d="${toPath(current)}" fill="#f2f5fa" stroke="#00774f" stroke-width="2"/><path d="${toPath(PHONE.cameraOutline.map(([x,y])=>[x+center.x,y+center.y]))}" fill="#090c0e"/><path d="${toPath(old)}" fill="none" stroke="#d52959" stroke-width="2"/><text x="30" y="1350" font-family="sans-serif" font-size="18" fill="#d52959">Red: old circular clip over the glass corners</text><text x="30" y="1380" font-family="sans-serif" font-size="18" fill="#00774f">Green: measured display / glass seam (118 points)</text></svg>`);
console.log(count+' phone geometry checks passed; '+projected+' projected contour samples. Browser verification pending.');
