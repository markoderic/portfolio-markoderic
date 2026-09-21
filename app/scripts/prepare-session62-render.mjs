// Evidence only: real React SSR/icons/content, authored SVG layout and layer approximation.
// No browser, DOM capture, live texture or application asset changes.
import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';
import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
import * as T from 'three';import {LAPTOP} from '../src/prototype/deviceGeometry.js';import {deskPose} from '../src/prototype/deskCamera.js';
const app=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(app,'../docs/redesign/session-62-display-optics');
const require=createRequire(import.meta.url),{Resvg}=require('/tmp/portfolio-wallpaper-render/node_modules/@resvg/resvg-js');
const bundle=path.join(app,'.vite/display-ssr.mjs');
await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Desktop from './src/prototype/MacDesktop.jsx';import {Finder} from './src/prototype/apps/CareerApps.jsx';import Icon from './src/prototype/AppIcon.jsx';export const finder=()=>renderToStaticMarkup(React.createElement(Finder,{initialSection:'about'}));export const icon=id=>renderToStaticMarkup(React.createElement(Icon,{id}));export const render=props=>renderToStaticMarkup(React.createElement(Desktop,props));`,resolveDir:app,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:bundle,loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'raw',setup(b){b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
const {render,icon,finder}=await import(pathToFileURL(bundle));globalThis.document={activeElement:null};globalThis.window={};globalThis.location={hash:"#about"};
const W=1264,H=790,rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,t,color='#25292b',size=11,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${esc(t)}</text>`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="Helvetica,Arial,sans-serif">${body}</svg>`;
const save=(name,s)=>{fs.writeFileSync(path.join(dir,name+'.svg'),s);fs.writeFileSync(path.join(dir,name+'.png'),new Resvg(s,{font:{loadSystemFonts:true}}).render().asPng())};
// SVG shadows below are a sampled authored approximation of CSS inset shadows,
// not a claim that resvg executes CSS box-shadow. Runtime CSS is tested separately.
const face=(kind)=>{
 const before=kind==='before',a=kind==='a',tint=a?.035:.06,shine=a?.04:.06;
 const defs=`<defs><linearGradient id="shine" x1="0" y1="0" x2="1" y2="${before?1:.53}"><stop stop-color="white" stop-opacity="${before?.035:shine}"/><stop offset="${before?.22:.28}" stop-color="white" stop-opacity="${before?0:shine*.3}"/><stop offset=".42" stop-color="white" stop-opacity="0"/><stop offset="${before?.84:.70}" stop-color="#111416" stop-opacity="0"/><stop offset="1" stop-color="#111416" stop-opacity="${before?.02:.025}"/></linearGradient><linearGradient id="top" x2="0" y2="1"><stop stop-opacity="${a?.18:.28}"/><stop offset="1" stop-opacity="0"/></linearGradient><linearGradient id="bottom" x2="0" y1="1" y2="0"><stop stop-opacity="${a?.08:.12}"/><stop offset="1" stop-opacity="0"/></linearGradient></defs>`;
 return defs+(before?'':rect(0,0,W,H,'#4e5052',`fill-opacity="${tint}"`))+rect(0,0,W,H,'url(#shine)')+(before?'':rect(0,1,W,6,'url(#top)')+rect(0,H-5,W,4,'url(#bottom)'))+rect(0,0,W,1,'white',`fill-opacity="${before?.16:a?.26:.38}"`)+rect(0,H-1,W,1,'black',`fill-opacity="${before?.16:a?.32:.48}"`)+rect(0,0,1,H,'white',`fill-opacity="${before?.06:.14}"`)+(before?'':rect(W-1,0,1,H,'black','fill-opacity=".22"'));
};
const fixtures=[];
for(const theme of ['light','dark']){
 const dark=theme==='dark',ink=dark?'#f2f4f7':'#25292b',surface=dark?'#303841':'#f9f9f7',panel=dark?'#262d35':'#e7e7e3',active=dark?'vscode':'finder';
 const bounds={x:135,y:120,w:800,h:510};const html=render({size:{width:W,height:H},night:dark,manager:{windows:[{id:active,bounds,z:1}],active},host:{current:null},sound:{muted:true},enabled:true});
 fs.writeFileSync(path.join(dir,theme+'-ssr.html'),'<!-- Actual React SSR; no CSS layout, native input or browser render. -->\n'+html);
 const items=[...html.matchAll(/<button[^>]*data-launcher="([^"]+)"[^>]*style="left:([^p]+)px;top:([^p]+)px"[^>]*aria-label="([^"]+)"/g)].map(m=>({id:m[1],x:+m[2],y:+m[3],label:m[4],svg:icon(m[1])}));
 let body=fs.readFileSync(path.join(app,`src/prototype/assets/wallpaper/aqua-ribbons-${theme}.svg`),'utf8').replace(/<svg[^>]*>/,`<svg width="${W}" height="${H}" viewBox="0 0 1600 1000">`);
 for(const [i,it]of items.entries()){body+=it.svg.replace(/<svg[^>]*>/,`<svg x="${it.x+18}" y="${it.y+5}" width="44" height="44" viewBox="0 0 64 64">`)+rect(it.x,it.y+54,80,19,i===0?'#155db2':'#18344d','rx="4"')+text(it.x+40,it.y+67,it.label.length>12?it.label.slice(0,11)+'…':it.label,'white',11,'text-anchor="middle"');}
 body+=rect(0,0,W,28,surface)+text(14,18,`◈     ${dark?'VS Code':'Finder'}     File     Edit     View     Window     Help`,ink)+text(W-167,18,'Fri Sep 18   9:41 AM',ink,10);
 // No fake notch inside content: measured live aperture is BELOW the physical notch.
 body+=rect(bounds.x,bounds.y,bounds.w,bounds.h,surface,'rx="9" stroke="#727980" stroke-opacity=".4"')+rect(bounds.x,bounds.y,bounds.w,30,panel,'rx="8"')+text(bounds.x+400,bounds.y+20,dark?'VS Code':'Finder',ink,11,'text-anchor="middle"');
 ['#ff6059','#ffbd2e','#28c840'].forEach((c,i)=>body+=`<circle cx="${bounds.x+17+i*22}" cy="${bounds.y+15}" r="6" fill="${c}"/>`);
 if(dark){
  body+=rect(136,150,798,479,'#202127')+rect(136,150,155,479,'#262830')+text(150,178,'EXPLORER','#a7abba',10)+text(150,204,'screenProjection.js','#dbdce5',10);
  const lines=fs.readFileSync(path.join(app,'src/prototype/screenProjection.js'),'utf8').split('\n').slice(0,22);
  lines.forEach((line,i)=>{body+=text(314,185+i*17,String(i+1),'#717b8c',10,'text-anchor="end" font-family="Menlo,monospace"')+text(331,185+i*17,line.slice(0,89),line.startsWith('//')?'#7eaa83':'#dbdce5',10,'font-family="Menlo,monospace"')});
 }else{
  body+=rect(136,150,154,479,panel)+text(154,189,'Favorites',ink,11)+text(154,221,'Work',ink)+text(154,251,'Experience',ink)+text(154,281,'About',ink)+text(154,311,'Résumé',ink);
  // Actual Finder copy extracted from its real SSR; wrapping/layout authored.
  const finderHTML=finder();fs.writeFileSync(path.join(dir,'finder-ssr.html'),finderHTML);
  const lines=[...finderHTML.matchAll(/<(h1|h2|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[2].replace(/<[^>]+>/g,'').replaceAll('&#x27;',"'").replaceAll('&amp;','&')).filter(Boolean).slice(0,5);
  let y=205;for(const line of lines){const words=line.split(' ');let part='';for(const word of words){if((part+' '+word).length>76){body+=text(318,y,part,ink,12);y+=24;part=word}else part+=(part?' ':'')+word;}if(part){body+=text(318,y,part,ink,y===205?22:12);y+=36}}
 }
 body+=rect(435,720,395,56,surface,'rx="16" fill-opacity=".94"');items.forEach((it,i)=>body+=it.svg.replace(/<svg[^>]*>/,`<svg x="${445+i*47}" y="726" width="39" height="39" viewBox="0 0 64 64">`));
 // Evidence-only menu and focus ring illustrate bright/dark small text contrast.
 body+=rect(150,29,205,74,surface,'rx="6" stroke="#727980"')+text(162,50,'Arrange desktop icons',ink)+text(162,73,'Desk',ink)+text(162,94,'Phone',ink);
 body+=rect(items[0].x-2,items[0].y-2,84,86,'none','rx="5" stroke="#102b43" stroke-width="5"')+rect(items[0].x-2,items[0].y-2,84,86,'none','rx="5" stroke="white" stroke-width="2"');
 save(theme+'-base',svg(W,H,body));save(theme+'-before',svg(W,H,body+face('after')))
 fixtures.push({theme,items:items.map(({svg,...x})=>x),bounds,content:dark?'Actual screenProjection.js first 22 lines, manually laid out inside SSR-derived chrome':'Actual Finder SSR text, manually wrapped',size:{width:W,height:H}});
}
const size={width:1440,height:900},normal=new T.Vector3(0,0,1).applyEuler(new T.Euler(...LAPTOP.screenRotation)),look=new T.Vector3(...LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));
const d=LAPTOP.height*size.height/(2*Math.tan(T.MathUtils.degToRad(39/2))*H);
// Rig's focused fit centers the display at viewport midpoint (450 at this size).
const focused=look.clone().addScaledVector(normal,d),desk=deskPose(size),angled=deskPose(size,{yaw:-.36,pitch:.05});

const {createDisplayOptics}=await import('../src/prototype/displayOptics.js');
const plane=new T.Object3D();plane.position.fromArray(LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));plane.rotation.set(...LAPTOP.screenRotation);plane.updateMatrixWorld();
const frames=[];for(const [view,theme,night,eye,target]of [['front','light',false,focused,look],['oblique','dark',true,angled.position.clone().lerp(focused,.82),angled.look.clone().lerp(look,.82)]]){
 const c=new T.PerspectiveCamera(39,1440/900,.1,100);c.position.copy(eye);c.lookAt(target);c.updateMatrixWorld();const values={},el={style:{setProperty(k,v){values[k]=v}}};createDisplayOptics()(el,plane,c,{width:W,height:H},true);const v=k=>parseFloat(values['--glass-'+k]),env=night?.48:1;
 const base=fs.readFileSync(path.join(dir,theme+'-base.svg'),'utf8');const overlay=`<defs><radialGradient id="face" gradientUnits="userSpaceOnUse" cx="${W*(v('x')/100)}" cy="${H*(v('y')/100)}" r="1" gradientTransform="translate(${W*v('x')/100} ${H*v('y')/100}) scale(${W*.6} ${H*.45}) translate(${-W*v('x')/100} ${-H*v('y')/100})"><stop stop-color="white" stop-opacity="${v('alpha')*env}"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><linearGradient id="sheen" x2="0" y2="1"><stop stop-color="white" stop-opacity="${.018*env}"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="recess" x2="0" y2="1"><stop stop-opacity=".24"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><g transform="translate(${v('dx')} ${v('dy')})"><rect x="-4" y="-4" width="${W+8}" height="${H+8}" fill="url(#face)"/><rect x="-4" y="-4" width="${W+8}" height="${H*.12}" fill="url(#sheen)"/></g><rect y="1" width="${W}" height="3" fill="url(#recess)"/><rect width="${W}" height="1" fill="white" opacity=".32"/><rect y="${H-1}" width="${W}" height="1" opacity=".42"/><rect width="1" height="${H}" opacity="${v('left')}"/><rect x="${W-1}" width="1" height="${H}" opacity="${v('right')}"/>`;
 save(view+'-after-texture',base.replace(/<\/svg>$/,overlay+'</svg>'));
 for(const stage of ['before','after']){const name=view+'-'+theme+'-'+(night?'scene-night':'scene-day')+'-'+stage;fs.writeFileSync(path.join(dir,name+'-extras.json'),'[]');frames.push({name,view,theme,night,stage,eye:eye.toArray(),look:target.toArray(),width:1440,height:900,fraction:0,texture:stage==='before'?theme+'-before.png':view+'-after-texture.png',optics:values});}
}
fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify(frames,null,2));
// Fresh current scene assembly, redirected before execution; no historical scene snapshot.
let source=fs.readFileSync(path.join(app,'scripts/support/session61-scene.mjs'),'utf8').replaceAll('session-61-paper-toss','session-62-display-optics').replaceAll('.session61-current-scene','.session62-current-scene');const temp=path.join(app,'scripts/support/.session62-scene.mjs');fs.writeFileSync(temp,source);try{await import(pathToFileURL(temp))}finally{fs.unlinkSync(temp)}
for(const f of ['screen.png','top.png'])fs.copyFileSync(path.join(dir,'../session-61-paper-toss',f),path.join(dir,f));
let swift=fs.readFileSync(path.join(dir,'../session-61-paper-toss/render-view.swift'),'utf8').replace('Current geometry; camera, hand and cue change. After shows held53% shot. SceneKit + cached CPU shadows; no native acceptance.','Current geometry; static SSR-derived screen + optical approximation. SceneKit/cached shadows, no native acceptance.');fs.writeFileSync(path.join(dir,'render-display.swift'),swift);
console.log('Four matched current-scene offline frames prepared; optical raster approximates authored CSS, no native acceptance.');
