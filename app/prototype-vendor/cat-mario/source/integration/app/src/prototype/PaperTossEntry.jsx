import React from 'react';
export function guardTossEntryKey(e) {
 if((e.key==='Enter'||e.key===' ')&&(e.repeat||e.isComposing||e.nativeEvent?.isComposing))e.preventDefault();
}
export default function PaperTossEntry({anchor,visible,enabled,reason,onEnter,onUi}) {
 return <aside ref={anchor} className="paper-toss-entry" hidden={!visible} aria-label="Bin game"
  onPointerEnter={()=>onUi(true)} onPointerLeave={()=>onUi(false)} onFocus={()=>onUi(true)}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))onUi(false);}}>
  <button disabled={!enabled} aria-describedby="paper-toss-entry-reason" onKeyDown={guardTossEntryKey} onClick={()=>onEnter('context')}>Play paper toss</button>
  <small id="paper-toss-entry-reason" role="status">{reason||'Aim a separate paper ball.'}</small>
 </aside>;
}
