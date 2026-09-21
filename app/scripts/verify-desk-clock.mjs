import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {createLocalClock,localClockReading,DIGIT_SEGMENTS} from '../src/prototype/localClock.js';
import {clockDisplayGeometry,setClockSegments,clockParts,CLOCK} from '../src/prototype/clockGeometry.js';
import {mountClock,harness,nodes,DeskClock,LocalClockTime} from './support/clock-scene-fixture.mjs';
import {fanEnvelope} from './support/fan-envelope.mjs';
const checks=[];const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)},dir=new URL('../../docs/redesign/session-18-vintage-clock/',import.meta.url);
function environment(start){let date=new Date(start),next=0,reads=0;const timers=new Map(),eventTarget=()=>{const listeners=new Map();return {listeners,addEventListener(k,f){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},removeEventListener(k,f){listeners.get(k)?.delete(f)},emit(k){for(const f of listeners.get(k)||[])f()}}};const doc=eventTarget(),win=eventTarget();doc.hidden=false;
 const clock=createLocalClock({now:()=>{reads++;return new Date(date)},doc,win,setTimer:(fn,ms)=>{timers.set(++next,{fn,ms});return next},clearTimer:id=>timers.delete(id)});
 return {clock,timers,doc,win,reads:()=>reads,set(d){date=new Date(d)},tick(d){date=new Date(d);const [id,t]=timers.entries().next().value;timers.delete(id);t.fn()}};
}
check('all ten digit maps drive actual hexagonal segment vertex colors; blank hour, steady colon and AM/PM',()=>{
 const expected=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];assert.equal(new Set(expected).size,10);
 const display=clockDisplayGeometry();for(let digit=0;digit<10;digit++){setClockSegments(display,{digits:[digit,null,0,0],period:'AM'});for(const r of display.ranges){const a=display.geometry.attributes.color,on=a.getX(r.start)>.1;if(r.digit===0)assert.equal(on,expected[digit].includes(r.id));if(r.digit===1)assert.equal(on,false);if(r.steady)assert.equal(on,true);if(r.period)assert.equal(on,r.period==='AM');}}setClockSegments(display,{digits:[1,2,0,0],period:'PM'});for(const r of display.ranges.filter(r=>r.period))assert.equal(display.geometry.attributes.color.getX(r.start)>.1,r.period==='PM');display.geometry.dispose();assert.deepEqual(DIGIT_SEGMENTS,expected);
});
check('local h:mm format handles 9:59 to 10:00, noon, midnight, date rollover and single-digit hour',()=>{
 for(const [h,m,label,digits]of [[9,59,'9:59 AM',[null,9,5,9]],[10,0,'10:00 AM',[1,0,0,0]],[11,59,'11:59 AM',[1,1,5,9]],[12,0,'12:00 PM',[1,2,0,0]],[23,59,'11:59 PM',[1,1,5,9]],[24,0,'12:00 AM',[1,2,0,0]],[1,7,'1:07 AM',[null,1,0,7]]]){const r=localClockReading(new Date(2026,8,18,h,m));assert.equal(r.label,label);assert.deepEqual(r.digits,digits);if(h===24)assert.ok(r.key.startsWith('2026-9-19/'));}
});
check('fresh local conversion follows different host timezones and DST rollover',()=>{
 const saved=process.env.TZ;try{const date=new Date('2026-09-18T16:30:00Z');process.env.TZ='America/New_York';assert.equal(localClockReading(date).label,'12:30 PM');process.env.TZ='Asia/Kolkata';assert.equal(localClockReading(date).label,'10:00 PM');process.env.TZ='Pacific/Honolulu';assert.equal(localClockReading(date).label,'6:30 AM');process.env.TZ='America/New_York';assert.equal(localClockReading(new Date('2026-03-08T06:59:00Z')).label,'1:59 AM');assert.equal(localClockReading(new Date('2026-03-08T07:00:00Z')).label,'3:00 AM');}finally{if(saved===undefined)delete process.env.TZ;else process.env.TZ=saved;}
});
check('one minute-boundary timer samples wall time, deduplicates readings and shares listeners',()=>{
 const e=environment(new Date(2026,8,18,9,59,48,250)),a=[],b=[];const stop=e.clock.subscribe(x=>a.push(x)),stopB=e.clock.subscribe(x=>b.push(x));assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(e.timers.size,1);assert.equal([...e.timers.values()][0].ms,11750);
 e.win.emit('focus');assert.equal(a.length,1);assert.equal(e.timers.size,1);e.tick(new Date(2026,8,18,10,0,0,14));assert.equal(a.at(-1).label,'10:00 AM');assert.equal(b.at(-1).label,'10:00 AM');assert.equal([...e.timers.values()][0].ms,59986);stop();assert.equal(e.timers.size,1);stopB();assert.equal(e.timers.size,0);
});
check('hidden work suspends; visibility/focus/pageshow resume with fresh time and no elapsed replay',()=>{
 const e=environment(new Date(2026,8,18,23,59)),seen=[];const stop=e.clock.subscribe(x=>seen.push(x));e.doc.hidden=true;e.doc.emit('visibilitychange');assert.equal(e.timers.size,0);const n=e.reads();e.set(new Date(2026,8,19,7,23));e.win.emit('focus');assert.equal(e.reads(),n);e.doc.hidden=false;e.doc.emit('visibilitychange');assert.equal(seen.at(-1).label,'7:23 AM');assert.equal(e.timers.size,1);e.set(new Date(2026,8,19,8,41));e.win.emit('pageshow');assert.equal(seen.at(-1).label,'8:41 AM');e.set(new Date(2026,8,19,9,12));e.win.emit('focus');assert.equal(seen.at(-1).label,'9:12 AM');assert.equal(e.timers.size,1);stop();
});
check('forward/backward wall-clock and timezone changes recompute rather than incrementing cached minutes',()=>{
 const e=environment(new Date(2026,8,18,9,30)),seen=[];const stop=e.clock.subscribe(x=>seen.push(x));e.tick(new Date(2026,8,20,18,3,29));assert.equal(seen.at(-1).label,'6:03 PM');assert.equal([...e.timers.values()][0].ms,31000);e.tick(new Date(2026,8,17,6,2,12));assert.equal(seen.at(-1).label,'6:02 AM');assert.equal([...e.timers.values()][0].ms,48000);
 const saved=process.env.TZ;try{e.set('2026-09-18T16:30:00Z');process.env.TZ='UTC';e.win.emit('focus');const key=seen.at(-1).key;process.env.TZ='Asia/Tokyo';e.win.emit('focus');assert.equal(seen.at(-1).label,'1:30 AM');assert.notEqual(seen.at(-1).key,key);}finally{if(saved===undefined)delete process.env.TZ;else process.env.TZ=saved;}stop();
});
check('cleanup is idempotent and development remounts never duplicate timers/listeners',()=>{
 const e=environment(new Date());for(let i=0;i<20;i++){const stop=e.clock.subscribe(()=>{});assert.equal(e.timers.size,1);assert.equal(e.doc.listeners.get('visibilitychange').size,1);assert.equal(e.win.listeners.get('focus').size,1);stop();stop();assert.equal(e.timers.size,0);assert.equal(e.doc.listeners.get('visibilitychange').size,0);assert.equal(e.win.listeners.get('focus').size,0);assert.equal(e.win.listeners.get('pageshow').size,0);}const n=e.reads();e.win.emit('focus');assert.equal(e.reads(),n);
});
check('mounted digit hook and quiet semantic equivalent update without rebuilding housing; direct return refreshes',()=>{
 const e=environment(new Date(2026,8,18,9,59));const outer=harness(DeskClock,{clock:e.clock,enabled:true,night:false}),staticGeometry=outer.slots[0].value;
 const node=[...nodes(outer.tree)].find(n=>typeof n.type==='function'),digits=harness(node.type,node.props);digits.flushEffects();const geometry=digits.tree.props.geometry,version=geometry.attributes.color.version;
 const text=harness(LocalClockTime,{clock:e.clock,enabled:true});text.flushEffects();assert.equal(e.timers.size,1);assert.equal([...nodes(text.tree)].some(n=>n.props?.['aria-live']),false);assert.equal([...nodes(text.tree)].some(n=>n.type==='button'),false);
 e.tick(new Date(2026,8,18,10,0));digits.render();text.render();assert.equal(digits.tree.props.geometry,geometry);assert.ok(geometry.attributes.color.version>version);assert.equal(outer.slots[0].value,staticGeometry);assert.equal([...nodes(text.tree)].find(n=>n.type==='time').props.children[0],'10:00 AM');
 const v=geometry.attributes.color.version;digits.render({night:true});assert.equal(geometry.attributes.color.version,v);digits.render({enabled:false});digits.flushEffects();text.render({enabled:false});text.flushEffects();assert.equal(e.timers.size,0);e.set(new Date(2026,8,18,13,47));digits.render({enabled:true});digits.flushEffects();digits.render();assert.equal(digits.slots.find(s=>s?.value?.label)?.value.label,'1:47 PM');for(const h of [digits,text])for(const s of h.slots)s.cleanup?.();assert.equal(e.timers.size,0);
});
const root=await mountClock();root.updateMatrixWorld(true);const bound=new T.Box3().setFromObject(root),fan=fanEnvelope();let minimumGap=Infinity;
check('mounted housing/feet fit tabletop and clear full fan sweep plus every existing prop and open drawer',()=>{
 assert.ok(Math.abs(bound.min.y)<1e-7);assert.ok(bound.min.x>-5.4&&bound.max.x<5.4&&bound.min.z>-3&&bound.max.z<3);assert.equal(bound.intersectsBox(fan),false);
 const sources=[['session-15-drawers/open-desk.json',()=>true],['session-07-chair-refinement/after-render.json',m=>['chair','phone'].includes(m.root)],['session-11-laptop-lighting/laptop-render.json',()=>true],['session-12-plant/after-plant.json',()=>true],['session-16-palette-bin/rose-props.json',()=>true]];
 for(const [name,filter]of sources)for(const m of JSON.parse(fs.readFileSync(new URL('../../docs/redesign/'+name,import.meta.url))).meshes.filter(filter)){
 const b=new T.Box3().setFromPoints(m.positions.map(p=>new T.Vector3(...p)));if(m.root==='desk'&&b.max.y<=.00001)continue;const gap=Math.max(b.min.x-bound.max.x,bound.min.x-b.max.x,b.min.y-bound.max.y,bound.min.y-b.max.y,b.min.z-bound.max.z,bound.min.z-b.max.z);assert.ok(gap>.015,`${m.root}/${m.name}: ${gap} ${JSON.stringify(b)} clock ${JSON.stringify(bound)}`);minimumGap=Math.min(minimumGap,gap);}
 root.traverse(o=>{assert.equal(o.userData.deskTarget,undefined)});
});
check('lens is transparent and recessed; digits are in front of the well and behind the lens',()=>{
 const lens=root.getObjectByName('clock-smoked-lens'),segments=root.getObjectByName('clock-segments');assert.equal(lens.material.transparent,true);assert.equal(lens.material.opacity,.08);assert.equal(lens.material.depthWrite,false);assert.equal(segments.material.toneMapped,false);
 const origin=new T.Vector3(.42,.43,2).applyMatrix4(root.matrixWorld),target=new T.Vector3(.42,.43,0).applyMatrix4(root.matrixWorld),ray=new T.Raycaster(origin,target.sub(origin).normalize());const hits=ray.intersectObject(root,true);assert.equal(hits[0].object.name,'clock-smoked-lens');assert.equal(hits.find(h=>!h.object.material.transparent).object.name,'clock-segments');
});
const {meshes:handset}=await import('./inspect-phone-edges.mjs');
let phoneRadius=0;for(const mesh of handset)for(const point of mesh.points)phoneRadius=Math.max(phoneRadius,point.length());
const {PHONE}=await import('../src/prototype/deviceGeometry.js');
const phoneSweep=new T.Box3().setFromPoints([new T.Vector3(...PHONE.desk),new T.Vector3(...PHONE.picked)]).expandByScalar(phoneRadius);
check('entire phone clears clock during pickup/return for every orientation along its bounded pivot path',()=>{assert.equal(bound.intersectsBox(phoneSweep),false);});
let meshes=0,triangles=0,casters=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.castShadow)casters++;}});
fs.writeFileSync(new URL('clock-checks.json',dir),JSON.stringify({checks,bounds:{min:bound.min.toArray(),max:bound.max.toArray()},fanBounds:{min:fan.min.toArray(),max:fan.max.toArray()},minimumGap,phoneSweep:{radius:phoneRadius,min:phoneSweep.min.toArray(),max:phoneSweep.max.toArray()},cost:{meshes,triangles,casters,textures:0,timers:1,perFrameWork:0},evidence:'Actual component hooks with mocked React/events/timers, actual Three geometry. No native browser evidence.'},null,2)+'\n');
console.log(`${checks.length} clock checks passed`);
