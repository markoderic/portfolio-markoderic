import {PAPER_REST} from '../src/prototype/paperDisposal.js';
// Source callbacks + actual Three geometry/raycast oracle. No browser/WebGL/DOM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as T from 'three';
import {deskPose,deskAngles} from '../src/prototype/deskCamera.js';
import {LAPTOP,PHONE} from '../src/prototype/deviceGeometry.js';
import {maskPhone,maskPaper} from '../src/prototype/screenProjection.js';
import handsetOutline from '../src/prototype/assets/phone-hull.json' with {type:'json'};
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {PAPER_WIDTH,PAPER_HEIGHT,paperFeedPosition} from '../src/prototype/paperGeometry.js';
import {maskPrinter,printerClipPath} from '../src/prototype/printerOcclusion.js';
const root=fileURLToPath(new URL('../',import.meta.url)),before=process.argv.includes('--before');
const output=path.join(root,'.vite/printer-fixture.mjs');
await build({stdin:{contents:`export {Printer} from './src/prototype/StudioProps.jsx';export {Rig} from './src/prototype/Scene.jsx';export {harness} from './scripts/support/hook-harness.js';`,resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:output,plugins:[{name:'offline-scene',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'fixture'}));
 b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'fixture'}));
 b.onResolve({filter:/^@react-three\/drei$/},()=>({path:'drei',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:root,contents:a.path==='react'?`import * as h from './scripts/support/hook-harness.js';export * from './scripts/support/hook-harness.js';export const forwardRef=fn=>props=>fn(props,null);export default {...h,forwardRef};`:a.path==='fiber'?`export const Canvas=()=>null;export const useFrame=fn=>globalThis.__printerFrames.push(fn);`:`export {RoundedBox} from './node_modules/@react-three/drei/core/RoundedBox.js';export const useGLTF=()=>{throw Error('Not used in geometry fixture')};export const useTexture=()=>{};export const Environment=()=>null;export const Lightformer=()=>null;export const ContactShadows=()=>null;`}));
 b.onLoad({filter:/\/src\/prototype\/Scene.jsx$/},a=>({contents:fs.readFileSync(before?path.join(root,'../docs/redesign/session-05a-printer-occlusion/before-Scene.jsx'):a.path,'utf8')+'\nexport {Rig};',loader:'jsx',resolveDir:path.dirname(a.path)}));
 b.onResolve({filter:/\.glb\?url$/},a=>({path:a.path,namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},()=>({contents:'export default "offline-asset"'}));
 }}],loader:{'.png':'text','.jpg':'text'}});
