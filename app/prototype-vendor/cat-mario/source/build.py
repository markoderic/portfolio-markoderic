#!/usr/bin/env python3
"""Rebuild this private Classic Cat Mario distribution with Emscripten 3.1.74.
No installs or downloads. --emsdk is an existing isolated SDK directory.
"""
from pathlib import Path
import argparse,os,subprocess,re,json,hashlib,zipfile
p=argparse.ArgumentParser();p.add_argument('--emsdk',required=True);p.add_argument('--test-output');a=p.parse_args()
src=Path(__file__).resolve().parent;dest=Path(a.test_output).resolve() if a.test_output else src.parent;dest.mkdir(parents=True,exist_ok=True);sdk=Path(a.emsdk).resolve();env=os.environ.copy();env.update(EM_CONFIG=str(sdk/'.emscripten'),EM_CACHE=str(sdk/'upstream/emscripten/cache'))
compiler=sdk/'upstream/emscripten/em++';version=subprocess.check_output([str(compiler),'--version'],env=env,text=True);assert '3.1.74 ' in version,'Pinned Emscripten 3.1.74 required'
cmd=[str(compiler),'main.cpp','DxLib.cpp','loadg.cpp','-DEMSCRIPTEN','-Os','-sSTB_IMAGE=1','-sUSE_SDL=1','-sINITIAL_MEMORY=33554432','-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=CreateClassic','-sENVIRONMENT=web','-sINVOKE_RUN=0','-sEXPORTED_FUNCTIONS=["_main","_stbi_load","_stbi_load_from_memory","_stbi_image_free","_SDL_FreeSurface"]','-sEXPORTED_RUNTIME_METHODS=["SDL","Browser"]','--embed-file','data@/','--js-library',str(src/'emscripten/library_sdl.js'),'--js-library',str(src/'emscripten/library_browser.js'),'-o',str(dest/'classic.mjs')]
if a.test_output:cmd.insert(4,'-DCLASSIC_TEST')
subprocess.run(cmd,cwd=src/'game',env=env,check=True)
# Scoped local identifiers; never publish window.chime/Module or use eval.
parts=['// TSS 0.94.2 / chime pinned source. See credits.html and source.zip.\nexport function createChime(AudioLooper) {\nconst window = {}; let Log;\n', (src/'chime/compat.js').read_text(),'\nLog = window.Log;\n']
for n in ['MasterChannel','TssChannel','TString','TsdPlayer','TssCompiler']:parts.append((src/'tss'/(n+'.js')).read_text().replace('exports.TString = TString;', ''))
api=(src/'chime/api.js').read_text();start=api.index("  if (typeof data === 'string' && data.indexOf('http') == 0) {");end=api.index('  if (data.constructor == Array)',start);api=api[:start]+"  if (typeof data === 'string' && data.indexOf('http') == 0) throw new Error('Only bundled scores are supported');\n"+api[end:];parts.extend([api,'\nreturn window.chime;\n}\n']);(dest/'synth.mjs').write_text('\n'.join(parts))
scores={m[0]:m[1] for m in re.findall(r'<script[^>]*id="([^"]+)"[^>]*>([\s\S]*?)</script>',(src/'scores.html').read_text())};(dest/'scores.json').write_text(json.dumps(scores,ensure_ascii=False,separators=(',',':'))+'\n')
if not a.test_output:
 with zipfile.ZipFile(dest/'source.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for f in sorted(src.rglob('*')):
   if f.is_file() and '__pycache__' not in f.parts:
    info=zipfile.ZipInfo(str(f.relative_to(src)),date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,f.read_bytes())
files=['classic.mjs','classic.wasm','synth.mjs','scores.json'];manifest={n:{'bytes':(dest/n).stat().st_size,'sha256':hashlib.sha256((dest/n).read_bytes()).hexdigest()} for n in files};(dest/'artifacts.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
