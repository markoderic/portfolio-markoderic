import fs from 'node:fs';import * as T from 'three';import {deskPose} from '../src/prototype/deskCamera.js';
const dir=new URL('../../docs/redesign/session-47-wood-camera/',import.meta.url),old=new URL('../session-39-depth-shadows/',dir);
const scene=JSON.parse(fs.readFileSync(new URL('after-scene.json',dir)));
for(const m of scene.meshes){
 if(m.root==='desk'&&Math.max(...m.positions.map(p=>p[0]))>5.39&&Math.min(...m.positions.map(p=>p[0]))< -5.39){m.wood=true;m.color=[1,1,1];m.uv=m.positions.map(p=>[p[0]/10.8+.5,p[2]/6+.5]);}
 // Export precision only; actual runtime geometry remains unchanged.
 for(const key of ['positions','normals','colors','uv'])if(m[key])m[key]=m[key].map(a=>a.map(n=>+n.toFixed(6)));
}
fs.writeFileSync(new URL('after-scene.json',dir),JSON.stringify(scene));
const frames=[];for(const stage of ['before','after'])for(const [name,night,eye,look,width,height] of [
 ['day-close',false,[8.5,6.9,10],[1.3,-.15,.4],1100,780],
 ['night-close',true,[8.5,6.9,10],[1.3,-.15,.4],1100,780],
 ['day-overview',false,deskPose({width:1200,height:800}).position.toArray(),deskPose({width:1200,height:800}).look.toArray(),1200,800]])frames.push({name:stage+'-'+name,stage,night,eye,look,width,height,theme:'light',texture:'screen.png'});
fs.writeFileSync(new URL('frames.json',dir),JSON.stringify(frames,null,2));fs.copyFileSync(new URL('screen.png',old),new URL('screen.png',dir));
let s=fs.readFileSync(new URL('render-study.swift',old),'utf8')
 .replace('let ground=base.appendingPathComponent((frame["stage"] as! String)+"-maps")','let ground=base.appendingPathComponent("../session-39-depth-shadows/after-maps")')
 .replace('stage+"-scene.json"','"after-scene.json"').replace('stage+"-measurements.json"','"after-measurements.json"')
 .replace('var sources=[SCNGeometrySource(vertices:vectors("positions"))]',`let original=vectors("positions")
  let cameraPart=(m["name"] as? String ?? "").hasPrefix("camera/")
  let vertices=(before && cameraPart) ? original.map{SCNVector3(4.7+($0.x-4.7)*4/3,$0.y*4/3,2.2+($0.z-2.2)*4/3)} : original
  var sources=[SCNGeometrySource(vertices:vertices)]
  if let uv=m["uv"] as? [[NSNumber]] {sources.append(SCNGeometrySource(textureCoordinates:uv.map{CGPoint(x:$0[0].doubleValue,y:$0[1].doubleValue)}))}`)
 .replace('geometry.materials=[mat]',`if m["wood"] as? Bool == true {mat.diffuse.contents=NSImage(contentsOf:base.appendingPathComponent(before ? "before-top.png" : "top.png"))!;mat.roughness.contents=0.75;mat.diffuse.mipFilter = .linear;mat.diffuse.minificationFilter = .linear;mat.diffuse.magnificationFilter = .linear}
  geometry.materials=[mat]`)
 .replace('for m in maps where m["name"] as! String != "before"','for m in maps where m["name"] as! String != "table-contact"')
 .replace('before ? 7 : 2','2')
 .replace('SceneKit + CPU contact maps + static screen','SceneKit + actual top map + static screen')
 .replace('Not browser rendering. Current exported geometry + static screen stand-in; SceneKit HDR, approximate environment/materials/shadows. No Three PCF/bias or native shadow acceptance.','Not browser output. Actual generated top map; edge blend/roughness, lighting and shadows approximated. Same camera/light in each pair; no native acceptance.');
fs.writeFileSync(new URL('render-study.swift',dir),s);
const before=new Uint8Array(1024*512*4),base=new T.Color('#493329');for(let j=0;j<512;j++)for(let i=0;i<1024;i++){const x=(i/1023-.5)*10.8,z=(j/511-.5)*6;const grain=Math.sin(z*83+Math.sin(x*.75)*2.1+Math.sin(z*12)*.7);const c=base.clone().multiplyScalar(.96+.055*grain).convertLinearToSRGB();before.set([...c.toArray().map(n=>Math.round(n*255)),255],(j*1024+i)*4)}fs.writeFileSync(new URL('before-top.rgba',dir),before);
