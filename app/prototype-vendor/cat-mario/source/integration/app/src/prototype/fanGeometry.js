import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const FAN_STRIPS=[{x:-.20,y:.30,z:.312,length:.50,phase:0},{x:0,y:.32,z:.312,length:.55,phase:2.1},{x:.20,y:.30,z:.312,length:.47,phase:4.3}];
export const STRIP_ROWS=18,STRIP_WIDTH=.045;
const paint='#989883',metal='#9e9c8b',dark='#303b3e';
function merge(parts){const plain=parts.map(g=>g.index?g.toNonIndexed():g);const g=mergeGeometries(plain);parts.forEach(p=>p.dispose());plain.forEach(p=>{if(!parts.includes(p))p.dispose();});return g;}
function cylinder(r1,r2,h,pos,axis='y',segments=32){const g=new T.CylinderGeometry(r1,r2,h,segments);if(axis==='z')g.rotateX(Math.PI/2);g.translate(...pos);return g;}
function ring(r,t,z){return new T.TorusGeometry(r,t,6,48).translate(0,0,z);}
function line(points,r=.009){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,r,5,false);}
function blade(){
 const shape=new T.Shape();shape.moveTo(.08,-.05);shape.bezierCurveTo(.22,-.12,.43,-.10,.49,.08);shape.bezierCurveTo(.54,.19,.35,.31,.23,.30);shape.bezierCurveTo(.15,.25,.10,.08,.08,-.05);
 const g=new T.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,steps:1,curveSegments:8});
 // Gentle pitch across each broad blade. All tips stay inside radius .555.
 const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)+a.getY(i)*.13-.04);g.computeVertexNormals();return g;
}
export function fanTabAnchor(s){
 // Exact middle control point of the matching 60/90/120 degree guard spoke.
 return [Math.sign(s.x)*.17,s.x===0?.34:Math.sqrt(3)*.17,.24];
}
function tab(s){
 const anchor=fanTabAnchor(s),positions=[];
 for(const [x,y,z]of [anchor,[(anchor[0]+s.x)/2,Math.max(anchor[1],s.y)+.01,.275],[s.x,s.y,.312],[s.x,s.y-.015,.312]])for(const side of [-1,1])positions.push(x+side*.026,y,z);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,4,6,5,5,6,7]);g.computeVertexNormals();return g;
}
export function fanParts(){
 const shell=new T.LatheGeometry([[.53,-.16],[.60,-.14],[.62,-.08],[.62,.07],[.60,.14],[.57,.15],[.565,-.1]].map(p=>new T.Vector2(...p)),48);shell.rotateX(Math.PI/2);
 const cage=[];
 for(const [r,z]of [[.18,.27],[.32,.25],[.46,.20],[.585,.14],[.25,-.18],[.43,-.18],[.585,-.16]])cage.push(ring(r,.009,z));
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a),y=Math.sin(a);cage.push(line([[.12*x,.12*y,.28],[.34*x,.34*y,.24],[.585*x,.585*y,.14]]));if(i%2===0)cage.push(line([[.15*x,.15*y,-.18],[.36*x,.36*y,-.18],[.585*x,.585*y,-.16]]));}
 const rotor=[];for(let i=0;i<3;i++)rotor.push(blade().rotateZ(i*Math.PI*2/3));rotor.push(cylinder(.135,.135,.12,[0,0,0],'z'));
 const parts=[
  {name:'fan-base',owner:'fixed',color:paint,geometry:new T.LatheGeometry([[0,0],[.36,0],[.44,.025],[.46,.06],[.43,.10],[.33,.145],[0,.145]].map(p=>new T.Vector2(...p)),40).scale(1,1,.82),cast:true,trigger:true},
  {name:'fan-neck',owner:'fixed',color:paint,geometry:merge([cylinder(.085,.16,.67,[0,.485,-.16]),new T.SphereGeometry(.105,16,10).translate(0,.84,-.16)]),cast:true},
  {name:'fan-switch',owner:'fixed',color:dark,geometry:cylinder(.075,.082,.055,[0,.165,.225]),cast:true,trigger:true},
  {name:'fan-switch-mark',owner:'indicator',trigger:true,color:'#c0c7ac',geometry:new T.BoxGeometry(.012,.003,.05).translate(0,.194,.248)},
  {name:'fan-housing',owner:'head',color:paint,geometry:shell,cast:true},
  {name:'fan-motor',owner:'head',color:dark,geometry:merge([cylinder(.20,.17,.27,[0,0,-.28],'z'),cylinder(.07,.07,.20,[0,0,-.09],'z')]),cast:true},
  {name:'fan-guard',owner:'head',color:metal,geometry:merge(cage),metalness:.65},
  {name:'fan-front-cap',owner:'head',color:paint,geometry:cylinder(.12,.12,.04,[0,0,.275],'z')},
  {name:'fan-blades',owner:'rotor',color:'#596569',geometry:merge(rotor),metalness:.3},
  {name:'fan-strip-tabs',owner:'head',color:'#c5bfae',geometry:merge(FAN_STRIPS.map(tab))},
 ];
 return parts;
}
export function streamerGeometry(){
 const count=FAN_STRIPS.length*(STRIP_ROWS+1)*2,geometry=new T.BufferGeometry(),indices=[];
 geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(count*3),3));
 for(let k=0;k<FAN_STRIPS.length;k++)for(let i=0;i<STRIP_ROWS;i++){const a=k*(STRIP_ROWS+1)*2+i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}geometry.setIndex(indices);
 // Conservative all-power/all-phase local bounds: stable frustum culling,
 // no per-frame scans/allocations. Exact fit is checked offline.
 geometry.boundingBox=new T.Box3(new T.Vector3(-.30,-.30,.311),new T.Vector3(.30,.45,.89));geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
 deformStreamers(geometry,0,0);return geometry;
}
export function deformStreamers(g,power,phase){
 const p=g.attributes.position.array,n=g.attributes.normal.array;
 for(let k=0;k<FAN_STRIPS.length;k++){
  const strip=FAN_STRIPS[k],ds=strip.length/STRIP_ROWS;let x=strip.x,y=strip.y,z=strip.z;
  for(let i=0;i<=STRIP_ROWS;i++){
   const t=i/STRIP_ROWS,angle=power*(Math.PI/2-.10)+.15*power*t*Math.sin(phase-strip.phase-t*5);
   const dx=.10*power*t*Math.sin(phase*1.0+strip.phase-t*6),dy=-Math.cos(angle),dz=Math.sin(angle),len=Math.hypot(dx,dy,dz);
   if(i){x+=ds*dx/len;y+=ds*dy/len;z+=ds*dz/len;}
   // Root positions are exact for every power/phase, with no stretching.
   for(let side=0;side<2;side++){const j=(k*(STRIP_ROWS+1)*2+i*2+side)*3;p[j]=x+(side-.5)*STRIP_WIDTH;p[j+1]=y;p[j+2]=z;n[j]=0;n[j+1]=dz;n[j+2]=-dy;}
  }
 }
 g.attributes.position.needsUpdate=true;g.attributes.normal.needsUpdate=true;
}
