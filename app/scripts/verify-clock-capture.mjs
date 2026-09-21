import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';
import {Desk,Chair,Plant,Bin,harness,materialize} from './support/chair-scene-fixture.mjs';
import {mountClock} from './support/clock-scene-fixture.mjs';import {mountFan} from './support/fan-scene-fixture.mjs';
import {clockDisplayGeometry,setClockSegments} from '../src/prototype/clockGeometry.js';import {localClockReading} from '../src/prototype/localClock.js';
import {createShadowCaptureState,captureSettledGround,groundCasterSnapshot} from '../src/prototype/groundShadowPass.js';
const refs=Object.fromEntries([['desk',Desk],['chair',Chair],['plant',Plant],['bin',Bin]].map(([id,C])=>[id,{current:materialize(harness(C,{}).tree)}])),clock=await mountClock(),fan=mountFan(),scene=new T.Scene();scene.add(...Object.values(refs).map(r=>r.current),clock,fan.root);
const state=createShadowCaptureState(),motion={moving:new Set(),revision:0},before=groundCasterSnapshot(refs).key,display=clockDisplayGeometry();clock.getObjectByName('clock-segments').geometry=display.geometry;let captures=0,writes=0;
for(let i=0;i<900;i++){fan.frame(1/60);if(i%60===0){setClockSegments(display,localClockReading(new Date(2026,8,18,9,i/60)));writes++;}if(i===10)motion.moving.add(0);if(i===40){motion.moving.clear();motion.revision++;}captureSettledGround(state,{capture(){captures++}},{},refs,1/60,motion);}
assert.equal(captures,2);assert.equal(groundCasterSnapshot(refs).key,before);assert.equal(writes,15);
const result={pass:true,frames:900,clockFixtureUpdates:writes,captures,signatureUnchanged:true,note:'Same caster refs as Scene: clock/fan are siblings outside cached floor casters; mocked renderer capture, actual geometry/signatures. Not WebGL performance evidence.'};
fs.writeFileSync(new URL('../../docs/redesign/session-18-vintage-clock/capture-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('PASS clock updates and running fan preserve initial + single drawer-settled capture');
