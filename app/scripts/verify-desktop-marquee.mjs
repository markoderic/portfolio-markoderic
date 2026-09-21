import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {fixture,harness,DesktopIcon,MacDesktop,DesktopItems,find,desktopPoint,selectedIn,selectionRect} from './support/desktop-selection-fixture.mjs';
import {projectScreen} from '../src/prototype/screenProjection.js';
globalThis.getComputedStyle=host=>({transform:host.transform||'none'});globalThis.document={querySelector:()=>({focus(){}})};globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
globalThis.DOMMatrix=class{constructor(s){this.values=s.slice(9,-1).split(',').map(Number);}toFloat64Array(){return Float64Array.from(this.values)}};
const checks=[],check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)};
check('Empty click clears, threshold produces no box, four directions normalize and select real current icon bounds',()=>{
 for(const [a,b] of [[[945,35],[1035,215]],[[1035,215],[945,35]],[[945,215],[1035,35]],[[1035,35],[945,215]]]){const f=fixture();f.down(...a);assert.equal(f.rect(),undefined);f.move(...b);assert.deepEqual(f.selected(),['finder','premiere','vscode']);assert.deepEqual(f.rect().props.style,{left:945,top:35,width:90,height:180});f.up(...b);assert.equal(f.rect(),undefined);assert.equal(f.root.held,null);assert.deepEqual(f.selected(),['finder','premiere','vscode']);f.down(100,100);f.move(103,102);assert.equal(f.rect(),undefined);f.up(103,102);assert.deepEqual(f.selected(),[]);f.dispose();}
});
check('Inclusive edge/partial intersection, no/all icons, moved positions and Shift union from immutable press snapshot',()=>{
 assert.deepEqual(selectedIn({x:10,y:10,width:10,height:10},[{id:'a',x:20,y:20,width:80,height:82}]),['a']);
 const f=fixture();f.icons()[0].props.move({x:100,y:100});f.render();f.down(95,95);f.move(101,101);assert.deepEqual(f.selected(),['finder']);f.up(101,101);f.down(945,120,{shiftKey:true});f.move(1030,213);assert.deepEqual(f.selected(),['finder','premiere']);f.move(946,121);assert.deepEqual(f.selected(),['finder']);f.move(1030,213);assert.deepEqual(f.selected(),['finder','premiere']);f.up(1030,213);f.down(0,0);f.move(1040,650);assert.equal(f.selected().length,9);f.up(1040,650);f.down(250,300);f.move(350,380);assert.deepEqual(f.selected(),[]);f.dispose();
});
check('Successful release survives synchronous lost capture; only its post-drag click/double-click are suppressed',()=>{
 const f=fixture();f.down(945,35);f.up(1030,215);assert.equal(f.selected().length,3);for(const name of ['onClickCapture','onDoubleClickCapture']){const e=f.event(1030,215);f.h.tree.props[name](e);assert.ok(e.defaultPrevented&&e.stopped);}f.h.tree.props.onLostPointerCapture(f.event(0,0));f.render();assert.equal(f.selected().length,3);
 const next=f.event(100,100,{target:{}});f.h.tree.props.onPointerDownCapture(next);f.h.tree.props.onClickCapture(next);assert.equal(next.defaultPrevented,false);const keyboard=f.event(0,0,{detail:0});f.h.tree.props.onClickCapture(keyboard);assert.equal(keyboard.defaultPrevented,false);f.dispose();
});
check('Escape restores snapshot, held/IME keys do not cancel, fresh Escape after cancel/commit bubbles',()=>{
 const f=fixture();f.icons()[0].props.select();f.render();f.down(100,100);f.move(1030,500);assert.ok(f.rect());for(const extra of [{repeat:true},{isComposing:true},{nativeEvent:{isComposing:true}}]){f.h.tree.props.onKeyDown(f.event(0,0,{key:'Escape',...extra}));assert.ok(f.rect());}
 const e=f.event(0,0,{key:'Escape'});f.h.tree.props.onKeyDown(e);f.render();assert.ok(e.defaultPrevented&&e.stopped);assert.deepEqual(f.selected(),['finder']);assert.equal(f.rect(),undefined);const next=f.event(0,0,{key:'Escape'});f.h.tree.props.onKeyDown(next);assert.equal(next.defaultPrevented,false);assert.equal(f.root.held,null);f.dispose();
});
check('Cancellation, invalid projection, resize, disable/overlay, blur and unmount roll back without stuck capture',()=>{
 for(const mode of ['cancel','lost','invalid','resize','disable','blur','unmount']){const f=fixture();f.icons()[0].props.select();f.render();f.down(100,100);f.move(1020,600);
 if(mode==='cancel')f.h.tree.props.onPointerCancel(f.event(0,0));if(mode==='lost')f.h.tree.props.onLostPointerCapture(f.event(0,0));if(mode==='invalid'){f.host.current.getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});f.move(10,10);}if(mode==='resize')f.render({size:{width:900,height:600}});if(mode==='disable')f.render({enabled:false});if(mode==='blur')f.h.tree.props.onBlur({currentTarget:f.root,relatedTarget:{}});if(mode==='unmount')f.dispose();else{f.render();assert.deepEqual(f.selected(),['finder'],mode);assert.equal(f.rect(),undefined,mode);f.dispose();}assert.equal(f.root.held,null,mode);}
});
check('Secondary/stale pointers cannot change or finish an owner; icons/windows/menu/dock/touch/context do not start',()=>{
 const f=fixture();for(const extra of [{target:{}},{pointerType:'touch'},{button:2},{isPrimary:false},{metaKey:true},{ctrlKey:true}]){f.down(100,100,extra);assert.equal(f.root.held,null);assert.equal(f.rect(),undefined);}f.down(100,100);f.move(1020,600,{pointerId:2});f.up(1020,600,{pointerId:2});assert.equal(f.root.held,1);assert.equal(f.rect(),undefined);f.move(1020,600);const selected=f.selected();f.h.tree.props.onPointerCancel(f.event(0,0,{pointerId:2}));assert.deepEqual(f.selected(),selected);f.up(1020,600);f.move(0,0);assert.deepEqual(f.selected(),selected);f.dispose();
});
check('Tilted projection inverse and scaled direct/narrow layouts use identical logical selection geometry',()=>{
 const size={width:1040,height:650},plane=new T.Object3D();plane.rotation.set(-.18,.34,.05);const camera=new T.PerspectiveCamera(39,1.6,.1,100);camera.position.set(3,2,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();const el={style:{}};projectScreen(el,plane,camera,{width:1400,height:875},[2.91,1.819],size);const matrix=new T.Matrix4().fromArray(el.style.transform.slice(9,-1).split(',').map(Number));
 const f=fixture(size,{host:{transform:el.style.transform,closest:()=>false},client:(x,y)=>{const p=new T.Vector4(x,y,0,1).applyMatrix4(matrix);return{x:p.x/p.w,y:p.y/p.w}}});f.down(945,35);f.move(1030,215);assert.deepEqual(f.selected(),['finder','premiere','vscode']);assert.ok(Math.abs(f.rect().props.style.width-85)<1e-6);f.dispose();
 const narrow=fixture({width:360,height:500});narrow.down(0,0);narrow.move(360,500);assert.equal(narrow.selected().length,9);narrow.dispose();
});
check('Modifier icon clicks change selection without sound/drag/launch; Mac Control-click stays native',()=>{
 const f=fixture();let launch=0,activate=0;const icon=()=>harness(DesktopIcon,{...f.icons()[0].props,launch(){launch++},activate(){activate++}}),node={style:{},setPointerCapture(){throw Error('modifier captured')},hasPointerCapture:()=>false};
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{value:{platform:'MacIntel',userAgentData:{platform:'macOS'}},configurable:true});
 for(const [mode,expected] of [[{shiftKey:true},['finder']],[{metaKey:true},[]],[{metaKey:true},['finder']]]){const h=icon(),e=f.event(0,0,{...mode,currentTarget:node});h.tree.props.onPointerDown(e);h.tree.props.onClick(e);f.render();assert.deepEqual(f.selected(),expected);}const before=f.selected();const h=icon(),e=f.event(0,0,{ctrlKey:true,currentTarget:node});h.tree.props.onPointerDown(e);h.tree.props.onClick(e);h.tree.props.onDoubleClick(e);assert.deepEqual(f.selected(),before);assert.equal(e.defaultPrevented,false);
 Object.defineProperty(globalThis,'navigator',{value:{platform:'Win32'},configurable:true});const c=icon(),ce=f.event(0,0,{ctrlKey:true,currentTarget:node});c.tree.props.onClick(ce);f.render();assert.notDeepEqual(f.selected(),before);assert.equal(launch+activate,0);if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;f.dispose();
});
check('Committed multi-selection survives view/appearance renders; a selected icon drag moves the whole selected group',()=>{
 const f=fixture();f.down(0,0);f.move(1040,650);f.up(1040,650);assert.equal(f.selected().length,9);f.render({enabled:false});f.render({enabled:true,night:true});assert.equal(f.selected().length,9);
 const props=f.icons()[0].props,h=harness(DesktopIcon,props),node={style:{},held:false,setPointerCapture(){this.held=true},hasPointerCapture(){return this.held},releasePointerCapture(){this.held=false}};
 const e=f.event(props.position.x,props.position.y,{currentTarget:node});h.tree.props.onPointerDown(e);f.render();assert.equal(f.selected().length,9);const to=f.event(props.position.x-100,props.position.y+40,{currentTarget:node});f.h.tree.props.onPointerMove(to);f.h.tree.props.onPointerUp(to);f.render();assert.deepEqual(f.icons()[0].props.position,{x:props.position.x-100,y:props.position.y+34});assert.equal(node.held,false);assert.equal(f.icons()[1].props.position.x,848);f.dispose();
});
check('Pen selection, touch wallpaper clearing, capture failure and CSS-only ResizeObserver cancellation',()=>{
 const f=fixture();f.down(945,35,{pointerType:'pen'});f.move(1030,215,{pointerType:'pen'});f.up(1030,215,{pointerType:'pen'});assert.equal(f.selected().length,3);
 f.down(100,100,{pointerType:'touch'});assert.equal(f.root.held,null);f.h.tree.props.onClick(f.event(100,100,{pointerType:'touch'}));f.render();assert.deepEqual(f.selected(),[]);
 f.icons()[0].props.select();f.render();f.root.setPointerCapture=()=>{throw Error('inactive pointer')};f.down(100,100);assert.deepEqual(f.selected(),['finder']);assert.equal(f.rect(),undefined);f.dispose();
 let observer,disconnected=false;globalThis.ResizeObserver=class{constructor(fn){observer=fn;}observe(){}disconnect(){disconnected=true}};
 const r=fixture();r.icons()[0].props.select();r.render();observer([{contentRect:{width:1040,height:650}}]);r.down(100,100);r.move(1030,500);observer([{contentRect:{width:1039,height:650}}]);r.render();assert.deepEqual(r.selected(),['finder']);assert.equal(r.rect(),undefined);assert.equal(r.root.held,null);r.dispose();assert.ok(disconnected);delete globalThis.ResizeObserver;
});
check('Mounted MacDesktop menu/calendar/external overlay gate the child; local cancellation takes Escape before menus',()=>{
 const props={manager:{windows:[],active:null},size:{width:1040,height:650},host:{current:{}},enabled:true,sound:{muted:true},night:false};const mac=harness(MacDesktop,props);const child=()=>find(mac,n=>n.type===DesktopItems);assert.ok(child().props.enabled);const f=fixture(undefined,{props:{controller:child().props.controller}});f.down(100,100);f.move(1000,500);const e=f.event(0,0,{key:'Escape'});mac.tree.props.onKeyDown(e);f.render();assert.ok(e.stopped);assert.equal(f.rect(),undefined);
 find(mac,n=>n.props?.['data-menu']==='File').props.onClick();mac.render();assert.equal(child().props.enabled,false);mac.render({desktopBlocked:true});assert.equal(child().props.enabled,false);f.dispose();
});
fs.writeFileSync(new URL('../../docs/redesign/session-27-desktop-marquee/selection-checks.json',import.meta.url),JSON.stringify({checks,method:'actual mounted handlers and Three projection math; mock DOM offsets/capture/focus, not native browser'},null,2)+'\n');
console.log(checks.length+' marquee groups passed.');
