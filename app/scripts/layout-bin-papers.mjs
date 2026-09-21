// Authoring utility only. Prints fixed placements; runtime has no solver.
import {paperGeometry,binInnerRadius,BIN_FLOOR} from '../src/prototype/binGeometry.js';
import {triangles,contactHeight,points} from './support/bin-contact.mjs';
const plans=[];
for(let layer=0;layer<2;layer++){
 const count=[6,5][layer];
 for(let j=0;j<count;j++){
 const center=j===count-1,angle=j*Math.PI*2/(count-1)+layer*.54,r=center?0:[.165,.16][layer];
 plans.push({seed:plans.length+1,scale:[.102+(j%3)*.009,.0755+(j%2)*.009,.112+(j%3)*.005],xz:[r*Math.cos(angle),r*Math.sin(angle)]});
 }}
const placed=[];
for(const p of plans){const g=paperGeometry(p.seed,p.scale),vs=points(g),t=triangles(g,[p.xz[0],0,p.xz[1]]);let height=BIN_FLOOR-Math.min(...vs.map(v=>v.y));for(const q of placed)height=Math.max(height,contactHeight(t,q.triangles).height);const position=[p.xz[0],height,p.xz[1]];const wall=Math.min(...vs.map(v=>binInnerRadius(v.y+height)*Math.cos(Math.PI/48)-Math.hypot(v.x+position[0],v.z+position[2])));if(wall<0)throw Error('wall '+p.seed+' '+wall);placed.push({...p,position,triangles:triangles(g,position)});}
console.log(JSON.stringify(placed.map(({seed,scale,position})=>({seed,scale,position})),null,2));
console.error('height',Math.max(...placed.flatMap(p=>p.triangles.flat().map(v=>v[1]))));
