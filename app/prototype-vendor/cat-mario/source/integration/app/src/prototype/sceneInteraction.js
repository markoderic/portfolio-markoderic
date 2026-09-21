export function orbitPose(yaw, pitch) {
  return {
    yaw: Math.max(-0.48, Math.min(0.48, yaw)),
    pitch: Math.max(-0.16, Math.min(0.22, pitch)),
  };
}
export function paperState(state, action) {
  if (action === "disposed") return { ...state, completed: false };
  if (action === "start") return { ...state, printing: true, progress: 0 };
  if (action === "complete")
    return { ...state, printing: false, completed: true, progress: 1 };
  if (action === "cancel")
    return { ...state, printing: false, progress: state.completed ? 1 : 0 };
  if (action === "open") return { ...state, printing: false };
  return state;
}
export function zoomPaper(zoom, action) {
  return action === "fit"
    ? 1
    : Math.max(
        1,
        Math.min(
          2.2,
          Math.round((zoom + (action === "in" ? 0.2 : -0.2)) * 10) / 10,
        ),
      );
}
export function trackpadTarget(target) {
  return (
    !!target?.closest?.(".mac-desktop") &&
    !target.closest('.phone-host,[data-sound="lamp"],[data-launcher]') &&
    !!target.closest("button,a,.window-title")
  );
}

export const PRINT_TIMING = Object.freeze({ crumple: 200, toss: 800, feed: 2000 });
export const DISPOSAL_DURATION = PRINT_TIMING.crumple + PRINT_TIMING.toss;
export function printTimeline(elapsed, replace = false, reduced = false, discardOnly = false) {
  const disposal = replace && !reduced ? DISPOSAL_DURATION : 0;
  const feed = reduced || discardOnly ? 0 : PRINT_TIMING.feed;
  if (elapsed < disposal)
    return elapsed < PRINT_TIMING.crumple
      ? { phase: "crumple", progress: elapsed / PRINT_TIMING.crumple }
      : { phase: "toss", progress: (elapsed - PRINT_TIMING.crumple) / PRINT_TIMING.toss };
  if (elapsed < disposal + feed)
    return { phase: "feed", progress: (elapsed - disposal) / feed };
  return { phase: "complete", progress: 1 };
}
// Parent may cross the entire final interval between renders. Keep a terminal
// toss until Rig has actually applied the fitted pose, deformation and visibility.
// Wall-clock feed timing stays unchanged; hidden/direct jobs do not wait for a mesh.
export function presentPrintMotion(job, motion, physical) {
  if (job.replace && physical && !job.contactPresented &&
      (motion.phase === "feed" || motion.phase === "complete"))
    return { phase: "toss", progress: 1, terminal: true, job };
  return { ...motion, job };
}
export function acknowledgePaperMotion(motion, physical) {
  if (physical && motion.terminal && motion.job) motion.job.contactPresented = true;
}

// Settle before the first frame only. Camera reframing/resize never restarts disposal or feed.
export function advancePrintJob(job, now, settled, reduced = false) {
  if (job.startedAt === undefined) {
    if (!settled) return null;
    job.startedAt = now;
  }
  return printTimeline(now - job.startedAt, job.replace, reduced, job.discardOnly);
}
