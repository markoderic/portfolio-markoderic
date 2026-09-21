// Offline physical mesh rays, not rendered/native visibility.
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {Desk,harness,materialize} from './support/chair-scene-fixture.mjs';
import {DESK_CAMERA} from '../src/prototype/deskCamera.js';
const results=[];
for(const open of [false,true]){
 const root=materialize(harness(Desk,{drawers:[open,open,open]}).tree);root.updateMatrixWorld(true);
 for(const [frame,eye]of [['overview',DESK_CAMERA.eye],['detail',[6,6,10]]]){
  const ray=new T.Raycaster(),origin=new T.Vector3(...eye),props=[];
  root.traverse(o=>{if(!o.isMesh)return;let parent=o,group=null;while(parent){if(/-contents$/.test(parent.name))group=parent;parent=parent.parent;}if(!group)return;
   let visible=0,samples=0;const bounds=new T.Box3().setFromObject(o,true);
   const targets=[];for(let x=0;x<=6;x++)for(let z=0;z<=6;z++)targets.push(new T.Vector3(bounds.min.x+(bounds.max.x-bounds.min.x)*x/6,bounds.max.y,bounds.min.z+(bounds.max.z-bounds.min.z)*z/6));
   for(const p of targets){ray.set(origin,p.clone().sub(origin).normalize());const hit=ray.intersectObjects(root.children,true)[0];if(hit?.object===o)visible++;samples++;}
   props.push({drawer:group.name,part:o.name,visible,samples});
  });
  const total=props.reduce((n,p)=>n+p.visible,0);if(!open&&total)console.log(props.filter(p=>p.visible));if(!open)assert.equal(total,0,'Closed contents sampled rays must be concealed');else if(frame==='overview') for(const group of ['top-contents','middle-contents','bottom-contents'])assert.ok(props.some(p=>p.drawer===group&&p.visible>0),'Visible contents '+frame+' '+group);
  results.push({open,frame,visibleSamples:total,props});
 }
}
fs.writeFileSync(new URL('../../docs/redesign/session-15-drawers/visibility.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(results.map(({props,...r})=>r));console.log('Four configurations pass sampled physical visibility checks; not complete pixel coverage or browser proof.');
