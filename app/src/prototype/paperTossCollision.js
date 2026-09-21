import * as T from 'three';
import {FLOOR_Y} from './sceneScale';
// Blocks of actual world triangles, never a material-batch box as a solid.
const BLOCK=32;
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible||p.userData.shadowOnly||p.userData.tossOwned)return false;return o.material?.colorWrite!==false;}
function slab(a,b,bounds,r=0){let lo=0,hi=1;for(let k=0;k<3;k++){const key=['x','y','z'][k],d=b[key]-a[key],min=bounds[k]-r,max=bounds[k+3]+r;if(Math.abs(d)<1e-14){if(a[key]<min||a[key]>max)return null;}else{let x=(min-a[key])/d,y=(max-a[key])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return null;}}return lo;}
export function createTossCollisions(scene,{iterations=32}={}){
 scene.updateMatrixWorld(true);const meshes=[],triangle=new T.Triangle(),point=new T.Vector3(),closest=new T.Vector3(),delta=new T.Vector3(),edge=new T.Line3(),candidate=new T.Vector3();let bytes=0,triangles=0;
 scene.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position||!visible(o))return;
  const a=o.geometry.attributes.position,ids=o.geometry.index,count=Math.floor((ids?.count||a.count)/3),data=new Float32Array(count*9),blocks=[];
  for(let i=0;i<count;i++){
   if(i%BLOCK===0)blocks.push([Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity]);const box=blocks.at(-1);
   for(let j=0;j<3;j++){point.fromBufferAttribute(a,ids?ids.getX(i*3+j):i*3+j).applyMatrix4(o.matrixWorld);data.set(point.toArray(),i*9+j*3);for(let k=0;k<3;k++){box[k]=Math.min(box[k],data[i*9+j*3+k]);box[k+3]=Math.max(box[k+3],data[i*9+j*3+k]);}}
  }
  const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(const b of blocks)for(let k=0;k<3;k++){bounds[k]=Math.min(bounds[k],b[k]);bounds[k+3]=Math.max(bounds[k+3],b[k+3]);}
  let bin=false;for(let p=o;p;p=p.parent)if(p.userData.tossBin)bin=true;
  // Standalone evidence may tag the bin root; mounted scene uses this same tag.
  meshes.push({data,blocks,bounds,count,name:o.name||'scene mesh',bin});bytes+=data.byteLength+blocks.length*6*8;triangles+=count;
 });
 const stats={bytes,triangles,meshes:meshes.length,sweeps:0,blocks:0,candidates:0,iterations:0,exhaustions:0};
 function triangleTime(a,b,r){
  delta.subVectors(b,a);const length=delta.length();let t=0;
  for(let k=0;k<iterations;k++){stats.iterations++;point.copy(a).addScaledVector(delta,t);if(triangle.getArea()<1e-12){let best=Infinity;for(const [a,b] of [[triangle.a,triangle.b],[triangle.b,triangle.c],[triangle.c,triangle.a]]){edge.set(a,b).closestPointToPoint(point,true,candidate);const distance=point.distanceToSquared(candidate);if(distance<best){best=distance;closest.copy(candidate);}}}else triangle.closestPointToPoint(point,closest);const gap=point.distanceTo(closest)-r;if(gap<=1e-6)return {t,unresolved:false};if(length<1e-14)return null;t+=gap/length;if(t>1)return null;}
  stats.exhaustions++;return {t:Math.min(t,1),unresolved:true};
 }
 return {stats,
  sweep(a,b,r){stats.sweeps++;let hit=null;
   if(b.y-r<=FLOOR_Y&&b.y<a.y)hit={t:Math.max(0,(FLOOR_Y+r-a.y)/(b.y-a.y)),name:'floor',bin:false};
   for(const m of meshes){const near=slab(a,b,m.bounds,r);if(near===null||hit&&near>hit.t)continue;
    for(let k=0;k<m.blocks.length;k++){const t=slab(a,b,m.blocks[k],r);if(t===null||hit&&t>hit.t)continue;stats.blocks++;
     for(let i=k*BLOCK;i<Math.min(m.count,(k+1)*BLOCK);i++){const n=i*9;triangle.a.fromArray(m.data,n);triangle.b.fromArray(m.data,n+3);triangle.c.fromArray(m.data,n+6);stats.candidates++;const contact=triangleTime(a,b,r);if(contact&&(!hit||contact.t<hit.t))hit={...contact,name:m.name,bin:m.bin};}
    }
   }return hit;
  },dispose(){meshes.length=0;},
 };
}
