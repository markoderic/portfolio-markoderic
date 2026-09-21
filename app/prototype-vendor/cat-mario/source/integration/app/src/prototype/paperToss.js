import * as T from 'three';
import {createFlight,createAirflow,stepFlight,TOSS,TOSS_HEADING,clampTossHeading,fanSample} from './paperTossPhysics';
import {createTossCollisions} from './paperTossCollision';
import {BIN_SCALE,binInnerRadius} from './binGeometry';
import {tossTargetRadius} from './paperTossTarget';
export function createPaperToss(){
 const listeners=new Set(),air=createAirflow(),wind=new T.Vector3(),launch=new T.Vector3(...TOSS.launch),fan={};let cache=null,acc=0,clock=0,windClock=0,cancelInput=null;
 const g={phase:'off',available:false,heading:TOSS_HEADING,power:50,held:launch.clone(),made:0,attempts:0,id:0,flight:null,hold:0,wind:0,status:'',camera:null,size:null,blocked:false,hidden:false,ball:null,cue:null,audio:null,restoreCamera:null};
 const resetHand=()=>{g.held.copy(launch);if(g.ball)g.ball.position.copy(launch);};
 const emit=()=>{for(const fn of listeners)fn();};
 const phase=p=>{g.phase=p;emit();};
 g.subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};g.active=()=>g.phase!=='off';
 g.inputCancel=fn=>{cancelInput=fn;};
 g.cancelAim=()=>{if(g.phase!=='aiming')return false;cancelInput?.();g.releaseInput?.();if(g.prior){g.heading=g.prior.heading;g.power=g.prior.power;}g.prior=null;resetHand();phase('ready');return true;};
 g.setAim=(heading,power,held)=>{if(!['ready','aiming'].includes(g.phase)||g.blocked||![heading,power].every(Number.isFinite))return;g.prior||={heading:g.heading,power:g.power};g.heading=clampTossHeading(heading);g.power=T.MathUtils.clamp(power,0,100);if(held&&held.toArray().every(Number.isFinite))g.held.copy(held);if(g.ball)g.ball.position.copy(g.held);phase('aiming');};
 g.cancel=(message='Throw canceled')=>{cancelInput?.();g.releaseInput?.();g.audio?.cancel();acc=0;g.flight=null;resetHand();g.hold=0;if(g.prior){g.heading=g.prior.heading;g.power=g.prior.power;}g.prior=null;g.status=message;if(g.active())phase('entering');};
 g.exit=()=>{if(!g.active())return;g.cancel();cache?.dispose();cache=null;g.resumeOutcome=false;g.made=0;g.attempts=0;g.heading=TOSS_HEADING;g.power=50;g.restoreCamera?.();g.restoreCamera=null;air.clear();g.camera=null;g.size=null;phase('off');};
 g.enter=()=>{if(!g.available||g.active()||g.hidden)return false;g.status='Preparing throw';phase('entering');return true;};
 g.throw=()=>{if(!['ready','aiming'].includes(g.phase)||g.blocked||g.hidden||!cache)return false;cancelInput?.();g.prior=null;g.flight=createFlight(g.heading,g.power,g.held);g.id++;acc=0;g.audio?.begin(g.id);g.status='';phase('flight');return true;};
 g.next=()=>{if(g.phase!=='outcome'||g.blocked)return;g.audio?.cancel();g.flight=null;resetHand();g.hold=0;g.status='';phase('ready');};
 g.resize=()=>{if(g.active()){const resolved=g.phase==='outcome'||g.resumeOutcome,status=g.status;g.cancel('View resized — aim again');if(resolved){g.resumeOutcome=true;g.status=status;}cache?.dispose();cache=null;}};
 g.pageHidden=value=>{g.hidden=value;if(value&&g.active()){if(g.phase==='outcome'||g.resumeOutcome){g.audio?.cancel();g.hold=0;cancelInput?.();g.releaseInput?.();}else g.cancel('Throw canceled while away');}};
 g.frame=({dt,time,camera,size,scene,history,settled,eligible})=>{
  if(g.size&&(g.size.width!==size.width||g.size.height!==size.height))g.resize();
  g.camera=camera;g.size=size;g.available=eligible&&!g.hidden;
  if(!g.active())return;
  if(g.hidden)return;
  if(!Number.isFinite(dt)||dt<0||dt>.1){if(g.phase!=='outcome'&&!g.resumeOutcome)g.cancel('Frame interrupted — aim again');else{g.hold=0;g.audio?.cancel();if(g.ball)g.ball.visible=false;}return;}
  if(g.phase==='entering'&&settled&&eligible){cache ||= createTossCollisions(scene);g.metrics=cache.stats;acc=0;const next=g.resumeOutcome?'outcome':'ready';g.resumeOutcome=false;phase(next);}
  if(g.phase==='flight'){
   acc+=dt;clock=time-acc;let steps=0;
   while(acc+1e-10>=TOSS.step&&steps++<12&&g.phase==='flight'){
    clock+=TOSS.step;stepFlight(g.flight,cache,air,history,clock,TOSS.step,scene);acc-=TOSS.step;
    if(g.flight.done){const f=g.flight;g.attempts++;if(f.result==='make')g.made++;g.hold=TOSS.hold;g.status=`${f.result==='make'?'In':'Miss'} — ${g.made}/${g.attempts}`;g.audio?.contact(g.id,!!f.contact?.bin,!!f.contact&&!f.contact.unresolved);phase('outcome');acc=0;}
   }
  }else if(g.phase==='outcome')g.hold=Math.max(0,g.hold-dt);
  windClock+=dt;if(windClock>=.1){windClock=0;air(g.held,fanSample(history,time,fan),wind,scene);g.wind=wind.length();g.windDirection=[wind.x,wind.z];emit();}
  if(g.ball){g.ball.visible=['ready','aiming','flight','outcome'].includes(g.phase);g.ball.position.copy(g.phase==='outcome'&&g.hold<=0?launch:g.flight?.p||g.held);g.ball.rotation.set(g.flight?.elapsed*3||0,g.flight?.elapsed*4||0,0);}
 };
 g.dispose=()=>{g.exit();listeners.clear();cancelInput=null;air.clear();g.camera=null;g.size=null;};return g;
}
// Forward is the visible rest-ball-to-bin direction, so a diagonal push toward
// the target remains neutral. The captured camera keeps that basis stable.
export function tossAimBasis(camera,size){
 const rest=new T.Vector3(...TOSS.launch).project(camera),rim=new T.Vector3(TOSS.bin[0],TOSS.rim,TOSS.bin[2]).project(camera);
 const forward=new T.Vector2((rim.x-rest.x)*size.width/2,(rest.y-rim.y)*size.height/2).normalize();
 return {forward,side:new T.Vector2(-forward.y,forward.x),rest:new T.Vector2((rest.x+1)*size.width/2,(1-rest.y)*size.height/2)};
}
export function forwardAim(camera,size,dx,dy){
 if(!camera||!size||![dx,dy,size.width,size.height].every(Number.isFinite)||size.width<=0||size.height<=0)return null;
 const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),basis=tossAimBasis(camera,size),drag=new T.Vector2(dx,dy);
 const forward=Math.max(0,drag.dot(basis.forward)),side=T.MathUtils.clamp(drag.dot(basis.side)/Math.max(forward,70),-Math.tan(Math.PI/10),Math.tan(Math.PI/10));
 const direction=new T.Vector3(TOSS.bin[0]-TOSS.launch[0],0,TOSS.bin[2]-TOSS.launch[2]).normalize().addScaledVector(right.clone().setY(0).normalize(),side).normalize();
 const heading=clampTossHeading(T.MathUtils.radToDeg(Math.atan2(direction.z,-direction.x)));
 const depth=-new T.Vector3(...TOSS.launch).applyMatrix4(camera.matrixWorldInverse).z;
 const units=2*depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))/size.height,scale=Math.min(1,72/Math.max(1,drag.length())),radius=TOSS.radius/units;
 // Keep the complete target opening above the hand, and the accessible hit area
 // inside the viewport. This bounds only the displayed hand; drag strength stays
 // continuous after reaching that limit. No furniture/collision exemptions.
 const rimRadius=BIN_SCALE*binInnerRadius(.76);let rimBottom=-Infinity;
 for(let i=0;i<16;i++){const p=new T.Vector3(TOSS.bin[0]+rimRadius*Math.cos(i*Math.PI/8),TOSS.rim,TOSS.bin[2]+rimRadius*Math.sin(i*Math.PI/8)).project(camera);rimBottom=Math.max(rimBottom,(1-p.y)*size.height/2);}
 const margin=Math.max(44,tossTargetRadius(new T.Vector3(...TOSS.launch),camera,size)+14)+8;
 const x=T.MathUtils.clamp(dx*scale,margin-basis.rest.x,size.width-margin-basis.rest.x);
 const y=T.MathUtils.clamp(dy*scale,Math.min(0,rimBottom+radius+12-basis.rest.y),Math.max(0,size.height-86-radius-basis.rest.y));
 const held=new T.Vector3(...TOSS.launch).addScaledVector(right,x*units).addScaledVector(up,-y*units);
 return {heading,power:100*T.MathUtils.clamp(forward/(.24*Math.min(size.width,size.height)),0,1),held,ready:forward>=8};
}
