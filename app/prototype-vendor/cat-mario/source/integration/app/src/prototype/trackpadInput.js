import * as T from 'three';
import {pressField,finitePoint} from './physicalPress.js';
import {tracePointer} from './runtimeDiagnostics.js';
// Runtime conversion retains source mesh 11 as this distinct face (192 vertices).
// Its triangles, including rounded corners, are the boundary; never a material ID.
export const TRACKPAD_FACE = 'M3_Surface_8';
const belongs = (object, owner) => { for(let o=object;o;o=o.parent)if(o===owner)return true;return false; };
export function laptopHit(event, owner) {
  if(!owner || !event?.ray)return null;
  let root=owner;while(root.parent)root=root.parent;root.updateMatrixWorld(true);
  const ray=new T.Raycaster();ray.ray.copy(event.ray);
  const hit=ray.intersectObject(root,true).find(h=>{
    for(let o=h.object;o;o=o.parent)if(!o.visible||o.userData.shadowOnly)return false;
    return true;
  });
  if(!hit||!belongs(hit.object,owner))return null;
  return hit.object.name===TRACKPAD_FACE && hit.face?.normal.y>.9 ? 'trackpad' : 'laptop';
}
export function clearTrackpadInput(input){input.trackpadPress=null;}
export function moveTrackpadInput(input,e){
  const p=input.trackpadPress;
  if(p&&p.pointerId===e.pointerId)p.moved ||= !Number.isFinite(e.clientX+e.clientY)||Math.hypot(e.clientX-p.x,e.clientY-p.y)>5;
}
export function laptopHandlers(input,enabled,owner,activate,hit=laptopHit){
  const consume=e=>{e.stopPropagation();if(e.nativeEvent)e.nativeEvent.sceneObject=true;};
  const reason=()=>!enabled?'disabled':input.hidden?'hidden':input.laptopReturning?'phone-return-in-progress':input.dragging?'orbit-drag':null;
  const note=(e,why,p=input.trackpadPress)=>tracePointer(input,'laptop',e,why,p);
  return {
    onPointerDown(e){
      const reject=reason()||(pressField(e,'isTrusted')===false?'untrusted':e.button!==0?'secondary-button':e.isPrimary===false?'secondary-pointer':input.trackpadPress?'already-owned':!Number.isFinite(e.pointerId)||!finitePoint(e)?'invalid-pointer':null);
      if(reject){note(e,reject);return;}
      const kind=hit(e,owner.current);if(!kind){note(e,'occluded-or-off-target');return;}
      consume(e);input.trackpadPress={pointerId:e.pointerId,x:e.clientX,y:e.clientY,kind,moved:false,time:pressField(e,'timeStamp')};note(e,'paired-down');
    },
    onPointerMove(e){moveTrackpadInput(input,e);},
    onPointerUp(e){
      const p=input.trackpadPress;
      if(!p||p.pointerId!==e.pointerId){note(e,p?'wrong-pointer':'no-paired-down');return;}
      moveTrackpadInput(input,e);
      const reject=reason()||(pressField(e,'isTrusted')===false?'untrusted':p.moved?'drag-excursion':e.button!==0||e.isPrimary===false?'secondary-release':!finitePoint(e)?'invalid-point':hit(e,owner.current)!==p.kind?'occluded-or-off-target':null);
      clearTrackpadInput(input);if(reject){note(e,reject,p);return;}
      // A single validated release owns activation. A compatibility click is not
      // another gesture and must not need a second pointer identity / raycast.
      consume(e);note(e,'activate-'+p.kind,p);activate(p.kind);
    },
    onPointerCancel(e){note(e,'cancel');if(input.trackpadPress?.pointerId===e.pointerId)clearTrackpadInput(input);},
    onLostPointerCapture(e){note(e,'capture-lost');if(input.trackpadPress?.pointerId===e.pointerId)clearTrackpadInput(input);},
    onClick(e){note(e,'compatibility-click-no-activation');consume(e);},
  };
}
