// Physical decorative motion; one shared speed envelope, no timers/extra RAF.
export const FAN = {
  position: [4.7, 0, -1.65], pivot: [0, .86, -.16], head: [0, .23, .16],
  direction: -Math.PI/4, sweep: Math.PI/4, cycle: 12, bladeSpeed: 14,
  rise: .32, fall: .55, maxDelta: .1, staleDelta: .5,
};
const TAU=Math.PI*2;
export const createFanMotion=()=>({power:0,spin:0,phase:0,flutter:0,yaw:FAN.direction,suspended:true,updates:0});
export function advanceFan(s,on,reduced,visible,dt){
  // Freeze the exact pose only during reduced/hidden/non-3D suspension. A resumed frame is
  // deliberately consumed, so even a small stale first delta cannot advance it.
  if(reduced||!visible||!Number.isFinite(dt)||dt<0||dt>FAN.staleDelta){s.suspended=true;return false;}
  if(s.suspended){s.suspended=false;return false;}
  if(!on&&s.power===0)return false;
  // Integrate every continuous visible frame with bounded work; do not starve
  // a slow renderer. Long stalls and lifecycle resumes still discard stale time.
  dt=Math.min(dt,FAN.maxDelta);
  const target=on?1:0,k=1/(on?FAN.rise:FAN.fall),decay=Math.exp(-k*dt);
  const integral=target*dt+(s.power-target)*(1-decay)/k;
  s.power=target+(s.power-target)*decay;
  if(Math.abs(s.power-target)<.001)s.power=target;
  s.spin=(s.spin+FAN.bladeSpeed*integral)%TAU;
  s.phase=(s.phase+TAU/FAN.cycle*integral)%TAU;
  s.flutter=(s.flutter+TAU*2.2*integral)%TAU;
  s.yaw=FAN.direction+FAN.sweep*Math.sin(s.phase);
  s.updates++;return true;
}
export const fanMotionVisible=(_view,active,direct,hidden)=>active&&!direct&&!hidden;
export const fanAllowed=({view,active,direct,dragging=false,blocked=false})=>view==='desk'&&active&&!direct&&!dragging&&!blocked;
export function clearFanInput(input){if(input){input.fanHover=false;input.fanPress=null;}}

// Logical Explore control is independent of physical desk hit eligibility.
export const fanControlAllowed=({active,direct,reduced=false,simple=false,failed=false,dragging=false,blocked=false,hidden=false})=>active&&!simple&&!failed&&(!direct||reduced)&&!dragging&&!blocked&&!hidden;
