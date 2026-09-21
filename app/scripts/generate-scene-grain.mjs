// Original deterministic static grain: balanced black/white pixels, fixed alpha48.
// Runtime uses a tiny repeat tile; no clock, decoder loop or shader noise pass.
import fs from 'node:fs';import {deflateSync} from 'node:zlib';
const size=128,values=Array.from({length:size*size},(_,i)=>i%2?255:0);let state=0x63a47d21;
const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};
for(let i=values.length-1;i>0;i--){const j=next()%(i+1);[values[i],values[j]]=[values[j],values[i]]}
const raw=Buffer.alloc(size*(size*4+1));for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*(size*4+1)+1+x*4,c=values[y*size+x];raw[i]=raw[i+1]=raw[i+2]=c;raw[i+3]=48;}
const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
const chunk=(type,data)=>{const t=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),data.length+8);return b};
const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(new URL('../src/prototype/assets/scene-grain.png',import.meta.url),png);console.log({size,bytes:png.length,alpha:48,white:values.filter(x=>x===255).length,black:values.filter(x=>x===0).length});
