// CPU reconstruction of captured runtime graphs. Not OfflineAudioContext or a browser recording.
import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';
import {AudioMock} from './support/fan-audio-mock.mjs';
import {createFanMotion,advanceFan} from '../src/prototype/fanMotion.js';
import {FAN_SOUND,fanSamples} from '../src/prototype/fanSoundSynthesis.js';
const dir=new URL('../../docs/redesign/session-25-fan-audio/',import.meta.url),out=new URL('../.vite/fan-preview-source.mjs',import.meta.url);
await build({stdin:{contents:"export * from './src/prototype/fanSound';export * from './src/prototype/sound';",resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,platform:'node',format:'esm',outfile:fileURLToPath(out)});
const {createFanAudio,playSound}=await import(out.href),rate=48000,measurements=[];
// Streaming AudioParam evaluator: recorded runtime value/target events, no look-ahead.
function parameter(p){let i=0,value=p.base,target=null,tau=0,last=0;return time=>{while(i<p.history.length&&p.history[i].time<=time){const e=p.history[i++];if(target!==null)value=target+(value-target)*Math.exp(-(e.time-last)/tau);if(e.kind==='value'){value=e.value;target=null;}else{target=e.value;tau=e.tau;}last=e.time;}return target===null?value:target+(value-target)*Math.exp(-(time-last)/tau);};}
function render(context,duration){const output=new Float64Array(Math.ceil(duration*rate));
 for(const source of context.sources){const filter=source.next,gain=filter.next,level=parameter(gain.gain),frequency=parameter(filter.frequency),speed=parameter(source.playbackRate);let phase=0,x1=0,x2=0,y1=0,y2=0;
  const data=source.buffer.getChannelData(0),end=Math.min(output.length,Math.ceil((source.stopped??duration)*rate));
  for(let i=Math.ceil(source.started*rate);i<end;i++){const t=i/rate,index=Math.floor(phase),fraction=phase-index;if(!source.loop&&index>=data.length)break;
   const a=data[index%data.length],b=source.loop?data[(index+1)%data.length]:(data[index+1]??0),x=a+(b-a)*fraction;
   phase+=speed(t)*source.buffer.sampleRate/rate;
   const w=2*Math.PI*frequency(t)/rate,cs=Math.cos(w),alpha=Math.sin(w)/(2*filter.Q.value),a0=1+alpha;
   const b0=(1-cs)/2/a0,b1=(1-cs)/a0,a1=-2*cs/a0,a2=(1-alpha)/a0;
   const y=b0*x+b1*x1+b0*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;output[i]+=y*level(t);
  }
 }
 return output;
}
function write(name,data,description){let peak=0,squares=0,clipped=0;const wav=Buffer.alloc(44+data.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length*2,40);
 data.forEach((value,i)=>{peak=Math.max(peak,Math.abs(value));squares+=value*value;if(Math.abs(value)>1)clipped++;wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+2*i);});
 const rms=Math.sqrt(squares/data.length);fs.writeFileSync(new URL(name,dir),wav);measurements.push({file:name,description,seconds:data.length/rate,sampleRate:rate,format:'mono PCM16',peak,peakDbFS:20*Math.log10(peak),rms,rmsDbFS:20*Math.log10(rms),clippedSamples:clipped,auditioned:false});
}
async function fan(duration,toggles=[],isolated=false){const context=new AudioMock();context.state='running';const s={on:true,visible:!isolated,switchEligible:true,reduced:false,preferences:{muted:false,volume:.4}};
 const owner=createFanAudio(()=>s,{context:()=>context,unlock:async()=>true,subscribe:()=>()=>{}}),motion=createFanMotion();owner.mount();let index=0;
 for(let frame=0;frame<duration*60;frame++){const t=frame/60;context.advance(t);while(index<toggles.length&&toggles[index][0]<=t){s.on=toggles[index++][1];await owner.toggle(s.on);}if(advanceFan(motion,s.on,false,!isolated,1/60))owner.power(motion.power);}
 const result=render(context,duration);owner.dispose();return result;
}
write('fan-start-steady-stop.wav',await fan(11,[[6.5,false]]),'Initial on after gesture: actual 60 Hz advanceFan power ramp; 6.5 s off switch and deceleration. Includes more than one 4 s loop at full speed.');
write('fan-rapid-reversal.wav',await fan(6,[[1,false],[1.2,true],[1.4,false],[1.65,true],[2.1,false]]),'Actual owner, rapid off/on/off/on/off; the same loop is retargeted.');
const on=await fan(.6,[[.1,true]],true),off=await fan(.6,[[.1,false]],true);
write('fan-switch-on.wav',on,'Isolated on at 0.10 s, default volume .4.');write('fan-switch-off.wav',off,'Isolated off at 0.10 s, default volume .4.');
let existing;globalThis.window={AudioContext:class extends AudioMock{constructor(){super();existing=this;}}};
// Seed only evidence randomness. Existing runtime lamp/trackpad synthesis remains unchanged.
const random=Math.random;let seed=1247;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
await playSound('lamp',{muted:false,volume:.4});existing.advance(.7);await playSound('click',{muted:false,volume:.4});Math.random=random;
const comparison=render(existing,3);for(let i=0;i<on.length;i++){comparison[Math.round(1.4*rate)+i]+=on[i];comparison[Math.round(2.1*rate)+i]+=off[i];}
write('switch-comparison.wav',comparison,'Lamp 0.00 s; trackpad 0.70 s; fan on 1.50 s; fan off 2.20 s. Original runtime sources, unchanged default volume; no normalization.');
const loop=fanSamples(rate),differences=Array.from(loop.slice(1),(v,i)=>Math.abs(v-loop[i])).sort((a,b)=>a-b);
fs.writeFileSync(new URL('audio-preview-metrics.json',dir),JSON.stringify({method:'CPU reconstruction from actual fan audio-owner graph and recorded AudioParam value/target events: linear buffer resampling, RBJ lowpass at runtime Q, gain automation. Not native Web Audio/OfflineAudioContext/output recording; browser interpolation and output-device response can differ.',volume:.4,parameters:FAN_SOUND,loopSeam:{adjacentDelta:Math.abs(loop[0]-loop.at(-1)),interiorDeltaP99:differences[Math.floor(differences.length*.99)]},measurements},null,2)+'\n');
console.log(JSON.stringify(measurements.map(({file,peakDbFS,rmsDbFS,clippedSamples})=>({file,peakDbFS,rmsDbFS,clippedSamples})),null,2));
