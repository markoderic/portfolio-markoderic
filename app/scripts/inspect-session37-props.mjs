// Actual current fan/camera/chair geometry, with retained unchanged scene exports.
// Offline numeric/SceneKit evidence only, never browser automation.
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {productionParts,PROP_MATERIALS,PRODUCTION} from '../src/prototype/productionPropsGeometry.js';
import {FAN} from '../src/prototype/fanMotion.js';import {fanEnvelopes} from './support/fan-envelope.mjs';
import {mountFan} from './support/fan-scene-fixture.mjs';import {deformStreamers} from '../src/prototype/fanGeometry.js';
import {CHAIR,DESK} from '../src/prototype/sceneScale.js';import {deskPose} from '../src/prototype/deskCamera.js';
const dir=new URL('../../docs/redesign/session-37-props/',import.meta.url);
const base=JSON.parse(fs.readFileSync(new URL('../session-35-framing/after-scene.json',dir)));
const points=g=>Array.from({length:g.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i));
const bounds=meshes=>new T.Box3().setFromPoints(meshes.flatMap(m=>m.positions.map(p=>new T.Vector3(...p))));
const boxJSON=b=>({min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()});
function meshData(name,root,g,m,matrix=new T.Matrix4()){
 const n=g.attributes.normal,nm=new T.Matrix3().getNormalMatrix(matrix);return {name,root,positions:points(g).map(p=>p.applyMatrix4(matrix).toArray()),normals:n?Array.from({length:n.count},(_,i)=>new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray()):[],indices:g.index?[...g.index.array]:Array.from({length:g.attributes.position.count},(_,i)=>i),color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,side:m.side??2,castShadow:true};
}
const parts=productionParts({...PRODUCTION,cameraScale:1}); // unscaled parameter supported by final runtime
function props(scale){return parts.map(p=>{const matrix=new T.Matrix4();if(p.root==='camera')matrix.makeTranslation(...PRODUCTION.camera).multiply(new T.Matrix4().makeScale(scale,scale,scale)).multiply(new T.Matrix4().makeTranslation(...PRODUCTION.camera.map(v=>-v)));return meshData(p.name,p.root,p.geometry,{...PROP_MATERIALS[p.material],color:new T.Color(PROP_MATERIALS[p.material].color)},matrix);});}
function fan(yaw){const f=mountFan();f.root.getObjectByName('fan-yaw').rotation.y=yaw;f.root.getObjectByName('fan-rotor').rotation.z=.6;deformStreamers(f.root.getObjectByName('fan-streamers').geometry,1,0);f.root.updateMatrixWorld(true);const meshes=[];f.root.traverse(o=>{if(o.isMesh)meshes.push(meshData(o.name,'fan',o.geometry,o.material,o.matrixWorld))});return meshes;}
const up=new T.Vector3(0,1,0),pivot=new T.Vector3(...FAN.position).add(new T.Vector3(...FAN.pivot));
const chairCenter=new T.Vector3(...CHAIR.backPosition).add(new T.Vector3(0,CHAIR.backHeight/2,0).applyAxisAngle(new T.Vector3(1,0,0),CHAIR.backTilt)).applyAxisAngle(up,CHAIR.yaw).add(new T.Vector3(...CHAIR.position));
const bearing=Math.atan2(chairCenter.x-pivot.x,chairCenter.z-pivot.z),candidates=[];
for(const degrees of [-90,-60,-45]){const yaw=T.MathUtils.degToRad(degrees),old=FAN.direction;FAN.direction=yaw;const volumes=fanEnvelopes();FAN.direction=old;const axis=new T.Vector3(0,0,1).applyAxisAngle(up,yaw);candidates.push({degrees,yaw,axis:axis.toArray(),chairBearing:T.MathUtils.radToDeg(bearing),chairHeadingError:T.MathUtils.radToDeg(yaw-bearing),volumes:Object.fromEntries(Object.entries(volumes).map(([k,v])=>[k,boxJSON(v)]))});}
const scales=[1,.75,.8],cameraCandidates=scales.map(scale=>({scale,...boxJSON(bounds(props(scale).filter(m=>m.root==='camera')))}));
fs.writeFileSync(new URL('candidates.json',dir),JSON.stringify({chair:{base:CHAIR.position,yaw:CHAIR.yaw,backCenter:chairCenter.toArray()},fanPivot:pivot.toArray(),candidates,cameraCandidates},null,2)+'\n');
for(const [tag,yaw,scale]of [['before',-Math.PI/2,1],['after',-Math.PI/4,.8],['candidate75',-Math.PI/4,.75]]){
 const meshes=base.meshes.filter(m=>!['fan','camera','microphone','production'].includes(m.root)).concat(fan(yaw),props(scale));fs.writeFileSync(new URL(tag+'-scene.json',dir),JSON.stringify({...base,meshes}));
 fs.copyFileSync(new URL('../session-35-framing/after-measurements.json',dir),new URL(tag+'-measurements.json',dir));
}
const frames=[];for(const stage of ['before','after'])for(const night of [false,true]){const pose=deskPose({width:1440,height:900});frames.push({name:stage+'-'+(night?'night':'day')+'-overview',stage,night,theme:'light',texture:'screen.png',eye:pose.position.toArray(),look:pose.look.toArray(),width:1440,height:900});frames.push({name:stage+'-'+(night?'night':'day')+'-props',stage,night,theme:'light',texture:'screen.png',eye:[9.4,6.4,8.8],look:[4.1,.45,.05],width:1100,height:850});}
frames.push({name:'candidate75-day-props',stage:'candidate75',night:false,theme:'light',texture:'screen.png',eye:[9.4,6.4,8.8],look:[4.1,.45,.05],width:1100,height:850});
fs.writeFileSync(new URL('frames.json',dir),JSON.stringify(frames,null,2));
const oldFrames=JSON.parse(fs.readFileSync(new URL('../session-35-framing/frames.json',dir)));fs.copyFileSync(new URL('../session-35-framing/'+oldFrames[0].texture,dir),new URL('screen.png',dir));fs.copyFileSync(new URL('../session-35-framing/render-study.swift',dir),new URL('render-study.swift',dir));
console.log(JSON.stringify({candidates,cameraCandidates,chair:chairCenter.toArray()},null,2));
