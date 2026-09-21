import React,{useEffect,useRef,useState} from 'react';
import {forwardAim} from './paperToss';
import {tossPresentationCurrent} from './paperTossTarget';
export default function PaperTossControls({game,onExit}){
 const [,refresh]=useState(0),gesture=useRef(null),ticket=useRef(null),target=useRef(),cue=useRef(),wantFocus=useRef(true);
 const [keyboard,setKeyboard]=useState(false);
 const focusedPage=()=>typeof document==='undefined'||document.hasFocus?.()!==false;
 const usable=()=>focusedPage()&&tossPresentationCurrent(game,game.presentation)&&(['ready','aiming'].includes(game.phase)||game.phase==='outcome'&&game.hold<=0);
 function release(){const p=gesture.current;gesture.current=null;if(p){try{if(p.node.hasPointerCapture(p.id))p.node.releasePointerCapture(p.id);}catch{}game.releaseInput?.();}return p;}
 const cancel=()=>{const p=release();if(p)ticket.current={id:p.id};game.cancelAim();};
 const consume=e=>{const t=ticket.current;if(!t)return false;const match=t.keyboard?e.detail===0:e.detail!==0&&(e.pointerId==null||e.pointerId===0||e.pointerId===t.id);if(match)ticket.current=null;return match;};
 useEffect(()=>{
  const unsubscribe=game.subscribe(()=>refresh(v=>v+1));game.inputCancel(()=>{const p=release();if(p)ticket.current={id:p.id};});game.target=target.current;game.cue=cue.current;game.consumeClick=consume;game.clearClick=()=>{ticket.current=null;};
  game.targetPresented=()=>{if(wantFocus.current&&focusedPage()){target.current?.focus({preventScroll:true});wantFocus.current=false;}};
  const interrupted=()=>{cancel();};addEventListener('blur',interrupted);addEventListener('resize',interrupted);
  return()=>{release();game.inputCancel(null);game.target=null;game.cue=null;game.targetPresented=null;game.consumeClick=null;game.clearClick=null;unsubscribe();removeEventListener('blur',interrupted);removeEventListener('resize',interrupted);};
 },[game]);
 const begin=e=>{
  if(!usable()||gesture.current||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0||e.isPrimary===false||!['mouse','pen','touch'].includes(e.pointerType)||![e.pointerId,e.clientX,e.clientY].every(Number.isFinite))return;
  e.preventDefault();e.stopPropagation();ticket.current=null;target.current?.focus({preventScroll:true});setKeyboard(false);
  if(game.phase==='outcome')game.next();game.setAim(game.heading,game.power);
  gesture.current={id:e.pointerId,node:e.currentTarget,x:e.clientX,y:e.clientY,presentation:game.presentation,camera:game.camera.clone(),size:{...game.size},moved:false,aim:null};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{cancel();}
 };
 const update=e=>{
  const p=gesture.current;if(!p||p.id!==e.pointerId)return false;
  if(!focusedPage()||!tossPresentationCurrent(game,p.presentation)||!['ready','aiming'].includes(game.phase)||e.isPrimary===false||![e.clientX,e.clientY].every(Number.isFinite)){cancel();return false;}
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.moved ||= Math.hypot(dx,dy)>=8;
  p.aim=forwardAim(p.camera,p.size,dx,dy);
  if(p.aim)game.setAim(p.aim.heading,p.aim.power,p.aim.held);return true;
 };
 const activate=()=>{if(!usable())return;if(game.phase==='outcome')game.next();else{wantFocus.current=true;game.throw();}};
 const key=e=>{
  if(e.target!==e.currentTarget||!focusedPage()||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.isComposing||e.nativeEvent?.isComposing)return;
  if(e.key==='Escape'){if(game.cancelAim()){e.preventDefault();e.stopPropagation();}return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();setKeyboard(true);if(e.repeat||!usable())return;
  if(e.key===' '||e.key==='Enter'){ticket.current={keyboard:true};activate();return;}
  if(game.phase==='outcome')game.next();
  // Screen-left/right use the same camera basis as forwardAim.
  const h=game.heading*Math.PI/180,m=game.camera.matrixWorld.elements;
  const right=Math.sign(m[0]*Math.sin(h)+m[2]*Math.cos(h))||1;
  game.setAim(game.heading+(e.key==='ArrowLeft'?-2*right:e.key==='ArrowRight'?2*right:0),game.power+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0));
 };
 return <section className="paper-toss-controls" aria-label="Paper toss">
  <button ref={target} type="button" className="paper-toss-target" aria-label="Throw paper ball" aria-describedby="paper-toss-instructions" aria-disabled={game.blocked||game.hidden||!['ready','aiming','outcome'].includes(game.phase)}
   onFocus={()=>setKeyboard(target.current?.matches?.(':focus-visible')??false)} onBlur={e=>{if(e.relatedTarget)wantFocus.current=false;setKeyboard(false);cancel();}}
   onPointerDown={begin} onPointerMove={e=>{if(update(e)){e.preventDefault();e.stopPropagation();}}}
   onPointerUp={e=>{if(gesture.current?.id!==e.pointerId)return;if(e.button!==0||e.isPrimary===false){cancel();return;}if(!update(e))return;const p=release();e.preventDefault();e.stopPropagation();ticket.current={id:p.id};if(p.aim?.ready){wantFocus.current=true;game.throw();}else game.cancelAim();}}
   onPointerCancel={e=>{if(gesture.current?.id===e.pointerId)cancel();}} onLostPointerCapture={e=>{if(gesture.current?.id===e.pointerId)cancel();}}
   onKeyDown={key} onKeyUp={e=>{if([' ','Enter'].includes(e.key)){const t=ticket.current;queueMicrotask(()=>{if(ticket.current===t&&t?.keyboard)ticket.current=null;});}}}
   onClick={e=>{e.preventDefault();e.stopPropagation();if(!consume(e)&&e.detail===0&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)activate();}}
  />
  <svg className="paper-toss-arrow" aria-hidden="true"><path ref={cue}/></svg>
  <span id="paper-toss-instructions" className="paper-toss-sr">Drag the ball toward the bin and release to throw. Drag farther forward for more power; sideways movement aims the same way. Arrow shows initial direction. Keyboard: Left and Right aim, Up and Down change power, Space or Enter throws or readies the next ball. Escape cancels aim, then exits.</span>
  <div className="paper-toss-feedback">
   {(keyboard||['ready','aiming','entering'].includes(game.phase))&&<small>{keyboard?`← → aim · ↑ ↓ power ${Math.round(game.power)}% · Space / Enter throw`:'Drag toward the bin · Release to throw'}</small>}
   <p role="status" aria-live="polite">{game.phase==='outcome'?`${game.status} · Drag again`:game.phase==='entering'?'Settling view…':game.phase==='flight'?'':keyboard?`${Math.round(game.heading)}° · ${Math.round(game.power)}%`:''}</p>
  </div>
  <button type="button" className="paper-toss-exit" onClick={onExit}>Exit</button>
 </section>;
}
