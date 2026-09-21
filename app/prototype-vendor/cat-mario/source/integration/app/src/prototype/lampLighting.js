// One physical head frame owns both the visible diffuser and its local light.
export const LAMP_LIGHT = {
  position: [3.4, .01, -1.05], head: [-.52, 1.72, -.15], tilt: -.95, pitch: -.5,
  diffuserY: -.235, diffuserRadius: .26, openingY: -.26,
  source: [0, -.275, 0], target: [0, -3, 0],
  color: '#ffce86', intensity: 96, emission: 3,
  angle: 1.12, penumbra: .40, distance: 10, decay: 2,
};
export function advanceLamp(current, night, reduced, dt) {
  return current + ((night ? 1 : 0) - current) *
    (reduced ? 1 : 1 - Math.exp(-5 * Math.max(0, Math.min(dt, .05))));
}
