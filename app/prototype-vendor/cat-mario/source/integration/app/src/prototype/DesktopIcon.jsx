import React from 'react';
import AppIcon, { registry } from './AppIcon';
import { selectionModifier } from './desktopSelection';
export default function DesktopIcon({id,enabled=true,position,selected,select,launch,activate,begin,suppress,keyboardMove}) {
 const title=id==='preview'?'Resume':registry[id].name;
 return <button className={selected?'selected':''} data-launcher={id} style={{left:position.x,top:position.y}}
  aria-label={title} aria-pressed={selected} title={`${title} · double-click to open · Alt + arrows to move`}
  onPointerDown={e=>begin(id,e)}
  onClick={e=>{
   if(!enabled||suppress(e))return;
   const modifier=selectionModifier(e);if(modifier==='context')return;
   if(modifier){e.preventDefault();select(modifier);return;}
   select();if(e.detail<2)activate();if(e.detail===0)launch();
  }}
  onDoubleClick={e=>{if(!enabled||suppress(e)||selectionModifier(e))return;launch();}}
  onKeyDown={e=>{if(enabled&&e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();keyboardMove(id,e.key);}}}>
  <AppIcon id={id}/><span>{title}</span>
 </button>;
}
