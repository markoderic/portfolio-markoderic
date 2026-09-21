import assert from 'node:assert/strict';import fs from 'node:fs';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
import Prototype from './src/prototype/Prototype.jsx';
const text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join('');
const scene=h=>find(h,n=>n.props?.printMotion),desktop=h=>find(h,n=>n.props?.manager&&n.props?.notchScreen);
const byClass=(h,c)=>find(h,n=>n.props?.className===c),byText=(h,s)=>find(h,n=>n.type==='button'&&text(n)===s);
const target=kind=>({closest:s=>kind==='primary'?s.includes('data-entry-confirm'):kind==='secondary'?s!=='[data-entry-confirm]':false});
const event=(extra={})=>({target:target('backdrop'),pointerId:1,button:0,buttons:0,clientX:100,clientY:100,detail:1,nativeEvent:{},repeat:false,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...extra});
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
let focus=[],listeners=new Map(),selected='';
globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.window={getSelection:()=>({toString:()=>selected})};globalThis.document={activeElement:null,hidden:false};globalThis.history={pushState(){}};globalThis.addEventListener=(n,f)=>listeners.set(n,f);globalThis.removeEventListener=()=>{};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
function setup(hash='',{reduced=false,simple=false,width=1440}={}){
 globalThis.innerWidth=width;globalThis.innerHeight=900;globalThis.location={hash,search:simple?'?simple':''};globalThis.motionPreference={matches:reduced,addEventListener(n,f){listeners.set('motion',f)},removeEventListener(){}};globalThis.matchMedia=()=>motionPreference;globalThis.entryProgress={active:false,loaded:0,total:0,errors:[]};selected='';focus=[];listeners=new Map();
 const h=harness(Prototype,{}),render=()=>{h.render();for(const n of nodes(h.tree))if(n.props?.ref&&!n.props.ref.current)n.props.ref.current={style:{},scrollTo(){},focus:()=>focus.push(n.props.className||n.props['aria-label']),querySelector:()=>({focus(){}})};h.flushEffects();h.render();};render();
 const ready=()=>{for(const id of ['desk','workspace','laptopModel','phone','resources'])scene(h).props.onStageReady(id);render()};
 const activate=()=>{byClass(h,'entry-confirm').props.onClick(event({target:target('primary')}));render()};
 return {h,render,ready,activate};
}
check('base/#desk fresh and cached refresh wait indefinitely on real readiness',()=>{
 for(const hash of ['', '#desk'])for(const cached of [false,true]){const s=setup(hash);if(!cached){entryProgress.active=true;entryProgress.total=27;entryProgress.loaded=1;}s.ready();assert.ok(byClass(s.h,'entry-layer'));assert.equal(scene(s.h).props.entry.phase,'terminal');if(!cached){assert.ok(text(byClass(s.h,'entry-confirm')).includes('Skip loading'));entryProgress.active=false;entryProgress.loaded=27;s.render();}for(let i=0;i<30;i++)s.render();assert.ok(text(byClass(s.h,'entry-confirm')).includes('Enter workspace'));assert.ok(byClass(s.h,'entry-layer'));const refreshed=setup(hash);assert.ok(byClass(refreshed.h,'entry-layer'));}
});
check('ready click confirms once, protects physical actions and leaves only usable desk',()=>{
 const s=setup();s.ready();const action=byClass(s.h,'entry-confirm').props.onClick,e=event();const initial=scene(s.h).props;
 action(e);action(event());s.render();assert.ok(e.prevented&&e.stopped);assert.equal(initial.entry.token,1);assert.equal(initial.entry.phase,'arriving');assert.ok(byClass(s.h,'arrival-shield'));assert.equal(scene(s.h).props.view,'desk');
 scene(s.h).props.onSelect('phone');scene(s.h).props.onLamp();scene(s.h).props.onResume();scene(s.h).props.onPaper();s.render();assert.equal(scene(s.h).props.view,'desk');assert.equal(scene(s.h).props.night,false);assert.equal(scene(s.h).props.printProgress.current,0);
 scene(s.h).props.onArrivalComplete(1);s.render();s.render();assert.equal(scene(s.h).props.entry.phase,'active');assert.ok(!byClass(s.h,'entry-layer'));assert.ok(!byClass(s.h,'arrival-shield'));assert.ok(!byClass(s.h,'arrival-begin'));assert.ok(focus.includes('Workspace navigation'));scene(s.h).props.onSelect('laptop');s.render();assert.equal(scene(s.h).props.view,'laptop');
});
check('mouse and touch backdrop click consume the actual click, never pointer-up',()=>{
 for(const pointerType of ['mouse','touch']){const s=setup();s.ready();const layer=byClass(s.h,'entry-layer'),e=event({pointerType});layer.props.onPointerDown(e);s.h.tree.props.onPointerUp(e);s.render();assert.equal(scene(s.h).props.entry.phase,'terminal');layer.props.onClick(e);s.render();assert.equal(scene(s.h).props.entry.phase,'arriving');assert.ok(e.stopped&&e.prevented);}
});
check('selected text, drags, secondary controls, nonprimary pointer and cancellation never enter',()=>{
 for(const kind of ['selection','drag','secondary','right','cancel','multi']){const s=setup();s.ready();const layer=byClass(s.h,'entry-layer'),e=event({target:target(kind==='secondary'?'secondary':'backdrop'),button:kind==='right'?2:0});layer.props.onPointerDown(e);if(kind==='selection')selected='Desk / environment';if(kind==='drag')layer.props.onPointerMove({...e,clientX:140});if(kind==='multi')layer.props.onPointerMove({...e,pointerId:2});if(kind==='cancel')layer.props.onPointerCancel();layer.props.onClick(e);s.render();assert.equal(scene(s.h).props.entry.phase,'terminal',kind);}
 const s=setup();s.ready();byText(s.h,'Sound on').props.onClick();s.render();assert.equal(scene(s.h).props.entry.phase,'terminal');assert.equal(scene(s.h).props.night,false);
});
check('Enter primary/backdrop confirms once; repeat cannot activate newly focused Explore',()=>{
 for(const kind of ['primary','backdrop']){const s=setup();s.ready();const e=event({key:'Enter',target:target(kind)});s.h.tree.props.onKeyDownCapture(e);s.h.tree.props.onKeyDownCapture({...e,repeat:true});s.render();assert.equal(scene(s.h).props.entry.token,1);scene(s.h).props.onArrivalComplete(1);s.render();const repeat=event({key:'Enter',repeat:true,target:target('secondary')});s.h.tree.props.onKeyDownCapture(repeat);assert.ok(repeat.prevented&&repeat.stopped);s.h.tree.props.onKeyUpCapture({key:'Enter'});assert.equal(scene(s.h).props.view,'desk');}
});
check('composing/repeated/secondary Enter does not activate entry',()=>{
 for(const extra of [{repeat:true},{target:target('primary'),isComposing:true},{isComposing:true},{nativeEvent:{isComposing:true}},{keyCode:229},{target:target('secondary')}]){const s=setup();s.ready();s.h.tree.props.onKeyDownCapture(event({key:'Enter',...extra}));s.render();assert.equal(scene(s.h).props.entry.phase,'terminal');}
});
check('skip before readiness is explicit, immediate, honest and has no second gate',()=>{
 const s=setup();s.activate();assert.equal(scene(s.h).props.entry.phase,'active');assert.equal(scene(s.h).props.view,'desk');assert.ok(byClass(s.h,'entry-pending'));assert.ok(!byClass(s.h,'arrival-shield'));s.ready();assert.ok(!byClass(s.h,'entry-pending'));assert.equal(scene(s.h).props.view,'desk');
 const k=setup();k.h.tree.props.onKeyDownCapture(event({key:'Enter'}));k.render();assert.equal(scene(k.h).props.entry.phase,'active');assert.ok(byClass(k.h,'entry-pending'));
});
check('failure/pending work never says ready; fallback keeps the existing desktop',()=>{
 const s=setup();const mail=desktop(s.h).props.mail,manager=desktop(s.h).props.manager;entryProgress.errors=['phone.glb'];s.ready();assert.ok(text(byClass(s.h,'entry-confirm')).includes('Skip loading'));s.activate();assert.ok(text(byClass(s.h,'entry-pending')).includes('failed'));find(s.h,n=>n.props?.onFailure).props.onFailure();s.render();s.render();assert.ok(!scene(s.h));assert.ok(byClass(s.h,'entry-failure'));assert.equal(desktop(s.h).props.mail,mail);assert.deepEqual(desktop(s.h).props.manager,manager);
});
check('deep links, reduced motion, small displays and Simple view retain direct exceptions',()=>{
 for(const hash of ['#film','#portfolio','#notch','#animalfeed','#contact','#laptop','#phone','#paper','#resume']){const s=setup(hash);assert.ok(!byClass(s.h,'entry-layer'));assert.ok(!byClass(s.h,'arrival-shield'));assert.equal(scene(s.h).props.entry.phase,'active');}
 for(const opts of [{reduced:true},{width:390},{simple:true}]){const s=setup('',opts);assert.ok(!byClass(s.h,'entry-layer'));assert.ok(!byClass(s.h,'arrival-shield'));assert.equal(desktop(s.h).props.enabled,true);}
});
check('resume and Simple terminal options work before readiness',()=>{
 const s=setup();byText(s.h,'Resume').props.onClick();s.render();assert.equal(scene(s.h).props.view,'paper');assert.ok(!byClass(s.h,'entry-layer'));
 const t=setup();byText(t.h,'Simple view').props.onClick();t.render();assert.ok(!scene(t.h));assert.equal(desktop(t.h).props.enabled,true);
});
check('arrival skip/navigation/popstate cancel stale completion and preserve state',()=>{
 for(const kind of ['skip','navigate','popstate']){const s=setup();s.ready();const initial=desktop(s.h).props,mail={...initial.mail,draft:{...initial.mail.draft,details:'keep draft'}};initial.setMail(mail);s.render();const manager=desktop(s.h).props.manager;s.activate();const old=scene(s.h).props,token=old.entry.token;if(kind==='skip')byText(s.h,'Skip arrival').props.onClick(event());if(kind==='navigate')desktop(s.h).props.navigate('phone');if(kind==='popstate'){location.hash='#film';listeners.get('popstate')()}s.render();const expected=scene(s.h).props.view;old.onArrivalComplete(token);s.render();assert.equal(scene(s.h).props.view,expected);assert.equal(scene(s.h).props.entry.phase,'active');assert.equal(desktop(s.h).props.mail,mail);if(kind!=='popstate')assert.deepEqual(desktop(s.h).props.manager,manager);}
});
check('name is stable on desk and recedes only for focused routes; Explore controls survive',()=>{
 const s=setup();s.ready();s.activate();scene(s.h).props.onArrivalComplete(1);s.render();assert.equal(byClass(s.h,'workspace-identity').props['data-focused'],false);find(s.h,n=>n.props?.['aria-label']==='Workspace navigation').props.onClick();s.render();for(const label of ['View desk','Open laptop','Pick up phone','View resume','Simple view','Nighttime','Pause desk motion','Controls & credits'])assert.ok(byText(s.h,label),label);desktop(s.h).props.navigate('phone');s.render();assert.equal(byClass(s.h,'workspace-identity').props['data-focused'],true);
});
check('reduced-motion or narrow resize during arrival cancels it without a late focus/route steal',()=>{
 for(const change of ['reduced','resize']){const s=setup();s.ready();s.activate();const old=scene(s.h).props,token=old.entry.token,mail=desktop(s.h).props.mail;
 if(change==='reduced'){motionPreference.matches=true;listeners.get('motion')();}else{innerWidth=390;listeners.get('resize')();}s.render();s.render();old.onArrivalComplete(token);s.render();assert.equal(scene(s.h).props.view,'laptop');assert.equal(scene(s.h).props.entry.phase,'active');assert.ok(!byClass(s.h,'arrival-shield'));assert.equal(desktop(s.h).props.mail,mail);
 }
});
console.log(count+' entry lifecycle checks passed; mock callbacks/focus only, no native input.');
