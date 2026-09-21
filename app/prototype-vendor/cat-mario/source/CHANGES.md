# Changes from the pinned classic port

- Preserve the selected source's levels, collision expressions, character/trap behavior and PNG bytes.
- Apply report 96's byte casts for SDL_Color and matching delete[]; omit unused native mixer initialization/free calls on the web path.
- Explicit classic_start/pause/key/release/tick/dispose and at-title query. Initialize without automatic entry/loop/audio. Fixed 60 Hz callbacks remain outside C++; the original alternating loop and Space double-speed behavior remain inside it. Test-only counters/state/wait probes are conditional on CLASSIC_TEST.
- Replace the broken web wait-event polling with a waiting latch released by a fresh keydown. Pause clears held keys; disposal is idempotent.
- Instance-contained Module.classicSound callback in place of global PlaySound.
- Override pinned Emscripten SDL/browser JS libraries through supported --js-library build inputs. Listener creation uses Module.classicListen so the host can remove exactly its own registrations. classicInput bypasses SDL input listeners and pointer-lock/fullscreen setup. No global API monkey-patches or harness facades ship.
- Modern browser-only modular ES build with embedded PNGs and decoder/free exports. No CommonJS glue, Node requirement, scratch path or probe interface in the shipping artifact.
- Locally scoped TSS/chime browser module retains original DSP. build.py removes the unconditional TString CommonJS export and replaces the optional URL-fetch branch with a local-only rejection. The original dependency sources are retained unchanged. Injected AudioLooper owns no context; the host connects/disconnects two bounded output nodes on the shared context.
- Add the prototype app, icon, route, desktop/Dock registration, responsive canvas, explicit Start/Resume/Restart, focus/touch/input owner and game-specific window eligibility. Do not change other apps' enabled semantics.
- Package pins, inventory, credits/licenses, game/library diffs, source and reproducible build script. No new application dependencies.

## Session 40 application launch repair (2026-09-20)

The portfolio wrapper now retains its initial lazy record outside suspended instance state, owns an inner Suspense fallback and a cancellable 20-second application-load deadline, and creates a fresh record only for explicit retry. Shipped game/synth/Wasm and gameplay are unchanged. Integration snapshots include the updated wrapper and offline real-React reconciliation/composed shipping-engine checks. These checks use simulated host nodes, canvas, focus and local file transport; they do not claim native browser verification. See portfolio report 121 for the saved pre-fix fixture and evidence.

## Session 50 input, resume and title containment (2026-09-21)

The host adapter uses the pinned Emscripten SDL compatibility arrow/F1 symbols (1024 plus scancode), replacing incorrect SDL1 numbers. Keyboard Space aliases Z for title/jump; original C gameplay/speed behavior is unchanged. A deliberate game-surface press refocuses and resumes a paused eligible game, allowing one frame for parent window activation. Visibility/eligibility alone does not resume. The owned SDL caption callback delegates to Module.classicSetTitle; the portfolio supplies a no-op so game initialization does not overwrite its document title. Default standalone caption behavior and credits remain.

Session50 evidence executes actual WorkspaceWindow/AppContents/CatMario with the installed React reconciler and shipping ESM/Wasm, recording SDL player draw destinations through modeled host/canvas transport. This is not native gameplay, pixel rendering or listening verification. Full current evidence is portfolio report144.

## Session52 direct game launch and game-shaped window

The portfolio initializes/runs the focused ready game without an outer Start step, preserves the game's own title screen, and moves redundant controls/credits to Help. A cancelled opening or lost focus never starts on late readiness; explicit return/refocus resumes. Windows fit480:420 plus measured chrome through default, largest-fit and resize paths. Original game binary, artwork, SDL/input/title hooks, audio and engine remain unchanged. Included adapter/window snapshots and offline verification reflect the current integration.
