import {getSoundContext} from './sound';
import {PRINT_TIMING,DISPOSAL_DURATION} from './sceneInteraction';
import {PAPER_SOUND,paperSamples} from './paperSoundSynthesis';
const banks=new WeakMap();
function bufferFor(context,kind){
 let bank=banks.get(context);if(!bank){bank=new Map();banks.set(context,bank);}
 if(!bank.has(kind)){const samples=paperSamples(context.sampleRate,kind),b=context.createBuffer(1,samples.length,context.sampleRate);b.getChannelData(0).set(samples);bank.set(kind,b);}return bank.get(kind);
}
export function createPaperAudio(read,getContext=getSoundContext,now=()=>performance.now()){
 let mounted=false,job=null,generation=0,finished=false,pageHidden=false,policy='',wasHidden=false,seen=new Set();const voices=new Set();
 const eligible=s=>!pageHidden&&!s.hidden&&!s.direct&&(['printer','paper'].includes(s.view)||finished&&s.view==='desk');
 const audible=s=>!s.preferences.muted&&s.preferences.volume>0;
 function stop(v,immediate=false){if(v.cleaned||v.closing&&!immediate)return;v.closing=true;
  if(immediate){v.source.stop();v.clean();return;}
  const p=v.gain.gain,c=v.context,current=p.value;p.cancelScheduledValues(0);p.setValueAtTime(current,c.currentTime);p.setTargetAtTime(0,c.currentTime,.005);v.source.stop(c.currentTime+PAPER_SOUND.release);
 }
 function silence(immediate=false){for(const v of voices)stop(v,immediate);}
 function sync(){if(!mounted)return;const s=read(),hidden=pageHidden||s.hidden;
  if(job&&!finished&&(hidden||wasHidden)){
   seen.add('crumple');
   if(now()-job.startedAt>=DISPOSAL_DURATION)seen.add('contact');
  }
  wasHidden=hidden;
  const allowed=eligible(s)&&audible(s),next=`${allowed}:${s.hidden}:${s.direct}:${s.view}`;
  if(next!==policy){generation++;policy=next;}
  const running=getContext()?.state==='running';
  if(!allowed||!running){silence(!running);return;}
  for(const v of voices)if(!v.closing&&v.volume!==s.preferences.volume){v.volume=s.preferences.volume;const p=v.gain.gain,c=v.context,current=p.value;p.cancelScheduledValues(0);p.setValueAtTime(current,c.currentTime);p.setTargetAtTime(v.volume*v.level,c.currentTime,.008);}
 }
 function valid(run,owner,kind){const s=read();return mounted&&run===generation&&owner===job&&!finished&&s.job===job&&eligible(s)&&audible(s)&&
  (kind==='crumple'?s.motion.phase==='crumple'&&now()-job.startedAt<PRINT_TIMING.crumple:s.motion.terminal&&job.contactPresented);}
 function play(kind,owner,run){if(!valid(run,owner,kind))return;const c=getContext();if(c?.state!=='running')return;
  const offset=kind==='crumple'?Math.max(0,(now()-job.startedAt)/1000):0;
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),s=read();
  const level=kind==='crumple'?PAPER_SOUND.crumpleLevel:PAPER_SOUND.contactLevel;
  source.buffer=bufferFor(c,kind);filter.type='lowpass';filter.frequency.value=kind==='crumple'?PAPER_SOUND.crumpleFilter:PAPER_SOUND.contactFilter;filter.Q.value=.707;
  gain.gain.value=s.preferences.volume*level;source.connect(filter).connect(gain).connect(c.destination);
  const v={source,filter,gain,context:c,kind,level,volume:s.preferences.volume,closing:false,cleaned:false};
  v.clean=()=>{if(v.cleaned)return;v.cleaned=true;source.onended=null;source.disconnect();filter.disconnect();gain.disconnect();voices.delete(v);};source.onended=v.clean;voices.add(v);
  // A delayed resume gets only the unexpired part, never a new 200 ms rustle.
  if(offset){gain.gain.value=0;gain.gain.setTargetAtTime(s.preferences.volume*level,c.currentTime,.002);}
  source.start(c.currentTime,offset);
 }
 return {
  mount(){mounted=true;generation++;sync();},
  begin(next){generation++;silence(true);job=next;finished=false;seen.clear();sync();},
  present(motion){if(!mounted||motion.job!==job||finished)return;sync();
   if(motion.phase!=='crumple')for(const v of voices)if(v.kind==='crumple')stop(v);
   const kind=motion.phase==='crumple'?'crumple':motion.terminal&&job.contactPresented?'contact':null;
   if(!kind||seen.has(kind))return;seen.add(kind);const owner=job,run=generation;
   if(!valid(run,owner,kind))return;
   try{if(getContext()?.state==='running')play(kind,owner,run);
    else Promise.resolve(owner.audioReady).then(ok=>{if(ok)play(kind,owner,run);}).catch(()=>{});
   }catch{/* Audio failures never affect paper motion or navigation. */}
  },
  finish(owner){if(owner!==job)return;finished=true;generation++;},
  sync,
  pageHidden(value){pageHidden=value;generation++;sync();},
  cancel(){generation++;job=null;finished=false;seen.clear();silence();},
  dispose(){mounted=false;generation++;job=null;silence(true);},
 };
}
