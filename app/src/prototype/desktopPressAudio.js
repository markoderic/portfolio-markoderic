import {getSoundContext,unlockSound} from './sound';
const banks=new WeakMap();
export const DESKTOP_PRESS_SOUND=Object.freeze({press:{seconds:.024,gain:.17,hz:1900,decay:310},release:{seconds:.030,gain:.13,hz:1450,decay:250}});
export function desktopPressSamples(rate,kind){
  const spec=DESKTOP_PRESS_SOUND[kind],data=new Float32Array(Math.ceil(rate*spec.seconds));let seed=kind==='press'?45123:45124,noise=0;
  const filter=1-Math.exp(-2*Math.PI*4200/rate);
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise+=filter*(seed/2147483648-1-noise);const t=i/rate;
    data[i]=(noise*.65+Math.sin(2*Math.PI*spec.hz*t)*.28)*Math.exp(-t*spec.decay)*Math.min(1,t/.0005,(spec.seconds-t)/.002);
  }return data;
}
function bufferFor(c,kind){let bank=banks.get(c);if(!bank){bank={};banks.set(c,bank)}if(!bank[kind]){const data=desktopPressSamples(c.sampleRate,kind),b=c.createBuffer(1,data.length,c.sampleRate);b.getChannelData(0).set(data);bank[kind]=b}return bank[kind]}
// The DOM surface owns a pair; it never captures/prevents/retargets input. This
// models a trackpad-like mechanism, not hardware detection from pointerType.
export function createDesktopPressAudio(read,unlock=unlockSound,context=getSoundContext){
  let mounted=false,gesture=null,epoch=0;const voices={press:null,release:null};
  const eligible=()=>{const s=read();return mounted&&s.enabled&&!s.blocked&&!s.hidden&&!s.preferences.muted&&s.preferences.volume>0};
  function stop(kind){const v=voices[kind];if(!v)return;voices[kind]=null;v.source.onended=null;try{v.source.stop()}catch{}v.source.disconnect();v.gain.disconnect()}
  function cancel(pointerId){if(pointerId!==undefined&&gesture?.id!==pointerId)return;epoch++;gesture=null;stop('press');stop('release')}
  function play(kind){const c=context();if(!eligible()||c?.state!=='running')return false;stop(kind);const source=c.createBufferSource(),gain=c.createGain(),v={source,gain};voices[kind]=v;
    try{source.buffer=bufferFor(c,kind);gain.gain.value=DESKTOP_PRESS_SOUND[kind].gain*read().preferences.volume;source.connect(gain).connect(c.destination);source.onended=()=>{source.disconnect();gain.disconnect();if(voices[kind]===v)voices[kind]=null};source.start(c.currentTime);return true}
    catch{stop(kind);return false}
  }
  const safe=fn=>(...args)=>{try{return fn(...args)}catch{cancel()}};
  return {
    mount(){mounted=true},cancel:safe(cancel),
    down:safe(e=>{
      if(gesture||!eligible()||e.button!==0||e.isPrimary===false||e.pointerType==='touch'||!Number.isFinite(e.pointerId)||
        e.target?.closest?.('.cat-mario,.phone-host,[data-desktop-sound="off"],[inert],:disabled,[aria-disabled="true"]'))return;
      cancel();const g={id:e.pointerId,token:epoch,played:false};gesture=g;
      // Unlock starts in the original gesture. If still pending at pointer-up,
      // consume the action silently rather than replaying a late pair.
      const ready=unlock();if(context()?.state==='running')g.played=play('press');
      Promise.resolve(ready).then(ok=>{if(ok&&gesture===g&&g.token===epoch&&!g.played&&eligible())g.played=play('press')}).catch(()=>{});
    }),
    up:safe(e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;gesture=null;epoch++;if(e.button===0&&e.isPrimary!==false&&g.played&&eligible())play('release')}),
    sync:safe(()=>{if(!eligible()){cancel();return}for(const kind of ['press','release'])if(voices[kind])voices[kind].gain.gain.value=DESKTOP_PRESS_SOUND[kind].gain*read().preferences.volume}),
    dispose:safe(()=>{mounted=false;cancel()}),
  };
}
