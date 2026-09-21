import React, { useEffect, useRef, useState } from "react";
import Document from "./Documents";
import { documents, resumeUrl } from "./content";

function Menu({ label, items, active, setActive }) {
  const trigger = useRef(),
    panel = useRef();
  const shown = active === label;
  useEffect(() => {
    if (shown) panel.current?.querySelector("button:not(:disabled),a")?.focus();
  }, [shown]);
  function close() {
    setActive(null);
    trigger.current?.focus();
  }
  function keys(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const nodes = [
        ...panel.current.querySelectorAll("button:not(:disabled),a"),
      ];
      let i = nodes.indexOf(document.activeElement);
      i =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? nodes.length - 1
            : (i + (e.key === "ArrowDown" ? 1 : -1) + nodes.length) %
              nodes.length;
      nodes[i]?.focus();
    }
  }
  return (
    <div
      className="menu"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget))
          setActive((old) => (old === label ? null : old));
      }}
    >
      <button
        ref={trigger}
        className="menu-trigger"
        aria-haspopup="menu"
        aria-expanded={shown}
        onClick={() => setActive(shown ? null : label)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(label);
          }
        }}
      >
        {label}
      </button>
      {shown && (
        <div
          ref={panel}
          className="menu-panel"
          role="menu"
          aria-label={label}
          onKeyDown={keys}
        >
          {items.map((item) =>
            item.href ? (
              <a
                key={item.label}
                role="menuitem"
                href={item.href}
                download={item.download}
                target={item.download ? undefined : "_blank"}
                rel="noreferrer"
                onClick={close}
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.action();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
export default function Desktop({
  enabled = true,
  active,
  setActive,
  windows,
  setWindows,
  open,
  navigate,
  returnFocus,
}) {
  const [menu, setMenu] = useState(null),
    [maximized, setMaximized] = useState(false),
    [find, setFind] = useState(false),
    [query, setQuery] = useState(""),
    [count, setCount] = useState(0);
  const heading = useRef(),
    content = useRef(),
    search = useRef();
  function remove(minimize = false) {
    const id = active;
    setActive(null);
    setFind(false);
    if (!minimize) setWindows((w) => w.filter((x) => x !== id));
    requestAnimationFrame(() => returnFocus(id));
  }
  useEffect(() => {
    setFind(false);
    setQuery("");
    if (active && enabled) {
      heading.current?.focus();
    }
  }, [active, enabled]);
  useEffect(() => {
    if (!enabled) {
      setMenu(null);
      content.current?.querySelectorAll("video").forEach((v) => v.pause());
    }
  }, [enabled]);
  useEffect(() => {
    if (find) search.current?.focus();
  }, [find]);
  useEffect(() => {
    const root = content.current;
    if (!root) return;
    root.querySelectorAll("mark[data-find]").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    root.normalize();
    if (!query.trim()) {
      setCount(0);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement.closest("button,a,script,style")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let matches = 0;
    for (const node of nodes) {
      const text = node.textContent,
        term = query.trim().toLowerCase();
      let start = 0,
        index = text.toLowerCase().indexOf(term);
      if (index < 0) continue;
      const fragment = document.createDocumentFragment();
      while (index >= 0) {
        fragment.append(text.slice(start, index));
        const mark = document.createElement("mark");
        mark.dataset.find = "true";
        mark.textContent = text.slice(index, index + term.length);
        fragment.append(mark);
        matches++;
        start = index + term.length;
        index = text.toLowerCase().indexOf(term, start);
      }
      fragment.append(text.slice(start));
      node.replaceWith(fragment);
    }
    setCount(matches);
    root.querySelector("mark")?.scrollIntoView({ block: "nearest" });
    return () => {
      root
        .querySelectorAll("mark[data-find]")
        .forEach((mark) =>
          mark.replaceWith(document.createTextNode(mark.textContent)),
        );
      root.normalize();
    };
  }, [query, active]);
  const cmd = (label, action, disabled = false) => ({
    label,
    action,
    disabled,
  });
  const menus = {
    File: [
      cmd("Open Projects", () => open("projects")),
      cmd("Open Resume", () => open("resume")),
      {
        label: "Download Resume",
        href: resumeUrl,
        download: "Marko Deric Resume 2026.pdf",
      },
      cmd("Close window", () => remove(), !active),
    ],
    Edit: [
      cmd(
        "Find in document",
        () => setFind(true),
        !active || active === "resume",
      ),
      cmd(
        "Clear find",
        () => {
          setQuery("");
          setFind(false);
          heading.current?.focus();
        },
        !find,
      ),
    ],
    View: [
      cmd("Show desk", () => navigate("desk")),
      cmd("Focus phone", () => navigate("phone")),
      cmd(
        maximized ? "Restore window size" : "Maximize window",
        () => setMaximized((x) => !x),
        !active,
      ),
    ],
    Window: [
      cmd("Minimize window", () => remove(true), !active),
      ...windows.map((id) =>
        cmd(`${active === id ? "✓ " : ""}${documents[id]}`, () => open(id)),
      ),
    ],
    Help: [
      cmd("Controls & credits", () => open("controls")),
      cmd("About Marko", () => open("about")),
      cmd("Contact", () => open("contact")),
    ],
  };
  return (
    <section
      className="desktop"
      aria-label="Laptop desktop"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !menu) {
          e.stopPropagation();
          if (find) {
            setFind(false);
            setQuery("");
            heading.current?.focus();
          } else if (active) remove();
        }
      }}
    >
      <div className="menu-bar">
        <strong className="desktop-owner">MD</strong>
        {Object.entries(menus).map(([label, items]) => (
          <Menu
            key={label}
            label={label}
            items={items}
            active={menu}
            setActive={setMenu}
          />
        ))}
        <span className="menu-context">Marko's workspace</span>
      </div>
      <div className="desktop-wallpaper" aria-hidden="true">
        <span>Marko Deric</span>
        <small>MARKO DERIC / PERSONAL WORKSPACE</small>
      </div>
      {active && (
        <section
          className={`desktop-window ${maximized ? "maximized" : ""}`}
          role="region"
          aria-label={`${documents[active]} window`}
        >
          <header className="window-bar">
            <div className="window-controls">
              <button
                className="close"
                aria-label="Close window"
                title="Close window"
                onClick={() => remove()}
              >
                ×
              </button>
              <button
                className="minimize"
                aria-label="Minimize window"
                title="Minimize window"
                onClick={() => remove(true)}
              >
                −
              </button>
              <button
                className="expand"
                aria-label={
                  maximized ? "Restore window size" : "Maximize window"
                }
                title={maximized ? "Restore window size" : "Maximize window"}
                onClick={() => setMaximized((x) => !x)}
              >
                ↗
              </button>
            </div>
            <h2 ref={heading} tabIndex={-1}>
              {documents[active]}
            </h2>
            <button
              className="window-projects"
              onClick={() => open("projects")}
            >
              Projects
            </button>
          </header>
          {find && (
            <form className="find-bar" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="find-document">Find</label>
              <input
                id="find-document"
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this document"
              />
              <span role="status">{count} matches</span>
              <button
                type="button"
                onClick={() => {
                  setFind(false);
                  setQuery("");
                  heading.current?.focus();
                }}
              >
                Done
              </button>
            </form>
          )}
          <div className="window-body">
            <aside className="sidebar">
              <span>FAVORITES</span>
              {["projects", "about", "resume", "contact"].map((id) => (
                <button
                  key={id}
                  aria-current={active === id ? "page" : undefined}
                  onClick={() => open(id)}
                >
                  <span aria-hidden="true">
                    {
                      { projects: "▰", about: "◉", resume: "▤", contact: "✉" }[
                        id
                      ]
                    }
                  </span>
                  {documents[id]}
                </button>
              ))}
              <div className="sidebar-note">
                Apps, websites
                <br />
                and film.
              </div>
            </aside>
            <div className="document-scroll" ref={content} key={active}>
              <Document id={active} open={open} navigate={navigate} />
            </div>
          </div>
        </section>
      )}
      {!active && (
        <button
          className="desktop-folder"
          data-launcher="projects"
          onClick={() => open("projects")}
        >
          <span aria-hidden="true">▰</span>Open Projects
        </button>
      )}
      <nav className="dock" aria-label="Desktop applications">
        {[
          ...new Set(["projects", "about", "resume", "contact", ...windows]),
        ].map((id) => (
          <button
            key={id}
            data-launcher={id}
            aria-pressed={active === id}
            onClick={() => open(id)}
          >
            <span>{documents[id]}</span>
            {windows.includes(id) && (
              <i
                aria-label={
                  active === id ? "Active" : "Minimized or background"
                }
              />
            )}
          </button>
        ))}
      </nav>
    </section>
  );
}
