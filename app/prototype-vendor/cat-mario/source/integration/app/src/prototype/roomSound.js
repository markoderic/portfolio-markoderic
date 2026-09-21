import {getSoundContext,subscribeSoundUnlock} from './sound.js';
import {ROOM_SOUND,roomSamples} from './roomSoundSynthesis.js';
const buffers=new WeakMap();
function bufferFor(context){let buffer=buffers.get(context);if(!buffer){const data=roomSamples(context.sampleRate);buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.getChannelData(0).set(data);buffers.set(context,buffer);}return buffer;}
// One mounted room bed in the existing context. This owner never unlocks,
// resumes/suspends/closes a context, changes another voice, or owns a timer.
export function createRoomAudio(read,services={context:getSoundContext,subscribe:subscribeSoundUnlock}){
 let mounted=false,generation=0,voice=null,context=null,listener=null,unsubscribe;
 const envelope=(v,time)=>{const e=v.envelope,t=Math.max(0,Math.min(1,(time-e.start)/e.duration));return e.from+(e.to-e.from)*t;};
 function ramp(v,to,duration){const now=v.context.currentTime,from=envelope(v,now),param=v.gain.gain;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else param.cancelScheduledValues(now);param.setValueAtTime(from,now);param.linearRampToValueAtTime(to,now+duration);v.envelope={from,to,start:now,duration};}
 function clean(v,recheck=false){if(!v||v.cleaned)return;v.cleaned=true;if(v.source)v.source.onended=null;for(const node of [v.source,v.gain])try{node?.disconnect();}catch{}if(voice===v)voice=null;if(recheck&&mounted&&v.generation===generation)sync();}
 function stop(v,immediate=false){if(!v||v.cleaned)return;if(immediate){v.closing=true;try{if(v.started)v.source.stop();}catch{}clean(v);return;}if(v.closing)return;v.closing=true;try{ramp(v,0,ROOM_SOUND.release);v.source.stop(v.context.currentTime+ROOM_SOUND.release);}catch{stop(v,true);}}
 function bind(next){if(context===next)return;context?.removeEventListener?.('statechange',listener);stop(voice,true);context=next;listener=null;if(context){const bound=context,run=generation;listener=()=>{if(mounted&&generation===run&&context===bound)sync();};context.addEventListener?.('statechange',listener);}}
 function start(level){const v={context,generation,source:null,gain:null,started:false,closing:false,cleaned:false,envelope:{from:0,to:0,start:context.currentTime,duration:ROOM_SOUND.attack}};voice=v;
  try{const buffer=bufferFor(context);v.source=context.createBufferSource();v.gain=context.createGain();v.source.buffer=buffer;v.source.loop=true;v.gain.gain.value=0;v.source.connect(v.gain).connect(context.destination);v.source.onended=()=>clean(v,true);v.source.start();v.started=true;ramp(v,level,ROOM_SOUND.attack);}catch{stop(v,true);}
 }
 function sync(){if(!mounted)return;bind(services.context());const s=read(),volume=s.preferences?.volume,allowed=s.entered&&!s.hidden&&!s.preferences?.muted&&Number.isFinite(volume)&&volume>0,running=context?.state==='running';if(!running||!allowed){stop(voice,!running);return;}const level=ROOM_SOUND.level*Math.min(1,volume);if(!voice)start(level);else if(!voice.closing&&voice.envelope.to!==level)ramp(voice,level,ROOM_SOUND.attack);}
 return {sync,mount(){if(mounted)return;mounted=true;const run=++generation;unsubscribe=services.subscribe(()=>{if(mounted&&run===generation)sync();});sync();},dispose(){if(!mounted)return;mounted=false;generation++;unsubscribe?.();unsubscribe=null;context?.removeEventListener?.('statechange',listener);listener=null;stop(voice,true);context=null;}};
}
