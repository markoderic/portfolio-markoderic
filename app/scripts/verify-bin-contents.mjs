import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {Bin,Desk,Chair,Printer,Lamp,harness,materialize} from './support/chair-scene-fixture.mjs';
import {triangles,contactHeight,points} from './support/bin-contact.mjs';
import {BIN_PAPERS,BIN_FLOOR,binInnerRadius} from '../src/prototype/binGeometry.js';
const dir=new URL('../../docs/redesign/session-16-palette-bin/',import.meta.url),bin=materialize(harness(Bin,{}).tree),papers=[];
for(let i=0;i<BIN_PAPERS.length;i++)papers.push(bin.getObjectByName('bin-paper-'+i));
let wall=Infinity,supportGap=0,pairPenetration=-Infinity,top=0;
for(let i=0;i<papers.length;i++){
 const m=papers[i],p=m.position.toArray(),v=points(m.geometry).map(v=>v.add(m.position)),t=triangles(m.geometry,p);
 const floor=Math.min(...v.map(v=>v.y));let support=BIN_FLOOR-floor;assert.ok(floor>=BIN_FLOOR-1e-7);
 for(let j=0;j<i;j++){const lower=papers[j],h=contactHeight(t,triangles(lower.geometry,lower.position.toArray())).height;support=Math.max(support,h);pairPenetration=Math.max(pairPenetration,h);assert.ok(h<1e-7);}
 supportGap=Math.max(supportGap,Math.abs(support));assert.ok(Math.abs(support)<1e-7,'unsupported paper '+i);
 for(const p of v){wall=Math.min(wall,binInnerRadius(p.y)*Math.cos(Math.PI/48)-Math.hypot(p.x,p.z));top=Math.max(top,p.y);}
}
assert.ok(wall>.002);const fill=(top-BIN_FLOOR)/(.76-BIN_FLOOR);assert.ok(fill>.43&&fill<.56);
const peel=bin.getObjectByName('bin-peel'),rimContact=contactHeight(triangles(peel.geometry),triangles(bin.children[0].geometry));assert.ok(Math.abs(rimContact.height)<1e-7);assert.ok(Math.hypot(...rimContact.witness)>.36&&Math.hypot(...rimContact.witness)<.39);
const pv=points(peel.geometry);assert.ok(Math.min(...pv.map(v=>v.y))>.4);assert.ok(pv.some(v=>Math.hypot(v.x,v.z)>.43));assert.ok(pv.some(v=>Math.hypot(v.x,v.z)<.31));
bin.updateMatrixWorld(true);const added=new T.Box3().setFromObject(bin.getObjectByName('bin-contents'));
const obstacles=[materialize(harness(Desk,{drawers:[true,true,true]}).tree),materialize(harness(Chair,{}).tree)];let furnitureGap=Infinity;for(const group of obstacles){group.updateMatrixWorld(true);group.traverse(o=>{if(!o.isMesh)return;const b=new T.Box3().setFromObject(o),gap=Math.max(b.min.x-added.max.x,added.min.x-b.max.x,b.min.y-added.max.y,added.min.y-b.max.y,b.min.z-added.max.z,added.min.z-b.max.z);assert.ok(gap>0);furnitureGap=Math.min(furnitureGap,gap);});}
// Actual nearest-mesh ray queries: decorations have finite local bounds and do
// not become targets or shadow receivers. Compare established object-center rays.
const scene=new T.Group();scene.add(bin,...obstacles);const printer=materialize(harness(Printer,{progress:{current:0},onResume(){}}).tree),lamp=materialize(harness(Lamp,{night:false,onToggle(){}}).tree);scene.add(printer,lamp);scene.updateMatrixWorld(true);const camera=new T.Vector3(11,14,21),ray=new T.Raycaster(),rayResults=[];
for(const [name,p]of [['printer',[-3.65,.6,-.65]],['lamp',[2.7,1,-1]],['drawers',[3.64,-1.35,3.65]]]){ray.set(camera,new T.Vector3(...p).sub(camera).normalize());const hit=ray.intersectObjects(scene.children,true)[0];assert.ok(!hit?.object.name.startsWith('bin-'));rayResults.push({name,first:hit?.object.name||'unnamed existing furniture'});}
let meshes=0,tri=0;bin.getObjectByName('bin-contents').traverse(o=>{if(o.isMesh){meshes++;tri+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
const result={paperCount:papers.length,fillFraction:fill,topLocal:top,minimumInteriorWallGap:wall,supportGap,pairPenetration,peelRimContact:rimContact,minimumFurnitureAxisGap:furnitureGap,rayResults,addedMeshes:meshes,addedTriangles:tri,addedTextures:0,method:'Actual geometry; convex tapered containment, exact projected triangle support/contact, conservative all-open furniture bounds and sampled physical rays. Not browser verification.'};fs.writeFileSync(new URL('bin-check.json',dir),JSON.stringify(result,null,2)+'\n');console.log(result);
