import * as THREE from "three";
import { fitLanding } from "./paperLanding.js";
import { PAPER_WIDTH, PAPER_HEIGHT } from "./paperGeometry.js";

// The ball deformation's largest radius is scale * (.105 + .018) = .2583.
// Furniture stays fixed. Both cubic handles are over the bin, so the sheet
// clears the left desk edge before descending and approaches the opening vertically.
export const DISPOSAL_LIFT = .4;
export const PAPER_DESK_CLEARANCE = .025;
export const PAPER_REST = [-2.2, PAPER_HEIGHT / 2 + PAPER_DESK_CLEARANCE, 1.7];
const smooth = t => { const u = THREE.MathUtils.clamp(t, 0, 1); return u * u * (3 - 2 * u); };
export function crumpleAmount(progress) { return smooth(progress); }
export function disposalCurve(start, bin, quaternion = new THREE.Quaternion()) {
  const curve = new THREE.CubicBezierCurve3(
    start.clone().add(new THREE.Vector3(0, DISPOSAL_LIFT, 0)),
    new THREE.Vector3(bin[0], 2.7, bin[2]),
    new THREE.Vector3(bin[0], 2.7, bin[2]),
    new THREE.Vector3(bin[0], bin[1] + .61, bin[2]),
  );
  const landing = fitLanding(curve, bin, quaternion);
  const originalPoint = curve.getPoint.bind(curve), begin = .925;
  // Preserve the exact upper arc. Only the final descent eases to contact on
  // that same normalized curve and existing rotation; timing belongs to printTimeline.
  curve.landing = {...landing, begin};
  curve.getPoint = (t, target) => {
    if (t <= begin) return originalPoint(t, target);
    const u = (t - begin) / (1 - begin), d = landing.end - begin;
    const parameter = begin + (u*u*u-2*u*u+u)*(1-begin) + (-2*u*u*u+3*u*u)*d;
    return originalPoint(parameter, target);
  };
  return curve;
}
export function applyDisposalPose(paper, captured, motion) {
  paper.position.copy(captured.position);
  paper.quaternion.copy(captured.quaternion);
  if (motion.phase === "crumple") paper.position.y += DISPOSAL_LIFT * crumpleAmount(motion.progress);
  if (motion.phase === "toss") {
    const t = smooth(motion.progress);
    captured.curve.getPoint(t, paper.position);
    paper.rotateZ(t * 5);
    paper.rotateY(t * 3);
  }
}
// A returned/opening flat sheet can otherwise tilt below the tabletop before
// disposal even starts. Keep its lowest corner above the existing desk without
// changing camera targets, the print feed, page dimensions or the focus framing.
export function keepPaperAboveDesk(paper) {
  const x = new THREE.Vector3(1, 0, 0).applyQuaternion(paper.quaternion);
  const y = new THREE.Vector3(0, 1, 0).applyQuaternion(paper.quaternion);
  paper.position.y = Math.max(paper.position.y,
    Math.abs(x.y) * PAPER_WIDTH / 2 + Math.abs(y.y) * PAPER_HEIGHT / 2 + PAPER_DESK_CLEARANCE);
}
