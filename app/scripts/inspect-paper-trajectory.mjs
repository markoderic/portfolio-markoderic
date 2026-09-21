import * as T from 'three';
import fs from 'node:fs';
import {Desk,Printer,Bin,Chair,harness,materialize} from './support/paper-scene-fixture.mjs';
import {PAPER_WIDTH,PAPER_HEIGHT,paperFeedPosition} from '../src/prototype/paperGeometry.js';
import {PRINTER} from '../src/prototype/sceneScale.js';
export const groups={desk:materialize(harness(Desk,{}).tree),printer:materialize(harness(Printer,{progress:{current:1},onResume(){}}).tree),bin:materialize(harness(Bin,{}).tree),chair:materialize(harness(Chair,{}).tree)};
export const obstacles=[];for(const [name,group]of Object.entries(groups)){group.updateMatrixWorld(true);let index=0;group.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();obstacles.push({name:name+'/'+index++,object:o,box:new T.Box3().setFromObject(o),localBox:o.geometry.boundingBox.clone()})}})}
console.log(JSON.stringify(obstacles.map(({name,box})=>({name,min:box.min.toArray(),max:box.max.toArray()})),null,2));
