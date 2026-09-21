// Owned output adapter for the pinned TSS/chime source; GPL-2.0 integration code.
export const cueIds = ['stop','field','dungeon','star4','castle','puyo','jump','brockbreak','brockcoin','humi','koura','dokan','brockkinoko','powerup','kirra','goal','death','Pswitch','jumpBlock','hintBlock','4-clear','allclear','tekifire'];
export const missingCues = ['dungeon','star4','castle','puyo','goal','4-clear','allclear'];
export function createClassicAudio(createChime, scores) {
  let running = false, disposed = false, epoch = 0, context, gain;
  let preferences = { muted:true, volume:0 };
  const loopers = [];
  function AudioLooper(size) { this.bufferSize=size; this.channel=null; this.node=null; loopers.push(this); }
  AudioLooper.prototype.setChannel = function(channel) { this.channel=channel; channel.setBufferLength(this.bufferSize*2); channel.setSampleRate(44100); };
  const chime = createChime(AudioLooper);
  const sounds = cueIds.map(id => scores[id] ? new chime.Sound(scores[id]) : null);
  if (sounds.some(s => s && !s.success)) throw Error('A bundled game score could not be initialized.');
  function disconnect() {
    ++epoch;
    for(const l of loopers) if(l.node) { l.node.onaudioprocess=null; l.node.disconnect(); l.node=null; }
    if(gain) { gain.disconnect(); gain=null; }
  }
  function output() {
    disconnect();
    if (!running || disposed || !context || context.state !== 'running' || preferences.muted || !preferences.volume || !context.createScriptProcessor) return false;
    try {
      gain=context.createGain(); gain.gain.value=Math.max(0, Math.min(1, preferences.volume))*0.22; gain.connect(context.destination);
      const ownEpoch=epoch;
      for(const l of loopers) {
        l.channel.setSampleRate(context.sampleRate);
        const node=context.createScriptProcessor(l.bufferSize,0,2);l.node=node;
        node.onaudioprocess=e=>{
          const left=e.outputBuffer.getChannelData(0),right=e.outputBuffer.getChannelData(1);left.fill(0);right.fill(0);
          if(!running || disposed || ownEpoch!==epoch || preferences.muted || !preferences.volume) return;
          try { l.channel.generate(l.bufferSize*2);const pcm=l.channel.getBuffer();for(let i=0;i<left.length;i++){left[i]=pcm[i*2]/32768;right[i]=pcm[i*2+1]/32768;} }
          catch { disconnect(); }
        };
        node.connect(gain);
      }
      return true;
    } catch { disconnect();return false; }
  }
  return {
    play(index,channel) {
      if(!running || disposed) return;
      // Missing BGM must end the old track; missing one-shots are silent.
      const sound=sounds[index];
      if(channel===0) chime.bgm(sound || sounds[0]);
      else if(sound) chime.effect(sound);
    },
    begin(prefs) { if(disposed)return;preferences={...prefs};running=true; },
    attach(ctx,prefs) { if(!running || disposed)return false;context=ctx;preferences={...prefs};return output(); },
    preferences(prefs) {
      const audible=!!gain;preferences={...prefs};
      if(preferences.muted || !preferences.volume)disconnect();
      else if(audible)gain.gain.value=Math.max(0,Math.min(1,preferences.volume))*0.22;
      else if(running)output();
    },
    pause() { running=false;disconnect(); },
    dispose() { if(disposed)return;running=false;disposed=true;disconnect();for(const l of loopers){l.channel.clearChannel();l.channel=null;}loopers.length=0;context=null; },
  };
}
