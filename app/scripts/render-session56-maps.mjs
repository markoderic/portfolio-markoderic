// Offline triangle-depth contacts and analytic directional silhouettes from current exported meshes.
// No WebGL shadow filtering/compilation claim. One-time evidence renderer only.
import fs from 'node:fs';import {GROUND_SHADOW} from '../src/prototype/groundShadowPass.js';
const dir=new URL('../../docs/redesign/session-56-shadow-continuity/',import.meta.url),scene=JSON.parse(fs.readFileSync(new URL('current-scene.json',dir)));
let meshes=[];
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

const evidence=[];
for(const fraction of [0,.25,.5,.75,1]){
 const output=new URL('pose-'+Math.round(fraction*100).toString().padStart(3,'0')+'/',dir);fs.mkdirSync(output,{recursive:true});
 const actual=scene.meshes.map(m=>({...m,positions:m.drawer===2?m.positions.map(p=>[p[0],p[1],p[2]+fraction*2.35]):m.positions}));
 const maps=[];for(const layer of [...GROUND_SHADOW.layers,{name:'directional',resolution:1024,day:GROUND_SHADOW.directional.day,night:GROUND_SHADOW.directional.night}]){
  const directional=layer.name==='directional',config={...layer,width:22,depth:18,center:directional?[.5,GROUND_SHADOW.center[1]+GROUND_SHADOW.directional.offset,1.5]:GROUND_SHADOW.center,quadratic:true,steps:directional?[]:[layer.blurStep]};
  meshes=directional?actual.filter(m=>m.castShadow).map(m=>({...m,positions:m.positions.map(p=>[p[0]+(p[1]-config.center[1])/4,config.center[1]+.001,p[2]-(p[1]-config.center[1])/3])})):actual.filter(m=>['desk','chair','plant','bin'].includes(m.root));
  // Binary nearest projected silhouette; exact ray direction from key[-3,12,4].
  let alpha=raster({...config,far:directional?1:config.far});if(directional)alpha=alpha.map(a=>a>0?1:0);
  for(const step of config.steps){alpha=blur(alpha,config.resolution,step*config.resolution/config.width,0);alpha=blur(alpha,config.resolution,0,step*config.resolution/config.depth)}
  const n=config.resolution,bytes=Buffer.alloc(n*n*4);let edge=0,nonzero=0;for(let i=0;i<alpha.length;i++){bytes[i*4+3]=Math.round(alpha[i]*255);if(alpha[i]>0)nonzero++}for(let i=0;i<n;i++)edge=Math.max(edge,alpha[i],alpha[(n-1)*n+i],alpha[n*i],alpha[n*i+n-1]);
  fs.writeFileSync(new URL(config.name+'.rgba',output),bytes);maps.push({...config,edgeAlpha:edge,nonzeroPixels:nonzero});
 }
 fs.writeFileSync(new URL('offline-maps.json',output),JSON.stringify({maps,note:'CPU depth + bilinear nine-tap blur for contacts; unfiltered analytic silhouette for directional receiver. Not native GPU maps.'},null,2));evidence.push({fraction,maps:maps.map(({name,edgeAlpha,nonzeroPixels})=>({name,edgeAlpha,nonzeroPixels}))});console.log('Rasterized fraction',fraction);
}
fs.writeFileSync(new URL('map-evidence.json',dir),JSON.stringify(evidence,null,2));
