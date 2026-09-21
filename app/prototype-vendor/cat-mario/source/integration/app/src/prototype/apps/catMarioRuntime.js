import { createClassicAudio } from './catMarioAudio';
export const classicBase = () => `${import.meta.env?.BASE_URL ?? '/'}prototype-vendor/cat-mario/`;
export const classicAsset = name => `${classicBase()}${name}`;
const defaultLoad = async (signal) => {
  const base=classicBase();
  const [factory,wasm,synthData]=await Promise.all([
    import(/* @vite-ignore */ `${base}classic.mjs`),
    fetch(`${base}classic.wasm`,{signal}).then(r=>{if(!r.ok)throw Error('Game data unavailable');return r.arrayBuffer();}),
    Promise.all([
      import(/* @vite-ignore */ `${base}synth.mjs`),
      fetch(`${base}scores.json`,{signal}).then(r=>{if(!r.ok)throw Error('Game audio data unavailable');return r.json();}),
    ]).catch(()=>null),
  ]);
  return {factory:factory.default,wasm,createChime:synthData?.[0].createChime,scores:synthData?.[1]};
};
// One RAF, fixed 60 Hz source callbacks; pause rather than catch up after interruption.
export function createClassicRuntime({canvas, notify, eligible, preferences, unlock, getContext,
  load=defaultLoad, requestFrame=requestAnimationFrame, cancelFrame=cancelAnimationFrame,
  setTimer=setTimeout, clearTimer=clearTimeout}) {
  let module,audio,disposed=false,phase='loading',started=false,generation=0,frame=null,last=null,accumulator=0;
  const listeners=[],abort=new AbortController();
  let timeout, atTitle = true;
  const change=(state,reason='')=>{phase=state;if(!disposed)notify({phase:state,reason,atTitle});};
  const listen=(target,type,fn,options)=>{if(disposed||abort.signal.aborted)return;target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
  function stopFrame(){if(frame!==null)cancelFrame(frame);frame=null;last=null;accumulator=0;}
  function pause(reason='Paused') {
    ++generation;stopFrame();module?._classic_pause();audio?.pause();
    if(phase==='playing')change(started?'paused':'ready',reason);
  }
  function tick(now) {
    frame=null;if(disposed||phase!=='playing')return;
    if(!eligible()){pause('Paused — click the game to continue.');return;}
    if(last===null)last=now;
    const delta=now-last;last=now;
    if(!Number.isFinite(delta)||delta<0||delta>100){pause('Paused after an interruption.');return;}
    accumulator+=delta;
    try {
      let count=0;
      while(accumulator+1e-6>=1000/60&&count<6){module._classic_tick();accumulator-=1000/60;count++;}
    } catch(error) { pause();change(error?.status===0?'ended':'error','The game stopped. Restart to begin a fresh run.');return; }
    if (!!module._classic_at_title() !== atTitle) { atTitle=!!module._classic_at_title(); change(phase); }
    frame=requestFrame(tick);
  }
  function free(m) {
    if(!m)return;
    try{m._classic_dispose();}catch{/* Partial initialization can abort before surfaces exist. */}
    for(const surf of Object.values(m.SDL?.surfaces||{}).filter(Boolean))try{m._SDL_FreeSurface(surf.surf);}catch{/* Drop the instance even after partial failure. */}
    if(m.SDL){m.SDL.events.length=0;if(m.SDL.canvasPool)m.SDL.canvasPool.length=0;}
    if(m.Browser?.resizeListeners)m.Browser.resizeListeners.length=0;
  }
  const ready=(async()=>{
    timeout=setTimer(()=>{abort.abort();if(!disposed){pause();change('error','Loading timed out. Retry when ready.');}},20000);
    try {
      const payload=await load(abort.signal);
      if(disposed||abort.signal.aborted)return;
      try { if(payload.createChime)audio=createClassicAudio(payload.createChime,payload.scores); }
      catch { audio=null; /* Audio failure must not prevent silent gameplay. */ }
      const m=await payload.factory({wasmBinary:payload.wasm,noInitialRun:true,canvas,
        classicInput:true,doNotCaptureKeyboard:true,classicListen:listen,
        classicSetTitle:()=>{}, // The embedded game owns no portfolio document title.
        classicSound:(index,channel)=>audio?.play(index,channel),
        locateFile:name=>classicAsset(name),print:()=>{},printErr:()=>{}});
      if(disposed||abort.signal.aborted){free(m);audio?.dispose();for(const remove of listeners.splice(0))remove();return;}
      module=m;
      if(m._main(0,0)!==0)throw Error('Initialization failed');
      clearTimer(timeout);timeout=null;change('ready');
    } catch(error) {
      free(module);module=null;audio?.dispose();audio=null;
      for(const remove of listeners.splice(0))remove();
      if(!disposed&&!abort.signal.aborted)change('error','Could not load Cat Mario. Retry to start again.');
    } finally {if(timeout!==null)clearTimer(timeout);timeout=null;}
  })();
  return {
    ready,
    phase:()=>phase,
    start() {
      if(disposed||!['ready','paused'].includes(phase)||!eligible())return false;
      const token=++generation;started=true;audio?.begin(preferences());module._classic_start();last=null;accumulator=0;change('playing');frame=requestFrame(tick);
      // Unlock begins in the user gesture. No delayed promise may reawaken a paused run.
      let result;try{result=unlock();}catch{result=false;}
      Promise.resolve(result).then(ok=>{
        if(disposed||token!==generation||phase!=='playing'||!eligible())return;
        if(ok)audio?.attach(getContext(),preferences());
      }).catch(()=>{});
      return true;
    },
    pause,
    key(key,down){if(!disposed&&phase==='playing'&&eligible())module?._classic_key(key,down?1:0);else if(!down)module?._classic_key(key,0);},
    atTitle:()=>!!module?._classic_at_title(),
    preferences(){audio?.preferences(preferences());},
    dispose(){if(disposed)return;pause();disposed=true;++generation;abort.abort();if(timeout!==null)clearTimer(timeout);free(module);module=null;audio?.dispose();audio=null;for(const remove of listeners.splice(0))remove();},
  };
}
