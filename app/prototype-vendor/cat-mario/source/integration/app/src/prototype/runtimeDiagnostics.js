// Explicitly opt-in, memory-only technical trace. No storage, telemetry or content.
import {RUNTIME_REVISION} from './runtimeRevision.js';
const fields=new Set('owner instance voice kind reason type pointerId pointerType trusted primary button x y elapsed target width height direct reduced simple failed entry settled view requested on active hidden dragging blocked nav toss laptopEnabled phase power spin updates frames dt minDelta maxDelta suspended context muted volume visible switchEligible source revision'.split(' '));
const clean=data=>Object.fromEntries(Object.entries(data||{}).filter(([k,v])=>fields.has(k)&&(typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=120)));
export function createRuntimeDiagnostics(now=()=>performance.now()){
 let enabled=false,start=0,records=[],sampleTimes=new Map(),read=()=>({}),lastFrame=null;
 const record=(kind,data={})=>{if(!enabled)return;records.push({ms:Math.round(now()-start),...clean(data),kind});if(records.length>256)records.shift();};
 return {
  get enabled(){return enabled;}, revision:RUNTIME_REVISION,
  observe(fn){read=fn;},
  start(){records=[];sampleTimes.clear();lastFrame=null;start=now();enabled=true;record('trace',{reason:'enabled',revision:RUNTIME_REVISION});this.snapshot();},
  stop(){record('trace',{reason:'disabled'});enabled=false;sampleTimes.clear();},
  record,
  sample(key,data){if(!enabled)return;const time=now();if(key==='fan-frame')lastFrame=time;if(time-(sampleTimes.get(key)??-Infinity)<1000)return;sampleTimes.set(key,time);record(key,data);},
  snapshot(){const state=clean(read());record('state',state);return state;},
  report(){return {schema:1,revision:RUNTIME_REVISION,tracing:enabled,elapsed:enabled?Math.round(now()-start):records.at(-1)?.ms??0,frameAgeMs:lastFrame===null?null:Math.round(now()-lastFrame),state:clean(read()),records:records.map(r=>({...r}))};},
  dispose(){enabled=false;records=[];sampleTimes.clear();read=()=>({});lastFrame=null;},
 };
}
export function targetCategory(target){
 if(target?.closest?.('.runtime-diagnostics'))return 'diagnostics';
 if(target?.tagName==='CANVAS')return 'canvas';
 if(target?.closest?.('.laptop-host'))return 'laptop-screen';
 if(target?.closest?.('.phone-host'))return 'phone-screen';
 if(target?.closest?.('.paper-surface'))return 'paper';
 if(target?.closest?.('nav'))return 'navigation';return 'other';
}
export function tracePointer(input,owner,e,reason,press){
 const trace=input?.trace;if(!trace?.enabled)return;
 const native=e?.nativeEvent||e||{},field=k=>e?.[k]??native[k];
 trace.record('pointer',{owner,reason,type:field('type')||'unknown',pointerId:field('pointerId'),pointerType:field('pointerType'),trusted:field('isTrusted'),primary:field('isPrimary'),button:field('button'),x:field('clientX'),y:field('clientY'),target:targetCategory(native.target),elapsed:press&&Number.isFinite(field('timeStamp'))?field('timeStamp')-press.time:undefined});
}
export function downloadRuntimeReport(trace){
 const data=JSON.stringify(trace.report(),null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`portfolio-runtime-${trace.revision}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}
