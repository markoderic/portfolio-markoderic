// Deterministic callback harness, not a browser or React DOM renderer.
// Used to exercise component event wiring with injected state and pointer capture.
let active;
const slot = (init) => {
  const i = active.cursor++;
  return (active.slots[i] ||= init());
};
export function useRef(value) {
  return slot(() => ({ current: value }));
}
export function useState(value) {
  const s = slot(() => ({
    value: typeof value === "function" ? value() : value,
  }));
  return [
    s.value,
    (v) => {
      s.value = typeof v === "function" ? v(s.value) : v;
    },
  ];
}
export function useReducer(reducer, value, init) {
  const [s, set] = useState(() => (init ? init(value) : value));
  return [s, (a) => set((old) => reducer(old, a))];
}
export function useMemo(fn, deps) {
  const s = slot(() => ({}));
  if (!s.deps || deps.some((v, i) => v !== s.deps[i])) {
    s.value = fn();
    s.deps = deps;
  }
  return s.value;
}
export const useCallback = (fn, deps) => useMemo(() => fn, deps);
export function useEffect(fn, deps) {
  const s = slot(() => ({}));
  if (!s.deps || !deps || deps.some((v, i) => v !== s.deps[i])) {
    s.deps = deps;
    active.passive.push(() => { s.cleanup?.(); s.cleanup = fn(); });
  }
} // No implicit effects: tests must explicitly flush with local IO stubs.
export function useLayoutEffect(fn) {
  active.effects.push(fn);
  slot(() => ({}));
}
export const createElement = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.flat(Infinity) },
});
export const lazy = (loader) => ({ loader });
export const Suspense = Symbol("suspense");
export class Component {}
export function harness(Component, props) {
  const h = { slots: [], cursor: 0, effects: [], passive: [], props, tree: null };
  h.render = (extra = {}, layout = false) => {
    h.props = { ...h.props, ...extra };
    h.cursor = 0;
    h.effects = [];
    active = h;
    h.tree = Component(h.props);
    active = null;
    if (layout) {
      for (const n of nodes(h.tree))
        if (n.props?.ref) n.props.ref.current ||= captureNode();
      h.effects.forEach((fn) => fn());
    }
    return h.tree;
  };
  h.flushEffects = () => { const pending = h.passive.splice(0); pending.forEach(fn => fn()); };
  h.render();
  return h;
}
export function* nodes(tree) {
  if (!tree || typeof tree !== "object") return;
  yield tree;
  for (const child of tree.props?.children || []) yield* nodes(child);
}
export const find = (h, predicate) => [...nodes(h.tree)].find(predicate);
export const captureNode = () => ({
  style: {},
  held: false,
  setPointerCapture() {
    this.held = true;
  },
  hasPointerCapture() {
    return this.held;
  },
  releasePointerCapture() {
    this.held = false;
  },
  focus() {},
});
export default { createElement, Component };
export const useId = () => useRef("test-id").current;
