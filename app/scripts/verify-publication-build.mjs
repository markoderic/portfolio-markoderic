// Filesystem/build audit only: no browser, HTTP, deployment or account actions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'vite';
import {resolveRoute} from '../src/prototype/workspaceState.js';

const app = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = path.dirname(app);
const evidence = path.join(root, 'docs/redesign/submission-ready');
const out = path.join(app, '.vite/submission-build');
const modules = new Set();
await build({root:app, configFile:path.join(app,'vite.config.js'), build:{outDir:out,emptyOutDir:true}, plugins:[{
  name:'publication-module-audit', generateBundle(_, bundle){
    for(const item of Object.values(bundle)) if(item.type==='chunk') for(const id of Object.keys(item.modules)) modules.add(id);
  },
}]});
const graph = [...modules].sort();
assert(graph.some(id=>id.endsWith('/src/prototype/Prototype.jsx')));
assert(!graph.some(id=>/\/roomSound(?:Synthesis)?\.js$/.test(id)));
for(const name of ['fanSound.js','drawerSound.js','paperSound.js']) assert(graph.some(id=>id.endsWith('/'+name)),name);
const html = fs.readFileSync(path.join(out,'index.html'),'utf8');
assert(html.includes('https://markoderic.com/'));
assert(html.includes('index,follow'));
assert(!html.includes('noindex'));
assert(!fs.existsSync(path.join(out,'prototype.html')));
assert.equal(fs.readFileSync(path.join(out,'CNAME'),'utf8').trim(),'markoderic.com');
for(const name of ['robots.txt','sitemap.xml','resume.pdf']) assert.deepEqual(fs.readFileSync(path.join(out,name)),fs.readFileSync(path.join(app,'public',name)));
assert.deepEqual(fs.readFileSync(path.join(out,'resume.pdf')),fs.readFileSync(path.join(app,'src/prototype/assets/marko-deric-resume-2026.pdf')));
for(const name of ['projects','about','experience','contact','resume','phone','laptop','desk']) {
  assert.deepEqual(resolveRoute('#/'+name),resolveRoute('#'+name));
  assert.deepEqual(resolveRoute('#/'+name+'/'),resolveRoute('#'+name));
}
assert.deepEqual(resolveRoute('#/'),resolveRoute(''));
const vendor = path.join(app,'prototype-vendor/cat-mario');
for(const name of ['source.zip','credits.html',...Object.keys(JSON.parse(fs.readFileSync(path.join(vendor,'artifacts.json'),'utf8')))]) {
  assert.deepEqual(fs.readFileSync(path.join(out,'prototype-vendor/cat-mario',name)),fs.readFileSync(path.join(vendor,name)),name);
}
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const emitted = walk(out);
const executable = emitted.filter(f=>f.endsWith('.js')&&f.includes('/assets/')).map(f=>fs.readFileSync(f,'utf8')).join('\n');
assert(!executable.includes('Local runtime diagnostics'));
assert(!/private preview|private draft|private redesign|keep this redesign private/i.test(executable));
assert(!emitted.some(f=>/\/(?:docs|account-notes|archives)\//.test(path.relative(out,f))));
const sha = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const baseline = JSON.parse(fs.readFileSync(path.join(evidence,'baseline.json'),'utf8'));
for(const [name,hash] of Object.entries(baseline.productionOutputs)) assert.equal(sha(path.join(root,name)),hash,name);
assert.equal(sha(path.join(root,'.github/workflows/static.yml')),baseline.workflow);
assert.equal(sha(path.join(app,'src/main.jsx')),baseline.legacyEntrySource);
fs.writeFileSync(path.join(evidence,'release-build-audit.json'),JSON.stringify({
  status:'pass',kind:'Build/module/filesystem checks; native visual, input and audio verification remains pending',
  rootEntry:'src/prototype/main.jsx',releaseFiles:emitted.length,moduleCount:graph.length,
  roomModulesExcluded:true,diagnosticsUIExcluded:true,legacyHashRoutesPreserved:true,
  originalOutputFilesPreserved:Object.keys(baseline.productionOutputs).length,
  sourceArchiveSHA256:sha(path.join(vendor,'source.zip')),modules:graph.map(id=>id.replace(root+'/','')),
},null,2)+'\n');
console.log('Publication build and asset, module, route, metadata and preservation audit passed.');
