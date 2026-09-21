// Session 14: source/CSS, color math and real React SSR, never browser rendering.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { arrangeIcons, clampIcon } from '../src/prototype/interactionMath.js';
const app=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(app,'../docs/redesign/session-14-wallpaper');
const css=fs.readFileSync(path.join(app,'src/prototype/workspace.css'),'utf8');
const previous=fs.readFileSync(path.join(output,'before-workspace.css'),'utf8');
const added=css.slice(previous.length), rules=postcss.parse(added);
let count=0;
const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
const values={}; rules.walkRules(rule=>{values[rule.selector]=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));});
const desktop=values['.workspace .mac-desktop'];
check('Only new desktop-scoped CSS; original global/app/scene rules byte-identical',()=>{
 assert.ok(css.startsWith(previous));rules.walkRules(r=>assert.ok(r.selector.split(',').every(s=>s.includes('.mac-desktop'))));
 rules.walkDecls(d=>assert.ok(!['filter','transform','animation','font-family','font-size','opacity','z-index','pointer-events'].includes(d.prop)&&!d.prop.startsWith('--')));
});
check('Wallpaper is a static noninteractive CSS background, with cover/no-repeat and blue decode fallbacks',()=>{
 assert.equal(desktop['background-size'],'cover');assert.equal(desktop['background-repeat'],'no-repeat');assert.equal(desktop['background-position'],'center');
 assert.equal(desktop['background-color'],'#397daf');assert.equal(values['.workspace.night .mac-desktop']['background-color'],'#142d4a');
 assert.ok(!/scene-night|::before|::after|transition|https?:/.test(added));
});
check('Small original matched SVG geometry; no script, font, filter, bitmap or remote dependency',()=>{
 const docs=['light','dark'].map(t=>fs.readFileSync(path.join(app,`src/prototype/assets/wallpaper/aqua-ribbons-${t}.svg`),'utf8'));
 for(const doc of docs){assert.ok(Buffer.byteLength(doc)<4096);assert.match(doc,/viewBox="0 0 1600 1000"/);assert.ok(!/<(?:script|image|filter|foreignObject|animate)|href=|font-family/.test(doc));}
 assert.deepEqual(docs[0].match(/ d="[^"]+"/g),docs[1].match(/ d="[^"]+"/g));
});
const rgb=h=>h.slice(1).match(/../g).map(v=>parseInt(v,16)/255);
const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const blend=(fg,bg,a)=>fg.map((c,i)=>c*a+bg[i]*(1-a));
const label=values['.workspace .mac-desktop > .desktop-items > button > span'];
const selection=values['.workspace .mac-desktop > .desktop-items > button[aria-pressed="true"] > span'];
const contrast=[];
check('Opaque moving label and selected label exceed AA on every wallpaper region',()=>{
 for(const [name,bg] of [['normal',label.background],['selected',selection.background]]){
  const r=ratio(rgb(label.color),rgb(bg));assert.ok(r>=4.5);assert.ok(ratio(rgb(label.color).map(v=>v*.91),rgb(bg).map(v=>v*.91))>=4.5,'Existing pressed brightness filter retains AA');contrast.push({name,ratio:r,method:'Opaque label, independent of wallpaper color and icon position'});
 }
 assert.notEqual(selection.background,label.background);assert.match(selection['box-shadow'],/#ddecff/);
});
check('Menu/title/inactive title/popover/dock labels and dual focus ring retain calculated contrast',()=>{
 for(const [theme,ink,surface,panel,accent,hover] of [['light','#25292b','#f9f9f7','#e7e7e3','#1768b1','#d8e5ee'],['dark','#f2f4f7','#303841','#262d35','#8bc7ff','#425c70']]){
  for(const [part,fg,bg] of [['menu/popover',rgb(ink),rgb(surface)],['active title',rgb(ink),rgb(panel)],['inactive title',blend(rgb(ink),rgb(panel),.7),rgb(panel)],['open menu',rgb(ink),rgb(hover)]]){
   const r=ratio(fg,bg);assert.ok(r>=4.5);contrast.push({name:theme+' '+part,ratio:r});
  }
  // Conservative dock scrim endpoints cover any possible black-to-white wallpaper.
  for(const endpoint of [0,1]){const bg=blend(rgb(surface),[endpoint,endpoint,endpoint],.94),r=ratio(rgb(ink),bg);assert.ok(r>=4.5);contrast.push({name:theme+' dock '+endpoint,ratio:r});}
  const r=ratio(rgb(accent),rgb(surface));assert.ok(r>=3);contrast.push({name:theme+' menu focus',ratio:r});
 }
 const r=ratio(rgb('#ffffff'),rgb('#102b43'));assert.ok(r>=3);contrast.push({name:'Two-tone desktop/dock focus ring',ratio:r});
});
const sizes=[{width:1040,height:650},{width:1264,height:790},{width:1200,height:805},{width:776,height:505},{width:366,height:749}];
const crops=[];
check('16:10 and direct portrait/wide cover math has uniform scaling, no holes or overflow; moved icon hit bounds unchanged',()=>{
 for(const size of sizes){const scale=Math.max(size.width/1600,size.height/1000),w=1600*scale,h=1000*scale;assert.ok(w>=size.width&&h>=size.height);crops.push({...size,scale,cropX:(w-size.width)/2,cropY:(h-size.height)/2});
  for(const p of [{x:-100,y:-100},{x:50000,y:50000},{x:size.width/2,y:size.height/2}]){const q=clampIcon(p,size);assert.ok(q.x>=4&&q.x+80<=size.width);assert.ok(q.y>=36&&q.y+82<=size.height-62);}
 }
});
fs.writeFileSync(path.join(output,'contrast-and-crops.json'),JSON.stringify({contrast,crops},null,2)+'\n');
const bundle=path.join(app,'.vite/wallpaper-ssr.mjs');
await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Desktop from './src/prototype/MacDesktop.jsx';import Icon from './src/prototype/AppIcon.jsx';export const icon=id=>renderToStaticMarkup(React.createElement(Icon,{id}));export const render=props=>renderToStaticMarkup(React.createElement(Desktop,props));`,resolveDir:app,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:bundle,loader:{'.png':'dataurl','.jpg':'dataurl','.pdf':'dataurl'},plugins:[{name:'raw',setup(b){b.onLoad({filter:/\.jsx$/},()=>null);b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},a=>({contents:fs.readFileSync(a.path,'utf8'),loader:'text'}));}}]});
const {render,icon}=await import(pathToFileURL(bundle));
globalThis.document={activeElement:null};globalThis.window={};
const fixtures=[];
check('Real desktop SSR retains labels, draggable coordinates, menu, dock and real window title markup in both appearances',()=>{
 for(const night of [false,true]){
  const size=sizes[0], html=render({size,night,manager:{windows:[{id:'finder',bounds:{x:160,y:165,w:560,h:340},z:1}],active:'finder'},host:{current:null},sound:{muted:true},enabled:true});
  assert.ok(html.includes('Mac desktop')&&html.includes('data-menu="View"')&&html.includes('window-title')&&html.includes('data-dock="finder"'));
  const items=[...html.matchAll(/<button[^>]*data-launcher="([^"]+)"[^>]*style="left:([^p]+)px;top:([^p]+)px"[^>]*aria-label="([^"]+)"/g)].map(m=>({id:m[1],x:+m[2],y:+m[3],label:m[4],svg:icon(m[1])}));
  assert.equal(items.length,8);for(const item of items)assert.deepEqual({x:item.x,y:item.y},arrangeIcons(size)[item.id]);
  fs.writeFileSync(path.join(output,`desktop-${night?'dark':'light'}-ssr.html`),'<!-- Actual React SSR, not browser rendering. No scripts or live controls. -->\n'+html);
  fixtures.push({theme:night?'dark':'light',size,items,window:{x:160,y:165,width:560,height:340,title:'Finder'},menu:['◈','Finder','File','Edit','View','Window','Help']});
 }
});
fs.writeFileSync(path.join(output,'desktop-fixtures.json'),JSON.stringify(fixtures,null,2)+'\n');
console.log(`${count} source/SSR/math checks passed. Browser layout, pixel filtering, native focus/drag and theme flashes unverified.`);
