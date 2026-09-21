// Offline projection/path diagram from the implemented runtime's measured paths.
import fs from 'node:fs';import * as T from 'three';import {deskPose} from '../src/prototype/deskCamera.js';
const dir=new URL('../../docs/redesign/session-29b-paper-toss/',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('physics.json',dir))),frames=[];
for(const size of [{width:1440,height:900},{width:900,height:700},{width:800,height:500}]){
 const pose=deskPose(size),camera=new T.PerspectiveCamera(39,size.width/size.height,.1,100);camera.position.copy(pose.position);camera.lookAt(pose.look);camera.updateMatrixWorld();
 const project=p=>{const v=new T.Vector3(...p).project(camera);return [(v.x+1)*size.width/2,(1-v.y)*size.height/2]};
 const paths=Object.fromEntries(['off','on','miss','peel'].map(k=>[k,data[k].path.map(project)]));
 const panel={left:size.width-258,top:size.height-340,width:236,height:308}; // Conservative layout reservation, NOT measured DOM box.
 for(const path of Object.values(paths))for(const [x,y] of path)if(x+12>=panel.left&&x-12<=panel.left+panel.width&&y+12>=panel.top&&y-12<=panel.top+panel.height)throw Error('Path/panel reservation overlap');
 frames.push({size,panel,launch:project([-1.8,1.1,3.65]),bin:project([-5.95,-4.704,3.1]),evidence:'Projection math + conservative 308px panel reservation, not measured DOM/GPU'});
 const poly=points=>points.map(p=>project(p).map(v=>v.toFixed(2)).join(',')).join(' ');
 const rim=Array.from({length:65},(_,i)=>[-5.95+.756*Math.cos(i*Math.PI/32),-4.704,3.1+.756*Math.sin(i*Math.PI/32)]);
 const pathSvg=Object.entries(paths).map(([k,p],i)=>`<polyline points="${p.map(q=>q.map(v=>v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${['#147c65','#ce6b10','#72809c','#b64c58'][i]}" stroke-width="3"/>`).join('');
 const text=`<text x="24" y="28">OFFLINE PROJECTION — runtime paths; not a scene render or browser screenshot</text><text x="24" y="49">Green: fan off make · Orange: fan on make · Blue: floor miss · Red: peel fail-safe miss</text>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><rect width="100%" height="100%" fill="#f4f2ed"/><g font-family="monospace" font-size="12" fill="#28342c">${text}<polygon points="${poly([[-5.4,0,-3],[5.4,0,-3],[5.4,0,3],[-5.4,0,3]])}" fill="#dbd9d0" stroke="#999a90"/><polyline points="${poly(rim)}" fill="none" stroke="#444" stroke-width="2"/>${pathSvg}<rect x="${panel.left}" y="${panel.top}" width="${panel.width}" height="${panel.height}" fill="#101713" opacity=".9"/><text x="${panel.left+12}" y="${panel.top+25}" fill="#e5eee8">Controls reservation</text><text x="${panel.left+12}" y="${panel.top+45}" fill="#e5eee8">236 × 308px</text><text x="${panel.left+12}" y="${panel.top+65}" fill="#e5eee8">Not a UI screenshot</text><text x="24" y="${size.height-20}">Existing neutral overview ${size.width} × ${size.height}; desk/rim outlines only. Furniture and shaders omitted.</text></g></svg>`;
 fs.writeFileSync(new URL(`projection-${size.width}.svg`,dir),svg);
}
fs.writeFileSync(new URL('framing-game.json',dir),JSON.stringify(frames,null,2)+'\n');console.log('PASS three offline framing reservations clear all four measured paths with 12px margin; native layout unverified.');
