// Real initial-view milestones. Project/video application chunks remain lazy.
export const entryStages = [
  ["desk", "Desk / environment"],
  ["laptop", "Laptop workspace"],
  ["phone", "Phone model"],
  ["resources", "Application resources"],
];
export function entryStatus(
  stages,
  { loading = false, errors = [], failed = false } = {},
) {
  const hasError = failed || errors.length > 0;
  const ready =
    !hasError && !loading && entryStages.every(([id]) => stages[id]);
  return {
    ready,
    hasError,
    message: hasError
      ? "Some resources could not load. Simple view is available."
      : ready
        ? "Ready. Enter workspace to continue."
        : "Initializing workspace. Enter skips loading.",
  };
}

// The visible laptop milestone includes the mounted desktop and loaded model.
// Cached callbacks can arrive in either order; neither alone claims readiness.
export function recordEntryStage(stages, id) {
  if (stages[id]) return stages;
  const next = { ...stages, [id]: true };
  if (next.workspace && next.laptopModel) next.laptop = true;
  return next;
}

// One lifecycle owner; synchronous transitions also reject repeated DOM events
// before React commits. Readiness is derived from resources, never a timer.
export const createEntry = fresh => ({ phase: fresh ? 'terminal' : 'active', token: 0, skipped: false });
export function transitionEntry(entry, action, token) {
  if (action === 'confirm' && entry.phase === 'terminal') {
    entry.phase = 'arriving'; entry.token++; return true;
  }
  if (action === 'complete' && entry.phase === 'arriving' && token === entry.token) {
    entry.phase = 'active'; return true;
  }
  if (action === 'skip' && entry.phase !== 'active') {
    entry.skipped = entry.phase === 'terminal'; entry.phase = 'active'; entry.token++; return true;
  }
  if (action === 'cancel') { entry.phase = 'active'; entry.token++; return true; }
  return false;
}
export const entryExcluded = target => !!target?.closest?.('button,a,input,textarea,select,nav,[contenteditable],.screen-host,.context-nav,[data-entry-control]');
export const entryComposing = e => e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229;
export function consumeEntryEvent(e) { e?.preventDefault?.(); e?.stopPropagation?.(); }
