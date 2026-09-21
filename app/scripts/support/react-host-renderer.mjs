// Actual installed React 18 reconciler, simulated host nodes. No browser/DOM layout.
import React from 'react';
import Reconciler from 'react-reconciler';
const context={};
export const renderer=Reconciler({
  now:()=>performance.now(), supportsMutation:true, isPrimaryRenderer:true,
  getRootHostContext:()=>context,getChildHostContext:()=>context,getPublicInstance:n=>n,
  prepareForCommit:()=>null,resetAfterCommit(){},shouldSetTextContent:()=>false,
  createInstance:(type,props)=>node(type,props),createTextInstance:text=>({text}),
  appendInitialChild:(p,c)=>p.children.push(c),appendChild:(p,c)=>p.children.push(c),appendChildToContainer:(p,c)=>p.children.push(c),
  removeChild:(p,c)=>p.children.splice(p.children.indexOf(c),1),removeChildFromContainer:(p,c)=>p.children.splice(p.children.indexOf(c),1),
  insertBefore:(p,c,b)=>p.children.splice(p.children.indexOf(b),0,c),insertInContainerBefore:(p,c,b)=>p.children.splice(p.children.indexOf(b),0,c),
  prepareUpdate:()=>true,commitUpdate:(n,_,type,old,props)=>{globalThis.hostCommitProps?.(n,old,props);n.props=props},commitTextUpdate:(n,old,text)=>n.text=text,
  clearContainer:p=>p.children=[],resetTextContent:n=>n.children=[],finalizeInitialChildren:()=>false,
  hideInstance:n=>n.hidden=true,unhideInstance:n=>n.hidden=false,hideTextInstance:n=>n.hidden=true,unhideTextInstance:n=>n.hidden=false,
  scheduleTimeout:setTimeout,cancelTimeout:clearTimeout,noTimeout:-1,getCurrentEventPriority:()=>16,detachDeletedInstance(){},
});
export function node(type,props={}) {return {type,props,children:[],width:props.width,height:props.height,style:{setProperty(){},removeProperty(){}},clientWidth:600,clientHeight:420,
  focus(){globalThis.document.activeElement=this;},contains(n){return this===n||this.children.some(c=>c.contains?.(n));},
  querySelector(selector){const tags=selector.split(',');return nodes(this).slice(1).find(n=>tags.includes(n.type))||null;},
  closest(selector){return selector==='[data-cat-key]'&&this.props['data-cat-key']?this:null;},
  getBoundingClientRect:()=>({left:0,top:0,width:480,height:420}),
  addEventListener(){},removeEventListener(){},getContext(){return globalThis.hostCanvasContext?.(this);},
};}
export function mount(Component,props){const container={children:[]};const root=renderer.createContainer(container,1,null,false,null,'',e=>{throw e;},null);const render=p=>renderer.updateContainer(p===null?null:React.createElement(Component,p),root,null,()=>{});render(props);return {container,render,close:()=>render(null)};}
export const flush=async(n=6)=>{for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,5));renderer.flushPassiveEffects();}};
export function nodes(n){return [n,...(n.children||[]).flatMap(nodes)];}
export const text=n=>n.hidden?'':n.text??(n.children||[]).map(text).join('');
