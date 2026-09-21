import * as T from 'three';
import {LAPTOP} from './deviceGeometry.js';
// Original shallow optical approximation. The live aperture and its three masks
// remain the only geometry/input owners; this never transforms their content.
export function createDisplayOptics(){
 const inverse=new T.Matrix4(),eye=new T.Vector3(),cache=new WeakMap();
 return (element,plane,camera,pixels,visible)=>{
  if(!element)return;
  let values={'--glass-visible':'0'};
  if(visible&&plane&&camera&&pixels.width>0&&pixels.height>0){
   inverse.copy(plane.matrixWorld).invert();camera.getWorldPosition(eye).applyMatrix4(inverse);
   if([eye.x,eye.y,eye.z].every(Number.isFinite)&&eye.z>.012){
    const clamp=T.MathUtils.clamp,sx=clamp(eye.x/eye.z,-1.5,1.5),sy=clamp(eye.y/eye.z,-1.5,1.5),oblique=clamp((1-eye.z/eye.length())/.6,0,1);
    const px=clamp(-.006*eye.x/(eye.z-.006)*pixels.width/LAPTOP.width,-4,4),py=clamp(.006*eye.y/(eye.z-.006)*pixels.height/LAPTOP.height,-4,4);
    values={'--glass-visible':'1','--glass-x':(18+4*sx).toFixed(1)+'%','--glass-y':(-18+4*sy).toFixed(1)+'%',
     '--glass-dx':px.toFixed(1)+'px','--glass-dy':py.toFixed(1)+'px','--glass-alpha':(.045+.035*oblique).toFixed(3),
     '--glass-left':(.15+.03*oblique+.025*sx).toFixed(3),'--glass-right':(.15+.03*oblique-.025*sx).toFixed(3)};
   }
  }
  const previous=cache.get(element)||{};
  for(const [key,value]of Object.entries(values))if(previous[key]!==value)element.style.setProperty(key,value);
  cache.set(element,{...previous,...values});
 };
}
