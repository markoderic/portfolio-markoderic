import { fitGameBounds, gameWindowBounds, resizeGameBounds, GAME_CHROME } from './gameWindowGeometry';
import React, { useLayoutEffect, useRef, useEffect, useState } from "react";
import { registry } from "./AppIcon";
import { localPointer, fitBounds, resizeBounds } from "./windowState";
import { desktopWorkArea } from "./desktopWorkArea";
import { interpolateBounds } from "./interactionMath";
import { dockTarget, stepGenie, paintGenie } from "./genie";
import AppContents from "./apps/AppContents";
export default function WorkspaceWindow({
  w,
  isActive,
  size,
  host,
  action,
  dismiss,
  reduced,
  enabled,
  gameBlocked = false,
  ...content
}) {
  const node = useRef(),
    frame = useRef(),
    drag = useRef();
  const gameLifecycle = useRef(), titleNode = useRef();
  const currentAction = useRef(action); currentAction.current = action;
  const openingFocus = useRef({ element: typeof document === "undefined" ? null : document.activeElement, cancelled: false, claimed: false });
  const claimOpeningFocus = (canvas) => {
    const intent = openingFocus.current;
    if (intent.cancelled || intent.claimed || drag.current || !enabled || !isActive || w.minimized || gameBlocked || document.hidden || !document.hasFocus?.()) return false;
    if (document.activeElement !== intent.element && document.activeElement !== node.current && !(intent.element?.isConnected === false && document.activeElement === document.body)) { intent.cancelled = true; return false; }
    intent.claimed = true; canvas?.focus({ preventScroll: true }); return true;
  };
  useEffect(() => {
    if (w.id !== 'catmario') return;
    const outside = e => { if (!node.current?.contains(e.target)) openingFocus.current.cancelled = true; };
    const leave = () => { openingFocus.current.cancelled = true; };
    const hidden = () => { if (document.hidden) leave(); };
    document.addEventListener?.('pointerdown', outside, true);
    document.addEventListener?.('visibilitychange', hidden);
    globalThis.addEventListener?.('blur', leave);
    return () => { document.removeEventListener?.('pointerdown', outside, true); document.removeEventListener?.('visibilitychange', hidden); globalThis.removeEventListener?.('blur', leave); };
  }, []);
  useLayoutEffect(() => { if (!isActive || w.minimized || gameBlocked) openingFocus.current.cancelled = true; }, [isActive, w.minimized, gameBlocked]);
  useLayoutEffect(() => {
    if (w.id !== 'catmario' || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const n=node.current, title=titleNode.current;
      if (!n?.offsetWidth || !n?.offsetHeight || !title?.offsetHeight) return;
      const chrome={ width:n.offsetWidth-n.clientWidth, height:n.offsetHeight-n.clientHeight+title.offsetHeight };
      const prior=w.chrome||GAME_CHROME;
      if (chrome.width>=0 && chrome.height>0 && (chrome.width!==prior.width||chrome.height!==prior.height)) currentAction.current('window-chrome',w.id,{chrome});
    };
    measure(); const observer=new ResizeObserver(measure); observer.observe(node.current); observer.observe(titleNode.current);
    return () => observer.disconnect();
  }, [w.chrome?.width, w.chrome?.height]);
  const resizeWindow = (...args) => w.id === 'catmario' ? resizeGameBounds(...args, w.chrome) : resizeBounds(...args);
  const [gameMotion, setGameMotion] = useState(false);
  const [compact, setCompact] = useState(() => typeof innerWidth === "number" && innerWidth < 800);
  useEffect(() => {
    const resize = () => setCompact(innerWidth < 800);
    globalThis.addEventListener?.("resize", resize);
    return () => globalThis.removeEventListener?.("resize", resize);
  }, []);
  const area = desktopWorkArea(size);
  const areaKey = [area.x, area.y, area.w, area.h, compact].join(":");
  const previousArea = useRef(areaKey);
  const target = w.id === 'catmario'
    ? w.max || compact ? gameWindowBounds(size, w.chrome, true) : fitGameBounds(w.bounds, size, w.chrome)
    : w.max || compact ? desktopWorkArea(size) : fitBounds(w.bounds, size);
  const live = useRef(target);
  const motion = useRef({ value: w.minimized ? 1 : 0, velocity: 0 });
  const genieFrame = useRef();
  const [moving, setMoving] = useState(false);
  useLayoutEffect(() => {
    cancelAnimationFrame(genieFrame.current);
    const destination = w.minimized ? 1 : 0;
    const render = () => paintGenie(node.current, live.current, dockTarget(host.current, w.id), motion.current.value);
    if (reduced || innerWidth < 800 || motion.current.value === destination && !motion.current.velocity) {
      motion.current = { value: destination, velocity: 0 };
      render(); setMoving(false);
      return;
    }
    setMoving(true);
    render(); // Restore begins at the retained presentation, including mid-flight.
    let last = performance.now();
    const tick = now => {
      motion.current = stepGenie(motion.current, destination, (now-last)/1000);
      last = now;
      render();
      if (!motion.current.done) genieFrame.current = requestAnimationFrame(tick);
      else {
        setMoving(false);
      }
    };
    genieFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(genieFrame.current);
  }, [w.minimized, reduced, size.width, size.height]);
  useEffect(() => {
    // Focus after React removes inert, and only if this app's dock still owns it.
    if (!w.minimized && !moving && enabled && document.activeElement?.dataset?.dock === w.id)
      node.current?.focus({ preventScroll: true });
  }, [w.minimized, moving, enabled]);
  const paint = (b) => {
    b = w.id === 'catmario' ? fitGameBounds(b, size, w.chrome) : fitBounds(b, size);
    live.current = b;
    if (node.current)
      Object.assign(node.current.style, {
        left: `${b.x}px`,
        top: `${b.y}px`,
        width: `${b.w}px`,
        height: `${b.h}px`,
      });
  };
  useLayoutEffect(() => {
    cancelAnimationFrame(frame.current);
    paint(live.current);
    if (previousArea.current !== areaKey) {
      previousArea.current = areaKey;
      // A resized work area ends the old coordinate gesture before new input.
      if (drag.current) finish(true);
    }
    if (drag.current) return;
    if (
      reduced ||
      innerWidth < 800 ||
      (live.current.w === target.w && live.current.h === target.h)
    ) {
      paint(target);
      if (w.id === "catmario") setGameMotion(false);
      return;
    }
    if (w.id === "catmario") { gameLifecycle.current?.(); setGameMotion(true); }
    const from = { ...live.current },
      start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 230);
      paint(interpolateBounds(from, target, t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else if (w.id === "catmario") setGameMotion(false);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target.x, target.y, target.w, target.h, reduced, areaKey]);
  const finish = (cancel = false, pointer) => {
    const d = drag.current;
    if (!d || (pointer !== undefined && d.pointer !== pointer)) return;
    drag.current = null;
    if (cancel === true) paint(d.origin);
    if (d.element.hasPointerCapture(d.pointer))
      d.element.releasePointerCapture(d.pointer);
    action("move", w.id, { position: live.current });
  };
  useEffect(() => {
    if (!enabled) finish(true);
  }, [enabled]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(genieFrame.current);
    },
    [],
  );
  const name = registry[w.id].name;
  return (
    <section
      ref={node}
      className={`mac-window ${isActive ? "is-active" : ""} ${w.max ? "is-max" : ""}`}
      style={{ zIndex: w.z + 2 }}
      tabIndex={-1}
      data-minimizing={moving || w.minimized}
      aria-label={`${name} window`}
      aria-hidden={w.minimized || moving}
      inert={w.minimized || moving ? "" : undefined}
      onPointerDownCapture={(e) => {
        if (w.id === "catmario" && !e.target.closest?.(".cat-play-region")) {
          openingFocus.current.cancelled = true;
          gameLifecycle.current?.();
        }
        if (!isActive) action("focus", w.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented && drag.current) {
          e.preventDefault();
          finish(true);
        }
      }}
      onFocusCapture={() => {
        if (!isActive) action("focus", w.id);
      }}
    >
      <header
        className="window-title"
        ref={titleNode}
        onPointerDown={(e) => {
          if (
            drag.current ||
            e.button !== 0 ||
            e.target.closest(".traffic,button") ||
            w.max ||
            innerWidth < 800
          )
            return;
          const p = localPointer(host.current, e.clientX, e.clientY);
          if (!p) return;
          cancelAnimationFrame(frame.current);
          drag.current = {
            origin: { ...live.current },
            x: p.x - live.current.x,
            y: p.y - live.current.y,
            pointer: e.pointerId,
            element: e.currentTarget,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          // Title-bar preventDefault suppresses native focus; keep Escape routed
          // through the window that owns this gesture, even after switching apps.
          node.current?.focus({ preventScroll: true });
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.pointer !== e.pointerId) return;
          const p = localPointer(host.current, e.clientX, e.clientY);
          if (!p) return;
          paint(
            (w.id === 'catmario' ? fitGameBounds : fitBounds)({ ...live.current, x: p.x - d.x, y: p.y - d.y }, size, w.chrome),
          );
        }}
        onPointerUp={(e) => finish(false, e.pointerId)}
        onPointerCancel={(e) => finish(true, e.pointerId)}
        // Capture can end without cancellation. Retain the last painted location;
        // only pointercancel, Escape or disabling the workspace rolls it back.
        onLostPointerCapture={(e) => finish(!enabled, e.pointerId)}
        onDoubleClick={(e) => {
          if (!e.target.closest(".traffic,button")) {
            finish();
            action("maximize", w.id);
          }
        }}
      >
        <div
          className="traffic"
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            aria-label={`Close ${name}`}
            onClick={() => dismiss("close", w.id)}
          >
            <span>
              <svg viewBox="0 0 12 12">
                <path d="m3.5 3.5 5 5m0-5-5 5" />
              </svg>
            </span>
          </button>
          <button
            aria-label={`Minimize ${name}`}
            onClick={() => dismiss("minimize", w.id)}
          >
            <span>
              <svg viewBox="0 0 12 12">
                <path d="M3 6h6" />
              </svg>
            </span>
          </button>
          <button
            aria-label={`${w.max ? "Restore" : "Maximize"} ${name}`}
            onClick={() => action("maximize", w.id)}
          >
            <span>
              <svg viewBox="0 0 12 12">
                <path
                  d={
                    w.max
                      ? "m2.5 5 2.5-2.5V5Zm7 2L7 9.5V7Z"
                      : "M2.5 5.5v-3h3Zm7 1v3h-3Z"
                  }
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </span>
          </button>
        </div>
        <strong>{name}</strong>
        <span className="window-grip">⠿</span>
      </header>
      {!w.max && !compact &&
        ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((edge) => (
          <div
            key={edge}
            className={`window-resize resize-${edge}`}
            role="separator"
            tabIndex={0}
            aria-label={`Resize ${name} ${edge} edge. Arrow keys resize; Escape cancels dragging.`}
            aria-orientation={
              edge === "n" || edge === "s" ? "horizontal" : "vertical"
            }
            onPointerDown={(e) => {
              if (drag.current || e.button !== 0) return;
              const p = localPointer(host.current, e.clientX, e.clientY);
              if (!p) return;
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.focus();
              cancelAnimationFrame(frame.current);
              drag.current = {
                origin: { ...live.current },
                start: p,
                edge,
                pointer: e.pointerId,
                element: e.currentTarget,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.pointer !== e.pointerId || !d.edge) return;
              const p = localPointer(host.current, e.clientX, e.clientY);
              if (p)
                paint(
                  resizeWindow(
                    d.origin,
                    d.edge,
                    p.x - d.start.x,
                    p.y - d.start.y,
                    size,
                  ),
                );
            }}
            onPointerUp={(e) => finish(false, e?.pointerId)}
            onPointerCancel={(e) => finish(true, e?.pointerId)}
            onLostPointerCapture={(e) => finish(true, e?.pointerId)}
            onKeyDown={(e) => {
              const delta = {
                ArrowLeft: [-12, 0],
                ArrowRight: [12, 0],
                ArrowUp: [0, -12],
                ArrowDown: [0, 12],
              }[e.key];
              if (!delta) return;
              e.preventDefault();
              const b = resizeWindow(live.current, edge, ...delta, size);
              paint(b);
              action("move", w.id, { position: b });
            }}
          />
        ))}
      <div className="window-content">
        <AppContents
          {...content}
          id={w.id}
          initialSection={w.initialSection}
          onClose={() => dismiss("close", w.id)}
          enabled={enabled && !w.minimized && !moving}
          claimOpeningFocus={claimOpeningFocus}
          gameEligible={enabled && isActive && !w.minimized && !moving && !gameMotion && !gameBlocked && !drag.current}
          gameLifecycle={gameLifecycle}
          onMaximize={() => action("maximize", w.id)}
          maximized={w.max}
        />
      </div>
    </section>
  );
}
