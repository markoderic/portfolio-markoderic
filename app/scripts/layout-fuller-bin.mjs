// Offline authoring only: additions rest on actual existing triangles.
import {BIN_PAPERS,paperGeometry,binInnerRadius,BIN_FLOOR} from '../src/prototype/binGeometry.js';
import {triangles,contactHeight,points} from './support/bin-contact.mjs';
const placed=BIN_PAPERS.slice(0,11).map(p=>({...p,triangles:triangles(paperGeometry(p.seed,p.scale),p.position)}));
for(const [i,x,z,sy] of [[12,.135,.04,.057],[13,-.045,.145,.062],[14,-.13,-.045,.053],[15,.04,-.145,.06],[16,.018,.015,.048]]){
 const scale=[.105+(i%3)*.008,sy,.112+(i%2)*.012],g=paperGeometry(i,scale),vs=points(g),t=triangles(g,[x,0,z]);
 let y=BIN_FLOOR-Math.min(...vs.map(v=>v.y));for(const p of placed)y=Math.max(y,contactHeight(t,p.triangles).height);
 const position=[x,y,z],wall=Math.min(...vs.map(v=>binInnerRadius(v.y+y)*Math.cos(Math.PI/48)-Math.hypot(v.x+x,v.z+z)));
 if(wall<0)throw Error('wall '+i);placed.push({seed:i,scale,position,triangles:triangles(g,position)});g.dispose();
}
console.log(JSON.stringify(placed.slice(11).map(({seed,scale,position})=>({seed,scale,position})),null,2));
console.error('top',Math.max(...placed.flatMap(p=>p.triangles.flat().map(v=>v[1]))));
