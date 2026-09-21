import { cubicBezier } from 'framer-motion';
import * as THREE from 'three';

// Original cabinet footprint retained. Drawer local origin is its front center.
export const CABINET = { x: 3.64, back: -2.275, front: 1.275, travel: 2.35, duration: .38 };
export const DRAWERS = [
  { id: 0, name: 'Top drawer', y: -1.355, height: 1.43 },
  { id: 1, name: 'Middle drawer', y: -3.05, height: 1.64 },
  { id: 2, name: 'Bottom drawer', y: -5, height: 1.88 },
];
const ease = cubicBezier(.32, .72, 0, 1);
export const createDrawerMotion = (open = false) => ({ value: open ? 1 : 0, target: open ? 1 : 0, from: open ? 1 : 0, elapsed: 0, moving: false });
// One writer, no timers or idle interpolation. Retarget from the rendered value.
export function advanceDrawer(state, open, reduced, dt) {
  const target = open ? 1 : 0;
  if (target !== state.target) {
    state.target = target; state.from = state.value; state.elapsed = 0;
    state.moving = state.from !== target;
  }
  if (reduced) { state.value = target; state.moving = false; return state.value; }
  if (!state.moving) return state.value;
  state.elapsed += Math.max(0, Math.min(dt, .05));
  const t = Math.min(1, state.elapsed / CABINET.duration);
  state.value = state.from + (target - state.from) * ease(t);
  if (t >= 1 - 1e-9) { state.value = target; state.moving = false; }
  return state.value;
}
export function drawerAllowed({ view, active, direct, blocked = false, dragging = false }) {
  return view === 'desk' && active && !direct && !blocked && !dragging;
}
export function toggleDrawerState(state, id) {
  return DRAWERS.some(d => d.id === id) ? state.map((v, i) => i === id ? !v : v) : state;
}
export function clearDrawerInput(input) { if (input) { input.drawerHover = null; input.drawerPress = null; } }
// R3F event intersections omit passive furniture. Independently inspect the first
// visible physical mesh, so the desk/carcass/chair can occlude a trigger.
export function exposedDrawer(event, id) {
  if (!event.object || !event.ray) return false;
  let root = event.object; while (root.parent) root = root.parent;
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(); ray.ray.copy(event.ray);
  const hit = ray.intersectObjects(root.children.length ? root.children : [root], true).find(h => {
    for (let o = h.object; o; o = o.parent) if (!o.visible || o.userData.shadowOnly) return false;
    return true;
  });
  return hit?.object.userData.drawerTrigger === id;
}
export function drawerHandlers(id, input, enabled, toggle, exposed = exposedDrawer) {
  const consume = e => { e.stopPropagation(); if(e.nativeEvent) e.nativeEvent.sceneObject = true; };
  const valid = e => enabled && !input.dragging && exposed(e, id);
  const moved = e => { const p = input.drawerPress; if (p?.id === id) p.moved ||= Math.hypot(e.clientX - p.x, e.clientY - p.y) > 5; };
  return {
    onPointerOver(e) { if (valid(e) && e.pointerType !== 'touch') { consume(e); input.drawerHover = id; } },
    onPointerOut() { if(input.drawerHover===id) input.drawerHover=null; if(input.drawerPress?.id===id) input.drawerPress=null; },
    onPointerDown(e) {
      if (!valid(e) || e.button !== 0 || e.isPrimary === false) return;
      consume(e); input.drawerPress = { id, pointerId:e.pointerId, x:e.clientX, y:e.clientY, moved:false };
    },
    onPointerMove(e) { moved(e); },
    onPointerUp(e) { moved(e); },
    onPointerCancel() { clearDrawerInput(input); },
    onClick(e) {
      const p=input.drawerPress; input.drawerPress=null;
      if (!valid(e)) return;
      consume(e);
      if (p?.id===id && !p.moved && Math.hypot(e.clientX-p.x,e.clientY-p.y)<=5 && (e.delta??0)<=5) toggle(id);
    },
  };
}
