import * as T from 'three';
import {TOSS} from './paperTossPhysics';

// Seated hand position beside the front/left of the chair, facing the real bin.
export function tossPose() {
 return {position:new T.Vector3(.3,3.4,5.96),look:new T.Vector3(-3.8,-2,4.05)};
}
export function createTossCamera(){
 let saved=null;
 return (game,motion,input,orbit,size)=>{
  const restore=()=>{if(!saved)return;motion.time=saved.time;motion.hover=null;motion.anchor=null;motion.hitCamera=null;input.manual=saved.manual;orbit.current={...saved.orbit};input.liveOrbit={...saved.live};saved=null;};
  if(!game?.active()){restore();return null;}
  if(!saved)saved={time:motion.time,manual:input.manual,orbit:{...orbit.current},live:{...input.liveOrbit}};
  game.restoreCamera=restore;
  return tossPose(size);
 };
}
