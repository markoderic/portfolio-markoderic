// Exact removal of Session25 wiring restores each previous file. No broad hash exemptions.
import fs from 'node:fs';import assert from 'node:assert/strict';
const dir=new URL('../../docs/redesign/session-25-fan-audio/',import.meta.url),src=new URL('../src/prototype/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,src),'utf8'),before=name=>fs.readFileSync(new URL('before-'+name,dir),'utf8');
let p=read('Prototype.jsx');
p=p.replace('import { createFanAudio } from "./fanSound";\n','');
p=p.replace(/  const fanSoundState = useRef\(\{\}\);[\s\S]*?  useEffect\(\(\) => \{ fanAudio.mount\(\); return \(\) => fanAudio.dispose\(\); \}, \[fanAudio\]\);\n/,'');
p=p.replace('      fanAudio.sync();\n','');
p=p.replace('    const leave = () => fanAudio.pageHidden(true);\n    const returnPage = () => fanAudio.pageHidden(false);\n','');
p=p.replace('    addEventListener("pagehide", leave);\n    addEventListener("pageshow", returnPage);\n    return () => {\n      removeEventListener("visibilitychange", visibility);\n      removeEventListener("pagehide", leave);\n      removeEventListener("pageshow", returnPage);\n    };','    return () => removeEventListener("visibilitychange", visibility);');
p=p.replace(/  fanSoundState.current = \{[\s\S]*?  useEffect\(\(\) => fanAudio.sync\(\), \[fanAudio, fanOn, sound, view, entryPhase, direct, reduced, simple, failed\]\);\n/,'');
p=p.replace('    const next = !fanSoundState.current.on;\n    fanSoundState.current.on = next;\n    setFanOn(next);\n    void fanAudio.toggle(next);','    setFanOn(value => !value);');
p=p.replace('                fanAudio={fanAudio}\n','');assert.equal(p,before('Prototype.jsx'));
assert.equal(read('Scene.jsx').replace('  fanAudio,\n','').replace('<DeskFan audio={fanAudio} on={fanOn}','<DeskFan on={fanOn}'),before('Scene.jsx'));
assert.equal(read('DeskFan.jsx').replace('DeskFan({audio,on=true','DeskFan({on=true').replace('  audio?.power(motion.power);\n',''),before('DeskFan.jsx'));
assert.equal(read('sound.js').replace(/const unlockListeners = new Set\(\);[\s\S]*?\n};\n/,'').replace('    if (context.state !== "running") return false;\n    for (const listener of unlockListeners) listener();\n    return true;','    return context.state === "running";'),before('sound.js'));
console.log('PASS four exact file comparisons after removing only fan audio wiring: scene/entry/navigation/geometry and existing sound synthesis preserved.');
