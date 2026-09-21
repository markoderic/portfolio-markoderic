// Execute the real Prototype resize/preference paths using its established hook mock.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const file=new URL('verify-trackpad-wiring.mjs',import.meta.url),original=fs.readFileSync(file,'utf8');
const prefix=original.slice(0,original.indexOf("await check('Physical pad"));
const suffix=original.slice(original.indexOf('`;\n',original.indexOf("await check('Physical pad")));
const body=String.raw`
await check('actual Prototype resize at 800/500 boundaries and Simple/reduced exceptions',async()=>{
 const s=setup();const sizes=[[1440,900],[1920,1080],[900,700],[800,500],[799,500],[800,499],[390,844],[800,500]];
 for(const [width,height]of sizes){globalThis.innerWidth=width;globalThis.innerHeight=height;emit('resize');s.render();const direct=width<800||height<500;assert.equal(s.h.tree.props.className.includes('direct-view'),direct);const fit=desktop(s.h).props.size;const expected=direct?{width:Math.min(width-24,1200),height:height-95}:{width:Math.min(height-110,(width-96)/1.6,(height-32)/1.118)*1.6,height:Math.min(height-110,(width-96)/1.6,(height-32)/1.118)};assert.deepEqual(fit,expected);assert.ok(fit.width<=width-24&&fit.height<=height-95);}
 dispose(s.h);
 for(const pref of [{simple:true},{reduced:true}]){globalThis.innerWidth=1440;globalThis.innerHeight=900;const f=setup('#laptop',pref);assert.ok(f.h.tree.props.className.includes('direct-view'));assert.deepEqual(desktop(f.h).props.size,{width:1200,height:805});dispose(f.h);}
});
console.log(count+' actual Prototype responsive groups passed; mocked layout/events, no native rendering.');if(failures)throw Error(failures+' failed');
`;
const temp=new URL('.responsive-layout-check.mjs',import.meta.url);fs.writeFileSync(temp,(prefix+body+suffix).replaceAll('trackpad-wiring-test','responsive-layout-test'));
try{const result=spawnSync(process.execPath,[fileURLToPath(temp)],{encoding:'utf8'});process.stdout.write((result.stdout||'')+(result.stderr||''));if(result.status)process.exitCode=result.status;}finally{fs.unlinkSync(temp);}
