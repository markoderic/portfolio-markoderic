import * as THREE from 'three';
import {DESK} from './sceneScale.js';
// The receiver stays inside the rounded tabletop's flat face, not above its bevel.
// Near-surface ambient contact supplements existing directional/spot cast shadows.
// The receiver sits just above the .012 desk mat; it has no floor/base color.
export const TABLETOP_SHADOW = {
  center:[0,-.01,0], receiver:[0,.014,0], width:DESK.width-.12, depth:DESK.depth-.12,
  scanInterval:.5,
  layers:[{name:'table-contact',far:.4,resolution:512,blurStep:.018,day:.34,night:.27}],
};
const bounds=new THREE.Box3();
export function tabletopCasterSnapshot(refs){
  const meshes=[],signature=[];
  for(const name of ['fan','production','clock','lamp','printer','laptop']){
    const root=refs[name]?.current;if(!root)return null;
    root.updateWorldMatrix(true,true);const start=meshes.length;
    root.traverseVisible(o=>{
      if(!o.isMesh||!o.castShadow||!o.geometry?.attributes.position||o.userData.shadowOnly)return;
      // Never key a cache on the continuously moving head/rotor/ribbons.
      if(name==='fan'&&o.name!=='fan-base')return;
      // Shared material batches can straddle the band (e.g. a lid and hinge).
      // Bounds select potential casters; the depth camera clips taller triangles.
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
      bounds.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      if(bounds.min.y>=TABLETOP_SHADOW.center[1]+TABLETOP_SHADOW.layers[0].far||bounds.max.y<=TABLETOP_SHADOW.center[1]+.001)return;
      meshes.push(o);signature.push(o.uuid,o.geometry.uuid,o.geometry.attributes.position.version,o.geometry.index?.version??0,...o.matrixWorld.elements);
    });
    if(start===meshes.length)return null; // Imported M3 may not be mounted yet.
  }
  return {meshes,key:signature.join(',')};
}
export function captureTabletopIfNeeded(state,resources,gl,refs,dt){
  state.elapsed+=Math.max(0,Math.min(dt,TABLETOP_SHADOW.scanInterval));
  if(!state.dirty&&state.elapsed<TABLETOP_SHADOW.scanInterval)return false;
  state.elapsed=0;const snapshot=tabletopCasterSnapshot(refs);if(!snapshot)return false;
  if(!state.dirty&&snapshot.key===state.key)return false;
  resources.capture(gl,snapshot.meshes);state.key=snapshot.key;state.dirty=false;return true;
}
