// Current runtime projection; offline framing metadata, no DOM/browser.
import fs from 'node:fs';import {build} from 'esbuild';import * as T from 'three';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../.vite/toss-entry-placement.mjs',import.meta.url);
await build({stdin:{contents:"export * from './src/prototype/deskCamera';export * from './src/prototype/paperTossInvitation';",resolveDir:root},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(out)});
const {deskPose,tossEntryPosition}=await import(out),frames=[];
for(const [width,height,night]of [[1440,900,false],[1440,900,true],[800,500,false]]){const size={width,height},pose=deskPose(size),camera=new T.PerspectiveCamera(39,width/height,.1,100);camera.position.copy(pose.position);camera.lookAt(pose.look);camera.updateMatrixWorld();const invitation=tossEntryPosition(camera,size);for(const label of ['before','after'])frames.push({name:label+'-'+(night?'night':'day')+'-'+width,stage:'after',night,theme:'light',texture:'screen.png',eye:pose.position.toArray(),look:pose.look.toArray(),width,height,invitation:label==='after'?invitation:null});}
fs.writeFileSync(new URL('../../docs/redesign/session-42-paper-toss-entry/frames.json',import.meta.url),JSON.stringify(frames,null,2)+'\n');
