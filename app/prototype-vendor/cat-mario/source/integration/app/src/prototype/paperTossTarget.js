import * as T from 'three';
import {TOSS,launchVelocity} from './paperTossPhysics';
// Exact perspective sphere bounds keep the hit area centered without the old
// rotated cube's oversized corners. Shared with the bounded hand-plane margins.
export function tossTargetRadius(origin,camera,size){
 const p=origin.clone().applyMatrix4(camera.matrixWorldInverse),depth=-p.z,r=TOSS.radius,den=depth*depth-r*r;
 if(depth<=r)return Infinity;
 const extent=(axis,pixels)=>{const center=axis/depth,spread=r*Math.sqrt(depth*depth+axis*axis-r*r);return Math.max(Math.abs((axis*depth+spread)/den-center),Math.abs((axis*depth-spread)/den-center))*pixels;};
 return Math.max(extent(p.x,Math.abs(camera.projectionMatrix.elements[0])*size.width/2),extent(p.y,Math.abs(camera.projectionMatrix.elements[5])*size.height/2));
}
// Called only after the existing Rig commits camera and game-ball presentation.
export function projectTossTarget(game,camera,size) {
 if(!game)return;
 const hide=()=>{game.presentation={visible:false,valid:false};if(game.target)Object.assign(game.target.style,{visibility:'hidden',pointerEvents:'none'});if(game.cue){game.cue.style.visibility='hidden';game.cue.setAttribute('d','');}};
 const held=['ready','aiming'].includes(game.phase)||game.phase==='outcome'&&game.hold<=0;
 if(game.phase==='aiming'&&!tossPresentationCurrent(game,game.presentation))game.cancelAim();
 const origin=game.ball?.position||game.held||new T.Vector3(...TOSS.launch),point=origin.clone().project(camera);
 const visible=held&&!game.blocked&&!game.hidden&&!!game.ball?.visible&&size.width>0&&size.height>0&&
  [point.x,point.y,point.z].every(Number.isFinite)&&Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1;
 const x=(point.x+1)*size.width/2,y=(1-point.y)*size.height/2;
 const radius=tossTargetRadius(origin,camera,size);
 const diameter=Math.max(88,2*radius+28);
 if(game.phase==='aiming'&&!visible){game.cancelAim();return projectTossTarget(game,camera,size);}
 if(!visible||![x,y,radius,diameter].every(Number.isFinite)){hide();return;}
 game.presentation={visible,valid:true,x,y,diameter,width:size.width,height:size.height,matrix:[...camera.matrixWorld.elements],projection:[...camera.projectionMatrix.elements]};
 // Project the real initial velocity. Keep the single arrow behind the hand
 // so a strong forward drag never draws a landing preview over the bin.
 const end=origin.clone().addScaledVector(launchVelocity(game.heading,game.power).normalize(),.6).project(camera);
 if(![end.x,end.y,end.z].every(Number.isFinite)){hide();return;}
 const direction=new T.Vector2((end.x-point.x)*size.width/2,(point.y-end.y)*size.height/2).normalize();
 const tip=new T.Vector2(x,y).addScaledVector(direction,-radius-8),back=direction.clone().negate();
 let room=116;
 for(const [v,d,min,max]of [[tip.x,back.x,14,size.width-14],[tip.y,back.y,64,size.height-86]])if(Math.abs(d)>1e-6)room=Math.min(room,((d>0?max:min)-v)/d);
 const length=Math.max(0,Math.min(48+68*game.power/100,room)),tail=tip.clone().addScaledVector(back,length),neck=tip.clone().addScaledVector(back,12),side=new T.Vector2(-direction.y,direction.x);
 const polygon=[tail.clone().addScaledVector(side,1.5),neck.clone().addScaledVector(side,1.5),neck.clone().addScaledVector(side,6),tip,neck.clone().addScaledVector(side,-6),neck.clone().addScaledVector(side,-1.5),tail.clone().addScaledVector(side,-1.5)];
 if(!polygon.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))){hide();return;}
 game.presentation.arrow={tail:tail.toArray(),tip:tip.toArray(),direction:direction.toArray(),length};
 if(game.cue){game.cue.style.visibility=visible&&['ready','aiming'].includes(game.phase)&&length>=24?'visible':'hidden';game.cue.setAttribute('d','M'+polygon.map(p=>p.toArray().map(v=>v.toFixed(2)).join(',')).join('L')+'Z');}
 const host=game.target;if(!host)return;
 Object.assign(host.style,{left:`${x-diameter/2}px`,top:`${y-diameter/2}px`,width:`${diameter}px`,height:`${diameter}px`,visibility:visible?'visible':'hidden',pointerEvents:visible?'auto':'none'});
 if(visible)game.targetPresented?.();
}
export function tossPresentationCurrent(game,p) {
 return !!game.camera&&!!p?.visible&&!!game.presentation?.visible&&!game.blocked&&!game.hidden&&
  p.width===game.size?.width&&p.height===game.size?.height&&
  p.matrix.every((v,i)=>Math.abs(v-game.camera.matrixWorld.elements[i])<1e-6)&&
  p.projection.every((v,i)=>Math.abs(v-game.camera.projectionMatrix.elements[i])<1e-6);
}
