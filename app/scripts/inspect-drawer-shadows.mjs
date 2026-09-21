// CPU triangle raster + separable blur approximates the configured contact maps.
// NOT a Three/WebGL render, old disabled-depth draw ordering or GPU verification.
import fs from 'node:fs';
import {GROUND_SHADOW} from '../src/prototype/groundShadowPass.js';
const root=new URL('../../docs/redesign/session-15-drawers/',import.meta.url);const tag=process.argv.find(a=>a.startsWith('--state='))?.slice(8)||'closed';if(!['closed','open','top','middle','bottom'].includes(tag))throw Error('Unknown drawer state');const dir=new URL(tag+'/',root);fs.mkdirSync(dir,{recursive:true});
const meshes=JSON.parse(fs.readFileSync(new URL('../../docs/redesign/session-07-chair-refinement/after-render.json',import.meta.url))).meshes.filter(m=>['chair','bin'].includes(m.root)).concat(JSON.parse(fs.readFileSync(new URL(tag+'-desk.json',root))).meshes,JSON.parse(fs.readFileSync(new URL('../../docs/redesign/session-12-plant/after-plant.json',import.meta.url))).meshes);
const weights=[.051,.0918,.12245,.1531,.1633,.1531,.12245,.0918,.051];
function raster({resolution:n,width,depth,center,far,quadratic}){
 const heights=new Float32Array(n*n).fill(Infinity),near=.001;
 for(const mesh of meshes)for(let i=0;i<mesh.indices.length;i+=3){
  const p=mesh.indices.slice(i,i+3).map(i=>mesh.positions[i]);
  if(Math.min(...p.map(v=>v[1]-center[1]))>far||Math.max(...p.map(v=>v[1]-center[1]))<near)continue;
  const q=p.map(v=>[(v[0]-center[0])/width*n+n/2,(.5-(v[2]-center[2])/depth)*n,v[1]-center[1]]);
  const [a,b,c]=q,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)continue;
  const x0=Math.max(0,Math.floor(Math.min(...q.map(v=>v[0])))),x1=Math.min(n-1,Math.ceil(Math.max(...q.map(v=>v[0])))),y0=Math.max(0,Math.floor(Math.min(...q.map(v=>v[1])))),y1=Math.min(n-1,Math.ceil(Math.max(...q.map(v=>v[1]))));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,w=1-u-v;
   if(Math.min(u,v,w)<-1e-7)continue;const h=u*a[2]+v*b[2]+w*c[2];if(h>=near&&h<=far)heights[y*n+x]=Math.min(heights[y*n+x],h);
  }
 }
 return heights.map(h=>Number.isFinite(h)?Math.max(0,1-(h-near)/(far-near))**(quadratic?2:1):0);
}
function blur(input,n,dx,dy){
 const out=new Float32Array(input.length);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){let sum=0;for(let i=-4;i<=4;i++){const xx=Math.max(0,Math.min(n-1,x+i*dx)),yy=Math.max(0,Math.min(n-1,y+i*dy)),ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;const at=(x,y)=>input[Math.min(n-1,y)*n+Math.min(n-1,x)];sum+=weights[i+4]*((1-fy)*((1-fx)*at(ix,iy)+fx*at(ix+1,iy))+fy*((1-fx)*at(ix,iy+1)+fx*at(ix+1,iy+1)));}out[y*n+x]=sum;}
 return out;
}
const maps=[];
for(const config of [...GROUND_SHADOW.layers.map(c=>({...c,width:GROUND_SHADOW.width,depth:GROUND_SHADOW.depth,center:GROUND_SHADOW.center,quadratic:true,steps:[c.blurStep]}))]){
 const n=config.resolution;let alpha=raster(config);for(const step of config.steps){alpha=blur(alpha,n,step*n/config.width,0);alpha=blur(alpha,n,0,step*n/config.depth);}
 const bytes=Buffer.alloc(n*n*4);for(let i=0;i<alpha.length;i++)bytes[i*4+3]=Math.round(alpha[i]*255);
 fs.writeFileSync(new URL(config.name+'.rgba',dir),bytes);let edge=0;for(let i=0;i<n;i++)edge=Math.max(edge,alpha[i],alpha[(n-1)*n+i],alpha[n*i],alpha[n*i+n-1]);
 maps.push({...config,peakAlpha:alpha.reduce((a,b)=>Math.max(a,b),0),edgeAlpha:edge});console.log(config.name,{edgeAlpha:edge,nonzeroPixels:alpha.filter(v=>v>0).length});
}
fs.writeFileSync(new URL('offline-maps.json',dir),JSON.stringify({maps,note:'Current drawer geometry; CPU nearest-depth/blur approximation, not rendered Three/WebGL.'},null,2)+'\n');
