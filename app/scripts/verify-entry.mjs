// Actual React SSR plus deterministic initialization state checks; no browser/network.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".vite/entry-test.mjs");
await build({
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `
    import React from 'react';
    import fs from 'node:fs';
    import {renderToStaticMarkup} from 'react-dom/server';
    import assert from 'node:assert/strict';
    import BootConsole from './src/prototype/BootConsole.jsx';
    import {entryStages,entryStatus} from './src/prototype/entryState.js';
    let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
    const complete=Object.fromEntries(entryStages.map(([id])=>[id,true]));
    const render=props=>renderToStaticMarkup(<BootConsole stages={{}} loading={false} loaded={0} total={0} errors={[]} {...props}/>);
    check('counts update within the same four stage rows without an asset-message backlog',()=>{
      for(let loaded=0;loaded<=32;loaded++){
        const html=render({stages:{laptop:true},loading:true,loaded,total:32});
        assert.equal((html.match(/data-stage=/g)||[]).length,4);
        assert.equal((html.match(/Asset transfers/g)||[]).length,1);
        assert.ok(html.includes(loaded+' / 32'));assert.ok(!html.includes('Ready. Enter workspace to continue.'));
      }
      const html=render({stages:complete,loaded:32,total:32});
      assert.equal((html.match(/data-stage=/g)||[]).length,4);
      assert.ok(html.includes('Ready. Enter workspace to continue.'));assert.ok(!html.includes('loading…'));
    });
    check('cached resources become ready in the same render without a readiness delay or a transfer-count requirement',()=>{
      const html=render({stages:complete});assert.ok(html.includes('Ready. Enter workspace to continue.'));assert.ok(html.includes('No pending asset transfers'));assert.ok(!html.includes('waiting for initialization'));
    });
    check('every real milestone and active-transfer completion is required',()=>{
      for(const [id] of entryStages){assert.equal(entryStatus({...complete,[id]:false}).ready,false);}
      assert.equal(entryStatus(complete,{loading:true}).ready,false);assert.equal(entryStatus(complete).ready,true);
    });
    check('cold-load errors cannot masquerade as ready even when all transfer counters finish',()=>{
      for(const failure of [{errors:['phone.glb']},{failed:true}]){
        const html=render({stages:complete,loaded:32,total:32,...failure});assert.ok(html.includes('could not load'));assert.ok(html.includes('Simple view'));assert.ok(!html.includes('Ready. Enter workspace to continue.'));
      }
      assert.ok(render({failed:true}).includes('unavailable'));
      assert.ok(render({errors:['phone.glb']}).includes('1 failed'));
    });
    check('stalled initialization remains loading while immediate skip remains explicit',()=>{
      const html=render({stages:{laptop:true},loading:true,loaded:1,total:32});assert.ok(html.includes('Enter skips loading'));assert.ok(!html.includes('Ready. Enter workspace to continue.'));
    });
    const evidence='docs/redesign/session-13-entrance/';
    for(const [name,props] of [['ready',{stages:complete}],['slow',{stages:{desk:true},loading:true,loaded:3,total:27}],['failed',{errors:['model.glb']}]] )fs.writeFileSync(evidence+'terminal-'+name+'.html','<!-- Actual BootConsole React SSR; no browser layout or integrated WebGL. -->'+render(props));
    console.log(count+' terminal state/server-render cases passed; wall-clock browser pacing unmeasured.');
  `,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  outfile: output,
});
await import(pathToFileURL(output).href + "?v=" + Date.now());
