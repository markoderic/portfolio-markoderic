// Reuse composed parent/Scene/DeskFan source callbacks; no native browser.
import fs from 'node:fs';
let fixture=fs.readFileSync(new URL('verify-fan-continuity.mjs',import.meta.url),'utf8');
const cases=String.raw`
await check('Fresh terminal and arrival animate the existing fan without enabling input or pre-gesture sound',async()=>{
 const s=mount(true);try{
 assert.equal(scene(s.h).props.entry.phase,'terminal');assert.equal(audio,undefined);
 const p=()=>find(s.stage,n=>n.type===DeskFan).props;assert.equal(p().enabled,false);
 const instance=s.fan,spin=rotate(s);s.run(.8);assert.notEqual(rotate(s),spin);assert.ok(snapshot(s).power>.9);assert.equal(audio,undefined);
 scene(s.h).props.onFanToggle();s.sync();assert.equal(scene(s.h).props.fanOn,true);
 document.hidden=true;emit('visibilitychange');s.sync();const held=rotate(s);s.run(.2);assert.equal(rotate(s),held);document.hidden=false;emit('visibilitychange');s.sync();s.frame(1/60);assert.equal(rotate(s),held);s.run(.1);assert.notEqual(rotate(s),held);
 for(const id of ['desk','laptop','phone','resources'])scene(s.h).props.onStageReady(id);s.sync();
 find(s.h,n=>n.props?.['data-entry-confirm']!==undefined).props.onClick(key());s.sync();await tick();assert.equal(scene(s.h).props.entry.phase,'arriving');assert.equal(p().enabled,false);assert.equal(loops().length,0);
 const arriving=rotate(s);s.run(.2);assert.notEqual(rotate(s),arriving);assert.equal(s.fan,instance);assert.equal(loops().length,0);
 const entry=scene(s.h).props.entry;scene(s.h).props.onArrivalComplete(entry.token);s.sync();s.run(.1);assert.equal(entry.phase,'active');assert.equal(p().enabled,true);assert.equal(s.fan,instance);assert.equal(loops().length,1);assert.equal(cues(),0);
 }finally{document.hidden=false;s.dispose();}
});
`;
fixture=fixture.replace("await check('Actual parent/Scene/frame",cases+"await check('Actual parent/Scene/frame");
fixture=fixture.replace("const out=path.join(root,'.vite/fan-continuity.mjs');","const out=path.join(root,'.vite/session59-entry.mjs');");
fixture=fixture.replace("setup(b){if(process.argv.includes('--before'))", "setup(b){if(process.argv.includes('--baseline'))b.onLoad({filter:/src\\/prototype\\/Scene\\.jsx$/},a=>({contents:fs.readFileSync(path.join(root,'../docs/redesign/session-59-fan-entry-cable/before/Scene.jsx'),'utf8'),loader:'jsx',resolveDir:path.dirname(a.path)}));if(process.argv.includes('--before'))");
fixture=fixture.replace("console.log(count+' composed continuity", "fs.writeFileSync('../docs/redesign/session-59-fan-entry-cable/'+(process.argv.includes('--baseline')?'before-entry':'entry-checks')+'.json',JSON.stringify({passed:count,failed:failures,boundary:'actual parent/Scene/DeskFan callbacks and Three meshes; mocked React hooks, DOM, frames and audio; no native acceptance'},null,2));console.log(count+' composed continuity");
const temp=new URL('.session59-entry-fixture.mjs',import.meta.url);fs.writeFileSync(temp,fixture);
try{await import(temp.href);}finally{fs.unlinkSync(temp);}
