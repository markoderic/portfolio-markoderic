// Actual Prototype callbacks with mocked hooks/DOM/progress. Not native input.
import assert from 'node:assert/strict';import { build } from 'esbuild';import path from 'node:path';import { fileURLToPath,pathToFileURL } from 'node:url';import fs from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=fs.readFileSync(new URL('./support/submission-controls-cases.js',import.meta.url),'utf8');
const output = path.join(root, ".vite/submission-controls.mjs");
const result=await build({
  metafile: true,
  define: {'import.meta.env.DEV': process.argv.includes('--dev')?'true':'false'},
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
assert.ok(!Object.keys(result.metafile.inputs).some(p=>/roomSound/.test(p)),'room owner and synthesis absent from current component graph');
for(const name of ['fanSound.js','drawerSound.js','paperSound.js','trackpadAudio.js','paperTossAudio.js','sound.js']) assert.ok(Object.keys(result.metafile.inputs).some(p=>p.endsWith('/'+name)),name+' remains in graph');
console.log('PASS room modules absent; six causal sound owners retained in component graph');
await import(pathToFileURL(output).href + "?v=" + Date.now());
