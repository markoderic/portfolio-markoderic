// Private build identity. Deterministic source metadata, never runtime trace data.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url)),src=path.join(app,'src/prototype'),output=path.join(src,'runtimeRevision.js');
export function writeRevision(){
 const hash=createHash('sha256');
 function walk(dir){for(const name of fs.readdirSync(dir).sort()){const p=path.join(dir,name);if(p===output)continue;if(fs.statSync(p).isDirectory())walk(p);else{hash.update(path.relative(app,p));hash.update(fs.readFileSync(p));}}}
 walk(src);for(const name of ['vite.prototype.config.js','package-lock.json','prototype-vendor/revision.js'])hash.update(fs.readFileSync(path.join(app,name)));
 const value=`export const RUNTIME_REVISION = 's36-${hash.digest('hex').slice(0,16)}';\n`;
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==value)fs.writeFileSync(output,value);
 return value;
}
export default function privateRevision(){writeRevision();return {name:'private-runtime-revision',buildStart(){writeRevision();},handleHotUpdate(ctx){if(ctx.file.startsWith(src+path.sep)&&ctx.file!==output)writeRevision();}};}
