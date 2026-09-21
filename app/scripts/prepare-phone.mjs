// Lossless graph pruning for the existing licensed phone; leaves production asset untouched.
import fs from 'node:fs';
const input=new URL('../public/assets/iphone-15-pro.glb',import.meta.url);
const output=new URL('../src/prototype/assets/phone-workspace.glb',import.meta.url);
const b=fs.readFileSync(input),jsonLength=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+jsonLength)),binStart=28+jsonLength,bin=b.subarray(binStart);
const screen=j.materials.findIndex(m=>m.name==='pIJKfZsazmcpEiU');
if(screen<0)throw new Error('Expected display material absent; no output written.');
j.materials[screen]={name:j.materials[screen].name,pbrMetallicRoughness:{baseColorFactor:[0,0,0,1],metallicFactor:0,roughnessFactor:1}};
const usedTextures=new Set();
const visitTextures=(o,fn)=>{if(!o||typeof o!=='object')return;for(const [key,v] of Object.entries(o)){if(key.endsWith('Texture')&&v&&Number.isInteger(v.index))fn(v);else visitTextures(v,fn)}};
visitTextures(j.materials,v=>usedTextures.add(v.index));
const textureMap=new Map([...usedTextures].sort((a,b)=>a-b).map((n,i)=>[n,i]));
j.textures=[...textureMap.keys()].map(n=>j.textures[n]);visitTextures(j.materials,v=>v.index=textureMap.get(v.index));
const imageIndices=[...new Set(j.textures.map(t=>t.source).filter(n=>n!==undefined))].sort((a,b)=>a-b);
if(j.textures.some(t=>t.extensions))throw new Error('Unexpected texture extension; review required.');
const imageMap=new Map(imageIndices.map((n,i)=>[n,i]));j.images=imageIndices.map(n=>j.images[n]);j.textures.forEach(t=>{if(t.source!==undefined)t.source=imageMap.get(t.source)});
const usedViews=new Set();
function walk(o,fn){if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){if(k==='bufferView'&&Number.isInteger(v))fn(o,k,v);else walk(v,fn)}}
walk(j,(o,k,v)=>usedViews.add(v));
const viewMap=new Map([...usedViews].sort((a,b)=>a-b).map((n,i)=>[n,i]));
let offset=0;const chunks=[];
const views=[...viewMap.keys()].map(n=>{const view=j.bufferViews[n];const data=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);const pad=(4-data.length%4)%4;const result={...view,buffer:0,byteOffset:offset};chunks.push(data,Buffer.alloc(pad));offset+=data.length+pad;return result});
walk(j,(o,k,v)=>o[k]=viewMap.get(v));j.bufferViews=views;j.buffers=[{byteLength:offset}];
const json=Buffer.from(JSON.stringify(j));const jsonPad=Buffer.alloc((4-json.length%4)%4,0x20),jsonChunk=Buffer.concat([json,jsonPad]),binary=Buffer.concat(chunks);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+binary.length,8);header.writeUInt32LE(jsonChunk.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(output,Buffer.concat([header,jsonChunk,bh,binary]));
console.log(JSON.stringify({originalBytes:b.length,optimizedBytes:fs.statSync(output).size,removedBytes:b.length-fs.statSync(output).size,screenMaterial:screen,keptImages:j.images.length,geometry:'Accessor bytes preserved; no decimation or lossy recompression.'},null,2));
