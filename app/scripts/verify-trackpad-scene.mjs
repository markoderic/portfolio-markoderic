// Actual Scene -> LaptopModel/Phone props and real mesh rays; R3F/DOM delivery mocked.
import {build} from 'esbuild';import {fileURLToPath} from 'node:url';import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {loadLaptop} from './support/laptop-lighting-fixture.mjs';import {LAPTOP} from '../src/prototype/deviceGeometry.js';
const root=fileURLToPath(new URL('../',import.meta.url)),output=new URL('../.vite/trackpad-scene.mjs',import.meta.url);
await build({stdin:{contents:"export {default as Scene,Phone} from './src/prototype/Scene.jsx';export {default as LaptopModel} from './src/prototype/LaptopModel.jsx';export * from './scripts/support/hook-harness.js';",resolveDir:root},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'transform',outfile:fileURLToPath(output),loader:{'.png':'dataurl'},plugins:[{name:'scene-boundaries',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:root+'scripts/support/hook-harness.js'}));
 b.onLoad({filter:/src\/prototype\/Scene.jsx$/},a=>({contents:fs.readFileSync(a.path,'utf8')+'\nexport {Phone};',loader:'jsx'}));
 b.onResolve({filter:/^@react-three\//},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('fiber')?'export const Canvas="Canvas",useFrame=()=>{};':'export const RoundedBox="RoundedBox", Environment="Environment", Lightformer="Lightformer",useTexture=()=>({}),useGLTF=()=>({scene:null});'}));
 b.onResolve({filter:/\?url$/},()=>({path:'asset',namespace:'asset'}));b.onLoad({filter:/.*/,namespace:'asset'},()=>({contents:'export default "offline-asset"'}));
}}]});
const m=await import(output.href);globalThis.React={createElement:m.createElement};globalThis.document={body:{style:{}}};
const owner=new T.Group(),world=new T.Scene(),model=await loadLaptop();owner.position.fromArray(LAPTOP.position);model.scale.setScalar(LAPTOP.modelScale);owner.add(model);world.add(owner);world.updateMatrixWorld(true);
const target=new T.Vector3(0,.329,6.8).applyMatrix4(model.getObjectByName('M3_Surface_8').matrixWorld),origin=target.clone().add(new T.Vector3(0,2,0));
const event=()=>({ray:new T.Ray(origin,target.clone().sub(origin).normalize()),pointerId:1,isPrimary:true,button:0,clientX:1,clientY:1,delta:0,nativeEvent:{},stopPropagation(){}});
let clicks=0,select=[];const props={entry:{phase:'active'},deskInput:{current:{}},view:'desk',direct:false,onTrackpad:()=>clicks++,onSelect:id=>select.push(id),hosts:{},layout:{}};
const scene=m.harness(m.Scene,props);const mac=()=>m.find(scene,n=>n.type===m.LaptopModel);
assert.equal(mac().props.input,props.deskInput.current);assert.equal(mac().props.onTrackpad,props.onTrackpad);
for(const view of ['desk','laptop','phone']){scene.render({view});assert.equal(mac().props.enabled,true);const pad=m.harness(m.LaptopModel,mac().props);pad.tree.props.ref.current=owner;const e=event();pad.tree.props.onPointerDown(e);pad.tree.props.onPointerUp(e);pad.tree.props.onClick(e);pad.tree.props.onClick(e);}
assert.equal(clicks,3);assert.deepEqual(select,[]);
for(const changes of [{view:'paper'},{view:'printer'},{view:'laptop',direct:true},{direct:false,deskBlocked:true}]){scene.render(changes);assert.equal(mac().props.enabled,false);}
scene.render({view:'desk',direct:false,deskBlocked:false});const phoneNode=m.find(scene,n=>n.type===m.Phone),phone=m.harness(m.Phone,phoneNode.props);phone.tree.props.onClick(event());assert.deepEqual(select,['phone']);assert.equal(clicks,3);
console.log('PASS Actual Scene routes measured laptop separately from Phone, gates direct/other views/overlays; duplicate model click cannot replay');
