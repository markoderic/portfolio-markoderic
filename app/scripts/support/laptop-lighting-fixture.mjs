import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {build} from 'esbuild';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export async function loadLaptop(){const b=fs.readFileSync(path.join(root,'src/prototype/assets/laptop-m3.glb'));const loader=new GLTFLoader();loader.register(()=>({name:'OFFLINE_TEXTURE',loadTexture(){return Promise.resolve(new T.Texture())}}));return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'')).scene;}
export async function laptopFixture(){
 const output=path.join(root,'.vite/laptop-lighting-fixture.mjs');
 await build({stdin:{contents:"export {LoadedLaptop,default as LaptopModel} from './src/prototype/LaptopModel.jsx';export {harness,nodes} from './scripts/support/hook-harness.js';",resolveDir:root,loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:output,plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:root+'scripts/support/hook-harness.js'}));b.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'mock'}));b.onResolve({filter:/^@react-three\/drei$/},()=>({path:'drei',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='fiber'?'export const useFrame=fn=>globalThis.laptopFrame=fn;':'export const useGLTF=()=>({scene:globalThis.cachedLaptop});'}));b.onResolve({filter:/\.glb\?url$/},()=>({path:'asset',namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},()=>({contents:'export default "offline-model"'}));
 }}]});return import(pathToFileURL(output).href+'?v='+Date.now());
}
