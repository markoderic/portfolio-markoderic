import { cubicBezier } from 'framer-motion';
import { deskPose } from './deskCamera.js';

export const ARRIVAL = { duration: 1.2, fade: .22, distance: 1.45, lift: 1.2, curve: [.23, 1, .32, 1] };
const ease = cubicBezier(...ARRIVAL.curve);
export function arrivalPose(size, progress) {
 const end=deskPose(size),start=end.position.clone().sub(end.look).multiplyScalar(ARRIVAL.distance).add(end.look),look=end.look.clone();
 start.y+=ARRIVAL.lift;look.x+=.4;look.y+=.35;
 const t=ease(Math.max(0,Math.min(1,progress)));
 return {position:start.lerp(end.position,t),look:look.lerp(end.look,t)};
}
export const createArrivalClock=()=>({token:-1,elapsed:0,completed:false,locked:false,segment:null});
// Rig alone supplies the committed presentation and clock. Resizing rebases the
// remaining path from that presentation; hidden/large deltas cannot advance it.
export function entryCameraFrame(clock,entry,size,dt,hidden,displayed){
 if(!entry)return null;
 if(entry.phase==='active'){
  const snap=clock.locked||(clock.token===-1&&entry.skipped);clock.locked=false;clock.token=entry.token;clock.segment=null;
  return snap?{...deskPose(size),fade:0}:null;
 }
 clock.locked=true;
 if(entry.phase==='terminal')return {...arrivalPose(size,0),fade:1};
 const fresh=clock.token!==entry.token;
 if(fresh){clock.token=entry.token;clock.elapsed=0;clock.completed=false;clock.segment=null;}
 const resized=clock.segment&&(clock.segment.width!==size.width||clock.segment.height!==size.height);
 if(!clock.segment||resized){
  const start=displayed||arrivalPose(size,0);
  clock.segment={position:start.position.clone(),look:start.look.clone(),end:deskPose(size),elapsed:0,duration:Math.max(.12,ARRIVAL.duration-clock.elapsed),width:size.width,height:size.height};
 }
 const delta=!hidden&&dt>=0&&dt<=.1&&!fresh&&!resized?dt:0,s=clock.segment;
 clock.elapsed+=delta;s.elapsed=Math.min(s.duration,s.elapsed+delta);
 if(s.elapsed>s.duration-1e-9)s.elapsed=s.duration;
 const t=ease(s.elapsed/s.duration),result={position:s.position.clone().lerp(s.end.position,t),look:s.look.clone().lerp(s.end.look,t),fade:1-Math.min(1,clock.elapsed/ARRIVAL.fade)};
 if(s.elapsed===s.duration&&!clock.completed){clock.completed=true;result.complete=entry.token;}
 return result;
}
export function presentEntryExit(element,frame){
 if(!element||frame?.fade===undefined)return;
 const opacity=frame.fade.toFixed(4),scale=(1+.025*(1-frame.fade)).toFixed(4);
 if(element.style.getPropertyValue('--entry-opacity')!==opacity)element.style.setProperty('--entry-opacity',opacity);
 if(element.style.getPropertyValue('--entry-scale')!==scale)element.style.setProperty('--entry-scale',scale);
}
