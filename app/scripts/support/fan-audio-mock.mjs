// Bounded graph/lifecycle mock; sample rendering is a CPU reconstruction, not Web Audio.
export class Param {
 constructor(context,value){this.context=context;this.base=value;this.events=[];this.history=[];this.maxQueue=0;}
 at(time,events=this.events){let value=this.base,last=0,target=null,tau=0;
  for(const e of events){if(e.time>time)break;if(target!==null)value=target+(value-target)*Math.exp(-(e.time-last)/tau);
   if(e.kind==='value'){value=e.value;target=null;}else{target=e.value;tau=e.tau;}last=e.time;}
  return target===null?value:target+(value-target)*Math.exp(-(time-last)/tau);
 }
 get value(){return this.at(this.context.currentTime);}
 set value(value){this.base=value;}
 cancelScheduledValues(time){this.events=this.events.filter(e=>e.time<time);}
 setValueAtTime(value,time){this.add({kind:'value',value,time});}
 setTargetAtTime(value,time,tau){this.add({kind:'target',value,time,tau});}
 add(e){this.events.push(e);this.history.push(e);this.maxQueue=Math.max(this.maxQueue,this.events.length);return this;}
}
export class AudioMock {
 constructor(){this.state='suspended';this.sampleRate=48000;this.currentTime=0;this.nodes=[];this.sources=[];this.buffers=[];this.destination={};this.resumes=0;this.closes=0;this.suspends=0;this.pending=null;this.peakLoops=0;}
 resume(){this.resumes++;if(this.pending)return this.pending;this.state='running';return Promise.resolve();}
 close(){this.closes++;}suspend(){this.suspends++;}
 createBuffer(channels,length,rate){const data=new Float32Array(length),b={duration:length/rate,length,sampleRate:rate,getChannelData:()=>data};this.buffers.push(b);return b;}
 node(kind){const n={kind,connected:false,connect:other=>{n.connected=true;n.next=other;return other},disconnect:()=>{n.connected=false}};this.nodes.push(n);return n;}
 createGain(){const n=this.node('gain');n.gain=new Param(this,1);return n;}
 createBiquadFilter(){const n=this.node('filter');n.frequency=new Param(this,350);n.Q=new Param(this,1);return n;}
 createBufferSource(){const n=this.node('source');n.playbackRate=new Param(this,1);n.start=time=>{n.started=time??this.currentTime;this.peakLoops=Math.max(this.peakLoops,this.sources.filter(s=>s.loop&&s.started!==undefined&&!s.ended).length);};n.stop=time=>{n.stopped=time??this.currentTime;};this.sources.push(n);return n;}
 advance(time){this.currentTime=time;for(const s of [...this.sources])if(s.started!==undefined&&!s.ended&&(s.stopped<=time||!s.loop&&s.started+s.buffer.duration<=time)){s.ended=true;s.onended?.();}}
}
export const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
