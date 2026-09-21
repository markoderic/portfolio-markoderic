// Actual generated maps, installed Three shader chunks, and mounted Desk lifecycle.
// No WebGL compiler, browser or GPU evidence.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import * as T from 'three';
import {createWoodMaterial,woodPixels,woodSample} from '../src/prototype/woodMaterial.js';
import {Desk,harness} from './support/chair-scene-fixture.mjs';
const dir=new URL('../../docs/redesign/session-47-wood-camera/',import.meta.url),checks=[];
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)};
const start=performance.now(),material=createWoodMaterial(),elapsed=performance.now()-start;
const tex=material.userData.woodTextures,hash=d=>crypto.createHash('sha256').update(d).digest('hex');
check('bounded deterministic packed maps, mipmapping, no repeat, plausible color and roughness',()=>{
 for(const [i,t]of tex.entries()){
  const p=woodPixels(!!i);assert.equal(hash(p.data),hash(t.image.data));assert.equal(t.image.data.length,t.image.width*t.image.height*4);
  assert.equal(t.colorSpace,T.SRGBColorSpace);assert.equal(t.minFilter,T.LinearMipmapLinearFilter);assert.equal(t.wrapS,T.ClampToEdgeWrapping);assert.equal(t.wrapT,T.ClampToEdgeWrapping);assert.equal(t.anisotropy,4);
  for(let j=0;j<t.image.data.length;j+=4){assert.ok(t.image.data[j]>35&&t.image.data[j]<105);assert.ok(t.image.data[j+3]/255>.66&&t.image.data[j+3]/255<.85)}
  fs.writeFileSync(new URL(i?'end.rgba':'top.rgba',dir),t.image.data);
 }
 // Top/end meet at exactly the same physical field sample along both upper ends.
 for(const side of [-1,1])for(let i=0;i<=255;i++){
  const z=(i/255-.5)*6,expected=woodSample(side*5.4,.11,z),offset=((64-1)*512+(side===1?256:0)+i)*4;
  assert.deepEqual(Array.from(tex[1].image.data.slice(offset,offset+4)),expected);
 }
});
check('actual installed standard shader accepts both injections with declared uniforms and correctly ordered roughness',()=>{
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.officeWoodTop.value,tex[0]);assert.equal(shader.uniforms.officeWoodEnd.value,tex[1]);
 assert.equal((shader.vertexShader.match(/officeWoodPosition=position/g)||[]).length,1);assert.equal((shader.fragmentShader.match(/vec4 officeWoodSample=/g)||[]).length,1);
 assert.ok(shader.fragmentShader.indexOf('vec4 officeWoodSample=')<shader.fragmentShader.indexOf('roughnessFactor=officeWoodSample.a'));
 const expand=s=>s.replace(/#include <(\w+)>/g,(_,key)=>{assert.ok(T.ShaderChunk[key]!==undefined,key);return expand(T.ShaderChunk[key])});
 const vs=expand(shader.vertexShader),fragment=expand(shader.fragmentShader);assert.ok(fragment.includes('float roughnessFactor = roughness;'));
 fs.writeFileSync(new URL('wood-standard.vert.glsl',dir),vs);fs.writeFileSync(new URL('wood-standard.frag.glsl',dir),fragment);
});
check('actual Desk memoizes one material and two textures, and releases all owned resources on unmount',()=>{
 const h=harness(Desk,{});h.flushEffects();const m=h.slots[0].value;let materials=0,textures=0;m.addEventListener('dispose',()=>materials++);m.userData.woodTextures.forEach(t=>t.addEventListener('dispose',()=>textures++));
 for(let i=0;i<20;i++){h.render();h.flushEffects();assert.equal(h.slots[0].value,m)}
 for(const s of h.slots)s.cleanup?.();assert.equal(materials,1);assert.equal(textures,2);
});
const bytes=tex.reduce((n,t)=>n+t.image.data.byteLength,0);fs.writeFileSync(new URL('material-checks.json',dir),JSON.stringify({checks,generationMs:elapsed,baseBytes:bytes,mipUpperBytes:Math.ceil(bytes*4/3),maps:tex.map(t=>({width:t.image.width,height:t.image.height,hash:hash(t.image.data)})),boundary:'Shader source assembled/expanded against installed Three; not compiled by native WebGL/GPU. Colors read by hardware sRGB texture decode; alpha stays linear.'},null,2));material.dispose();
