// Local authoring measurement; only mutates this process's FAN configuration.
import fs from 'node:fs';import * as T from 'three';import {FAN} from '../src/prototype/fanMotion.js';import {fanEnvelopes} from './support/fan-envelope.mjs';
const {FAN:old}=await import(new URL('../../docs/redesign/session-24-fan-placement-activation/before-fanMotion.js',import.meta.url));
const sources=['session-23-gray-printer-fuller-bin/after-props.json','session-18-vintage-clock/day-clock.json','session-19-production-props/selected-props.json','session-11-laptop-lighting/laptop-render.json'];
const obstacles=sources.flatMap(p=>JSON.parse(fs.readFileSync(new URL('../../docs/redesign/'+p,import.meta.url))).meshes.map(m=>({name:m.root+'/'+m.name,b:new T.Box3().setFromPoints(m.positions.map(v=>new T.Vector3(...v)))})));
const gap=(a,b)=>Math.max(a.min.x-b.max.x,b.min.x-a.max.x,a.min.y-b.max.y,b.min.y-a.max.y,a.min.z-b.max.z,b.min.z-a.max.z);
for(const [position,direction]of [[old.position,old.direction],[[4.7,0,-1.65],-Math.PI/2],[[4.5,0,-1.8],-Math.PI/2],[[4.6,0,-1.65],-1.42]]){
 FAN.position=position;FAN.direction=direction;const envelopes=fanEnvelopes(),near=[];for(const [part,a]of Object.entries(envelopes))for(const o of obstacles){const distance=gap(a,o.b);if(distance<.3)near.push({part,object:o.name,distance});}
 console.log(JSON.stringify({position,direction,envelopes:Object.fromEntries(Object.entries(envelopes).map(([k,v])=>[k,[v.min.toArray(),v.max.toArray()]])),near:near.sort((a,b)=>a.distance-b.distance)},null,2));
}
