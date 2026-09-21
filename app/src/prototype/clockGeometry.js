import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {DIGIT_SEGMENTS} from './localClock.js';
export const CLOCK={position:[2.1,0,-2.35],yaw:.15,width:1.85,height:.78,depth:.8,day:1,night:.7};
function merge(parts){const gs=parts.map(g=>g.index?g.toNonIndexed():g),out=mergeGeometries(gs);new Set([...parts,...gs]).forEach(g=>g.dispose());return out;}
function round(w,h,d,r,pos){return new RoundedBoxGeometry(w,h,d,2,r).translate(...pos);}
function rectangle(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(-x-r,y);s.quadraticCurveTo(-x,y,-x,y+r);s.lineTo(-x,-y-r);s.quadraticCurveTo(-x,-y,-x-r,-y);s.lineTo(x+r,-y);s.quadraticCurveTo(x,-y,x,-y-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function clockParts(){
 const rim=rectangle(1.77,.65,.045);rim.holes.push(new T.Path(rectangle(1.62,.50,.025).getPoints(3)));
 const bezel=new T.ExtrudeGeometry(rim,{depth:.055,bevelEnabled:false,curveSegments:3}).translate(0,.43,.397);
 const feet=[];for(const x of [-.64,.64])for(const z of [-.24,.24])feet.push(round(.19,.07,.17,.015,[x,.035,z]));
 const seam=merge([new T.BoxGeometry(1.7,.012,.004).translate(0,.20,-.402),...[-.55,-.33,-.11,.11,.33,.55].map(x=>new T.BoxGeometry(.075,.15,.003).translate(x,.45,-.402))]);
 return [
  {name:'clock-case',geometry:round(1.85,.72,.8,.055,[0,.42,0]),color:'#aaa394',roughness:.64,cast:true},
  {name:'clock-feet',geometry:merge(feet),color:'#303133',roughness:.92,cast:true},
  {name:'clock-bezel',geometry:bezel,color:'#4a4540',roughness:.48,cast:true},
  {name:'clock-display-well',geometry:round(1.62,.50,.015,.025,[0,.43,.408]),color:'#100e0e',roughness:.37},
  {name:'clock-rear-seam-vents',geometry:seam,color:'#55504a',roughness:.8},
  {name:'clock-smoked-lens',geometry:new T.PlaneGeometry(1.60,.48).translate(0,.43,.436),color:'#786354',roughness:.3,opacity:.08},
 ];
}
const centers=[-.61,-.31,.12,.42];
// Flat hexagonal segments: a top, b/c right, d bottom, e/f left, g middle.
const placements={a:[0,.196,0],b:[.103,.098,Math.PI/2],c:[.103,-.098,Math.PI/2],d:[0,-.196,0],e:[-.103,-.098,Math.PI/2],f:[-.103,.098,Math.PI/2],g:[0,0,0]};
function segment(){const s=new T.Shape();[[-.095,0],[-.076,-.016],[.076,-.016],[.095,0],[.076,.016],[-.076,.016]].forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new T.ShapeGeometry(s);}
function stroke(a,b,width=.009){const dx=b[0]-a[0],dy=b[1]-a[1];return new T.PlaneGeometry(Math.hypot(dx,dy),width).rotateZ(Math.atan2(dy,dx)).translate((a[0]+b[0])/2,(a[1]+b[1])/2,0);}
function letters(text){let gs=[];for(let i=0;i<text.length;i++){const x=i*.044;const paths={A:[[[0,0],[.015,.045],[.03,0]],[[.006,.018],[.024,.018]]],P:[[[0,0],[0,.045],[.027,.045],[.027,.025],[0,.025]]],M:[[[0,0],[0,.045],[.016,.019],[.032,.045],[.032,0]]]};for(const line of paths[text[i]])for(let j=1;j<line.length;j++)gs.push(stroke(line[j-1],line[j]).translate(x,0,0));}return merge(gs);}
export function clockDisplayGeometry(){
 const gs=[],ranges=[];let offset=0;
 const add=(g,kind)=>{const plain=g.index?g.toNonIndexed():g;if(plain!==g)g.dispose();ranges.push({start:offset,count:plain.attributes.position.count,...kind});offset+=plain.attributes.position.count;gs.push(plain);};
 for(let digit=0;digit<4;digit++)for(const [id,[x,y,z]]of Object.entries(placements))add(segment().rotateZ(z).translate(centers[digit]+x,.43+y,.424),{digit,id});
 for(const y of [-.07,.07])add(new T.CircleGeometry(.018,8).translate(-.095,.43+y,.424),{steady:true});
 for(const [period,y]of [['AM',.47],['PM',.36]])add(letters(period).translate(.635,y,.424),{period});
 const geometry=merge(gs);geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(offset*3),3));return {geometry,ranges};
}
const lit=new T.Color('#ef7046'),off=new T.Color('#241512');
export function setClockSegments(display,reading){
 const a=display.geometry.attributes.color;
 for(const r of display.ranges){const value=reading.digits[r.digit],on=r.steady||r.period===reading.period||(r.id&&value!==null&&DIGIT_SEGMENTS[value].includes(r.id)),color=on?lit:off;for(let i=r.start;i<r.start+r.count;i++)a.setXYZ(i,color.r,color.g,color.b);}
 a.needsUpdate=true;
}
