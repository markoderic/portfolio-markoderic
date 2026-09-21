// Exact vertical contact between triangulated height surfaces. Intersection of
// each pair's XZ projections is convex; linear height difference peaks at a vertex.
import * as T from 'three';
export function triangles(g,position=[0,0,0]){const a=g.attributes.position,ids=g.index?.array??Array.from({length:a.count},(_,i)=>i),v=[];for(let i=0;i<ids.length;i+=3)v.push(Array.from(ids.slice(i,i+3),n=>[a.getX(n)+position[0],a.getY(n)+position[1],a.getZ(n)+position[2]]));return v;}
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
function bary(p,t){const a=sub(t[1],t[0]),b=sub(t[2],t[0]),d=sub(p,t[0]),den=cross(a,b);if(Math.abs(den)<1e-12)return null;const v=cross(d,b)/den,w=cross(a,d)/den;return [1-v-w,v,w];}
const prepared = new WeakMap();
function prepare(tris){
 if(!prepared.has(tris))prepared.set(tris,tris.map(t=>({minY:Math.min(t[0][1],t[1][1],t[2][1]),maxY:Math.max(t[0][1],t[1][1],t[2][1]),t,p:t.map(v=>[v[0],v[2]]),minX:Math.min(t[0][0],t[1][0],t[2][0]),maxX:Math.max(t[0][0],t[1][0],t[2][0]),minZ:Math.min(t[0][2],t[1][2],t[2][2]),maxZ:Math.max(t[0][2],t[1][2],t[2][2])})));
 return prepared.get(tris);
}
export function contactHeight(moving,fixed){let h=-Infinity,witness=null;
 for(const am of prepare(moving))for(const bm of prepare(fixed)){
 if(bm.maxY-am.minY<=h||am.minX>bm.maxX||bm.minX>am.maxX||am.minZ>bm.maxZ||bm.minZ>am.maxZ)continue;
 const a=am.t,b=bm.t,ap=am.p,bp=bm.p;
 const candidates=[...ap,...bp];for(let i=0;i<3;i++)for(let j=0;j<3;j++){const p=ap[i],r=sub(ap[(i+1)%3],p),q=bp[j],s=sub(bp[(j+1)%3],q),den=cross(r,s);if(Math.abs(den)<1e-12)continue;const d=sub(q,p),u=cross(d,s)/den,v=cross(d,r)/den;if(u>=0&&u<=1&&v>=0&&v<=1)candidates.push([p[0]+u*r[0],p[1]+u*r[1]]);}
 for(const p of candidates){const aa=bary(p,ap),bb=bary(p,bp);if(!aa||!bb||Math.min(...aa,...bb)<-1e-8)continue;const y=bb.reduce((s,v,i)=>s+v*b[i][1],0)-aa.reduce((s,v,i)=>s+v*a[i][1],0);if(y>h){h=y;witness=p;}}
 }return {height:h,witness};}
export function points(g){return Array.from({length:g.attributes.position.count},(_,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i));}
