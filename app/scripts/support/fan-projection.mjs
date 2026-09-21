import * as T from 'three';import {fanParts,streamerGeometry,deformStreamers} from '../../src/prototype/fanGeometry.js';import {FAN} from '../../src/prototype/fanMotion.js';import {fanEnvelope} from './fan-envelope.mjs';
// Actual opaque triangles at sampled poses, with a filled rotor volume enclosing
// every blade angle. No renderer/HTML compositor, and not continuous yaw proof.
export function fanProjection(){
 const parts=fanParts(),material=new T.MeshBasicMaterial({side:T.DoubleSide}),bound=fanEnvelope(),hit=new T.Vector3(),raycast=new T.Raycaster(),poses=[];
 const rotor=parts.find(p=>p.owner==='rotor');let radius=0,z0=Infinity,z1=-Infinity;const a=rotor.geometry.attributes.position;
 for(let i=0;i<a.count;i++){radius=Math.max(radius,Math.hypot(a.getX(i),a.getY(i)));z0=Math.min(z0,a.getZ(i));z1=Math.max(z1,a.getZ(i));}
 const disk=new T.CylinderGeometry(radius/Math.cos(Math.PI/64),radius/Math.cos(Math.PI/64),z1-z0,64).rotateX(Math.PI/2).translate(0,0,(z0+z1)/2);
 for(let i=0;i<=18;i++)for(const power of [0,.5,1])for(let phase=0;phase<4;phase++){
  const root=new T.Group();root.position.fromArray(FAN.position);const yaw=new T.Group();yaw.position.fromArray(FAN.pivot);yaw.rotation.y=FAN.direction-FAN.sweep+i*Math.PI/36;root.add(yaw);const head=new T.Group();head.position.fromArray(FAN.head);yaw.add(head);
  for(const part of parts){const mesh=new T.Mesh(part.owner==='rotor'?disk:part.geometry,material);mesh.name=part.name;(['fixed','indicator'].includes(part.owner)?root:head).add(mesh);}
  const strips=streamerGeometry();deformStreamers(strips,power,phase*Math.PI/2);const mesh=new T.Mesh(strips,material);mesh.name='fan-streamers';head.add(mesh);root.updateMatrixWorld(true);poses.push({root,yaw:yaw.rotation.y,power,phase});
 }
 let broadHits=0,exactQueries=0;
 return {poses:poses.length,hit(ray,distance){const at=ray.intersectBox(bound,hit);if(!at||at.distanceTo(ray.origin)>distance)return null;broadHits++;raycast.ray.copy(ray);raycast.far=distance;
  for(const pose of poses){exactQueries++;const found=raycast.intersectObject(pose.root,true)[0];if(found)return {part:found.object.name,point:found.point.toArray(),yaw:pose.yaw,power:pose.power,phase:pose.phase};}return null;},stats:()=>({broadHits,exactQueries})};
}
