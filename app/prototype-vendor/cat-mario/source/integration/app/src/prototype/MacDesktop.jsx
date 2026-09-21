import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import AppIcon, { registry } from "./AppIcon";
import CalendarPanel from "./apps/CalendarPanel";
import WorkspaceWindow from "./WorkspaceWindow";
import DesktopItems from "./DesktopItems";
import { createDesktopPressAudio } from "./desktopPressAudio";
import { DESKTOP_CHROME, measureDesktopChrome } from "./desktopWorkArea";
export default function MacDesktop({
  onStageReady,
  mail,
  setMail,
  sendMail,
  requestMeeting,
  reduced,
  enabled,
  desktopBlocked = false,
  manager,
  dispatch,
  size,
  host,
  open,
  navigate,
  onResume,
  night,
  onLamp,
  sound,
  setSound,
  simple,
  onSimple,
  notchScreen,
}) {
  const menuBar = useRef(), dock = useRef(), currentChrome = useRef(), calendarTrigger = useRef();
  currentChrome.current = manager.chrome;
  const windowSize = { ...size, chrome: manager.chrome };
  useLayoutEffect(() => {
    const measure = () => {
      const chrome = measureDesktopChrome(menuBar.current, dock.current, size);
      if (!chrome || chrome.menuBottom === currentChrome.current?.menuBottom && chrome.dockInset === currentChrome.current?.dockInset) return;
      currentChrome.current = chrome;
      dispatch({ type: "resize", size: { ...size, chrome } });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (menuBar.current) observer.observe(menuBar.current);
    if (dock.current) observer.observe(dock.current);
    return () => observer.disconnect();
  }, [size.width, size.height, dispatch]);
  const pressState = useRef();
  pressState.current = {enabled, blocked: desktopBlocked, preferences: sound};
  const pressAudio = useMemo(() => createDesktopPressAudio(() => ({...pressState.current, hidden: !!document.hidden})), []);
  useEffect(() => {
    pressAudio.mount();
    const up = e => pressAudio.up(e), cancel = e => pressAudio.cancel(e.pointerId), leave = () => pressAudio.cancel();
    const visibility = () => { if (document.hidden) leave(); };
    addEventListener("pointerup", up, true);
    addEventListener("pointercancel", cancel, true);
    addEventListener("blur", leave);
    addEventListener("pagehide", leave);
    document.addEventListener?.("visibilitychange", visibility);
    return () => {
      removeEventListener("pointerup", up, true); removeEventListener("pointercancel", cancel, true);
      removeEventListener("blur", leave); removeEventListener("pagehide", leave);
      document.removeEventListener?.("visibilitychange", visibility); pressAudio.dispose();
    };
  }, [pressAudio]);
  useEffect(() => pressAudio.sync(), [pressAudio, enabled, desktopBlocked, sound]);
  useEffect(() => {
    onStageReady?.("workspace");
  }, [onStageReady]);
  const [calendar, setCalendar] = useState(false);
  const [menu, setMenu] = useState(null),
    [now, setNow] = useState(new Date());
  const desktopItems = useRef();
  const menuRef = useRef();
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!enabled) setMenu(null);
    if (!enabled || desktopBlocked) setCalendar(false);
  }, [enabled, desktopBlocked]);
  useEffect(() => {
    if (menu) menuRef.current?.querySelector("button,input,a")?.focus();
  }, [menu]);
  const active = manager.windows.find(
    (w) => w.id === manager.active && !w.minimized,
  );
  const action = (type, id = manager.active, extra = {}) =>
    dispatch({ type, id, size: windowSize, ...extra });
  function dismiss(type, id) {
    action(type, id);
    requestAnimationFrame(() =>
      document.querySelector(`[data-dock="${id}"]`)?.focus(),
    );
  }
  const perform = (fn) => () => {
    setMenu(null);
    fn();
  };
  const menus = {
    System: [
      ["About Marko", () => open("finder", "about")],
      ["View Resume", onResume],
      ["Contact", () => open("mail")],
    ],
    File: [
      ["Open Finder", () => open("finder")],
      ["View Resume", onResume],
      ...(active ? [["Close window", () => dismiss("close", active.id)]] : []),
    ],
    Edit: [
      [
        "Find in active app",
        () => {
          window.dispatchEvent(
            new CustomEvent("workspace-command", {
              detail: { app: manager.active, command: "find" },
            }),
          );
          requestAnimationFrame(() =>
            document
              .querySelector('.mac-window.is-active input[type="search"]')
              ?.focus(),
          );
        },
      ],
    ],
    View: [
      ["Arrange desktop icons", () => desktopItems.current?.arrange()],
      ["Desk", () => navigate("desk")],
      ["Phone", () => navigate("phone")],
      [simple ? "Use 3D view" : "Simple view", onSimple],
    ],
    Window: [
      ["Reset positions", () => action("reset")],
      ...(active
        ? [
            ["Minimize", () => dismiss("minimize", active.id)],
            ["Maximize / Restore", () => action("maximize")],
            [
              "Move left",
              () =>
                action("move", active.id, {
                  position: { x: active.bounds.x - 24 },
                }),
            ],
            [
              "Move right",
              () =>
                action("move", active.id, {
                  position: { x: active.bounds.x + 24 },
                }),
            ],
            [
              "Move up",
              () =>
                action("move", active.id, {
                  position: { y: active.bounds.y - 24 },
                }),
            ],
            [
              "Move down",
              () =>
                action("move", active.id, {
                  position: { y: active.bounds.y + 24 },
                }),
            ],
          ]
        : []),
      ...manager.windows.map((w) => [
        registry[w.id].name + (w.minimized ? " (minimized)" : ""),
        () => open(w.id),
      ]),
    ],
    Help: [["Controls & credits", () => open("controls")]],
  };
  return (
    <section
      className="mac-desktop"
      style={{ "--desktop-menu-height": `${DESKTOP_CHROME.menuHeight}px`, "--desktop-dock-height": `${DESKTOP_CHROME.dockHeight}px`, "--desktop-dock-bottom": `${DESKTOP_CHROME.dockBottom}px` }}
      tabIndex={-1}
      aria-label="Mac desktop"
      onPointerDownCapture={(e) => {
        pressAudio.down(e);
        if (e.isPrimary !== false && !e.target.closest?.(".desktop-items")) desktopItems.current?.cancel();
      }}
      onPointerUpCapture={e => pressAudio.up(e)}
      onPointerCancelCapture={e => pressAudio.cancel(e.pointerId)}
      onLostPointerCaptureCapture={e => pressAudio.cancel(e.pointerId)}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        if (e.repeat || e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.ctrlKey || e.altKey || e.metaKey) return;
        if (desktopItems.current?.cancel()) { e.preventDefault(); e.stopPropagation(); return; }
        if (menu) {
          e.stopPropagation();
          setMenu(null);
          document.querySelector(`[data-menu="${menu}"]`)?.focus();
        } else if (calendar) {
          e.preventDefault();
          e.stopPropagation();
          setCalendar(false);
          if (enabled && !desktopBlocked) calendarTrigger.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div className="mac-menu-bar" ref={menuBar}>
        <div className="mac-menu-left">
          {[
            "System",
            registry[manager.active]?.name || "Finder",
            "File",
            "Edit",
            "View",
            "Window",
            "Help",
          ].map((label, i) =>
            i === 1 ? (
              <strong key="active">{label}</strong>
            ) : (
              <button
                key={label}
                data-menu={label}
                aria-label={label === "System" ? "System menu" : undefined}
                aria-expanded={menu === label}
                onClick={() => setMenu(menu === label ? null : label)}
              >
                {label === "System" ? "◈" : label}
              </button>
            ),
          )}
        </div>
        <div className="mac-status">
          <button
            data-menu="Control Center"
            aria-label="Control Center"
            aria-expanded={menu === "Control Center"}
            onClick={() =>
              setMenu(menu === "Control Center" ? null : "Control Center")
            }
          >
            <svg width="17" height="14" viewBox="0 0 20 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.25">
              <rect x="4" y="1.5" width="12" height="5" rx="2.5"/><circle cx="7" cy="4" r="1.5" fill="currentColor" stroke="none"/>
              <rect x="4" y="9.5" width="12" height="5" rx="2.5"/><circle cx="13" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button
            data-calendar-trigger
            ref={calendarTrigger}
            aria-label="Open calendar and schedule a conversation"
            aria-expanded={calendar && enabled && !desktopBlocked}
            onClick={() => {
              setMenu(null);
              setCalendar((v) => !v);
            }}
          >
            <time>
              {now.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              &nbsp;
              {now.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </button>
        </div>
      </div>
      <CalendarPanel
        visible={calendar && enabled && !desktopBlocked}
        focusAllowed={!menu}
        now={now}
        close={() => {
          setCalendar(false);
          if (enabled && !desktopBlocked) calendarTrigger.current?.focus({ preventScroll: true });
        }}
        requestMeeting={requestMeeting}
      />
      {menu && (
        <>
          <button
            className="menu-dismiss"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setMenu(null)}
          />
          <div
            ref={menuRef}
            className={`mac-popover ${menu === "Control Center" ? "control-center" : ""}`}
            aria-label={menu}
          >
            {menu === "Control Center" ? (
              <>
                <strong>Control Center</strong>
                <button aria-pressed={night} onClick={onLamp}>
                  {night ? "Dark appearance" : "Light appearance"}
                </button>
                <button
                  aria-pressed={sound.muted}
                  onClick={() => setSound({ ...sound, muted: !sound.muted })}
                >
                  {sound.muted ? "Unmute sound" : "Mute sound"}
                </button>
                <label>
                  Volume
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={sound.volume}
                    onChange={(e) =>
                      setSound({ ...sound, volume: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            ) : (
              menus[menu]?.map(([name, fn]) => (
                <button
                  key={name}
                  disabled={
                    name === "Find in active app" &&
                    ![
                      "finder",
                      "premiere",
                      "vscode",
                      "xcode",
                      "youtube",
                    ].includes(manager.active)
                  }
                  onClick={perform(fn)}
                >
                  {name}
                </button>
              ))
            )}
          </div>
        </>
      )}
      <DesktopItems controller={desktopItems} host={host} size={size}
        enabled={enabled && !desktopBlocked && !menu && !calendar}
        activate={() => { /* The desktop pointer owner already supplies paired feedback. */ }}
        launch={id => id === "preview" ? onResume() : open(id)} />
      {manager.windows.map((w) => (
        <WorkspaceWindow
          key={w.id}
          w={w}
          isActive={w.id === manager.active}
          size={windowSize}
          host={host}
          action={action}
          dismiss={dismiss}
          reduced={reduced}
          enabled={enabled}
          gameBlocked={desktopBlocked || !!menu || calendar}
          sound={sound}
          open={open}
          navigate={navigate}
          onResume={onResume}
          mail={mail}
          setMail={setMail}
          sendMail={sendMail}
          notchScreen={notchScreen}
        />
      ))}
      <nav className="icon-dock" aria-label="Dock" ref={dock}>
        {[...new Set([
          "finder",
          "premiere",
          "vscode",
          "xcode",
          "notch",
          "youtube",
          "preview",
          "mail",
          "catmario",
          ...manager.windows.map(w => w.id),
        ])].map((id) => (
          <button
            key={id}
            data-dock={id}
            aria-label={`Open ${registry[id].name}`}
            onClick={() => open(id)}
          >
            <span className="dock-tooltip">{registry[id].name}</span>
            <span className="dock-icon"><AppIcon id={id} /></span>
            <i
              className={
                manager.windows.some((w) => w.id === id) ? "running" : ""
              }
            />
          </button>
        ))}
      </nav>
    </section>
  );
}
