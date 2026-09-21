import React,{useState,useRef,useEffect,useLayoutEffect} from 'react';
import DesktopIcon from './DesktopIcon';
import {desktopIds,arrangeIcons,clampIcon,crossedDragThreshold} from './interactionMath';
import {desktopPoint,desktopDragPoint,selectionRect,selectedIn,selectionModifier} from './desktopSelection';
export default function DesktopItems({controller,host,size,enabled,launch,activate}){
 const [selection,setSelection]=useState([]),[positions,setPositions]=useState(()=>arrangeIcons(size)),[rectangle,setRectangle]=useState(null);
 const root=useRef(),gesture=useRef(null),postGesture=useRef(null),selected=useRef(selection),placed=useRef(positions),config=useRef();
 config.current={size,enabled,launch,activate,host};
 const select=value=>{selected.current=value;setSelection(value);};
 const place=value=>{placed.current=value;setPositions(value);};
 const paint=members=>{for(const m of members){m.node.style.left=`${m.position.x}px`;m.node.style.top=`${m.position.y}px`;}};
 function finish(cancel=false,pointer,render=true){
  const g=gesture.current;if(!g||(pointer!==undefined&&pointer!==g.pointer))return false;
  gesture.current=null; // Release may synchronously reenter lostpointercapture.
  if(g.moved||g.travelled||cancel||g.touch)postGesture.current={pointer:g.pointer};
  if(g.kind==='icons'){
   const target=cancel?g.origins:g.live;
   paint(g.members.map(m=>({...m,position:target[m.id]})));
   if(render){if(cancel)select(g.before);if(g.moved)place({...placed.current,...target});}
  }else if(render){if(cancel)select(g.before);setRectangle(null);}
  if(g.node.hasPointerCapture?.(g.pointer))g.node.releasePointerCapture(g.pointer);
  if(g.kind==='icons'&&!cancel&&!g.moved&&!g.travelled&&g.touch&&config.current.enabled){config.current.activate();config.current.launch(g.id);}
  return true;
 }
 useLayoutEffect(()=>{
  const g=gesture.current;if(!g)return;
  if(!enabled||g.size.width!==size.width||g.size.height!==size.height){finish(true);return;}
  // React may commit a previous release while the next gesture is already live.
  if(g.kind==='icons'&&g.moved)paint(g.members.map(m=>({...m,position:g.live[m.id]})));
 });
 function nodesFor(ids){const all=Array.from(root.current?.querySelectorAll?.('[data-launcher]')||[]);return ids.map(id=>({id,node:all.find(n=>n.dataset.launcher===id)}));}
 function translated(origins,dx,dy,currentSize){
  let minX=-Infinity,maxX=Infinity,minY=-Infinity,maxY=Infinity;
  for(const p of Object.values(origins)){minX=Math.max(minX,4-p.x);maxX=Math.min(maxX,Math.max(4,currentSize.width-84)-p.x);minY=Math.max(minY,36-p.y);maxY=Math.min(maxY,Math.max(36,currentSize.height-144)-p.y);}
  dx=Math.max(minX,Math.min(maxX,dx));dy=Math.max(minY,Math.min(maxY,dy));
  return Object.fromEntries(Object.entries(origins).map(([id,p])=>[id,{x:p.x+dx,y:p.y+dy}]));
 }
 const begin=(id,e)=>{
  const c=config.current;
  if(!c.enabled||gesture.current||e.button!==0||e.isPrimary===false||selectionModifier(e))return;
  const start=desktopDragPoint(c.host.current,e.clientX,e.clientY);if(!start)return;
  const before=[...selected.current],ids=before.includes(id)?before:[id],members=nodesFor(ids);
  if(members.some(m=>!m.node||!placed.current[m.id]))return;
  const origins=Object.fromEntries(ids.map(id=>[id,{...placed.current[id]}]));
  gesture.current={kind:'icons',id,pointer:e.pointerId,node:e.currentTarget,start,before,members,origins,live:origins,size:{...c.size},time:performance.now(),touch:e.pointerType==='touch',moved:false,travelled:false};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{finish(true);return;}
  if(!before.includes(id))select([id]);
 };
 const moveGroup=(id,key)=>{
  if(!config.current.enabled)return;finish(true);
  const ids=selected.current.includes(id)?[...selected.current]:[id];select(ids);
  const origins=Object.fromEntries(ids.map(id=>[id,placed.current[id]]));
  const next=translated(origins,key==='ArrowRight'?12:key==='ArrowLeft'?-12:0,key==='ArrowDown'?12:key==='ArrowUp'?-12:0,config.current.size);
  paint(nodesFor(ids).filter(m=>m.node).map(m=>({...m,position:next[m.id]})));place({...placed.current,...next});
 };
 controller.current={cancel:()=>finish(true),arrange:()=>{finish(true);const next=arrangeIcons(config.current.size);paint(nodesFor(desktopIds).filter(m=>m.node).map(m=>({...m,position:next[m.id]})));place(next);}};
 useEffect(()=>{if(!enabled)finish(true);},[enabled]);
 useEffect(()=>{finish(true);const next=Object.fromEntries(Object.entries(placed.current).map(([id,p])=>[id,clampIcon(p,size)]));paint(nodesFor(desktopIds).filter(m=>m.node).map(m=>({...m,position:next[m.id]})));place(next);},[size.width,size.height]);
 useEffect(()=>{
  const leave=()=>finish(true),hidden=()=>{if(document.hidden)leave();};
  globalThis.addEventListener?.('blur',leave);globalThis.addEventListener?.('pagehide',leave);document.addEventListener?.('visibilitychange',hidden);
  return()=>{globalThis.removeEventListener?.('blur',leave);globalThis.removeEventListener?.('pagehide',leave);document.removeEventListener?.('visibilitychange',hidden);};
 },[]);
 useEffect(()=>{
  if(typeof ResizeObserver==='undefined'||!root.current)return;
  let dimensions=null;const observer=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(!r)return;const key=`${r.width}:${r.height}`;if(dimensions!==null&&dimensions!==key)finish(true);dimensions=key;});observer.observe(root.current);return()=>observer.disconnect();
 },[]);
 useEffect(()=>()=>{finish(true,undefined,false);controller.current=null;},[]);
 const suppress=e=>{
  if(gesture.current){e.preventDefault();e.stopPropagation();return true;}
  if(e.detail===0){postGesture.current=null;return false;}
  const ticket=postGesture.current;
  if(ticket&&(e.pointerId===undefined||e.pointerId===ticket.pointer)){e.preventDefault();e.stopPropagation();return true;}return false;
 };
 const update=e=>{
  const g=gesture.current;if(!g||e.pointerId!==g.pointer)return;
  const c=config.current;if(!c.enabled||g.size.width!==c.size.width||g.size.height!==c.size.height){finish(true);return;}
  const point=g.kind==='icons'?desktopDragPoint(c.host.current,e.clientX,e.clientY):desktopPoint(c.host.current,e.clientX,e.clientY,c.size);
  if(!point){finish(true);return;}
  if(g.kind==='icons'){
   g.travelled ||= Math.hypot(point.x-g.start.x,point.y-g.start.y)>10;
   if(!g.moved&&!crossedDragThreshold(g.start,point,g.touch?'touch':'mouse',performance.now()-g.time))return;
   g.moved=true;g.live=translated(g.origins,point.x-g.start.x,point.y-g.start.y,c.size);paint(g.members.map(m=>({...m,position:g.live[m.id]})));e.preventDefault();return;
  }
  if(!g.moved&&Math.hypot(point.x-g.start.x,point.y-g.start.y)<5)return;
  g.moved=true;const rect=selectionRect(g.start,point);setRectangle(rect);select(selectedIn(rect,g.bounds,g.add?g.before:[]));e.preventDefault();
 };
 return <div className="desktop-items" ref={root} tabIndex={0} aria-label="Desktop icons"
  onPointerDownCapture={e=>{if(!gesture.current&&e.isPrimary!==false&&e.button===0)postGesture.current=null;}}
  onPointerDown={e=>{
   if(!enabled||gesture.current||e.target!==e.currentTarget||e.button!==0||e.isPrimary===false||e.pointerType==='touch'||selectionModifier(e)==='context'||e.metaKey||e.ctrlKey)return;
   const start=desktopPoint(host.current,e.clientX,e.clientY,size);if(!start)return;
   const bounds=Array.from(e.currentTarget.querySelectorAll('[data-launcher]'),node=>({id:node.dataset.launcher,x:node.offsetLeft,y:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight}));
   if(bounds.some(b=>![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0))return;
   gesture.current={kind:'marquee',pointer:e.pointerId,node:e.currentTarget,start,bounds,before:[...selected.current],add:!!e.shiftKey,moved:false,size:{...size}};
   if(!e.shiftKey)select([]);
   e.preventDefault();e.stopPropagation();e.currentTarget.focus({preventScroll:true});
   try{e.currentTarget.setPointerCapture(e.pointerId);}catch{finish(true);}
  }}
  onPointerMove={update} onPointerUp={e=>{update(e);finish(false,e.pointerId);}}
  onPointerCancel={e=>finish(true,e.pointerId)} onLostPointerCapture={e=>finish(true,e.pointerId)}
  onClickCapture={suppress} onDoubleClickCapture={suppress}
  onClick={e=>{if(!e.defaultPrevented&&enabled&&(e.button===undefined||e.button===0)&&e.target===e.currentTarget&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey)select([]);}}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))finish(true);}}
  onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!e.repeat&&!e.isComposing&&!e.nativeEvent?.isComposing&&finish(true)){e.preventDefault();e.stopPropagation();}}}>
  {desktopIds.map(id=><DesktopIcon key={id} id={id} position={positions[id]} selected={selection.includes(id)} enabled={enabled}
   select={mode=>select(mode==='toggle'?(selected.current.includes(id)?selected.current.filter(v=>v!==id):[...selected.current,id]):mode==='add'?[...new Set([...selected.current,id])]:[id])}
   begin={begin} suppress={suppress} keyboardMove={moveGroup}
   move={p=>place({...placed.current,[id]:p})} activate={activate} launch={()=>launch(id)}/>)}
  {rectangle&&<div aria-hidden="true" className="desktop-marquee" style={{left:rectangle.x,top:rectangle.y,width:rectangle.width,height:rectangle.height}}/>}
 </div>;
}
