// PCM reconstruction of captured runtime drawer buffers and GainNode automation.
// Not a browser recording or OfflineAudioContext rendering; not auditioned.
import fs from 'node:fs';import {build} from 'esbuild';import {fileURLToPath} from 'node:url';
import {AudioMock} from './support/fan-audio-mock.mjs';
import {createDrawerMotion,advanceDrawer} from '../src/prototype/drawers.js';
import {DRAWER_SOUND} from '../src/prototype/drawerSoundSynthesis.js';
const dir=new URL('../../docs/redesign/session-38-drawer-audio/',import.meta.url),out=new URL('../.vite/drawer-preview.mjs',import.meta.url),rate=48000;
await build({entryPoints:[fileURLToPath(new URL('../src/prototype/drawerSound.js',import.meta.url))],bundle:true,format:'esm',platform:'node',outfile:fileURLToPath(out)});
const {createDrawerAudio}=await import(out.href),measurements=[];
function param(p){let i=0,value=p.base,target=null,tau=0,last=0;return time=>{while(i<p.history.length&&p.history[i].time<=time){const e=p.history[i++];if(target!==null)value=target+(value-target)*Math.exp(-(e.time-last)/tau);if(e.kind==='value'){value=e.value;target=null}else{target=e.value;tau=e.tau}last=e.time}return target===null?value:target+(value-target)*Math.exp(-(time-last)/tau)}}
for(const kind of ['opening','closing','reversal','three-drawers']){
 const c=new AudioMock();c.state='running';let now=0;const owner=createDrawerAudio(()=>({preferences:{muted:false,volume:.4}}),()=>c,()=>now*1000);owner.mount();
 const count=kind==='three-drawers'?3:1,motions=Array.from({length:count},()=>createDrawerMotion(kind==='closing')),targets=motions.map(()=>kind!=='closing'),timeline=[];
 targets.forEach((target,id)=>owner.accept(id,target,Promise.resolve(true)));
 for(let frame=0;frame<60;frame++){
  now=(frame+1)/60;c.advance(now);
  if(kind==='reversal'&&frame===4){targets[0]=false;owner.accept(0,false,Promise.resolve(true))}
  motions.forEach((m,id)=>{const prior=m.value;advanceDrawer(m,targets[id],false,1/60);owner.present(id,m,prior,1/60,false)});
  timeline.push({time:now,positions:motions.map(m=>m.value),moving:motions.map(m=>m.moving)});
 }
 const data=new Float64Array(rate);
 for(const source of c.sources){const gain=param(source.next.gain),samples=source.buffer.getChannelData(0),start=source.started,end=source.stopped??(source.loop?1:start+source.buffer.duration);
  for(let i=Math.ceil(start*rate);i<Math.min(data.length,Math.ceil(end*rate));i++){const t=i/rate,phase=(t-start)*rate,index=Math.floor(phase),fraction=phase-index;if(!source.loop&&index>=samples.length)break;const a=samples[index%samples.length],b=source.loop?samples[(index+1)%samples.length]:(samples[index+1]??0);data[i]+=(a+(b-a)*fraction)*gain(t)}
 }
 const wav=Buffer.alloc(44+data.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length*2,40);
 let peak=0,squares=0,clipped=0;data.forEach((v,i)=>{peak=Math.max(peak,Math.abs(v));squares+=v*v;if(Math.abs(v)>1)clipped++;wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2)});
 const filename='drawer-'+kind+'.wav';fs.writeFileSync(new URL(filename,dir),wav);
 measurements.push({filename,peak,peakDbFS:20*Math.log10(peak),rmsDbFS:20*Math.log10(Math.sqrt(squares/data.length)),clippedSamples:clipped,voices:c.sources.map(s=>({kind:s.loop?'slide':'endpoint',start:s.started,stop:s.stopped??s.started+s.buffer.duration})),timeline});owner.dispose();
}
fs.writeFileSync(new URL('audio-previews.json',dir),JSON.stringify({method:'CPU reconstruction of actual runtime buffers and recorded gain targets; same 60 Hz drawer integration; not native output',auditioned:false,sampleRate:rate,format:'mono PCM16',secondsPerFile:1,volume:.4,parameters:DRAWER_SOUND,measurements},null,2)+'\n');
console.log(measurements.map(({filename,peakDbFS,rmsDbFS,clippedSamples,voices})=>({filename,peakDbFS,rmsDbFS,clippedSamples,voices})));
