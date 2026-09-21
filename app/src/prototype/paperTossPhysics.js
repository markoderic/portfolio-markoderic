import * as T from 'three';
import {FAN} from './fanMotion';
import {BIN_SCALE,binInnerRadius} from './binGeometry';
import {FLOOR_Y} from './sceneScale';
export const TOSS={launch:[-1.8,-.1,5.25],radius:.18,step:1/120,gravity:12,drag:.1,lifetime:3,hold:.35,bin:[-5.95,FLOOR_Y,3.1],rim:FLOOR_Y+.76*BIN_SCALE};
export const TOSS_HEADING=T.MathUtils.radToDeg(Math.atan2(TOSS.bin[2]-TOSS.launch[2],TOSS.launch[0]-TOSS.bin[0]));
export const clampTossHeading=heading=>T.MathUtils.clamp(heading,TOSS_HEADING-18,TOSS_HEADING+18);
export function launchVelocity(heading,power,out=new T.Vector3()){
 const a=T.MathUtils.degToRad(clampTossHeading(heading)),speed=3.2+2.8*T.MathUtils.clamp(power,0,100)/100;
 return out.set(-Math.cos(a)*Math.cos(Math.PI/6)*speed,.5*speed,Math.sin(a)*Math.cos(Math.PI/6)*speed);
}
export function entryTime(a,b,r=TOSS.radius){
 const level=TOSS.rim-r;if(a.y<=level||b.y>=a.y||b.y>level)return null;
 const t=(level-a.y)/(b.y-a.y),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
 const inner=BIN_SCALE*binInnerRadius((level-r-FLOOR_Y)/BIN_SCALE);
 return Math.hypot(x-TOSS.bin[0],z-TOSS.bin[2])+r+.015<inner?t:null;
}
export function fanSample(history,time,out={}){
 const a=history?.previous,b=history?.current;if(!b){out.yaw=FAN.direction;out.power=0;return out;}
 const t=a&&b.time>a.time?T.MathUtils.clamp((time-a.time)/(b.time-a.time),0,1):1;
 out.yaw=a?a.yaw+(b.yaw-a.yaw)*t:b.yaw;out.power=a?a.power+(b.power-a.power)*t:b.power;return out;
}
export function createAirflow(){
 const d=new T.Vector3(),c=new T.Vector3(),q=new T.Vector3(),up=new T.Vector3(0,1,0),ray=new T.Raycaster(),hits=[];
 const airflow=(p,fan,out,scene)=>{
  out.set(0,0,0);if(!fan||fan.power<=0)return out;
  d.set(Math.sin(fan.yaw),0,Math.cos(fan.yaw));c.set(FAN.head[0],FAN.head[1],FAN.head[2]+.28).applyAxisAngle(up,fan.yaw);c.x+=FAN.pivot[0]+FAN.position[0];c.y+=FAN.pivot[1]+FAN.position[1];c.z+=FAN.pivot[2]+FAN.position[2];q.copy(p).sub(c);
  const s=q.dot(d),rho=q.addScaledVector(d,-s).length(),R=.55+.12*s;
  if(s<=0||s>=10||rho>=R)return out;
  if(scene){ray.ray.origin.copy(c);ray.ray.direction.copy(p).sub(c);ray.far=ray.ray.direction.length()-1e-4;ray.ray.direction.normalize();hits.length=0;ray.intersectObject(scene,true,hits);
   if(hits.some(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible||o.userData.shadowOnly||o.userData.tossOwned||o.name==='desk-fan')return false;return h.object.material?.colorWrite!==false;}))return out;
  }
  const u=Math.max(0,s-9),taper=1-u*u*(3-2*u);
  return out.copy(d).multiplyScalar(6*fan.power**2/(1+(s/5)**2)*(1-(rho/R)**2)**2*taper);
 };
 airflow.clear=()=>{hits.length=0;};return airflow;
}
export function createFlight(heading,power,origin=new T.Vector3(...TOSS.launch)){return {p:origin.clone(),v:launchVelocity(heading,power),old:new T.Vector3(),air:new T.Vector3(),fan:{},elapsed:0,entered:false,done:false,result:null,contact:null};}
export function stepFlight(f,collisions,airflow,history,time,h=TOSS.step,scene){
 if(f.done)return;
 f.old.copy(f.p);airflow(f.p,fanSample(history,time,f.fan),f.air,scene);
 f.v.set(f.v.x+(f.air.x-TOSS.drag*f.v.x)*h,f.v.y+(f.air.y-TOSS.gravity-TOSS.drag*f.v.y)*h,f.v.z+(f.air.z-TOSS.drag*f.v.z)*h);f.v.clampLength(0,16);f.p.addScaledVector(f.v,h);f.elapsed+=h;
 const hit=collisions.sweep(f.old,f.p,TOSS.radius),enter=entryTime(f.old,f.p);
 // Contact wins ties and unresolved candidates; entry is provisional until contact.
 if(enter!==null&&(!hit||enter<hit.t-1e-6))f.entered=true;
 if(hit){f.p.lerpVectors(f.old,f.p,hit.t);f.done=true;f.contact={...hit};f.result=f.entered&&hit.bin&&!hit.unresolved?'make':'miss';}
 if(!f.done&&(f.elapsed>=TOSS.lifetime-1e-9||Math.abs(f.p.x)>12||f.p.z< -8||f.p.z>12||f.p.y>6||f.p.y< -7)){f.done=true;f.result='miss';}
}
