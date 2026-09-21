import * as T from 'three';
// One local response inside Rig, only for desk <-> laptop. Retargeting retains
// position and velocity; unrelated camera owners invalidate this state.
export function createCameraApproach(){
 const positionVelocity=new T.Vector3(),lookVelocity=new T.Vector3(),offset=new T.Vector3(),j=new T.Vector3();
 const state={active:false,mode:null,positionVelocity,lookVelocity};
 state.reset=()=>{state.active=false;positionVelocity.set(0,0,0);lookVelocity.set(0,0,0);};
 state.prepare=(mode,allowed)=>{
  if(!allowed||!['desk','laptop'].includes(mode)){state.reset();state.mode=null;return;}
  if(state.mode&&state.mode!==mode)state.active=true;
  state.mode=mode;
 };
 const step=(current,target,velocity,dt)=>{const omega=10,e=Math.exp(-omega*dt);offset.copy(current).sub(target);j.copy(velocity).addScaledVector(offset,omega);current.copy(target).addScaledVector(offset,e).addScaledVector(j,dt*e);velocity.addScaledVector(j,-omega*dt).multiplyScalar(e);};
 state.frame=(position,look,targetPosition,targetLook,dt)=>{if(!state.active)return false;if(!(dt>0&&dt<=.1))return true;step(position,targetPosition,positionVelocity,dt);step(look,targetLook,lookVelocity,dt);return true;};
 state.still=()=>positionVelocity.length()<.001&&lookVelocity.length()<.001;
 return state;
}
