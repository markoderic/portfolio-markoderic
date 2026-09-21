// One aperture per device: Three plane, CSS projection, masks and camera fit share it.
// Phone contour follows the loaded display / front-glass seam, not a circular rim.
import phoneAperture from "./assets/phone-aperture.json" with { type: "json" };
// M3: source transforms baked by prepare-laptop.mjs; model scale applied once.
// The 16:10 aperture sits below the physical notch. See report 34 measurements.
export const LAPTOP = {
  position: [-0.58, 0.09367026897125906, -0.18],
  modelScale: 0.08793153957737156,
  screenPosition: [-0.000002851173730498, 1.0166508279507818, -1.4850147216646052],
  screenRotation: [-0.34868353397239815, 0, 0],
  width: 2.99, height: 2.99 / 1.6,
};
export const PHONE = { ...phoneAperture,
  desk: [1.8, .068, .31], picked: [1.15, 1.5, .48], logicalWidth: 430 };
export const phoneAspect = PHONE.width / PHONE.height;
export const phoneLogicalHeight = PHONE.logicalWidth / phoneAspect;
export const phoneClip = `polygon(${PHONE.outline.map(([x, y]) =>
  `${100 * (x / PHONE.width + .5)}% ${100 * (.5 - y / PHONE.height)}%`).join(",")})`;
export const phoneIslandStyle = Object.fromEntries(Object.entries(PHONE.island)
  .map(([key, value]) => [`--phone-island-${key}`, `${100 * value}%`]));
export function fitPhone(viewport) {
  const height = Math.max(1, Math.min(780, viewport.height - 95, (viewport.width - 24) / phoneAspect));
  return { width: height * phoneAspect, height };
}
