// Reuse the existing ground checks/CPU approximation with Session 12 output only.
// No older evidence is overwritten, and no browser surface is opened.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/redesign/session-12-plant/',import.meta.url);
for(const task of ['verify','inspect']){
 let source=fs.readFileSync(new URL(task+'-ground-shadows.mjs',import.meta.url),'utf8').replaceAll('../../docs/redesign/session-09-ground-shadows/','../../docs/redesign/session-12-plant/').replaceAll('./support/','../scripts/support/');
 source=source.replace("new URL('checks.json',dir)","new URL('ground-checks.json',dir)");
 if(task==='inspect'){
  source=source.replace("['desk','chair','plant','bin'].includes(m.root));","['desk','chair','bin'].includes(m.root)).concat(JSON.parse(fs.readFileSync(new URL('after-plant.json',dir))).meshes);");
  const start=source.indexOf("[{name:'before',resolution:"),end=source.indexOf('...GROUND_SHADOW.layers.map',start);source=source.slice(0,start)+'['+source.slice(end);
  source=source.replace('CPU approximation of depth/blur. Before uses nearest-depth union, not old GPU draw ordering. Not actual Three compositing.','Current plant triangles, CPU nearest-depth/blur approximation. Not actual Three compositing.');
 }
 const temp=new URL('../.vite/session12-'+task+'-ground.mjs',import.meta.url);fs.writeFileSync(temp,source);
 try{const log=execFileSync(process.execPath,[fileURLToPath(temp)],{encoding:'utf8'});fs.writeFileSync(new URL(task==='verify'?'ground-checks.txt':'offline-ground-log.txt',dir),log);console.log(log.trim());}finally{fs.unlinkSync(temp)}
}
