// Read-only actual runtime M3 probes. GLTF image decoding stubbed; real triangles.
import fs from 'node:fs';import * as T from 'three';
import {loadLaptop} from './support/laptop-lighting-fixture.mjs';
import {LAPTOP} from '../src/prototype/deviceGeometry.js';
const model=await loadLaptop();model.scale.setScalar(LAPTOP.modelScale);model.position.fromArray(LAPTOP.position);model.updateMatrixWorld(true);
model.traverse(o=>{if(o.isMesh)o.material.side=T.DoubleSide});
const center=new T.Vector3(...LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition)),rotation=new T.Euler(...LAPTOP.screenRotation),normal=new T.Vector3(0,0,1).applyEuler(rotation),ray=new T.Raycaster();
const probes=[];for(const [name,x,y]of [['center',0,0],['content-top',0,LAPTOP.height/2-.005],['above-aperture',0,LAPTOP.height/2+.04],['left-bezel',-LAPTOP.width/2-.035,0],['right-bezel',LAPTOP.width/2+.035,0]]){
 const base=new T.Vector3(x,y,0).applyEuler(rotation).add(center);ray.set(base.clone().addScaledVector(normal,.2),normal.clone().negate());
 probes.push({name,local:[x,y],hits:ray.intersectObject(model,true).filter(h=>h.distance<.4).map(h=>({mesh:h.object.name,normalOffset:h.point.clone().sub(base).dot(normal),point:h.point.toArray()}))});
}
const out={aperture:LAPTOP,probes,conclusion:'Actual bezel/lid/display backing already exist; no duplicate physical cover added. DOM material supplies the visible face over independently composited HTML.',limitations:'Triangle probes only; imported texture decoding and physical material appearance not inspected by this script.'};
fs.writeFileSync(new URL('../../docs/redesign/session-22-display-depth/stack-measurements.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
