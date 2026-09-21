// CPU nearest-depth rasterization of actual submitted geometry, cropped bottom drawer.
// No GPU blur/material/rendering claim. Matched pre-fix cache was the closed pose.
import fs from 'node:fs';import * as T from 'three';
process.env.SESSION44_RENDER='1';const {fixture}=await import('./verify-moving-drawer-shadows.mjs');
const f=fixture(),dir=new URL('../../docs/redesign/session-44-drawer-shadows/',import.meta.url);let index=0;const saved=[];
function raster(meshes){const W=240,H=300,minX=2.1,maxX=5.2,minZ=-.4,maxZ=4.4,y0=-6.31,far=.85,depth=new Float32Array(W*H).fill(Infinity);
 const vertices=[];for(const mesh of meshes){mesh.updateWorldMatrix(true,false);const g=mesh.geometry,p=g.attributes.position,idx=g.index;const box=new T.Box3().setFromObject(mesh);if(box.max.y<y0+.001||box.min.y>y0+far||box.max.x<minX||box.min.x>maxX||box.max.z<minZ||box.min.z>maxZ)continue;
 for(let j=0;j<(idx?idx.count:p.count);j+=3){let poly=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(j+k):j+k).applyMatrix4(mesh.matrixWorld));
 for(const [bound,above]of [[y0+.001,true],[y0+far,false]]){const clipped=[];for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],ai=above?a.y>=bound:a.y<=bound,bi=above?b.y>=bound:b.y<=bound;if(ai)clipped.push(a);if(ai!==bi)clipped.push(a.clone().lerp(b,(bound-a.y)/(b.y-a.y)))}poly=clipped}
 for(let k=1;k<poly.length-1;k++){const t=[poly[0],poly[k],poly[k+1]].map(v=>[(v.x-minX)/(maxX-minX)*W,(maxZ-v.z)/(maxZ-minZ)*H,v.y-y0]);const [a,b,c]=t,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)continue;
 const x0=Math.max(0,Math.floor(Math.min(...t.map(v=>v[0])))),x1=Math.min(W-1,Math.ceil(Math.max(...t.map(v=>v[0])))),z0=Math.max(0,Math.floor(Math.min(...t.map(v=>v[1])))),z1=Math.min(H-1,Math.ceil(Math.max(...t.map(v=>v[1]))));
 for(let y=z0;y<=z1;y++)for(let x=x0;x<=x1;x++){const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,w=1-u-v;if(u<0||v<0||w<0)continue;const d=u*a[2]+v*b[2]+w*c[2];depth[y*W+x]=Math.min(depth[y*W+x],d)}
 }} }
 const image=Buffer.alloc(W*H*3);for(let i=0;i<depth.length;i++){const alpha=Number.isFinite(depth[i])?Math.pow(1-Math.max(0,Math.min(1,(depth[i]-.001)/(far-.001))),2)*.70:0;image.fill(Math.round(255*(1-alpha)),i*3,i*3+3)}return Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`),image]);}
const capture=f.resources.capture;f.resources.capture=(gl,meshes,names)=>{capture(gl,meshes,names);if([0,2,4,7].includes(index)){const filename=`contact-${index}.ppm`;fs.writeFileSync(new URL(filename,dir),raster(meshes));saved.push({filename,frame:index,z:f.drawers[2].group.position.z})}index++};
f.frame();f.toggle(2,true);f.run(24);f.close();fs.writeFileSync(new URL('contact-crop.json',dir),JSON.stringify({method:'CPU orthographic nearest triangle depth, band-clipped; same quadratic alpha as shader, day opacity .70; no Gaussian blur, WebGL or scene screenshot; cropped bottom drawer floor region',saved},null,2)+'\n');
