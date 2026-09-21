import React, { useState, useEffect, useRef } from "react";
import {
  Files,
  Search,
  Code2,
  PanelRight,
  ChevronRight,
  Folder,
  Play,
  Settings2,
} from "lucide-react";
import projection from "../screenProjection.js?raw";
import windows from "../windowState.js?raw";
import scene from "../Scene.jsx?raw";
import desktop from "../MacDesktop.jsx?raw";
import taskSource from "../assets/source/TasksScreen.swift?raw";
import schoolSource from "../assets/source/SchoolScreen.swift?raw";
import noteSource from "../assets/source/NotesScreen.swift?raw";
import dashboardSource from "../assets/source/DashboardScreen.swift?raw";
import themeSource from "../assets/source/Theme.swift?raw";
import statsSource from "../assets/source/SchoolStats.swift?raw";
const portfolioFiles = [
  {
    name: "README.md",
    document: true,
    context:
      "How this portfolio presents work through familiar creative tools.",
    code: `# A workspace for my work

I’m Marko Deric. I build apps, websites and video projects while studying Emerging Technology in Business & Design at Miami University.

## What you can explore

Finder introduces my work and experience. Premiere presents a film project. Xcode introduces Notch, my published iPhone planner. Studio presents AnimalFeed. Mail starts a conversation.

## This portfolio

This portfolio uses React for the applications and Three.js for the desk. The interactive desktop, phone and printed resume stay connected as you move between them.

## My contribution

I set the direction, chose the projects and worked through the interactions. I built the implementation with AI coding assistance and iterative review.

## Try it

Move a window by its title bar. Double-click the title to maximize it. Open Notch from Xcode to continue on the phone, then return to the laptop.`,
  },
  {
    name: "decisions.md",
    document: true,
    context:
      "Concrete design and engineering choices visible in this workspace.",
    code: `# Decisions behind the desk

## Keep the work readable

Familiar tools give each project context. Readable project documents come before optional source code.

## One session across devices

The phone app stays mounted when you return to the laptop. Fictional sample edits are shared by the phone and Xcode demo action.

## Match the screen to the model

A camera projection maps HTML onto the physical display. Pointer coordinates are mapped back into display space for window movement.

## Make motion optional

Reduced motion and Simple view provide direct access to the applications. Keyboard and touch routes complement object selection.

## Project context

The resume is the original PDF. AnimalFeed results include their source and date range. The phone uses fictional records; native accounts, notifications and purchases are not connected in the browser sample.

## Let visitors explore the implementation

The project notes sit alongside source files from this portfolio. Scratch edits let you experiment with the text in this session without changing or running the site’s code.`,
  },
  {
    name: "screenProjection.js",
    code: projection,
    context:
      "The DOM display and WebGL plane use the same camera projection. One live screen persists through each device transition.",
  },
  {
    name: "windowState.js",
    code: windows,
    context:
      "Window bounds live in display coordinates. Inverse projection keeps a drag attached to the pointer as the screen moves.",
  },
  {
    name: "Scene.jsx",
    code: scene,
    context:
      "The camera retargets from its current pose. Selecting another device can interrupt the move.",
  },
  {
    name: "MacDesktop.jsx",
    code: desktop,
    context:
      "Desktop and dock share one application registry, with separate selection and launch behavior.",
  },
];
const notchFiles = [
  {
    name: "DashboardScreen.swift",
    code: dashboardSource,
    tab: "dashboard",
    context:
      "The dashboard derives its next commitment and task counts from the shared AppStore.",
  },
  {
    name: "TasksScreen.swift",
    code: taskSource,
    tab: "tasks",
    context:
      "Tasks group overdue, today, upcoming and completed records. Habits belong inside Tasks.",
  },
  {
    name: "SchoolScreen.swift",
    code: schoolSource,
    tab: "school",
    context:
      "School completion and class details use the same assignment records.",
  },
  {
    name: "SchoolStats.swift",
    code: statsSource,
    tab: "school",
    context:
      "An assignment with possible points but no earned points does not count as a zero until completed.",
  },
  {
    name: "NotesScreen.swift",
    code: noteSource,
    tab: "notes",
    context:
      "Search, folders and pinned notes are separate from the focused note editor.",
  },
  {
    name: "Theme.swift",
    code: themeSource,
    tab: "dashboard",
    context:
      "A shared surface and text ladder adapts every feature to light and dark appearances.",
  },
];
function Syntax({ line }) {
  const parts = line.split(
    /(\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:import|from|export|function|const|let|return|if|else|public|private|var|struct|enum|case|switch|guard|func|some|View|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return parts.map((part, i) => (
    <span
      key={i}
      className={
        part.startsWith("//")
          ? "syntax-comment"
          : /^['"]/.test(part)
            ? "syntax-string"
            : /^\d/.test(part)
              ? "syntax-number"
              : /^(import|from|export|function|const|let|return|if|else|public|private|var|struct|enum|case|switch|guard|func|some|View|true|false|null|undefined)$/.test(
                    part,
                  )
                ? "syntax-keyword"
                : undefined
      }
    >
      {part}
    </span>
  ));
}
export default function CodeWorkspace({
  xcode = false,
  navigate,
  notchScreen,
}) {
  const files = xcode ? notchFiles : portfolioFiles;
  const searchToggle = useRef();
  const [selected, setSelected] = useState(files[0].name),
    [tabs, setTabs] = useState([files[0].name]),
    [activity, setActivity] = useState("files"),
    [query, setQuery] = useState(""),
    [scratch, setScratch] = useState({}),
    [editing, setEditing] = useState(false),
    [inspector, setInspector] = useState(innerWidth >= 800),
    [sidebar, setSidebar] = useState(true),
    [line, setLine] = useState(null);
  useEffect(() => {
    const command = (e) => {
      if (
        e.detail.app === (xcode ? "xcode" : "vscode") &&
        e.detail.command === "find"
      )
        setActivity("search");
    };
    addEventListener("workspace-command", command);
    return () => removeEventListener("workspace-command", command);
  }, [xcode]);
  const current = files.find((f) => f.name === selected);
  const text = scratch[selected] ?? current.code;
  const lines = text.split("\n");
  function choose(name, n) {
    setSelected(name);
    setTabs((t) => (t.includes(name) ? t : [...t, name]));
    setEditing(false);
    setLine(n || null);
    if (n)
      requestAnimationFrame(() =>
        document
          .getElementById(`${xcode ? "swift" : "js"}-${name}-${n}`)
          ?.scrollIntoView({ block: "center" }),
      );
  }
  const matches = query
    ? files.flatMap((f) =>
        (scratch[f.name] ?? f.code)
          .split("\n")
          .flatMap((l, i) =>
            l.toLowerCase().includes(query.toLowerCase())
              ? [{ file: f.name, line: i + 1, text: l.trim() }]
              : [],
          ),
      )
    : [];
  return (
    <div
      className={`code-app ${xcode ? "xcode-app" : ""} ${inspector ? "inspector-open" : ""} ${sidebar ? "sidebar-open" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented && activity === "search" && sidebar) {
          e.stopPropagation();
          setActivity("files");
          searchToggle.current?.focus({ preventScroll: true });
        }
      }}
    >
      <header className="code-toolbar">
        <strong>{xcode ? "Notch" : "portfolio-markoderic"}</strong>
        {xcode && <span>SwiftUI / PlannerUI</span>}
        <button
          onClick={() => (xcode ? notchScreen(current.tab) : navigate("desk"))}
        >
          <Play size={12} />
          {xcode ? "Open demo" : "View desk"}
        </button>
        <button
          aria-label="Toggle sidebar"
          aria-pressed={sidebar}
          onClick={() => setSidebar((v) => !v)}
        >
          <Files size={14} />
        </button>
        <button
          ref={searchToggle}
          aria-label="Toggle source search"
          onClick={() =>
            setActivity((a) => (a === "files" ? "search" : "files"))
          }
        >
          <Search size={14} />
        </button>
        <button
          aria-label="Toggle feature inspector"
          aria-pressed={inspector}
          onClick={() => setInspector((v) => !v)}
        >
          <PanelRight size={14} />
        </button>
      </header>
      <div className="code-main">
        <nav className="code-activity" aria-label="Editor navigation">
          <button
            aria-label="File explorer"
            aria-pressed={activity === "files"}
            onClick={() => {
              setActivity("files");
              setSidebar(true);
            }}
          >
            <Files size={19} />
          </button>
          <button
            aria-label="Search source"
            aria-pressed={activity === "search"}
            onClick={() => {
              setActivity("search");
              setSidebar(true);
            }}
          >
            <Search size={19} />
          </button>
        </nav>
        <aside
          className="code-explorer"
          aria-hidden={!sidebar}
          inert={sidebar ? undefined : ""}
        >
          <h3>{activity === "files" ? "EXPLORER" : "SEARCH"}</h3>
          {activity === "files" ? (
            <>
              <p>
                <Folder size={12} />
                {xcode ? "PlannerCore / Sources" : "src / prototype"}
              </p>
              {files.map((f) => (
                <button
                  key={f.name}
                  className={selected === f.name ? "current" : ""}
                  onClick={() => choose(f.name)}
                >
                  <span>{xcode ? "◈" : "JS"}</span>
                  {f.name}
                </button>
              ))}
            </>
          ) : (
            <>
              <input
                type="search"
                aria-label="Search all source files"
                placeholder="Search source"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <small>{matches.length} results</small>
              {matches.slice(0, 150).map((m, i) => (
                <button
                  className="code-result"
                  key={i}
                  onClick={() => choose(m.file, m.line)}
                >
                  <strong>
                    {m.file}:{m.line}
                  </strong>
                  <span>{m.text.slice(0, 80)}</span>
                </button>
              ))}
              {matches.length > 150 && (
                <small>Showing first 150. Refine your search.</small>
              )}
            </>
          )}
        </aside>
        <section className="code-center">
          <div className="code-tabs">
            {tabs.map((name) => (
              <div className={name === selected ? "current" : ""} key={name}>
                <button onClick={() => choose(name)}>
                  {name}
                  {scratch[name] !== undefined ? " •" : ""}
                </button>
                <button
                  aria-label={`Close ${name} tab`}
                  disabled={tabs.length === 1}
                  onClick={() => {
                    const next = tabs.filter((t) => t !== name);
                    setTabs(next);
                    if (name === selected) setSelected(next.at(-1));
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="code-breadcrumb">
            {xcode ? "PlannerCore / Sources" : "src / prototype"} / {selected}
          </div>
          {current.document ? (
            <article className="workspace-readme">
              {lines.map((l, i) =>
                l.startsWith("# ") ? (
                  <h1 key={i} id={`js-${selected}-${i + 1}`}>
                    {l.slice(2)}
                  </h1>
                ) : l.startsWith("## ") ? (
                  <h2 key={i} id={`js-${selected}-${i + 1}`}>
                    {l.slice(3)}
                  </h2>
                ) : l ? (
                  <p
                    className={line === i + 1 ? "highlighted" : ""}
                    key={i}
                    id={`js-${selected}-${i + 1}`}
                  >
                    {l}
                  </p>
                ) : null,
              )}
            </article>
          ) : editing ? (
            <textarea
              className="code-scratch"
              spellCheck={false}
              aria-label={`Scratch editor for ${selected}`}
              value={text}
              onChange={(e) =>
                setScratch({ ...scratch, [selected]: e.target.value })
              }
            />
          ) : (
            <div
              className="code-lines"
              tabIndex={0}
              aria-label={`${selected} source code`}
            >
              {lines.map((l, i) => (
                <div
                  id={`${xcode ? "swift" : "js"}-${selected}-${i + 1}`}
                  className={line === i + 1 ? "highlighted" : ""}
                  key={i}
                >
                  <span className="line-number">{i + 1}</span>
                  <code>
                    <Syntax line={l} />
                  </code>
                </div>
              ))}
            </div>
          )}
          <div className="code-actions">
            <button
              disabled={current.document}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Read source" : "Edit scratch copy"}
            </button>
            <button
              disabled={scratch[selected] === undefined}
              onClick={() => {
                setScratch((s) => {
                  const next = { ...s };
                  delete next[selected];
                  return next;
                });
                setEditing(false);
              }}
            >
              Reset file
            </button>
            <small>
              {editing
                ? "Browser scratch only · no files are written"
                : `${lines.length} lines`}
            </small>
          </div>
        </section>
        <aside
          className="code-inspector"
          aria-hidden={!inspector}
          inert={inspector ? undefined : ""}
        >
          <h3>{xcode ? "Feature inspector" : "File context"}</h3>
          <div className="code-preview-icon">
            <Code2 size={33} />
          </div>
          <strong>{current.name}</strong>
          <p>{current.context}</p>
          {xcode && (
            <button onClick={() => notchScreen(current.tab)}>
              Open {current.tab} on phone
            </button>
          )}
          <small>
            {xcode
              ? "Curated source snapshot · released-version mapping unverified. Open demo does not compile Swift."
              : "Read the authored project notes or inspect the implementation files. Scratch edits stay in this session and do not execute."}
          </small>
        </aside>
      </div>
      <footer className="code-status">
        <span>{xcode ? "Swift" : "JavaScript"} · UTF-8</span>
        <span>
          {scratch[selected] !== undefined
            ? "Scratch modified"
            : "Read-only source"}{" "}
          · {lines.length} lines
        </span>
      </footer>
    </div>
  );
}
