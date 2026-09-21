import { fitGameBounds, gameWindowBounds } from './gameWindowGeometry.js';
import { desktopWorkArea } from './desktopWorkArea.js';
// Bounds are display-local CSS pixels, independent of the projected screen scale.
export function fitBounds(bounds, size) {
  const area = desktopWorkArea(size);
  const w = Math.min(Math.max(280, bounds.w), area.w);
  const h = Math.min(Math.max(180, bounds.h), area.h);
  return {
    x: Math.max(area.x, Math.min(bounds.x, area.x + area.w - w)),
    y: Math.max(area.y, Math.min(bounds.y, area.y + area.h - h)),
    w,
    h,
  };
}
export function windowReducer(state, action) {
  const { id } = action;
  const size = { ...action.size, chrome: action.size?.chrome ?? state.chrome };
  const raise = (windows, active = id) => ({
    ...state,
    chrome: size.chrome,
    windows,
    active,
    serial: state.serial + 1,
  });
  if (action.type === "open") {
    const old = state.windows.find((w) => w.id === id);
    return raise(
      old
        ? state.windows.map((w) =>
            w.id === id ? { ...w, bounds: w.id === 'catmario' ? fitGameBounds(w.bounds, size, w.chrome) : fitBounds(w.bounds, size), minimized: false, z: state.serial + 1 } : w,
          )
        : [
            ...state.windows,
            {
              id,
              z: state.serial + 1,
              minimized: false,
              initialSection: action.initialSection,
              max: false,
              bounds: id === 'catmario' ? gameWindowBounds(size) : fitBounds(
                {
                  x: 30 + state.windows.length * 22,
                  y: 48 + state.windows.length * 18,
                  w: size.width * 0.85,
                  h: size.height * 0.78,
                },
                size,
              ),
            },
          ],
    );
  }
  if (action.type === "focus")
    return raise(
      state.windows.map((w) =>
        w.id === id ? { ...w, z: state.serial + 1 } : w,
      ),
    );
  if (action.type === "close" || action.type === "minimize") {
    const windows =
      action.type === "close"
        ? state.windows.filter((w) => w.id !== id)
        : state.windows.map((w) =>
            w.id === id ? { ...w, minimized: true } : w,
          );
    const active =
      windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ||
      null;
    return raise(windows, active);
  }
  if (action.type === "resize" || action.type === "reset")
    return {
      ...state,
      chrome: size.chrome,
      windows: state.windows.map((w, i) => ({
        ...w,
        bounds: (w.id === 'catmario' ? fitGameBounds : fitBounds)(
          action.type === "reset"
            ? { ...w.bounds, x: 22 + i * 16, y: 40 + i * 16 }
            : w.bounds,
          size, w.chrome,
        ),
      })),
    };
  return {
    ...state,
    windows: state.windows.map((w) =>
      w.id !== id
        ? w
        : action.type === "maximize"
          ? { ...w, max: !w.max }
          : action.type === "window-chrome" && w.id === "catmario"
            ? { ...w, chrome: action.chrome, bounds: fitGameBounds(w.bounds, size, action.chrome) }
          : action.type === "move"
            ? {
                ...w,
                bounds: (w.id === 'catmario' ? fitGameBounds : fitBounds)({ ...w.bounds, ...action.position }, size, w.chrome),
              }
            : w,
    ),
  };
}
// Invert the 2D projective homography, including the perspective divide.
export function unprojectPoint(m, x, y) {
  const a = m[0] - x * m[3],
    b = m[4] - x * m[7],
    c = x * m[15] - m[12];
  const d = m[1] - y * m[3],
    e = m[5] - y * m[7],
    f = y * m[15] - m[13];
  const det = a * e - b * d;
  if (Math.abs(det) < 1e-9) return null;
  return { x: (c * e - b * f) / det, y: (a * f - c * d) / det };
}
export function localPointer(host, x, y) {
  const transform = getComputedStyle(host).transform;
  if (transform === "none" || host.closest(".direct-view")) {
    const r = host.getBoundingClientRect();
    return {
      x: ((x - r.left) * host.offsetWidth) / r.width,
      y: ((y - r.top) * host.offsetHeight) / r.height,
    };
  }
  return unprojectPoint(new DOMMatrix(transform).toFloat64Array(), x, y);
}

// Keep the opposite edge anchored; limits clamp size, never attract a drag to corners.
export function resizeBounds(start, edge, dx, dy, size) {
  const area = desktopWorkArea(size);
  start = fitBounds(start, size);
  const minW = Math.min(360, start.w, area.w),
    minH = Math.min(240, start.h, area.h);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  let left = start.x,
    right = start.x + start.w,
    top = start.y,
    bottom = start.y + start.h;
  if (edge.includes("e"))
    right = clamp(
      right + dx,
      left + minW,
      area.x + area.w,
    );
  if (edge.includes("w"))
    left = clamp(left + dx, area.x, right - minW);
  if (edge.includes("s"))
    bottom = clamp(bottom + dy, top + minH, area.y + area.h);
  if (edge.includes("n"))
    top = clamp(
      top + dy,
      area.y,
      bottom - minH,
    );
  return { x: left, y: top, w: right - left, h: bottom - top };
}

// Evaluated once at mount, never on focus/return. Explicit links own their destination.
export function initialWindows(route, size, fresh) {
  const empty = { windows: [], active: null, serial: 0 };
  const id = route.app || (fresh ? "finder" : null);
  return id ? windowReducer(empty, { type: "open", id, size, initialSection: fresh ? "about" : undefined }) : empty;
}
