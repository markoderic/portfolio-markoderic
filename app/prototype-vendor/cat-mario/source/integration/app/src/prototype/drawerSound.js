import {getSoundContext} from './sound';
import {DRAWER_SOUND,drawerSamples,drawerSlideLevel,drawerContactLevel} from './drawerSoundSynthesis';
const banks=new WeakMap();
function bufferFor(c,kind){
  let bank=banks.get(c);if(!bank){bank=new Map();banks.set(c,bank);}
  if(!bank.has(kind)){const data=drawerSamples(c.sampleRate,kind),buffer=c.createBuffer(1,data.length,c.sampleRate);buffer.getChannelData(0).set(data);bank.set(kind,buffer);}
  return bank.get(kind);
}
// One action token, slide voice and endpoint voice per drawer. No motion integration.
export function createDrawerAudio(read,getContext=getSoundContext,now=()=>performance.now()) {
  let mounted=false,hidden=false;
  const drawers=Array.from({length:3},()=>({generation:0,armed:false,slide:null,contact:null}));
  const allowed=()=>{const s=read();return mounted&&!hidden&&!s.hidden&&!s.direct&&!s.reduced&&s.preferences&&!s.preferences.muted&&s.preferences.volume>0;};
  function level(v,value){const p=v.gain.gain,c=v.context,current=p.value;p.cancelScheduledValues(0);p.setValueAtTime(current,c.currentTime);p.setTargetAtTime(value,c.currentTime,DRAWER_SOUND.smoothing);}
  function stop(d,kind,fade=false){const v=d[kind];if(!v)return;
    if(fade&&!v.stopping){v.stopping=true;level(v,0);v.source.stop(v.context.currentTime+DRAWER_SOUND.release);return;}
    v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();d[kind]=null;
  }
  function invalidate(d){d.generation++;d.armed=false;d.moving=false;stop(d,'slide');stop(d,'contact');}
  function voice(d,kind,amount){
    const c=getContext();if(c?.state!=='running')return;
    stop(d,kind);const source=c.createBufferSource(),gain=c.createGain();
    const v={source,gain,context:c,amount,stopping:false};d[kind]=v;
    source.onended=()=>{source.disconnect();gain.disconnect();if(d[kind]===v)d[kind]=null;};
    source.buffer=bufferFor(c,kind);source.loop=kind==='slide';gain.gain.value=0;
    source.connect(gain).connect(c.destination);level(v,amount*read().preferences.volume);source.start(c.currentTime);
  }
  function slide(d){
    if(!d.armed||!d.ready||!d.moving||!d.travel||now()-d.sampledAt>100||!allowed())return;
    const amount=drawerSlideLevel(d.speed);
    if(!d.slide)voice(d,'slide',amount);
    else {d.slide.amount=amount;level(d.slide,amount*read().preferences.volume);}
  }
  function sync(){
    if(!allowed()){drawers.forEach(invalidate);return;}
    if(getContext()&&getContext().state!=='running'){
      // Do not replay voices interrupted by a suspended context; pending fresh
      // gesture unlocks have no voice yet and remain scoped to their action.
      for(const d of drawers)if(d.slide||d.contact)invalidate(d);
    }
    for(const d of drawers)for(const kind of ['slide','contact']){
      const v=d[kind];if(v&&!v.stopping)level(v,v.amount*read().preferences.volume);
    }
  }
  const safe=fn=>(...args)=>{try{return fn(...args);}catch{for(const d of drawers){try{invalidate(d);}catch{}}}};
  return {
    mount(){mounted=true;},
    accept:safe((id,target,ready)=>{
      const d=drawers[id];if(!d)return;d.generation++;stop(d,'contact');
      if(d.slide?.stopping)stop(d,'slide');
      d.armed=allowed();d.target=target?1:0;d.awaitingTarget=true;d.ready=getContext()?.state==='running';d.moving=false;d.travel=0;d.speed=0;
      if(!d.armed){invalidate(d);return;}
      const token=d.generation;
      Promise.resolve(ready).then(ok=>{
        if(!ok||!mounted||token!==d.generation||!d.armed||!allowed())return;
        d.ready=true;slide(d);
      }).catch(()=>{});
    }),
    present:safe((id,motion,prior,dt,reduced)=>{
      sync();const d=drawers[id];if(!d?.armed)return;
      if(reduced){invalidate(d);return;}
      // Acceptance precedes React committing the new open prop. R3F may deliver
      // idle or moving frames from the previous commit in that interval. Wait
      // for the frame owner to acknowledge this action's target, rather than
      // cancelling the fresh action (or counting old-direction travel).
      if(d.target!==motion.target){if(d.awaitingTarget)return;invalidate(d);return;}
      d.awaitingTarget=false;
      const distance=Math.abs(motion.value-prior);
      d.sampledAt=now();d.speed=distance/Math.max(.001,Math.min(.05,dt));d.travel+=distance;d.moving=motion.moving;
      if(motion.moving)slide(d);
      if(!motion.moving){
        const travel=d.travel;d.armed=false;d.generation++;stop(d,'slide',true);
        // No queued endpoint: a late unlock cannot resurrect already-ended motion.
        if(travel>0&&d.ready&&allowed())voice(d,'contact',drawerContactLevel(travel,d.target));
      }
    }),
    sync:safe(sync),
    pageHidden:safe(value=>{hidden=value;sync();}),
    detach:safe(id=>{if(drawers[id])invalidate(drawers[id]);}),
    dispose:safe(()=>{mounted=false;drawers.forEach(invalidate);}),
  };
}
