import * as T from 'three';import {FAN} from '../../src/prototype/fanMotion.js';import {fanParts,streamerGeometry} from '../../src/prototype/fanGeometry.js';
// Analytic extrema over all yaw angles, enclosing every rotor angle and ribbon
// power/phase. Separate volumes avoid inventing a solid box across empty space.
export function fanEnvelopes(){
 const fixed=new T.Box3(),head=new T.Box3(),streamers=new T.Box3(),headPoints=[],parts=fanParts(),strip=streamerGeometry();
 const corners=b=>[...Array(8)].map((_,i)=>new T.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z));
 for(const part of parts){const a=part.geometry.attributes.position;
  if(['fixed','indicator'].includes(part.owner)){for(let i=0;i<a.count;i++)fixed.expandByPoint(new T.Vector3().fromBufferAttribute(a,i).add(new T.Vector3(...FAN.position)));}
  else if(part.owner==='rotor'){let r=0,z0=Infinity,z1=-Infinity;for(let i=0;i<a.count;i++){r=Math.max(r,Math.hypot(a.getX(i),a.getY(i)));z0=Math.min(z0,a.getZ(i));z1=Math.max(z1,a.getZ(i));}headPoints.push(...corners(new T.Box3(new T.Vector3(-r,-r,z0),new T.Vector3(r,r,z1))));}
  else for(let i=0;i<a.count;i++)headPoints.push(new T.Vector3().fromBufferAttribute(a,i));
 }
 function sweep(points,box){for(const p of points){p.add(new T.Vector3(...FAN.head));const lo=FAN.direction-FAN.sweep,hi=FAN.direction+FAN.sweep,angles=[lo,hi];
  for(const base of [Math.atan2(p.z,p.x),Math.atan2(-p.x,p.z)])for(let k=-2;k<=2;k++){const a=base+k*Math.PI;if(a>=lo&&a<=hi)angles.push(a);}
  for(const a of angles)box.expandByPoint(p.clone().applyAxisAngle(new T.Vector3(0,1,0),a).add(new T.Vector3(...FAN.pivot)).add(new T.Vector3(...FAN.position)));
 }}
 sweep(headPoints,head);sweep(corners(strip.boundingBox),streamers);
 parts.forEach(p=>p.geometry.dispose());strip.dispose();return {fixed,head,streamers};
}
export const fanEnvelope=()=>Object.values(fanEnvelopes()).reduce((box,b)=>box.union(b),new T.Box3());
