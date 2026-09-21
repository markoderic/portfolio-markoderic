# Classic Cat Mario — source and build instructions

Selected game: Toyoshima's classic Syobon Action 0.9.2.0. Exact revisions are in pins.json. This directory contains the modified game, nine original sprite sheets, supplied replacement music scores, original/patched source, runtime library hooks, synth dependencies, notices, integration source and build instructions. It does not include unverified ROMs, original music, or the expanded collection.

## Reproduce game browser artifacts

Prerequisites: Python 3, an **isolated** emsdk 3.1.74 installation with Emscripten revision 1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5. emsdk tag commit 3d6d8ee910466516a53e665b86458faa81dae9ba; installed release c2655005234810c7c42e02a18e4696554abe0352. No npm packages are used by this build. Keep SDK configuration/cache local; no shell-profile or global installation is needed.

From this source directory:

    python3 build.py --emsdk /absolute/path/to/isolated/emsdk

The script checks the compiler version, sets EM_CONFIG and EM_CACHE inside that SDK, compiles game/main.cpp, DxLib.cpp and loadg.cpp, synchronously embeds game/data, and writes classic.mjs, classic.wasm, synth.mjs, scores.json, artifacts.json and deterministic source.zip beside this directory. Its command is the reproducible configuration; no scratch artifact or binary patch is required. JS/Wasm URLs are supplied by the app from Vite's BASE_URL. The generated factory is ES-module/browser-only, modularized, with automatic main disabled. Exported classic entry points are marked EMSCRIPTEN_KEEPALIVE in source.

For diagnostic exports only (not for distribution):

    python3 build.py --emsdk /absolute/path/to/isolated/emsdk --test-output /absolute/path/to/test-build

The CLASSIC_TEST build adds tick/state/held-key/wait probes. Shipping artifacts omit them. Existing game warnings about abs(bool) and logical-not precedence remain; gameplay expressions were not changed.

## Browser integration

The portfolio's Vite asset plugin emits this folder under prototype-vendor/cat-mario/ in both release and local review builds. These assets remain outside public/ in the source checkout. Source ZIP, credits.html and notices remain reachable relative to that path. The game component and runtime are lazy; no game module/Wasm/audio runs on portfolio arrival. The small unchanged player sheet alone is used as the desktop icon.

The integration/ directory supplies the game adapter, component, stylesheet, prototype wiring and package manifests/configuration, with source snapshots of the prototype and focused verification scripts. Game-specific integration code is provided under GPL-2.0; retain the game's GPL text. Bundling/isolation does not by itself determine the license scope of the whole portfolio. The source archive and retained notices are included alongside the browser artifacts.

To rebuild the portfolio in its checkout, retain package-lock.json and dependencies, then run `npm ci` and `npm run build` from app/. The local review entry can also be built with `npx vite build --config vite.prototype.config.js`. The source package is primarily the corresponding source for the shipped game binary and its adapter, not a replacement checkout of the portfolio's unrelated large scene assets and research data.

## Runtime behavior and tests

A single host RAF calls the original alternating loop at fixed 60 Hz: normal 30 game updates/second; the original native Space symbol gives 60. The portfolio now maps keyboard Space to Z (jump/title), without exposing the original speed symbol as a primary UI control. Pauses reset timing; interruptions over 100 ms pause instead of catching up. No level/physics/artwork changes. The host owns listeners, surface cleanup and shared-context synth nodes. It neither exposes global Module/chime nor patches global event APIs. The Emscripten library hooks are reproduced from pinned source via --js-library; their patches are included.

Audio uses the pinned chime/TSS DSP with an injected output-only AudioLooper: two owned ScriptProcessor nodes (2048 and 8192 stereo frames) and one gain connected to the existing shared AudioContext. This is intentionally a small legacy-compatible adapter, not an AudioWorklet rewrite. Browser support/quality is not claimed. Unsupported/failed audio remains silent; gameplay still works. Seven absent scores are accepted as unavailable; no substitutes. Missing BGM invokes the real stop score, missing one-shots do nothing.

In the portfolio checkout run:

    node --experimental-vm-modules scripts/verify-cat-mario-runtime.mjs
    node scripts/verify-cat-mario-input-audio.mjs
    node scripts/verify-cat-mario-wiring.mjs
    node scripts/verify-cat-mario-navigation.mjs
    node scripts/verify-cat-mario-packaging.mjs

The first test needs the separate test-build in docs/redesign/session-30b-cat-mario/. These use actual browser ESM/Wasm and synth with mocked DOM/AudioContext, and actual component callbacks with a mocked runtime. They do not establish native rendering, gameplay completion, focus/touch delivery, audio quality, autoplay or performance.

## Session52 lean launch and window

Opening the focused game now runs its authentic title automatically when ready. A one-use window opening-focus grant expires after intervening action; leaving, hiding, minimizing, menus and keyboard focus loss prevent delayed start. A fresh game press/Enter resumes. The default outer window is482×452 for480×420 content plus measured title/border chrome, with aspect-preserving resize/largest fit constrained by the desktop work area. Primary toolbars/Start/footer were removed; Help contains controls, opt-in touch buttons, restart and credits/source. Back to game resumes after the Help close commit. Game C++, SDL glue, Wasm, synth, scores and artwork are unchanged. Current source/composed verification: scripts/verify-session52-game.mjs and verify-session52-geometry.mjs; native browser acceptance remains pending.
