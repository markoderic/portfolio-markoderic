// Fresh current JSX/asset assembly from the existing offline fixture, not a saved scene.
import fs from 'node:fs';
let source=fs.readFileSync(new URL('../inspect-session55-scene.mjs',import.meta.url),'utf8');
source=source.replace("tag=process.argv.includes('--before')?'before':'after'", "tag='current'").replace('session-55-prop-placement','session-61-paper-toss');
source=source.replace("console.log(JSON.stringify({tag,night,samples:sampleResults,meshes:meshes.length},null,2));", "");
source+='\nroots.bin.userData.tossBin=true;export const currentScene=h.scene;export {roots};\n';
const temp=new URL('../.session61-current-scene.mjs',import.meta.url);fs.writeFileSync(temp,source);let module;
try{module=await import(temp.href);}finally{fs.unlinkSync(temp)}
export const scene=module.currentScene,roots=module.roots;
