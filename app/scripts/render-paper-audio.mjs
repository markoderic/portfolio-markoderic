// Captured actual paper owner + Rig graph, CPU reconstruction; not native audio.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';
import {PaperAudioMock} from './support/paper-audio-mock.mjs';
import {paperRig} from './support/paper-frame-fixture.mjs';
import {printTimeline,presentPrintMotion,PRINT_TIMING} from '../src/prototype/sceneInteraction.js';
const dir=new URL('../../docs/redesign/session-26-paper-timing-audio/',import.meta.url),out=new URL('../.vite/paper-preview-source.mjs',import.meta.url);
await build({entryPoints:[fileURLToPath(new URL('../src/prototype/paperSound.js',import.meta.url))],bundle:true,format:'esm',platform:'node',outfile:fileURLToPath(out)});
const {createPaperAudio}=await import(out.href),rate=48000,measurements=[];
// Streaming AudioParam evaluator: recorded runtime value/target events, no look-ahead.
function parameter(p){let i=0,value=p.base,target=null,tau=0,last=0;return time=>{while(i<p.history.length&&p.history[i].time<=time){const e=p.history[i++];if(target!==null)value=target+(value-target)*Math.exp(-(e.time-last)/tau);if(e.kind==='value'){value=e.value;target=null;}else{target=e.value;tau=e.tau;}last=e.time;}return target===null?value:target+(value-target)*Math.exp(-(time-last)/tau);};}
function render(context,duration){const output=new Float64Array(Math.ceil(duration*rate));
 for(const source of context.sources){const filter=source.next,gain=filter.next,level=parameter(gain.gain),frequency=parameter(filter.frequency),speed=parameter(source.playbackRate);let phase=(source.offset||0)*source.buffer.sampleRate,x1=0,x2=0,y1=0,y2=0;
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

function sequence(mode){let now=0;const context=new PaperAudioMock();context.state='running';const job={replace:true,discardOnly:true,startedAt:0,audioReady:Promise.resolve(true)};
 const state={job,motion:{phase:'idle'},view:'printer',direct:false,hidden:false,preferences:{muted:false,volume:.4}};
 const owner=createPaperAudio(()=>state,()=>context,()=>now);owner.mount();owner.begin(job);
 const motion={current:state.motion},rig=paperRig({paperAudio:owner,printMotion:motion});
 for(let frame=0;frame<84;frame++){now=frame*1000/60;context.advance(now/1000);
  const raw=printTimeline(now,true,false,true);motion.current=state.motion=presentPrintMotion(job,raw,true);
  if(mode==='contact'&&now<1000)continue;if(mode==='crumple'&&now>=200)continue;
  if(state.motion.phase==='complete'){owner.finish(job);state.job=null;state.view='desk';owner.sync();}else rig.step();
 }
 const data=render(context,1.4);owner.dispose();return mode==='contact'?data.slice(rate*.9):mode==='crumple'?data.slice(0,rate*.4):data;
}
write('paper-crumple.wav',sequence('crumple'),'Actual 200 ms crumple source/graph; .4 s file including silence.');
write('paper-contact.wav',sequence('contact'),'Actual fitted terminal Rig acknowledgement at 1 s; isolated here at .10 s.');
write('paper-disposal-sequence.wav',sequence('complete'),'Actual normal 60 Hz timeline and Rig: crumple at 0, toss at .2 s, fitted contact at 1 s; no printer replacement feed.');
const before=await import(new URL('before-sceneInteraction.js',dir).href),samples=[];
for(const [label,timeline,times] of [['before',before.printTimeline,[0,50,100,199,200,312.5,425,537.5,649,650]],['after',printTimeline,[0,50,100,199,200,400,600,800,999,1000]]]){
 const motion={current:{phase:'idle'}},rig=paperRig({printMotion:motion});const rows=[];
 for(const ms of times){let m=timeline(ms,true,false,true);if(m.phase==='complete')m={phase:'toss',progress:1};motion.current=m;const mesh=rig.step();rows.push({ms,phase:m.phase,progress:m.progress,position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),crumpled:mesh.userData.crumpled});}
 samples.push({label,method:label==='before'?'Previous timeline applied to actual unchanged normalized Rig geometry; endpoint explicitly sampled for comparison, old parent did not guarantee presenting it.':'Current timing applied to actual Rig mesh',rows});
}
for(const index of [0,1,2,3,4,5,6,7,9]){
 const old=samples[0].rows[index],current=samples[1].rows[index];
 assert.deepEqual(current.position,old.position);assert.deepEqual(current.quaternion,old.quaternion);
}
fs.writeFileSync(new URL('timing-poses.json',dir),JSON.stringify({kind:'actual Three/Rig sampled source evidence, no native frames or pacing acceptance',before:{crumple:200,toss:450,feed:2000},after:PRINT_TIMING,samples},null,2)+'\n');
fs.writeFileSync(new URL('audio-preview-metrics.json',dir),JSON.stringify({kind:'CPU reconstruction of actual paper owner buffers/graph, Rig event ordering, linear sample interpolation and RBJ lowpass; not native recording or OfflineAudioContext',volume:.4,auditioned:false,measurements},null,2)+'\n');
console.log(JSON.stringify(measurements.map(({file,peakDbFS,rmsDbFS,clippedSamples})=>({file,peakDbFS,rmsDbFS,clippedSamples})),null,2));
