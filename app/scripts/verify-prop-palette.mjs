import assert from 'node:assert/strict';import fs from 'node:fs';
import {Lamp,Printer,harness,materialize} from './support/chair-scene-fixture.mjs';
import {PROP_PALETTE,PROP_PALETTES} from '../src/prototype/propPalette.js';
const results=[];
for(const Component of [Lamp,Printer]){
 const props={night:true,progress:{current:0},onToggle(){},onResume(){}},a=materialize(harness(Component,{...props,palette:PROP_PALETTES.rose}).tree),b=materialize(harness(Component,{...props,palette:PROP_PALETTES.clay}).tree);
 a.updateMatrixWorld(true);b.updateMatrixWorld(true);const am=[],bm=[];a.traverse(o=>{if(o.isMesh)am.push(o)});b.traverse(o=>{if(o.isMesh)bm.push(o)});assert.equal(am.length,bm.length);let colors=0;
 am.forEach((o,i)=>{const p=bm[i];assert.deepEqual(o.geometry.attributes.position.array,p.geometry.attributes.position.array);assert.deepEqual(o.matrixWorld.toArray(),p.matrixWorld.toArray());for(const k of ['roughness','metalness','emissiveIntensity','side'])assert.equal(o.material[k],p.material[k]);assert.equal(o.material.emissive.getHex(),p.material.emissive.getHex());if(!o.material.color.equals(p.material.color)){colors++;assert.equal(o.material.emissive.getHex(),0);}});
 assert.equal(colors,Component===Lamp?2:4);results.push({component:Component.name,paintedMeshes:colors,unchangedMechanicalMeshes:am.length-colors});
}
assert.equal(PROP_PALETTE,PROP_PALETTES.rose);
fs.writeFileSync(new URL('../../docs/redesign/session-16-palette-bin/palette-check.json',import.meta.url),JSON.stringify({results,note:'Actual mounted materials/transforms for both palettes; only two lamp and four printer color fields differ.'},null,2)+'\n');console.log('PASS actual palette scope: two lamp paints, four printer paints; geometry, mechanics, emissives and roughness unchanged');
