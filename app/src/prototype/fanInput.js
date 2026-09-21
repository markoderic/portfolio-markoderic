import * as T from 'three';
import {pressField,finitePoint} from './physicalPress.js';
import {tracePointer} from './runtimeDiagnostics.js';
import {clearFanInput} from './fanMotion.js';
export function exposedFan(e){
  if(!e?.object||!e.ray)return false;
  let root=e.object;while(root.parent)root=root.parent;root.updateMatrixWorld(true);
  const ray=new T.Raycaster();ray.ray.copy(e.ray);
  const hit=ray.intersectObjects(root.children.length?root.children:[root],true).find(h=>{
    for(let o=h.object;o;o=o.parent)if(!o.visible||o.userData.shadowOnly)return false;return true;
  });
  // Only actual structural/rotor triangles qualify. No enlarged hit volume;
  // an unrelated opaque foreground object still wins, even without handlers.
  return !!hit?.object.userData.fanOwned;
}
export function moveFanInput(input,e){
  const p=input.fanPress;
  if(p&&p.pointerId===e.pointerId)p.moved ||= !finitePoint(e)||Math.hypot(e.clientX-p.x,e.clientY-p.y)>5;
}
export function fanHandlers(input,enabled,toggle,exposed=exposedFan){
  const consume=e=>{e.stopPropagation();if(e.nativeEvent)e.nativeEvent.sceneObject=true;};
  const reason=e=>!enabled?'disabled':input.dragging?'orbit-drag':input.hidden?'hidden':!exposed(e)?'occluded-or-off-target':null;
  const note=(e,why,p=input.fanPress)=>tracePointer(input,'fan',e,why,p);
  return {
    onPointerOver(e){if(!reason(e)&&e.pointerType!=='touch'){consume(e);input.fanHover=true;}},
    onPointerOut(e){if(!e?.intersections?.some(h=>h.object?.userData.fanOwned)){input.fanHover=false;if(input.fanPress)note(e,'hover-gap-retain-press');}},
    onPointerDown(e){
      const reject=reason(e);if(reject){note(e,reject);return;}consume(e);
      const guard=pressField(e,'isTrusted')===false?'untrusted':e.button!==0?'secondary-button':e.isPrimary===false?'secondary-pointer':input.fanPress?'already-owned':!Number.isFinite(e.pointerId)||!finitePoint(e)?'invalid-pointer':null;
      if(guard){note(e,guard);return;}
      input.fanPress={pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,time:pressField(e,'timeStamp')};note(e,'paired-down');
    },
    onPointerMove(e){
      moveFanInput(input,e);
      if(!enabled||input.dragging||input.hidden){if(input.fanPress)note(e,'eligibility-lost');clearFanInput(input);return;}
      if(!exposed(e)){input.fanHover=false;return;}consume(e);input.fanHover=e.pointerType!=='touch';
    },
    onPointerUp(e){
      const p=input.fanPress;if(!p||p.pointerId!==e.pointerId){note(e,p?'wrong-pointer':'no-paired-down');return;}
      moveFanInput(input,e);
      const reject=reason(e)||(pressField(e,'isTrusted')===false?'untrusted':p.moved?'drag-excursion':e.button!==0||e.isPrimary===false?'secondary-release':!finitePoint(e)?'invalid-point':null);
      input.fanPress=null;if(reject){note(e,reject,p);input.fanHover=false;return;}
      consume(e);note(e,'activate',p);toggle();
    },
    onPointerCancel(e){note(e,'cancel');if(!e||input.fanPress?.pointerId===e.pointerId)clearFanInput(input);},
    onLostPointerCapture(e){note(e,'capture-lost');if(!e||input.fanPress?.pointerId===e.pointerId)clearFanInput(input);},
    onClick(e){note(e,'compatibility-click-no-activation');consume(e);},
  };
}
