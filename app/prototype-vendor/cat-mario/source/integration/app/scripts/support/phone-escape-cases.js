// Actual component handlers + explicitly modeled DOM eligibility and propagation.
// Not React DOM, native focus/keyboard, browser CSS or a reproduction of the user's trigger.
import assert from 'node:assert/strict';
import {harness,find,nodes} from './scripts/support/hook-harness.js';
import Prototype from './src/prototype/Prototype.jsx';
import Notch from './src/prototype/notch/NotchDemo.jsx';
import MacDesktop from './src/prototype/MacDesktop.jsx';
let pass=0,fail=0;
const check=(name,fn)=>{try{fn();pass++;console.log('PASS '+name)}catch(e){fail++;console.log('FAIL '+name+'\n'+e.stack)}};
const view=s=>s.h.tree.props.className.match(/view-(\w+)/)[1];
const scene=s=>find(s.h,n=>n.props?.printMotion);
const desktop=s=>find(s.h,n=>n.type===MacDesktop);
const text=n=>typeof n==='string'?n:(n?.props?.children||[]).map(text).join('');
function setup(hash='#phone',{simple=false,reduced=false,settle=true}={}){
 const listeners=new Map(),pushes=[];globalThis.innerWidth=1440;globalThis.innerHeight=900;
 globalThis.location={hash,search:simple?'?simple':''};globalThis.history={pushState:(_a,_b,url)=>pushes.push(url)};
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});
 globalThis.addEventListener=(type,fn)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn)};
 globalThis.removeEventListener=(type,fn)=>listeners.get(type)?.delete(fn);
 globalThis.window={addEventListener,removeEventListener};
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.setInterval=()=>1;globalThis.clearInterval=()=>{};
 globalThis.getComputedStyle=()=>({transform:'none'});
 const body={name:'body'},doc={body,activeElement:body,hidden:false,hasFocus:()=>true};globalThis.document=doc;
 const s={h:harness(Prototype,{}),p:null,sheet:null,dom:new Map(),pushes,listeners,doc};
 // Build the actual host/Notch/Sheet ancestry; preserve node identity by tree path.
 function bind(tree,parent=null,path='root'){
  if(!tree||typeof tree!=='object')return;
  if(tree.type===Notch){s.p ||= harness(Notch,tree.props);s.p.render(tree.props);return bind(s.p.tree,parent,path+'/notch')}
  if(typeof tree.type==='function'&&tree.props?.title&&tree.props?.onClose){s.sheet ||= harness(tree.type,tree.props);s.sheet.render(tree.props);return bind(s.sheet.tree,parent,path+'/sheet')}
  const node=s.dom.get(path)||{style:{},scrollTop:0,scrollTo(){},scrollIntoView(){}};s.dom.set(path,node);
  node.tree=tree;node.parent=parent;node.children=[];node.isConnected=true;parent?.children.push(node);
  node.contains=other=>{for(let n=other;n;n=n.parent)if(n===node)return true;return false};
  node.focus=()=>{for(let n=node;n;n=n.parent)if(n.tree.props?.inert!==undefined)return;const p=node.tree.props;if(p.disabled)return;if(p.tabIndex===undefined&&!['button','input','textarea','select','a'].includes(node.tree.type))return;doc.activeElement=node};
  node.querySelector=selector=>{const all=[...s.dom.values()].filter(n=>n.isConnected&&n!==node&&node.contains(n));return all.find(n=>selector.split(',').some(q=>{q=q.trim();if(q.startsWith('.'))return n.tree.props?.className?.split(' ').includes(q.slice(1));return n.tree.type===q}))||null};
  node.closest=selector=>{for(let n=node;n;n=n.parent)if(selector.startsWith('.')&&n.tree.props?.className?.split(' ').includes(selector.slice(1)))return n;return null};
  if(tree.props?.ref)tree.props.ref.current=node;
  for(const [i,child]of(tree.props?.children||[]).entries())bind(child,node,path+'/'+i);
  return node;
 }
 s.render=()=>{for(const n of s.dom.values())n.isConnected=false;s.h.render();s.root=bind(s.h.tree);s.p?.flushEffects();s.sheet?.flushEffects();s.h.flushEffects();};
 s.node=predicate=>[...s.dom.values()].find(n=>n.isConnected&&predicate(n.tree));
 s.nav=()=>s.node(n=>n.props?.['aria-label']==='Workspace navigation');
 s.phone=()=>s.node(n=>n.props?.className?.split(' ').includes('notch-demo'));
 s.settle=()=>{scene(s)?.props.onSettled(view(s));s.render()};
 s.press=(extra={})=>{
  const target=doc.activeElement,e={key:'Escape',repeat:false,nativeEvent:{},target,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},...extra};
  const path=[];for(let n=target;n?.tree;n=n.parent)path.push(n);
  for(const n of [...path].reverse()){if(e.stopped)break;n.tree.props?.onKeyDownCapture?.(e)}
  for(const n of path){if(e.stopped)break;n.tree.props?.onKeyDown?.(e)}
  if(!e.stopped)for(const fn of listeners.get('keydown')||[])fn(e);
  s.render();return e;
 };
 s.render();if(settle)s.settle();return s;
}
check('pickup has eligible workspace focus before inert phone settles, including laptop-to-phone',()=>{
 for(const hash of ['#phone','#laptop']){const s=setup(hash,{settle:false});if(hash==='#laptop'){desktop(s).props.navigate('phone');s.render()}
 assert.ok(s.doc.activeElement===s.nav(), 'navigation focus');assert.equal(s.phone().tree.props.tabIndex,-1);s.phone().focus();assert.ok(s.doc.activeElement===s.nav(),'inert phone cannot receive focus');s.press();assert.equal(view(s),'desk');assert.deepEqual(s.pushes.at(-1),'#desk');}
});
check('settled phone and ordinary buttons/inputs route through real ancestry',()=>{
 for(const opts of [{},{simple:true},{reduced:true}])for(const target of ['root','button','input']){
 const s=setup('#phone',opts);assert.ok(s.doc.activeElement===s.phone(), 'phone focus');
 if(target!=='root'){const n=s.node(n=>n.type===target&&s.phone().contains([...s.dom.values()].find(d=>d.tree===n)));assert.ok(n,target);n.focus()}
 s.press();assert.equal(view(s),'desk');assert.ok(s.doc.activeElement===s.nav(), 'navigation focus');assert.equal(s.nav().tree.props['aria-expanded'],false);
 }
});
check('body-targeted focus loss gets one scoped phone return; controls/outside focus are not intercepted',()=>{
 const s=setup();s.doc.activeElement=s.doc.body;s.press();assert.equal(view(s),'desk');assert.deepEqual(s.pushes,['#desk']);assert.equal(s.listeners.get('keydown')?.size||0,0);
 for(const mode of ['#desk','#laptop','#paper']){const x=setup(mode);x.doc.activeElement=x.doc.body;x.press();assert.equal(view(x),mode.slice(1));}
 for(const extra of [{target:{name:'external-input'}},{defaultPrevented:true}]){const x=setup();x.doc.activeElement=x.doc.body;x.press(extra);assert.equal(view(x),'phone')}
 const x=setup();x.doc.activeElement=x.doc.body;x.doc.hasFocus=()=>false;x.press();assert.equal(view(x),'phone');
});
check('local sheet cancellation wins even if focus is lost to body; repeats/IME never cascade',()=>{
 for(const lost of [false,true]){const s=setup();const primary=s.node(n=>n.props?.className==='n-primary');primary.focus();primary.tree.props.onClick();s.render();s.render();assert.ok(s.node(n=>n.props?.role==='dialog'));if(lost)s.doc.activeElement=s.doc.body;
 s.press();s.render();assert.equal(view(s),'phone');assert.equal(s.node(n=>n.props?.role==='dialog'),undefined);
 s.doc.activeElement=s.doc.body;for(const extra of [{repeat:true},{isComposing:true},{nativeEvent:{isComposing:true}},{keyCode:229}]){s.press(extra);assert.equal(view(s),'phone')}
 s.press();assert.equal(view(s),'desk');assert.deepEqual(s.pushes,['#desk']);}
});
check('scoped recovery preserves physical press and navigation-menu cancellation priority',()=>{
 for(const field of ['fanPress','drawerPress']){const s=setup();scene(s).props.deskInput.current[field]={id:1};s.doc.activeElement=s.doc.body;s.press();assert.equal(scene(s).props.deskInput.current[field],null);assert.equal(view(s),'phone');s.press({repeat:true});assert.equal(view(s),'phone');s.press();assert.equal(view(s),'desk')}
 const s=setup();s.nav().tree.props.onClick();s.render();s.doc.activeElement=s.doc.body;s.press();assert.equal(view(s),'phone');assert.equal(s.nav().tree.props['aria-expanded'],false);s.press();assert.equal(view(s),'desk');
});
check('phone tab, edited search and scroll survive return/reentry; open sheets stay locally owned after reentry',()=>{
 const s=setup();find(s.h,n=>n.type===Notch).props.dispatch({type:'tab',tab:'tasks'});s.render();s.render();
 const search=()=>s.node(n=>n.props?.['aria-label']==='Search tasks');search().tree.props.onChange({target:{value:'saved search'}});s.render();
 const scroll=s.node(n=>n.props?.className==='n-scroll');scroll.scrollTop=137;search().focus();s.press();
 desktop(s).props.navigate('phone');s.render();s.settle();assert.equal(search().tree.props.value,'saved search');assert.equal(find(s.h,n=>n.type===Notch).props.state.tab,'tasks');assert.equal(scroll.scrollTop,137);
 // Keep a local sheet mounted via explicit device navigation; reentry focuses it.
 const primary=s.node(n=>n.props?.className==='n-primary');primary.focus();primary.tree.props.onClick();s.render();s.render();
 desktop(s).props.navigate('laptop');s.render();s.settle();desktop(s).props.navigate('phone');s.render();s.settle();
 assert.equal(s.doc.activeElement.tree.props.role,'dialog');s.press();s.render();assert.equal(view(s),'phone');assert.equal(s.node(n=>n.props?.role==='dialog'),undefined);
});
check('phone return clears old orbit/hover but preserves pause preference and retained app/phone state',()=>{
 for(const paused of [false,true]){const s=setup();const props=scene(s).props;props.deskInput.current.manual=true;props.deskInput.current.liveOrbit={yaw:.4,pitch:.2};props.orbit.current={yaw:.4,pitch:.2};props.deskInput.current.pointer={x:10,y:10};
 // Existing pause control lives in desk Explore: use real handler before phone return.
 if(paused){desktop(s).props.navigate('desk');s.render();s.nav().tree.props.onClick();s.render();s.node(n=>n.type==='button'&&text(n)==='Pause desk motion').tree.props.onClick();desktop(s).props.navigate('phone');s.render();s.settle()}
 const reset=scene(s).props.deskInput.current.reset;const before=desktop(s).props,phone=find(s.h,n=>n.type===Notch).props.state;s.phone().focus();s.press();
 assert.deepEqual(scene(s).props.orbit.current,{yaw:0,pitch:0});assert.equal(scene(s).props.deskInput.current.manual,false);assert.equal(scene(s).props.deskInput.current.reset,reset+1);assert.equal(scene(s).props.deskPaused,paused);assert.equal(scene(s).props.deskInput.current.pointer,null);
 assert.equal(desktop(s).props.manager,before.manager);assert.equal(desktop(s).props.mail,before.mail);assert.equal(find(s.h,n=>n.type===Notch).props.state,phone);
 s.press({repeat:true});assert.equal(s.pushes.filter(p=>p==='#desk').length,paused?2:1);
 desktop(s).props.navigate('phone');s.render();s.settle();assert.ok(s.doc.activeElement===s.phone(), 'phone focus');assert.equal(find(s.h,n=>n.type===Notch).props.state,phone);
 }
});
console.log(pass+' passed, '+fail+' failed; modeled focus eligibility/event paths only, native verification pending.');if(fail)process.exitCode=1;
