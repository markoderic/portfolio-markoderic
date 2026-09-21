import * as T from 'three';
// Availability describes current state; it never queues an eventual launch.
export function tossReadiness({view,direct,reduced,entryLocked,hidden,settled,paperReady,drawersMoving,printPhase}) {
 const reason=direct||reduced?'Paper toss requires the 3D motion view.':entryLocked?'Finish entering the desk first.':hidden?'Return to this page to play.':
  ['waiting','crumple','toss','feed'].includes(printPhase)?'Wait for the résumé to finish.':view!=='desk'?'Return to the desk to play.':drawersMoving?'Wait for the drawers to settle.':!settled?'Wait for the desk to settle.':!paperReady?'Wait for the résumé to settle.':'';
 return {ready:!reason,reason};
}
export const TOSS_INVITATION={width:176,height:76,margin:12,anchor:[-5.95,-6.3,3.1]};
const point=new T.Vector3();
// A projected DOM anchor only: no mesh, collider, receiver or fit-bound helper.
export function tossEntryPosition(camera,size) {
 point.set(...TOSS_INVITATION.anchor).project(camera);
 if(!Number.isFinite(point.x+point.y+point.z)||point.z<=-1||point.z>=1||Math.abs(point.x)>1||Math.abs(point.y)>1)return null;
 const {width,height,margin}=TOSS_INVITATION;
 const x=(point.x+1)*size.width/2,y=(1-point.y)*size.height/2;
 return {x:Math.round(T.MathUtils.clamp(x-width/2,margin,size.width-width-margin)*2)/2,
  y:Math.round(T.MathUtils.clamp(y+12,64,size.height-height-margin)*2)/2,width,height};
}
export function projectTossEntry(host,camera,size) {
 if(!host)return;
 const p=tossEntryPosition(camera,size);host.style.visibility=p?'visible':'hidden';
 if(p){const transform=`translate3d(${p.x}px,${p.y}px,0)`;if(host.style.transform!==transform)host.style.transform=transform;}
}
