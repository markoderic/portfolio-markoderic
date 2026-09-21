// Original, deterministic synthesis. Shared verbatim by runtime and local previews.
export const FAN_SOUND = Object.freeze({seconds:4, seam:.08, level:.20, release:.045, smoothing:.025,
  filterBase:400, filterRange:1100, rateBase:.65, rateRange:.35, powerExponent:1.4,
  switchSeconds:.105, switchLevel:.35, switchFilter:1650});
export function fanSamples(sampleRate, kind='motor') {
  const count=Math.ceil(sampleRate*(kind==='motor'?FAN_SOUND.seconds:FAN_SOUND.switchSeconds));
  const seam=Math.ceil(sampleRate*FAN_SOUND.seam), data=new Float32Array(count);
  let seed=kind==='motor'?19837:kind==='on'?391:811;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  if(kind==='motor'){
    const air=new Float32Array(count+seam);let low=0;
    const alpha=1-Math.exp(-2*Math.PI*1800/sampleRate);
    for(let i=0;i<air.length;i++){low+=alpha*(random()-low);air[i]=low;}
    for(let i=0;i<count;i++){
      // The tail continues into the start; crossfade back to the original air.
      const blend=Math.min(1,i/seam),noise=i<seam?air[count+i]*(1-blend)+air[i]*blend:air[i];
      const t=i/sampleRate;
      data[i]=noise*.6+Math.sin(2*Math.PI*120*t)*.10+Math.sin(2*Math.PI*240*t)*.025;
    }
  }else{
    const frequency=kind==='on'?220:180;
    for(let i=0;i<count;i++){
      const t=i/sampleRate,attack=Math.min(1,t/.001),tail=Math.min(1,(FAN_SOUND.switchSeconds-t)/.012);
      data[i]=attack*tail*(random()*Math.exp(-155*t)*.5+Math.sin(2*Math.PI*frequency*t)*Math.exp(-55*t)*.48);
    }
  }
  return data;
}
export const fanLevel=(power,volume)=>FAN_SOUND.level*volume*Math.pow(power,FAN_SOUND.powerExponent);
