import * as THREE from "three";

// Desk-only tuning. Device/printer/paper fits remain owned by Rig.
export const DESK_CAMERA = {
  // Same elevated perspective, 18% closer; target balances top/bottom space.
  eye: [9.642, 10.674, 17.4], look: [.95, -2.2, 1],
  cycle: 40, yaw: .12, pitch: .025, approach: .035,
  hoverHysteresis: 12, response: 4.5, maxDelta: .1,
};
export const createDeskInput = () => ({
  pointer: null, serial: 0, dragging: false, pressing: false,
  ui: false, hidden: false, manual: false, liveOrbit: { yaw: 0, pitch: 0 },
  reset: 0,
});
export function clearDeskPointer(input) { input.pointer = null; input.serial++; }
export function recordDeskPointer(input, event, rect) {
  if (event.pointerType !== "mouse" || event.buttons || input.dragging) {
    clearDeskPointer(input); return;
  }
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  if (input.pointer?.x === x && input.pointer?.y === y) return;
  input.pointer = { x, y, width: rect.width, height: rect.height };
  input.serial++;
}
export function deskAngles(time) {
  const phase = time * Math.PI * 2 / DESK_CAMERA.cycle;
  return { yaw: DESK_CAMERA.yaw * Math.sin(phase), pitch: DESK_CAMERA.pitch * Math.sin(2 * phase) };
}
export function deskPose(size, angles = { yaw: 0, pitch: 0 }, hover = null) {
  const look = new THREE.Vector3(...DESK_CAMERA.look);
  const offset = new THREE.Vector3(...DESK_CAMERA.eye).sub(look);
  const sphere = new THREE.Spherical().setFromVector3(offset);
  sphere.theta += angles.yaw; sphere.phi += angles.pitch;
  // Preserve vertical composition on wide screens; pull back on narrow ones.
  // Retain full orbit angles. Ease out only beyond the autonomous arc so
  // extreme manual views keep chair/plant edges without shrinking the overview.
  const yawEdge = Math.max(0, Math.abs(angles.yaw) - DESK_CAMERA.yaw) / .36;
  const pitchEdge = Math.max(0, Math.abs(angles.pitch) - DESK_CAMERA.pitch) / .195;
  sphere.radius *= Math.max(1, 1.45 / (size.width / size.height)) *
    (1 + .075 * yawEdge ** 2 + .025 * pitchEdge ** 2);
  const position = look.clone().add(offset.setFromSpherical(sphere));
  if (hover) {
    // Dolly eye AND look about the object: its projected center stays put.
    position.lerp(hover, DESK_CAMERA.approach);
    look.lerp(hover, DESK_CAMERA.approach);
  }
  return { position, look };
}
export function createDeskMotion() {
  return { time: 0, serial: -1, hover: null, anchor: null, hitCamera: null,
    reset: 0, active: false, width: 0, height: 0, ray: new THREE.Raycaster() };
}
function visible(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}
// Exact mesh raycast, including noninteractive furniture as occluders. Only run
// on real pointer movement; never refresh intersections because the camera moved.
export function deskHit(state, camera, scene, pointer) {
  state.ray.setFromCamera(new THREE.Vector2(pointer.x / pointer.width * 2 - 1, 1 - pointer.y / pointer.height * 2), camera);
  const hit = state.ray.intersectObjects(scene.children, true).find(h => visible(h.object));
  let root = hit?.object;
  while (root && !root.userData.deskTarget) root = root.parent;
  return root ? { id: root.userData.deskTarget, point: new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()) } : null;
}
export function updateDeskMotion(state, { dt, camera, scene, size, input, orbit, active, paused, blocked, reduced, direct }) {
  const safeDelta = !input.hidden && dt >= 0 && dt <= DESK_CAMERA.maxDelta ? dt : 0;
  const disabled = state.reset !== input.reset || !active || !state.active || reduced || direct || paused || blocked || input.hidden || input.manual || input.dragging || input.pressing || input.ui;
  const resized = state.width !== size.width || state.height !== size.height;
  if (!active || disabled || resized || state.reset !== input.reset) {
    state.hover = null; state.anchor = null; state.hitCamera = null;
    // Consume old pointer samples; leaving focus/UI never reacquires stale hover.
    state.serial = input.serial;
  }
  if (state.reset !== input.reset) { state.time = 0; state.active = false; state.reset = input.reset; }
  if (!disabled && state.serial !== input.serial) {
    state.serial = input.serial;
    const pointer = input.pointer;
    if (!pointer) { state.hover = null; state.anchor = null; state.hitCamera = null; }
    else {
      const hit = scene ? deskHit(state, state.hitCamera || camera, scene, pointer) : null;
      const same = hit?.id === state.hover?.id;
      const departed = !state.anchor || Math.hypot(pointer.x - state.anchor.x, pointer.y - state.anchor.y) >= DESK_CAMERA.hoverHysteresis;
      if (same || departed) {
        if (hit) {
          state.hitCamera ||= camera.clone(); state.hitCamera.updateMatrixWorld();
          state.hover = hit; state.anchor = { x: pointer.x, y: pointer.y };
        } else { state.hover = null; state.anchor = null; state.hitCamera = null; }
      }
    }
  }
  // A visible transition back to desk completes before passive motion resumes.
  if (!disabled && !state.hover && state.active && safeDelta) state.time = (state.time + safeDelta) % DESK_CAMERA.cycle;
  const angles = input.manual ? orbit : deskAngles(state.time);
  input.liveOrbit = { ...angles };
  state.width = size.width; state.height = size.height;
  return { ...deskPose(size, reduced || direct ? { yaw: 0, pitch: 0 } : angles, state.hover?.point), safeDelta };
}
