import {getSoundContext,unlockSound} from './sound';
import {paperSamples,PAPER_SOUND} from './paperSoundSynthesis';
export function createTossAudio(read){
 let id=null,seen=false,voice=null,buffer=null,bufferContext=null;
 const stop=()=>{if(!voice)return;voice.source.stop();voice.clean();voice=null;};
 const allowed=()=>{const s=read();return s.enabled&&!s.hidden&&!s.preferences.muted&&s.preferences.volume>0;};
 return {begin(next){stop();id=next;seen=false;if(allowed())void unlockSound();},
 contact(next,bin,physical=true){if(id!==next||seen)return;seen=true;const c=getSoundContext();if(!physical||!allowed()||c?.state!=='running')return;
  if(bufferContext!==c){const samples=paperSamples(c.sampleRate,'contact');buffer=c.createBuffer(1,samples.length,c.sampleRate);buffer.getChannelData(0).set(samples);bufferContext=c;}
  const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=PAPER_SOUND.contactFilter;const level=PAPER_SOUND.contactLevel*(bin?.5:.25);gain.gain.value=read().preferences.volume*level;source.connect(filter).connect(gain).connect(c.destination);
  const v={source,gain,level,clean(){source.onended=null;source.disconnect();filter.disconnect();gain.disconnect();if(voice===v)voice=null;}};voice=v;source.onended=v.clean;source.start();
 },sync(){if(!allowed()){stop();return;}if(voice)voice.gain.gain.value=read().preferences.volume*voice.level;},cancel(){id=null;seen=true;stop();},dispose(){this.cancel();buffer=null;bufferContext=null;}};
}
