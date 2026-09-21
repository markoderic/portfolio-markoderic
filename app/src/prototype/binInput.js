import * as T from 'three';
import {finitePoint,pressField} from './physicalPress';
import {tracePointer} from './runtimeDiagnostics';
export const clearBinInput=input=>{input.binPress=null;};
export function moveBinInput(input,e){const p=input.binPress;if(p?.pointerId===e.pointerId)p.moved ||= !finitePoint(e)||Math.hypot(e.clientX-p.x,e.clientY-p.y)>5;}
export function exposedBin(e,owner) {
 if(!e?.ray||!owner)return false;
 let root=owner;while(root.parent)root=root.parent;root.updateMatrixWorld(true);
 const ray=new T.Raycaster();ray.ray.copy(e.ray);
 const hit=ray.intersectObject(root,true).find(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible||o.userData.shadowOnly)return false;return true;});
 for(let o=hit?.object;o;o=o.parent)if(o===owner)return true;
 return false;
}
export function binHandlers(input,allowed,owner,enter) {
 const consume=e=>{e.stopPropagation();if(e.nativeEvent)e.nativeEvent.sceneObject=true;};
 const reason=e=>!allowed()?'unavailable':input.hidden?'hidden':input.ui?'foreground-ui':input.dragging?'orbit-drag':!exposedBin(e,owner.current)?'occluded-or-off-target':null;
 const note=(e,why)=>tracePointer(input,'bin',e,why,input.binPress);
 return {
  onPointerOver(e){if(!reason(e)){consume(e);document.body.style.cursor='pointer';}},
  onPointerOut(){document.body.style.cursor='';},
  onPointerDown(e){const reject=reason(e)||(pressField(e,'isTrusted')===false?'untrusted':e.button!==0?'secondary-button':e.isPrimary===false?'secondary-pointer':input.binPress?'already-owned':!Number.isFinite(e.pointerId)||!finitePoint(e)?'invalid-pointer':null);if(reject){note(e,reject);return;}consume(e);input.binPress={pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,time:pressField(e,'timeStamp')};note(e,'paired-down');},
  onPointerMove(e){moveBinInput(input,e);},
  onPointerUp(e){const p=input.binPress;if(!p||p.pointerId!==e.pointerId)return;moveBinInput(input,e);const reject=reason(e)||(pressField(e,'isTrusted')===false?'untrusted':p.moved?'drag-excursion':e.button!==0||e.isPrimary===false?'secondary-release':!finitePoint(e)?'invalid-pointer':null);note(e,reject||'activate');clearBinInput(input);if(reject)return;consume(e);enter?.('bin');},
  onPointerCancel(e){if(!e||input.binPress?.pointerId===e.pointerId)clearBinInput(input);},
  onLostPointerCapture(e){if(!e||input.binPress?.pointerId===e.pointerId)clearBinInput(input);},
  onClick(e){consume(e);},
 };
}