globalThis.__printerFrames=[];const {Printer,Rig,harness}=await import(pathToFileURL(output).href+'?v='+Date.now());
// Materialize the actual Printer and Body/RoundedBox JSX, including the installed
// drei rounded-box shape/bevel parameters. Only renderer/DOM and material IO mocked.
function materialize(node){
 if(!node||typeof node!=='object')return null;
 if(typeof node.type==='function'){const h=harness(node.type,node.props);const object=materialize(h.tree);h.effects.forEach(f=>f());return object;}
 const p=node.props??{},children=p.children??[];
 if(node.type==='group'||node.type==='mesh'){
  const object=node.type==='group'?new T.Group():new T.Mesh();
  if(p.position)object.position.set(...p.position);if(p.rotation)object.rotation.set(...p.rotation);if(p.scale)typeof p.scale==='number'?object.scale.setScalar(p.scale):object.scale.set(...p.scale);if(p.visible!==undefined)object.visible=p.visible;
  if(p.ref)p.ref.current=object;
  for(const child of children){const value=materialize(child);if(value?.isBufferGeometry)object.geometry=value;else if(value?.isMaterial)object.material=value;else if(value?.isObject3D)object.add(value);}
  return object;
 }
 const geometries={extrudeGeometry:T.ExtrudeGeometry,boxGeometry:T.BoxGeometry,cylinderGeometry:T.CylinderGeometry,circleGeometry:T.CircleGeometry};
 if(geometries[node.type]){const geometry=new geometries[node.type](...(p.args??[]));if(p.ref)p.ref.current=geometry;return geometry;}
 if(node.type==='meshStandardMaterial'){const {children,ref,...params}=p;const material=new T.MeshStandardMaterial(params);if(ref)ref.current=material;return material;}
 return null;
}
const progress={current:.5},printer=materialize(harness(Printer,{progress,onResume(){}}).tree);printer.updateMatrixWorld(true);
const meshes=[];printer.traverse(o=>{if(o.isMesh)meshes.push(o)});assert.equal(meshes.length,22);
const screen=new T.Mesh(new T.PlaneGeometry(LAPTOP.width,LAPTOP.height),new T.MeshBasicMaterial({side:T.DoubleSide}));screen.position.set(...LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));screen.rotation.set(...LAPTOP.screenRotation);screen.updateMatrixWorld();
const pixels={width:1120,height:700},viewport={width:1440,height:900};
function camera(eye,look){const c=new T.PerspectiveCamera(39,1.6,.1,100);c.position.set(...eye);c.lookAt(...look);c.updateMatrixWorld();return c;}
const printerCamera=camera([-7.4,4.4,7.4],[-3.65,.55,.55]);
function polygons(css){if(!css||css==='none')return [[[0,0],[pixels.width,0],[pixels.width,pixels.height],[0,pixels.height]]];return [...css.matchAll(/M ([^Z]+)Z/g)].map(m=>m[1].replaceAll('L','').trim().split(/\s+/).map(Number)).map(a=>Array.from({length:a.length/2},(_,i)=>a.slice(i*2,i*2+2)));}
function inPolygon(p,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const shown=(css,x,y)=>polygons(css).some(p=>inPolygon([x,y],p));
function oracle(c,objects,x,y){const point=new T.Vector3((x/pixels.width-.5)*LAPTOP.width,(.5-y/pixels.height)*LAPTOP.height,0).applyMatrix4(screen.matrixWorld),eye=c.getWorldPosition(new T.Vector3()),direction=point.clone().sub(eye),length=direction.length();const ray=new T.Raycaster(eye,direction.normalize(),0,length-1e-6);const hits=ray.intersectObjects(objects,false);return hits.some(hit=>hit.point.clone().applyMatrix4(c.matrixWorldInverse).z<=-c.near);}
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
let witness;
for(let y=7;y<pixels.height;y+=13)for(let x=7;x<pixels.width;x+=13)if(!witness&&oracle(printerCamera,meshes,x,y))witness={x,y};assert.ok(witness,'current printer actually crosses the measured M3 display rays');
check('current-source Rig masks a physically nearer printer witness while preserving visible desktop',()=>{
 globalThis.__printerFrames=[];
 const hosts=Object.fromEntries(['laptop','phone','mask','paperMask','paper'].map(k=>[k,{current:{style:{clipPath:'none'}}}]));
 const pivot=new T.Group(),phone=new T.Object3D();pivot.add(phone);const paper=new T.Mesh(new T.PlaneGeometry(1.8,2.33,2,2));
 harness(Rig,{orbit:{current:{yaw:0,pitch:0}},pointerLook:{current:{yaw:0,pitch:0}},completedPage:false,view:'printer',direct:false,reduced:true,hosts,layout:{laptop:pixels,phone:{width:300,height:650}},onSettled(){},laptop:{current:screen},phone:{current:phone},pivot:{current:pivot},paper:{current:paper},printer:{current:printer},printProgress:progress,printMotion:{current:{phase:'idle',progress:0}}});
 const c=camera([10,6.8,23],[0,-2,1]);globalThis.__printerFrames[0]({camera:c,size:viewport},1/60);
 assert.equal(shown(hosts.laptop.current.style.clipPath,witness.x,witness.y),false,`printer witness ${JSON.stringify(witness)} must be removed from the HTML clip`);
 assert.ok(polygons(hosts.laptop.current.style.clipPath).length>0);assert.equal(shown(hosts.laptop.current.style.clipPath,1000,100),true);assert.notEqual(hosts.laptop.current.style.visibility,'hidden');
});
if(before)process.exit(0);
check('actual 22-part printer silhouette matches independent triangle rays at partial screen edges',()=>{
 const css=printerClipPath(meshes,printerCamera,screen,pixels);let hidden=0,clear=0;for(let y=7;y<700;y+=13)for(let x=7;x<1120;x+=13){const blocked=oracle(printerCamera,meshes,x,y);assert.equal(!shown(css,x,y),blocked,`${x},${y}`);blocked?hidden++:clear++;}assert.ok(hidden>0&&clear>0);console.log('  printer pose oracle samples:',{hidden,clear,pathBytes:css.length,cells:polygons(css).length,witness});
});
check('separate parts preserve gaps and overlapping shadows form a union, not XOR',()=>{
 const c=camera([0,0,5],[0,0,0]),saved=screen.matrixWorld.clone();screen.position.set(0,0,0);screen.rotation.set(0,0,0);screen.updateMatrixWorld();
 const left=new T.Mesh(new T.BoxGeometry(.5,.8,.2)),right=left.clone();left.position.set(-.7,0,1);right.position.set(.7,0,1);left.updateMatrixWorld();right.updateMatrixWorld();let css=printerClipPath([left,right],c,screen,pixels);assert.ok(shown(css,560,350));assert.ok(!shown(css,250,350)&&!shown(css,870,350));right.position.x=-.5;right.updateMatrixWorld();css=printerClipPath([left,right],c,screen,pixels);assert.ok(!shown(css,310,350));
 screen.matrix.copy(saved);screen.matrix.decompose(screen.position,screen.quaternion,screen.scale);screen.updateMatrixWorld();
});
check('behind-display, offscreen and invisible printers release stale clips; stationary frames are cached',()=>{
 const el={style:{clipPath:'none'}};maskPrinter(el,printer,printerCamera,screen,pixels);assert.notEqual(el.style.clipPath,'none');printer.visible=false;maskPrinter(el,printer,printerCamera,screen,pixels);assert.equal(el.style.clipPath,'none');printer.visible=true;
 const saved=printer.position.clone();printer.position.set(100,0,0);maskPrinter(el,printer,printerCamera,screen,pixels);assert.equal(el.style.clipPath,'none');printer.position.copy(saved);maskPrinter(el,printer,printerCamera,screen,pixels);assert.notEqual(el.style.clipPath,'none');let writes=0,current=el.style.clipPath;Object.defineProperty(el.style,'clipPath',{get:()=>current,set:v=>{writes++;current=v}});maskPrinter(el,printer,printerCamera,screen,pixels);assert.equal(writes,0);maskPrinter(el,null,printerCamera,screen,pixels);assert.equal(current,'none');
 const behind=new T.Mesh(new T.BoxGeometry(.8,.8,.2));behind.position.copy(screen.position).addScaledVector(new T.Vector3(0,0,1).transformDirection(screen.matrixWorld),-1);behind.updateMatrixWorld();assert.equal(printerClipPath([behind],printerCamera,screen,pixels),'none');
});
check('depth-straddling and camera-near-plane geometry matches ray depths without nonfinite output',()=>{
 const saved=screen.matrixWorld.clone();screen.position.set(0,0,0);screen.rotation.set(0,0,0);screen.updateMatrixWorld();const c=camera([0,0,5],[0,0,0]);
 for(const z of [-.2,0,.2,4.87,5.1]){const mesh=new T.Mesh(new T.BoxGeometry(.3,.4,.6));mesh.position.set(.5,0,z);mesh.rotation.y=.6;mesh.updateMatrixWorld();const css=printerClipPath([mesh],c,screen,pixels);assert.ok(!/NaN|Infinity/.test(css));for(let y=17;y<700;y+=41)for(let x=17;x<1120;x+=43)assert.equal(!shown(css,x,y),oracle(c,[mesh],x,y),`${z}: ${x},${y}`);}
 screen.matrix.copy(saved);screen.matrix.decompose(screen.position,screen.quaternion,screen.scale);screen.updateMatrixWorld();
});
check('printer, phone and moving paper clips combine as a union without erasing uncovered live regions',()=>{
 const saved=screen.matrixWorld.clone();screen.position.set(0,0,0);screen.rotation.set(0,0,0);screen.updateMatrixWorld();const c=camera([0,0,5],[0,0,0]);
 const part=new T.Mesh(new T.BoxGeometry(.9,.9,.3));part.position.set(-.7,-.4,1);part.updateMatrixWorld();
 const phone=new T.Mesh(new ConvexGeometry(handsetOutline.map(p=>new T.Vector3(...p))));phone.position.set(-.35,.25,1.4);phone.updateMatrixWorld();
 const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT),new T.MeshBasicMaterial({side:T.DoubleSide}));paper.position.set(.9,.8,1.6);paper.updateMatrixWorld();
 const printerPath=printerClipPath([part],c,screen,pixels),phoneElement={style:{}},paperElement={style:{}};
 maskPhone(phoneElement,phone,c,pixels,screen,pixels);maskPaper(paperElement,paper,c,screen,pixels);
 const legacyShown=(css,x,y)=>css==='none'||!inPolygon([x,y],polygons(css)[1]);let both=0,clear=0,blocked=0;
 for(let y=11;y<700;y+=31)for(let x=13;x<1120;x+=37){const hits=[part,phone,paper].map(o=>oracle(c,[o],x,y));const actual=shown(printerPath,x,y)&&legacyShown(phoneElement.style.clipPath,x,y)&&legacyShown(paperElement.style.clipPath,x,y);assert.equal(actual,!hits.some(Boolean),x+','+y);if(hits.filter(Boolean).length>1)both++;actual?clear++:blocked++;}
 assert.ok(both>0&&clear>0&&blocked>0);paper.visible=false;maskPaper(paperElement,paper,c,screen,pixels);assert.equal(paperElement.style.clipPath,'none');
 screen.matrix.copy(saved);screen.matrix.decompose(screen.position,screen.quaternion,screen.scale);screen.updateMatrixWorld();
});
check('oblique near-plane crossings and degenerate geometry do not create phantom solid caps',()=>{
 const saved=screen.matrixWorld.clone();screen.position.set(0,0,0);screen.rotation.set(0,0,0);screen.updateMatrixWorld();const c=camera([3,1,2],[0,0,0]);
 for(const pos of [[2.8,.95,1.95],[2.85,1,1.6],[3,1,2]]){const mesh=new T.Mesh(new T.BoxGeometry(.6,.7,.8));mesh.position.set(...pos);mesh.updateMatrixWorld();const css=printerClipPath([mesh],c,screen,pixels);assert.ok(!/NaN|Infinity/.test(css));for(let y=17;y<700;y+=43)for(let x=17;x<1120;x+=47)assert.equal(!shown(css,x,y),oracle(c,[mesh],x,y),pos+':'+x+','+y);}
 const mesh=new T.Mesh(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3)));mesh.updateMatrixWorld();assert.equal(printerClipPath([mesh],c,screen,pixels),'none');
 screen.matrix.copy(saved);screen.matrix.decompose(screen.position,screen.quaternion,screen.scale);screen.updateMatrixWorld();
});
check('interpolated desk/printer/paper/laptop/phone/return poses preserve independent visibility samples',()=>{
 const neutral=deskPose(viewport);const normal=new T.Vector3(0,0,1).transformDirection(screen.matrixWorld);const poses=[[neutral.position.toArray(),neutral.look.toArray()],[[-7.4,4.4,7.4],[-3.65,.55,.55]],[[-2.2,1.15,5.9],[-2.2,1.15,1.7]],[screen.position.clone().addScaledVector(normal,3.6).toArray(),screen.position.toArray()],[[1.15,1.5,4],[1.15,1.5,.534]],[neutral.position.toArray(),neutral.look.toArray()]];for(const angles of [deskAngles(5),deskAngles(10),deskAngles(30),{yaw:-.48,pitch:-.16},{yaw:.48,pitch:.22}]){const p=deskPose(viewport,angles);poses.push([p.position.toArray(),p.look.toArray()]);}let samples=0,maxBytes=0,maxCells=0;
 for(let i=0;i<poses.length-1;i++)for(let j=0;j<=10;j++){const t=j/10,eye=new T.Vector3(...poses[i][0]).lerp(new T.Vector3(...poses[i+1][0]),t),look=new T.Vector3(...poses[i][1]).lerp(new T.Vector3(...poses[i+1][1]),t),c=camera(eye.toArray(),look.toArray()),css=printerClipPath(meshes,c,screen,pixels);maxBytes=Math.max(maxBytes,css.length);maxCells=Math.max(maxCells,polygons(css).length);for(let y=19;y<700;y+=83)for(let x=23;x<1120;x+=89){assert.equal(!shown(css,x,y),oracle(c,meshes,x,y),`${i}:${j}:${x},${y}`);samples++;}}
 console.log('  transition samples / max path bytes / cells:',samples,maxBytes,maxCells);
});
check('new desk extrema and device approach retain printer/phone/paper depth union against independent rays',()=>{
 const phone=new T.Mesh(new ConvexGeometry(handsetOutline.map(p=>new T.Vector3(...p))));
 const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT),new T.MeshBasicMaterial({side:T.DoubleSide}));
 const deskQ=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,-.23)),feedQ=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,.13));
 let samples=0,blocked=0,clear=0;
 const poses=[...Array.from({length:8},(_,i)=>deskPose(viewport,deskAngles(i*5))),...[-.48,.48].flatMap(yaw=>[-.16,.22].map(pitch=>deskPose(viewport,{yaw,pitch})))];
 const legacyShown=(css,x,y)=>css==='none'||!inPolygon([x,y],polygons(css)[1]);
 for(const pose of poses)for(const t of [0,.5,1]){
  const c=camera(pose.position.toArray(),pose.look.toArray());
  phone.position.fromArray(PHONE.desk).lerp(new T.Vector3(...PHONE.picked),t);phone.quaternion.copy(deskQ).slerp(new T.Quaternion(),t);phone.updateMatrixWorld();
  paper.position.fromArray(paperFeedPosition(1)).lerp(new T.Vector3(...PAPER_REST),t);paper.quaternion.copy(feedQ).slerp(new T.Quaternion(),t);paper.updateMatrixWorld();
  const pp=printerClipPath(meshes,c,screen,pixels),ph={style:{}},pa={style:{}};maskPhone(ph,phone,c,viewport,screen,pixels);maskPaper(pa,paper,c,screen,pixels);
  for(let y=17;y<700;y+=53)for(let x=19;x<1120;x+=59){const actual=shown(pp,x,y)&&legacyShown(ph.style.clipPath,x,y)&&legacyShown(pa.style.clipPath,x,y);const expected=!oracle(c,[...meshes,phone,paper],x,y);assert.equal(actual,expected,`${t}:${x},${y}`);samples++;actual?clear++:blocked++;}
 }
 assert.ok(clear&&blocked);console.log('  new range depth-union oracle samples:',{samples,clear,blocked});
});
const evidence=path.join(root,'../docs/redesign/session-16-palette-bin');
const finalPath=printerClipPath(meshes,printerCamera,screen,pixels),d=finalPath.slice(6,-2);
const witnessPoint=new T.Vector3((witness.x/pixels.width-.5)*LAPTOP.width,(.5-witness.y/pixels.height)*LAPTOP.height,0).applyMatrix4(screen.matrixWorld),witnessRay=new T.Raycaster(printerCamera.position,witnessPoint.clone().sub(printerCamera.position).normalize()),witnessHit=witnessRay.intersectObjects(meshes,false)[0];
const witnessDepth={printerPartIndex:meshes.indexOf(witnessHit.object),printerDistance:witnessHit.distance,displayDistance:witnessPoint.distanceTo(printerCamera.position),printerPointWorld:witnessHit.point.toArray(),displayPointWorld:witnessPoint.toArray()};
fs.writeFileSync(path.join(evidence,'current-geometry.json'),JSON.stringify({witnessDepth,evidence:'Offline current geometry and source callback fixture, not browser output',printerMeshes:meshes.length,printerTriangles:meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),witness,pixels,screenWorld:screen.matrixWorld.toArray(),cameraPosition:printerCamera.position.toArray(),clipPath:finalPath},null,2)+'\n');
fs.writeFileSync(path.join(evidence,'occlusion-diagram.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="570" viewBox="0 0 1200 570"><rect width="1200" height="570" fill="#f7f7f3"/><g font-family="sans-serif" fill="#202c36"><text x="40" y="42" font-size="24">Current M3 aperture / printer approach — offline geometry</text><text x="40" y="75" font-size="16">Teal: visible live-display region. Gray: nearer printer. Red: independent blocked-ray witness.</text><text x="40" y="124" font-size="20">Before: printer absent from HTML clipping</text><text x="620" y="124" font-size="20">After: only the occluded region removed</text></g><g transform="translate(40 155) scale(.47)"><rect width="1120" height="700" fill="#73c8c5"/><circle cx="${witness.x}" cy="${witness.y}" r="9" fill="#d34b40"/></g><g transform="translate(620 155) scale(.47)"><rect width="1120" height="700" fill="#b5b6bb"/><path d="${d}" fill="#73c8c5"/><circle cx="${witness.x}" cy="${witness.y}" r="9" fill="#d34b40"/></g><g font-family="sans-serif" fill="#34434d" font-size="16"><text x="40" y="522">Uses the actual printer meshes, measured M3 plane and current printer camera target.</text><text x="40" y="551">Not a browser screenshot or proof of CSS compositing, glass appearance or hit testing.</text></g></svg>`);
console.log(`${count} printer occlusion source/geometry cases passed; real compositing and hit testing unverified.`);
