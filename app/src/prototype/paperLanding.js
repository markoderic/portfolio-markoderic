import * as T from 'three';
import {BIN_PAPERS,BIN_SCALE,paperGeometry} from './binGeometry.js';
import {triangles,contactHeight} from './binContact.js';
import {PAPER_WIDTH,PAPER_HEIGHT} from './paperGeometry.js';
import {PRINTER} from './sceneScale.js';
let receivingTriangles;
function receivingSurface(){
  if(!receivingTriangles){
    receivingTriangles=BIN_PAPERS.flatMap(p=>{const g=paperGeometry(p.seed,p.scale);g.scale(BIN_SCALE,BIN_SCALE,BIN_SCALE);const value=triangles(g,p.position.map(v=>v*BIN_SCALE));g.dispose();return value;}).sort((a,b)=>Math.max(...b.map(v=>v[1]))-Math.max(...a.map(v=>v[1])));
  }
  return receivingTriangles;
}
// One deterministic geometric endpoint fit per throw, not frame-by-frame physics.
// Same 16x20 sheet/deformation as Rig; the mounted-geometry check compares them.
export function landingTriangles(quaternion){
  const g=new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT,16,20),a=g.attributes.position;
  const q=quaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),5)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),3));
  for(let i=0;i<a.count;i++){
    const theta=a.getX(i)/PAPER_WIDTH*6.8,phi=((a.getY(i)/(PAPER_HEIGHT/2)+1)*Math.PI)/2,r=PRINTER.scale*(.105+.018*Math.sin(i*7.13));
    const p=new T.Vector3(r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta)).applyQuaternion(q);a.setXYZ(i,p.x,p.y,p.z);
  }
  const result=triangles(g).sort((a,b)=>Math.min(...a.map(v=>v[1]))-Math.min(...b.map(v=>v[1])));g.dispose();return result;
}
export function fitLanding(curve,bin,quaternion){
  const surface=receivingSurface(),ball=landingTriangles(quaternion),point=new T.Vector3();let end=.98,height;
  // The endpoint stays on the original path; iterate its tiny lateral residual.
  for(let k=0;k<2;k++){
    curve.getPoint(end,point);const shifted=ball.map(tri=>tri.map(v=>[v[0]+point.x-bin[0],v[1],v[2]+point.z-bin[2]]));
    height=bin[1]+contactHeight(shifted,surface).height+.002;
    let lo=.8,hi=1;for(let i=0;i<32;i++){const mid=(lo+hi)/2;curve.getPoint(mid,point);if(point.y>height)lo=mid;else hi=mid;}end=(lo+hi)/2;
  }
  return {end,height};
}
