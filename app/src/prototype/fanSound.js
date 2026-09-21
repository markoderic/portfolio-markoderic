import {unlockSound,getSoundContext,subscribeSoundUnlock} from './sound';
import {FAN_SOUND,fanSamples,fanLevel} from './fanSoundSynthesis';
const buffers=new WeakMap();
let nextOwner=0,nextVoice=0;
function bufferFor(context,kind){
  let bank=buffers.get(context);if(!bank){bank=new Map();buffers.set(context,bank);}
  if(!bank.has(kind)){
    const samples=fanSamples(context.sampleRate,kind),buffer=context.createBuffer(1,samples.length,context.sampleRate);
    buffer.getChannelData(0).set(samples);bank.set(kind,buffer);
  }
  return bank.get(kind);
}
// One owner per mounted portfolio. No context creation, motion integrator or timer.
export function createFanAudio(read, services={unlock:unlockSound,context:getSoundContext,subscribe:subscribeSoundUnlock}, trace){
  const owner=++nextOwner;
  const note=(reason,extra={})=>trace?.record("fan-audio",{owner,reason,...extra});
  let mounted=false,generation=0,press=0,actualPower=0,motor=null,click=null,unsubscribe;
  let pageHidden=false,policy='';
  const state=()=>{const s=read();return {...s,visible:s.visible&&!pageHidden,switchEligible:s.switchEligible&&!pageHidden};};
  const audible=s=>!s.preferences.muted&&s.preferences.volume>0;
  function target(param,value,context,smoothing=FAN_SOUND.smoothing){
    const current=param.value;
    param.cancelScheduledValues(0);
    param.setValueAtTime(current,context.currentTime);
    param.setTargetAtTime(value,context.currentTime,smoothing);
  }
  function voice(context,kind){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=bufferFor(context,kind);source.loop=kind==='motor';
    filter.type='lowpass';filter.Q.value=.707;filter.frequency.value=kind==='motor'?FAN_SOUND.filterBase:FAN_SOUND.switchFilter;
    gain.gain.value=0;source.connect(filter).connect(gain).connect(context.destination);
    const v={id:++nextVoice,context,source,filter,gain,closing:false,cleaned:false,lastPower:-1,lastVolume:-1};
    v.clean=()=>{if(v.cleaned)return;v.cleaned=true;note("disconnected",{voice:v.id,source:kind,context:context.state});source.onended=null;source.disconnect();filter.disconnect();gain.disconnect();if(motor===v)motor=null;if(click===v)click=null;};
    source.onended=()=>{note("ended",{voice:v.id,source:kind,context:context.state});v.clean();if(mounted)sync();};
    source.start();note("created",{voice:v.id,source:kind,context:context.state});return v;
  }
  function stop(v,immediate=false,reason="replace"){
    if(!v||v.cleaned||v.closing&&!immediate)return;
    note(reason,{voice:v.id,context:v.context.state});v.closing=true;
    if(immediate){v.source.stop();v.clean();return;}
    target(v.gain.gain,0,v.context,.006);v.source.stop(v.context.currentTime+FAN_SOUND.release);
  }
  function sync(){
    if(!mounted)return;
    const s=state(),allowed=audible(s),nextPolicy=`${allowed}:${s.visible}:${s.switchEligible}:${s.on}`;
    if(nextPolicy!==policy){press++;policy=nextPolicy;}
    const context=services.context(),running=context?.state==='running';
    if(!allowed||!s.switchEligible||!running)stop(click,!running,!allowed?'muted-or-zero-volume':!s.switchEligible?'switch-ineligible':'context-not-running');
    const power=s.reduced?(s.on?1:0):actualPower;
    const reason=!allowed?'muted-or-zero-volume':!s.visible?'view-policy':!running?'context-not-running':power<=0?'zero-power':'eligible';
    if(trace?.enabled)trace.sample('fan-audio-state',{owner,voice:motor?.id??0,context:context?.state||'uncreated',muted:s.preferences.muted,volume:s.preferences.volume,on:s.on,visible:s.visible,switchEligible:s.switchEligible,reduced:s.reduced,power,reason});
    if(reason!=='eligible'){stop(motor,!running,reason);return;}
    // An off fan may coast an existing voice; never start a delayed off voice.
    if(!motor&&s.on)motor=voice(context,'motor');
    if(!motor||motor.closing)return;
    if(Math.abs(power-motor.lastPower)<.001&&s.preferences.volume===motor.lastVolume)return;
    motor.lastPower=power;motor.lastVolume=s.preferences.volume;
    target(motor.gain.gain,fanLevel(power,s.preferences.volume),context);
    target(motor.filter.frequency,FAN_SOUND.filterBase+FAN_SOUND.filterRange*power,context);
    target(motor.source.playbackRate,FAN_SOUND.rateBase+FAN_SOUND.rateRange*power,context);
  }
  return {
    mount(){if(mounted)return;mounted=true;generation++;note("mounted");unsubscribe=services.subscribe(sync);sync();},
    power(value){if(actualPower===value)return;actualPower=Math.max(0,Math.min(1,value));sync();},
    sync,
    diagnosticState(){const s=state();return {owner,voice:motor?.id??0,context:services.context()?.state||'uncreated',power:actualPower,on:s.on,visible:s.visible,muted:s.preferences.muted,volume:s.preferences.volume};},
    pageHidden(value){pageHidden=value;sync();},
    async toggle(next){
      sync();const token=++press,run=generation,s=state();
      if(!mounted||!s.switchEligible||!audible(s)){note(!mounted?"not-mounted":!s.switchEligible?"switch-ineligible":"muted-or-zero-volume");return;}
      // Off cancels a pending unlock; do not replay a delayed mechanical cue.
      if(!next&&services.context()?.state!=='running'){note('off-unlock-cancelled');return;}
      try{
        if(!(await services.unlock())){note("unlock-rejected");return;}
        const latest=state(),context=services.context();
        if(!mounted||run!==generation||token!==press||latest.on!==next||!latest.switchEligible||!audible(latest)||context?.state!=='running'){note(!mounted||run!==generation?'async-owner-disposed':token!==press?'async-superseded':latest.on!==next?'async-power-changed':!latest.switchEligible?'async-switch-ineligible':!audible(latest)?'async-muted-or-zero-volume':'async-context-not-running',{context:context?.state||'uncreated'});return;}
        stop(click,true);click=voice(context,next?'on':'off');
        // Buffer has its own attack/release; no extra fade to blur the mechanism.
        click.gain.gain.value=latest.preferences.volume*FAN_SOUND.switchLevel;
      }catch{note("audio-error");/* No exception text or account/content data. */}
    },
    dispose(){if(!mounted)return;mounted=false;generation++;press++;unsubscribe?.();unsubscribe=null;note("disposed");stop(motor,true,"dispose");stop(click,true,"dispose");},
  };
}
