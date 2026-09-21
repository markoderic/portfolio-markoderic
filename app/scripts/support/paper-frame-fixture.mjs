import * as T from 'three';
import {Rig,harness,Bin,materialize} from './paper-scene-fixture.mjs';
import {LAPTOP,PHONE,fitPhone} from '../../src/prototype/deviceGeometry.js';
import {PAPER_WIDTH,PAPER_HEIGHT} from '../../src/prototype/paperGeometry.js';
import {PAPER_REST} from '../../src/prototype/paperDisposal.js';
export const binPosition=materialize(harness(Bin,{}).tree).position.toArray();
export function paperRig(sceneProps){
 const size={width:1440,height:900},camera=new T.PerspectiveCamera(39,1.6,.1,100),scene=new T.Scene();camera.position.set(11,14,21);camera.lookAt(.4,-1.7,1);camera.updateMatrixWorld();
 const laptop=new T.Object3D();laptop.position.fromArray(LAPTOP.position).add(new T.Vector3(...LAPTOP.screenPosition));laptop.rotation.set(...LAPTOP.screenRotation);
 const pivot=new T.Group(),phone=new T.Object3D();phone.position.fromArray(PHONE.position);pivot.position.fromArray(PHONE.desk);pivot.add(phone);
 const paper=new T.Mesh(new T.PlaneGeometry(PAPER_WIDTH,PAPER_HEIGHT,16,20));paper.position.fromArray(PAPER_REST);
 const hosts=Object.fromEntries(['laptop','phone','mask','paperMask','paper'].map(k=>[k,{current:{style:{},closest:()=>null}}]));
 const props={orbit:{current:{yaw:0,pitch:0}},completedPage:true,view:'printer',direct:false,reduced:false,hosts,layout:{laptop:{width:1120,height:700},phone:fitPhone(size)},onSettled(){},laptop:{current:laptop},phone:{current:phone},pivot:{current:pivot},paper:{current:paper},printer:{current:null},printProgress:{current:0},printMotion:{current:{phase:'idle'}},...sceneProps};
 const h=harness(Rig,props);return {paper,props,step(patch={}){Object.assign(props,patch);h.render(props);globalThis.__printerFrames.at(-1)({camera,size,scene},1/60);return paper;}};
}
