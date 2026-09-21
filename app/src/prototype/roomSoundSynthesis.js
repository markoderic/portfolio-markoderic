// Original non-tonal room air. Same deterministic samples feed runtime and WAVs.
export const ROOM_SOUND=Object.freeze({seconds:7,seam:.1,level:.055,attack:.07,release:.055});
export function roomSamples(rate){
 const count=Math.ceil(rate*ROOM_SOUND.seconds),seam=Math.ceil(rate*ROOM_SOUND.seam),air=new Float32Array(count+seam),out=new Float32Array(count);
 let seed=0x51ab329f,low=0,slow=0;const fastA=1-Math.exp(-2*Math.PI*650/rate),slowA=1-Math.exp(-2*Math.PI*110/rate);
 for(let i=0;i<air.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low+=fastA*(noise-low);slow+=slowA*(noise-slow);air[i]=(low-slow)*.7;}
 for(let i=0;i<count;i++){const t=Math.min(1,i/seam),blend=t*t*(3-2*t);out[i]=i<seam?air[count+i]*(1-blend)+air[i]*blend:air[i];}
 return out;
}
