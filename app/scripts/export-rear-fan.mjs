import fs from 'node:fs';import * as T from 'three';
import {mountFan} from './support/fan-scene-fixture.mjs';
import {FAN} from '../src/prototype/fanMotion.js';import {deformStreamers} from '../src/prototype/fanGeometry.js';
const dir=new URL('../../docs/redesign/session-24-fan-placement-activation/',import.meta.url);
export function meshesFrom(root){root.updateMatrixWorld(true);const meshes=[];root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld),positions=[],normals=[];for(let i=0;i<a.count;i++){positions.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).toArray());if(n)normals.push(new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(nm).toArray());}const m=o.material;meshes.push({root:'fan',name:o.name,positions,normals,indices:o.geometry.index?[...o.geometry.index.array]:Array.from({length:a.count},(_,i)=>i),color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,side:m.side,castShadow:['fan-base','fan-neck','fan-switch','fan-housing','fan-motor'].includes(o.name)});});return meshes;}
const {FAN:old}=await import(new URL('before-fanMotion.js',dir));
for(const [tag,yaw,power,phase,position]of [['before',old.direction,1,0,old.position],['center',FAN.direction,1,0,FAN.position],['left',FAN.direction-FAN.sweep,1,1,FAN.position],['right',FAN.direction+FAN.sweep,1,2,FAN.position],['off',FAN.direction+.42,0,0,FAN.position]]){
 const f=mountFan({on:power>0});f.root.position.fromArray(position);f.root.getObjectByName('fan-yaw').rotation.y=yaw;f.root.getObjectByName('fan-rotor').rotation.z=.6;deformStreamers(f.root.getObjectByName('fan-streamers').geometry,power,phase);
 fs.writeFileSync(new URL(tag+'-fan.json',dir),JSON.stringify({meshes:meshesFrom(f.root)})+'\n');
}
