import "./runtimeDiagnostics.css";
import React,{useEffect,useRef,useState} from 'react';
import {downloadRuntimeReport} from './runtimeDiagnostics.js';
export default function RuntimeDiagnostics({trace,onClose,onStart}){
 const [,refresh]=useState(0),close=useRef();
 useEffect(()=>{close.current?.focus();const id=setInterval(()=>refresh(n=>n+1),1000);return()=>clearInterval(id);},[]);
 const report=trace.report(),last=report.records.slice(-6);
 return <div className="runtime-diagnostics-backdrop" onPointerDown={e=>e.stopPropagation()}><section className="runtime-diagnostics" role="dialog" aria-modal="true" aria-label="Local runtime diagnostics" onKeyDown={e=>{if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}>
  <h2>Local runtime diagnostics</h2><p>Revision <code>{trace.revision}</code></p>
  <p>Off by default. Records only technical interaction, view, fan and audio state in memory (last 256 events). No text, recordings or network upload. Refresh clears the trace.</p>
  <p>{trace.enabled?'Tracing':'Stopped'} · View: {report.state.view} · Fan: {report.state.on?'On':'Off'} · Last frame: {report.frameAgeMs===null?'not sampled':`${report.frameAgeMs} ms ago`}</p>
  <pre>{last.map(r=>`${r.ms} ${r.kind} ${r.owner||''} ${r.reason||''}`).join('\n')}</pre>
  <div>{trace.enabled?<button onClick={()=>{trace.stop();refresh(n=>n+1);}}>Stop trace</button>:<button onClick={onStart}>Start new trace and return</button>}
  <button onClick={()=>downloadRuntimeReport(trace)}>Download diagnostic report</button><button ref={close} onClick={onClose}>Close</button></div>
 </section></div>;
}
