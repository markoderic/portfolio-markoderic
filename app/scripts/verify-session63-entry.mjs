// Actual Prototype callbacks with mocked hooks/DOM/progress. Not native input.
import { build } from 'esbuild';import path from 'node:path';import { fileURLToPath,pathToFileURL } from 'node:url';import fs from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
let source=fs.readFileSync(new URL('./support/entry-lifecycle-cases.js',import.meta.url),'utf8');
source+=`
check('Retained terminal is inert through arrival, stale controls cannot act, skip removes it once',()=>{const s=setup();s.ready();const layer=byClass(s.h,'entry-layer'),terminal=byClass(s.h,'entry-terminal'),sound=byText(s.h,'Sound on').props.onClick,resume=byText(s.h,'Resume').props.onClick,simple=byText(s.h,'Simple view').props.onClick;s.activate();const retained=byClass(s.h,'entry-layer');assert.equal(retained.props.ref,layer.props.ref);assert.equal(retained.props.inert,'');assert.equal(retained.props['aria-hidden'],true);assert.equal(retained.props['data-arriving'],true);for(const n of nodes(byClass(s.h,'entry-terminal')))if(n.type==='button')assert.equal(n.props.disabled,true);const token=scene(s.h).props.entry.token;sound();resume();simple();layer.props.onPointerDown(event());layer.props.onClick(event());s.render();assert.equal(scene(s.h).props.entry.token,token);assert.equal(scene(s.h).props.view,'desk');assert.ok(byText(s.h,'Sound on'));assert.ok(focus.includes('arrival-shield'));byText(s.h,'Skip arrival').props.onClick(event());s.render();assert.equal(scene(s.h).props.entry.phase,'active');assert.equal(byClass(s.h,'entry-layer'),undefined);scene(s.h).props.onArrivalComplete(token);s.render();assert.equal(byClass(s.h,'entry-layer'),undefined);});
check('Actual desktop input follows Rig settlement callback after navigation',()=>{const s=setup('#laptop');scene(s.h).props.onSettled(null);s.render();assert.equal(desktop(s.h).props.enabled,false);scene(s.h).props.onSettled('laptop');s.render();assert.equal(desktop(s.h).props.enabled,true);desktop(s.h).props.navigate('desk');s.render();assert.equal(desktop(s.h).props.enabled,false);scene(s.h).props.onSelect('laptop');s.render();assert.equal(desktop(s.h).props.enabled,false);scene(s.h).props.onSettled(null);s.render();assert.equal(desktop(s.h).props.enabled,false);scene(s.h).props.onSettled('laptop');s.render();assert.equal(desktop(s.h).props.enabled,true);desktop(s.h).props.navigate('desk');s.render();desktop(s.h).props.open('finder');s.render();assert.equal(scene(s.h).props.view,'laptop');assert.equal(desktop(s.h).props.enabled,false);scene(s.h).props.onSettled('laptop');s.render();assert.equal(desktop(s.h).props.enabled,true);});
fs.writeFileSync('../docs/redesign/session-63-arrival-camera/entry-checks.json',JSON.stringify({passed:count,boundary:'Actual Prototype hook callbacks and retained element ownership; modeled DOM/focus, not native paint/input'},null,2));
`;
const output = path.join(root, ".vite/session63-entry-lifecycle-test.mjs");
await build({
  stdin: { contents: source, resolveDir: root, loader: "jsx" },
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "transform",
  outfile: output,
  plugins: [
    {
      name: "test-boundaries",
      setup(b) {
        b.onResolve({ filter: /^react$/ }, () => ({
          path: path.join(root, "scripts/support/hook-harness.js"),
        }));
        b.onResolve({ filter: /^@react-three\/drei$/ }, () => ({
          path: "progress",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents:
            "export const useProgress=()=>globalThis.entryProgress;",
        }));
        b.onResolve({ filter: /\?raw$/ }, (a) => ({
          path: path.resolve(a.resolveDir, a.path.slice(0, -4)),
          namespace: "raw",
        }));
        b.onLoad({ filter: /.*/, namespace: "raw" }, async (a) => ({
          contents: await (
            await import("node:fs/promises")
          ).readFile(a.path, "utf8"),
          loader: "text",
        }));
        b.onResolve({ filter: /Scene$/ }, () => ({
          path: "scene",
          namespace: "empty-scene",
        }));
        b.onLoad({ filter: /.*/, namespace: "empty-scene" }, () => ({
          contents: "export default function Scene() {}",
        }));
      },
    },
  ],
  loader: {
    ".png": "dataurl",
    ".jpg": "dataurl",
    ".pdf": "dataurl",
    ".css": "empty",
  },
});
await import(pathToFileURL(output).href + "?v=" + Date.now());
