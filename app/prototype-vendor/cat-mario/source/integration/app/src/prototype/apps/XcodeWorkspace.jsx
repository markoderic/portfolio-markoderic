import React, { useState } from "react";
import {
  ChevronLeft,
  Smartphone,
  PanelRight,
  Folder,
  FileText,
} from "lucide-react";
import AppIcon from "../AppIcon";
import taskSource from "../assets/source/TasksScreen.swift?raw";
const features = [
  [
    "overview",
    "Notch",
    "A planner for the things that share your day.",
    "Tasks, school, money, notes and health live together in a native iPhone app. Marko designed, built and published Notch, and continues to maintain it.",
  ],
  [
    "tasks",
    "Tasks & habits",
    "Plan a day. Keep a routine.",
    "Task groups separate today, upcoming and completed work. Habits record daily progress alongside the tasks.",
  ],
  [
    "school",
    "School",
    "Classes and assignments, together.",
    "Class details, deadlines, completion and points grades use the same assignment records.",
  ],
  [
    "finance",
    "Finance",
    "Follow the money.",
    "Spending, income and finance tools help connect daily transactions with a longer plan. Explore the fictional sample ledger in the phone demo.",
  ],
  [
    "notes",
    "Notes",
    "Keep ideas close to the plan.",
    "Search, folders and pinned notes keep reference material within reach.",
  ],
  [
    "health",
    "Health",
    "Make room for the rest of life.",
    "Workouts and nutrition sit alongside planning. Native service connections are separate from this browser demo.",
  ],
];
export default function XcodeWorkspace({ notchScreen }) {
  const [project, setProject] = useState(false),
    [selected, setSelected] = useState("overview"),
    [inspector, setInspector] = useState(true),
    [source, setSource] = useState(false);
  const feature = features.find((f) => f[0] === selected);
  if (!project)
    return (
      <div className="xcode-welcome">
        <AppIcon id="xcode" />
        <h1>Welcome to Xcode</h1>
        <p>Explore an iPhone app by Marko Deric.</p>
        <div>
          <small>PROJECTS</small>
          <button onClick={() => setProject(true)}>
            <AppIcon id="notch" />
            <span>
              <strong>Notch</strong>
              <small>Native iOS planner · SwiftUI</small>
            </span>
            <span>›</span>
          </button>
        </div>
      </div>
    );
  return (
    <div className={`xcode-project ${inspector ? "inspector-open" : ""}`}>
      <header>
        <button onClick={() => setProject(false)}>
          <ChevronLeft size={14} />
          Projects
        </button>
        <strong>Notch</strong>
        <span>iOS · SwiftUI</span>
        <button
          onClick={() =>
            notchScreen(selected === "overview" ? "dashboard" : selected)
          }
        >
          <Smartphone size={14} />
          Open phone demo
        </button>
        <button
          aria-label="Toggle project inspector"
          aria-pressed={inspector}
          onClick={() => setInspector((v) => !v)}
        >
          <PanelRight size={15} />
        </button>
      </header>
      <div className="xcode-project-body">
        <nav aria-label="Project navigator">
          <strong>
            <Folder size={14} /> Notch
          </strong>
          {features.map(([id, name]) => (
            <button
              key={id}
              aria-current={selected === id ? "page" : undefined}
              onClick={() => {
                setSelected(id);
                setSource(false);
              }}
            >
              <FileText size={13} />
              {name}
            </button>
          ))}
          <button aria-pressed={source} onClick={() => setSource((v) => !v)}>
            TasksScreen.swift
          </button>
        </nav>
        <section>
          {source ? (
            <div className="xcode-source">
              <small>CURATED NATIVE SOURCE</small>
              <h1>TasksScreen.swift</h1>
              <pre tabIndex={0}>{taskSource}</pre>
            </div>
          ) : (
            <article>
              <small>PROJECT / {feature[1].toUpperCase()}</small>
              <h1>{feature[2]}</h1>
              <p>{feature[3]}</p>
              <div className="xcode-feature-cards">
                {features.slice(1).map(([id, name, headline]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setSelected(id);
                    }}
                  >
                    <strong>{name}</strong>
                    <span>{headline}</span>
                  </button>
                ))}
              </div>
              <button
                className="xcode-demo-action"
                onClick={() =>
                  notchScreen(selected === "overview" ? "dashboard" : selected)
                }
              >
                Explore {selected === "overview" ? "Notch" : feature[1]} on the
                phone →
              </button>
            </article>
          )}
        </section>
        <aside inert={inspector ? undefined : ""} aria-hidden={!inspector}>
          <h3>About this project</h3>
          <AppIcon id="notch" />
          <strong>Marko Deric</strong>
          <p>
            Product design · SwiftUI development · App Store publishing and
            maintenance
          </p>
          <dl>
            <dt>Platform</dt>
            <dd>iPhone</dd>
            <dt>Demo</dt>
            <dd>Shared phone session</dd>
            <dt>Data</dt>
            <dd>Fictional sample records</dd>
          </dl>
          <small>
            Curated native-source reconstruction. Release-specific parity is not
            established.
          </small>
        </aside>
      </div>
      <footer>Notch / {feature[1]} · Browser demo</footer>
    </div>
  );
}
