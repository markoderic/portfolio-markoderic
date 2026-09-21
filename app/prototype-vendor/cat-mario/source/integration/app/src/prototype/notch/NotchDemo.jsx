import ReleaseIcon from "./ReleaseIcon";
import NoteBody from "./NoteBody";
import TravelPanel from "./TravelPanel";
import DemoSettings from "./DemoSettings";
import { DayReview, WeeklyReview, CalendarTimeGrid } from "./PlanningExtras";
import MealPlanner from "./MealPlanner";
import HealthHistory from "./HealthHistory";
import AdvancedFields from "./AdvancedFields";
import HabitPanel from "./HabitPanel";
import FinancePanel, { FinanceFields, financeNames } from "./FinancePanel";
import React, { useEffect, useRef, useState } from "react";
import {
  Grid2X2,
  Check,
  Bell,
  Wallet,
  BookOpen,
  CalendarDays,
  Heart,
  Utensils,
  StickyNote,
  Globe,
  Ellipsis,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  Pin,
} from "lucide-react";
import {
  sections,
  addDays,
  isDone,
  classStats,
  calendarItems,
  calendarBills,
  classMeetings,
  validateEntity,
} from "./demoState";
const releaseIcons = ["grid", "check", "bell", "wallet", "book", "calendar", "heart", "fork", "note", "globe", "more"];
const names = {
  ...financeNames,
  reminderLists: "Reminder list",
  goals: "Goal",
  tasks: "Task",
  habits: "Habit",
  classes: "Class",
  assignments: "Assignment",
  notes: "Note",
  folders: "Folder",
  reminders: "Reminder",
  spending: "Expense",
  income: "Income",
  accounts: "Account",
  workouts: "Workout",
  nutrition: "Meal",
  trips: "Trip",
  shopping: "Shopping item",
  orders: "Order",
  bucket: "Bucket list item",
};
const titleCase = (s) => s[0].toUpperCase() + s.slice(1);
const formatDate = (d) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Anytime";
const money = (n) =>
  Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
function Card({ title, detail, children, action }) {
  return (
    <section className="n-card">
      {title && (
        <header>
          <strong>{title}</strong>
          {detail && <span>{detail}</span>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
function Row({ item, collection, onEdit, dispatch, check = true, meta }) {
  const done = isDone(item);
  return (
    <div className={`n-row ${done ? "done" : ""}`}>
      {check && (
        <button
          className="n-check"
          aria-label={`${done ? "Reopen" : "Complete"} ${item.title}`}
          aria-pressed={done}
          onClick={() => dispatch({ type: "toggle", collection, id: item.id })}
        >
          {done && <Check size={14} />}
        </button>
      )}
      <button
        className="n-row-title"
        title={collection === "tasks" ? "Alt + ↑ / ↓ to reorder" : undefined}
        onKeyDown={(e) => {
          if (
            collection === "tasks" &&
            e.altKey &&
            ["ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            e.preventDefault();
            e.stopPropagation();
            dispatch({
              type: "reorder",
              collection,
              id: item.id,
              direction: e.key === "ArrowUp" ? -1 : 1,
            });
          }
        }}
        onClick={() => onEdit(collection, item)}
      >
        <strong>{item.title || item.name || "Untitled note"}</strong>
        {meta && <small>{meta}</small>}
      </button>
      <button
        aria-label={`Edit ${item.title || item.name}`}
        onClick={() => onEdit(collection, item)}
      >
        <Ellipsis size={17} />
      </button>
    </div>
  );
}
function Sheet({ title, onClose, children }) {
  const ref = useRef();
  const opener = useRef(document.activeElement);
  useEffect(() => {
    ref.current?.querySelector("input,textarea,button")?.focus();
    return () => {
      if (opener.current?.isConnected)
        opener.current.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="n-sheet-shade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="n-sheet"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !e.defaultPrevented) {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            const all = [
              ...ref.current.querySelectorAll("button,input,textarea,select,a"),
            ].filter((x) => !x.disabled);
            const first = all[0],
              last = all.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <button onClick={onClose}>Cancel</button>
          <strong>{title}</strong>
        </header>
        {children}
      </section>
    </div>
  );
}
export default function NotchDemo({ state, dispatch, enabled, escapeRef }) {
  const tab = state.tab;
  const [sheet, setSheet] = useState(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [classId, setClassId] = useState(null),
    [schoolRange, setSchoolRange] = useState("All time"),
    [folder, setFolder] = useState("all"),
    [selectedDay, setSelectedDay] = useState(state.today),
    [month, setMonth] = useState(state.today.slice(0, 7)),
    [calendarMode, setCalendarMode] = useState("Month"),
    [timeGrid, setTimeGrid] = useState(false),
    [kind, setKind] = useState("All"),
    [tool, setTool] = useState(null),
    [healthTab, setHealthTab] = useState("Lifting"),
    [reminderFocus, setReminderFocus] = useState(null),
    [reminderSearch, setReminderSearch] = useState(false),
    [capture, setCapture] = useState("");
  const scroll = useRef(),
    navRef = useRef();
  // Also owns cancellation when a removed/inert control leaves focus on body.
  // The workspace fallback calls this before considering device navigation.
  const cancelLocalEscape = (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || !sheet) return;
    event.preventDefault();
    event.stopPropagation();
    setSheet(null);
  };
  useEffect(() => {
    if (!escapeRef) return;
    escapeRef.current = cancelLocalEscape;
    return () => { escapeRef.current = null; };
  }, [escapeRef, sheet]);
  useEffect(() => {
    setQuery("");
    setFilter("All");
    setClassId(null);
    setTool(null);
    scroll.current?.scrollTo(0, 0);
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "instant",
    });
  }, [tab]);
  useEffect(() => {
    if (
      !["all", "pinned"].includes(folder) &&
      !state.folders.some((f) => f.id === folder)
    )
      setFolder("all");
  }, [state.folders, folder]);
  useEffect(() => {
    if (classId && !state.classes.some((c) => c.id === classId))
      setClassId(null);
  }, [state.classes, classId]);
  function changeTab(next) {
    dispatch({ type: "tab", tab: next });
    setSheet(null);
  }
  function edit(collection, item = {}) {
    if (collection === "assignments" && !state.classes.length) {
      setSheet({
        kind: "edit",
        collection: "classes",
        value: {},
        id: crypto.randomUUID(),
      });
      return;
    }
    setSheet({
      kind: "edit",
      collection,
      value: { ...item },
      id: item.id || crypto.randomUUID(),
    });
  }
  function boundary(service) {
    setSheet({ kind: "boundary", service });
  }
  const matches = (item) =>
    `${item.title || item.name || ""} ${item.body || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
  const tasks = state.tasks
    .filter(matches)
    .filter((t) => filter === "All" || t.category === filter);
  const due = tasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate <= state.today,
    ),
    upcoming = tasks.filter((t) => !t.completed && t.dueDate > state.today),
    anytime = tasks.filter((t) => !t.completed && !t.dueDate);
  const completionRange =
    schoolRange === "Today"
      ? { from: state.today, to: state.today }
      : schoolRange === "Next 7 days"
        ? { from: state.today, to: addDays(state.today, 6) }
        : schoolRange === "This month"
          ? {
              from: state.today.slice(0, 7) + "-01",
              to: state.today.slice(0, 7) + "-31",
            }
          : undefined;
  const stats = classStats(state, classId, completionRange);
  const items = [
    ...calendarItems(state),
    ...calendarBills(state, `${month}-01`, addDays(`${month}-01`, 41)),
    ...classMeetings(
      state,
      tab === "calendar" ? `${month}-01` : state.today,
      tab === "calendar" ? addDays(`${month}-01`, 41) : addDays(state.today, 7),
    ),
  ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const school = state.assignments.filter(
    (a) => (!classId || a.classId === classId) && matches(a),
  );
  const row = (item, collection, check = true, meta) => (
    <Row
      key={`${item.id}-${item.date || ""}`}
      {...{ item, collection, dispatch, check, meta }}
      onEdit={edit}
    />
  );
  const newForTab = {
    tasks: "tasks",
    reminders: "reminders",
    finance: "spending",
    school: "assignments",
    health: "workouts",
    meals: "nutrition",
    notes: "notes",
    travel: "trips",
  };
  const openNew = () =>
    tab === "dashboard" || tab === "calendar"
      ? setSheet({ kind: "quick" })
      : edit(
          newForTab[tab],
          tab === "school" ? { classId: classId || state.classes[0]?.id } : {},
        );
  return (
    <section
      className={`notch-demo ${state.settings.dark ? "n-dark" : ""}`}
      aria-label="Notch sample app"
      tabIndex={-1}
      onKeyDown={cancelLocalEscape}
    >
      <div className="n-status">
        <time>
          {new Date().toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
        <span>Sample data</span>
      </div>
      <div className="phone-island" />
      <div className="n-scroll" ref={scroll} inert={sheet ? "" : undefined}>
        <header className="n-top">
          <div>
            <small>
              {["dashboard", "tasks", "reminders"].includes(tab)
                ? new Date(`${state.today}T12:00:00`).toLocaleDateString(
                    undefined,
                    { weekday: "long", month: "long", day: "numeric" },
                  )
                : tab === "school" ? `${state.classes.filter(c => !c.completed && !c.paused).length} classes · ${state.assignments.filter(a => !isDone(a)).length} open` : tab === "finance" ? new Date(`${state.today}T12:00:00`).toLocaleDateString(undefined, {month: "long"}) : " "}
            </small>
            <h1>
              {classId
                ? state.classes.find((c) => c.id === classId)?.name
                : titleCase(tab)}
            </h1>
          </div>
          {tab !== "more" && (
            <div className="n-top-actions">
            {tab === "reminders" && <button className="n-search-toggle" aria-label="Search reminders" aria-pressed={reminderSearch} onClick={()=>{setReminderSearch(v=>!v);setQuery("");}}><Search size={16}/></button>}
            <button className="n-primary" onClick={openNew}>
              <ReleaseIcon name={tab === "dashboard" ? "spark" : "plus"} size={14} />
              {tab === "dashboard"
                ? "Quick add"
                : tab === "tasks"
                  ? "Add task"
                  : ["notes", "reminders"].includes(tab)
                    ? "New"
                    : "Add"}
            </button>
            </div>
          )}
        </header>
        {(["dashboard", "tasks", "notes"].includes(tab) || tab === "reminders" && reminderSearch) && (
          <label className="n-search">
            <Search size={15} />
            <input
              type="search"
              placeholder={
                tab === "dashboard"
                  ? "Search tasks, notes, money…"
                  : `Search ${tab}`
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${tab}`}
            />
          </label>
        )}
        {tab === "dashboard" &&
          (query ? (
            <Card title="Results">
              {["tasks", "notes", "spending", "assignments"].flatMap((c) =>
                state[c].filter(matches).map((item) => row(item, c, false)),
              )}
              {!["tasks", "notes", "spending", "assignments"].some((c) =>
                state[c].some(matches),
              ) && <p>No matches.</p>}
            </Card>
          ) : (
            <>
              <Card title="NEXT">
                {items.find((i) => i.date >= state.today && !isDone(i)) ? (
                  <button
                    className="n-next"
                    onClick={() => {
                      const next = items.find(
                        (i) => i.date >= state.today && !isDone(i),
                      );
                      edit(next.collection, next);
                    }}
                  >
                    <strong>
                      {
                        items.find((i) => i.date >= state.today && !isDone(i))
                          .title
                      }
                    </strong>
                    <small>
                      {formatDate(
                        items.find((i) => i.date >= state.today && !isDone(i))
                          .date,
                      )}
                    </small>
                  </button>
                ) : (
                  <p>Nothing scheduled next.</p>
                )}
              </Card>
              <Card
                title="ONE THING"
                action={
                  <button onClick={() => setSheet({ kind: "oneThing" })}>
                    Edit
                  </button>
                }
              >
                <p className="n-emphasis">
                  {state.oneThing || "What matters today?"}
                </p>
              </Card>
              <h2>UP NEXT</h2>
              <Card>
                {items
                  .filter((i) => i.date >= state.today && !isDone(i))
                  .slice(0, 4)
                  .map((i) =>
                    row(
                      i,
                      i.collection,
                      false,
                      `${i.kind} · ${formatDate(i.date)}`,
                    ),
                  )}
              </Card>
              <h2>SNAPSHOT</h2>
              <div className="n-snapshot">
                <button onClick={() => changeTab("tasks")}>
                  <Check />
                  <strong>
                    {
                      state.tasks.filter(
                        (t) =>
                          !t.completed && t.dueDate && t.dueDate <= state.today,
                      ).length
                    }
                  </strong>
                  <span>Tasks left today</span>
                </button>
                <button onClick={() => changeTab("school")}>
                  <BookOpen />
                  <strong>{classStats(state).percent}%</strong>
                  <span>School completion</span>
                </button>
                <button onClick={() => changeTab("finance")}>
                  <Wallet />
                  <strong>
                    {money(
                      state.spending
                        .filter((s) => s.date === state.today)
                        .reduce((a, s) => a + Number(s.amount), 0),
                    )}
                  </strong>
                  <span>Spent today</span>
                </button>
                <button onClick={() => changeTab("health")}>
                  <Heart />
                  <strong>
                    {
                      state.workouts.filter((w) => w.date === state.today)
                        .length
                    }
                  </strong>
                  <span>Workouts today</span>
                </button>
              </div>
              <DayReview state={state} dispatch={dispatch} edit={edit} />
              <h2>TODAY'S FOCUS</h2>
              <Card>
                {state.tasks
                  .filter((t) => t.dueDate === state.today)
                  .map((t) => row(t, "tasks", true, t.category))}
              </Card>
              <button
                className="n-service"
                onClick={() => boundary("Mail connection")}
              >
                Connect mail <ChevronRight size={14} />
              </button>
            </>
          ))}
        {tab === "tasks" && (
          <>
            <div className="n-facts">
              <div>
                <b>{due.length}</b>
                <span>Left today</span>
              </div>
              <div>
                <b>
                  {
                    state.tasks.filter(
                      (t) =>
                        t.completed &&
                        t.completedAt?.startsWith(state.today.slice(0, 7)),
                    ).length
                  }
                </b>
                <span>Done this month</span>
              </div>
              <div>
                <b>
                  {
                    state.habits.filter((h) => h.history?.includes(state.today))
                      .length
                  }
                  /{state.habits.length}
                </b>
                <span>Habits today</span>
              </div>
            </div>
            <select
              aria-label="Task category"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {[
                "All",
                ...new Set(state.tasks.map((t) => t.category).filter(Boolean)),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <Card title="Today" detail={`${due.length} left`}>
              {due.length ? (
                due.map((t) =>
                  row(
                    t,
                    "tasks",
                    true,
                    t.dueDate < state.today
                      ? `Overdue · ${formatDate(t.dueDate)}`
                      : t.startTime || t.category,
                  ),
                )
              ) : (
                <p>Nothing left today.</p>
              )}
            </Card>
            <h2>
              DAILY HABITS{" "}
              <button onClick={() => edit("habits")}>+ Add habit</button>
            </h2>
            <HabitPanel state={state} dispatch={dispatch} edit={edit} />
            {[
              ["Upcoming", upcoming],
              ["Anytime", anytime],
              ["Completed", tasks.filter(isDone)],
            ].map(([label, list]) => (
              <Card key={label} title={label} detail={String(list.length)}>
                {list.map((t) => row(t, "tasks", true, formatDate(t.dueDate)))}
              </Card>
            ))}
          </>
        )}
        {tab === "school" && (
          <>
            {classId && (
              <button onClick={() => setClassId(null)}>‹ All classes</button>
            )}
            <Card
              title={`Completion · ${schoolRange.toLowerCase()}`}
              detail={`${stats.completed} of ${stats.total} done`}
            >
              <select
                aria-label="School completion range"
                value={schoolRange}
                onChange={(e) => setSchoolRange(e.target.value)}
              >
                {["All time", "Today", "Next 7 days", "This month"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <div className="n-completion">
                <strong>{stats.percent}%</strong>
                <div className="n-bars">
                  {state.classes
                    .filter((c) => !classId || c.id === classId)
                    .map((c) => (
                      <div key={c.id}>
                        <span>{c.name}</span>
                        <progress
                          style={{ accentColor: c.accentColor }}
                          max="100"
                          value={
                            classStats(state, c.id, completionRange).percent
                          }
                        />
                      </div>
                    ))}
                </div>
              </div>
              <div className="n-school-facts"><span><b>{stats.completed}</b> Done</span><span><b>{stats.total-stats.completed}</b> Left</span><span><b>{state.assignments.filter(a => (!classId || a.classId === classId) && !isDone(a) && a.dueDate && a.dueDate < state.today).length}</b> Overdue</span></div>
              {classId && (
                <p>
                  {stats.displayLetter || "—"} · {stats.gradeSource}
                  {stats.grade !== null
                    ? ` · ${stats.grade.toFixed(1)}% all-time points`
                    : ""}
                </p>
              )}
            </Card>
            <Card title="Due this week">
              {school
                .filter(
                  (a) =>
                    !isDone(a) &&
                    a.dueDate &&
                    a.dueDate <= addDays(state.today, 6),
                )
                .map((a) =>
                  row(
                    a,
                    "assignments",
                    true,
                    `${state.classes.find((c) => c.id === a.classId)?.name} · ${formatDate(a.dueDate)}`,
                  ),
                )}
            </Card>
            {!classId && (
              <>
                <h2>
                  CLASSES · {state.classes.length}
                  <button onClick={() => edit("classes")}>+ Add class</button>
                </h2>
                <div className="n-class-grid">
                {state.classes.map((c) => (
                  <Card key={c.id}>
                    <button
                      className="n-class"
                      style={{
                        borderLeftColor: c.completed
                          ? "#6b7280"
                          : c.accentColor || "#9d6fff",
                      }}
                      onClick={() => setClassId(c.id)}
                    >
                      <strong>
                        {c.name}
                        {c.completed
                          ? " · Finished"
                          : c.paused
                            ? " · Paused"
                            : ""}
                      </strong>
                      <span>
                        {c.meetingDays} {c.meetingTime}
                      </span>
                      <small>
                        {classStats(state, c.id, completionRange).completed} /{" "}
                        {classStats(state, c.id, completionRange).total} done
                      </small>
                    </button>
                  </Card>
                ))}
                </div>
              </>
            )}
            {classId && (
              <Card
                title="Class details"
                action={
                  <button
                    onClick={() =>
                      edit(
                        "classes",
                        state.classes.find((c) => c.id === classId),
                      )
                    }
                  >
                    Edit
                  </button>
                }
              >
                <p>{state.classes.find((c) => c.id === classId)?.professor}</p>
                <p>{state.classes.find((c) => c.id === classId)?.notes}</p>
              </Card>
            )}
            <Card title="All assignments">
              {school.map((a) =>
                row(
                  a,
                  "assignments",
                  true,
                  `${a.status} · ${formatDate(a.dueDate)}`,
                ),
              )}
            </Card>
            <button
              className="n-service"
              onClick={() => boundary("Syllabus / Canvas import")}
            >
              Import assignments <ChevronRight size={14} />
            </button>
          </>
        )}
        {tab === "calendar" && (
          <>
            <button
              aria-pressed={timeGrid}
              onClick={() => setTimeGrid((v) => !v)}
            >
              {timeGrid ? "Show list" : "Show time blocks"}
            </button>
            {timeGrid && (
              <CalendarTimeGrid items={items} day={selectedDay} edit={edit} />
            )}
            <div className="n-segment">
              {["Month", "Week", "Day"].map((m) => (
                <button
                  key={m}
                  aria-pressed={calendarMode === m}
                  onClick={() => setCalendarMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="n-calendar-head">
              <button
                aria-label="Previous month"
                onClick={() => {
                  const d = new Date(`${month}-15T12:00:00`);
                  d.setMonth(d.getMonth() - 1);
                  setMonth(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                  );
                }}
              >
                <ChevronLeft size={17} />
              </button>
              <strong>
                {new Date(`${month}-15T12:00:00`).toLocaleDateString(
                  undefined,
                  { month: "long", year: "numeric" },
                )}
              </strong>
              <button
                aria-label="Next month"
                onClick={() => {
                  const d = new Date(`${month}-15T12:00:00`);
                  d.setMonth(d.getMonth() + 1);
                  setMonth(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                  );
                }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            {calendarMode === "Month" && (
              <div className="n-month">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <small key={`h${i}`}>{d}</small>
                ))}
                {Array.from(
                  { length: new Date(`${month}-01T12:00:00`).getDay() },
                  (_, i) => (
                    <span key={`empty${i}`} />
                  ),
                )}
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5)),
                      0,
                    ).getDate(),
                  },
                  (_, i) => {
                    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                    return (
                      <button
                        key={date}
                        aria-pressed={date === selectedDay}
                        aria-label={`${date}${items.some((it) => it.date === date) ? ", has items" : ""}`}
                        onClick={() => setSelectedDay(date)}
                      >
                        {i + 1}
                        <i
                          className={
                            items.some((it) => it.date === date)
                              ? "has-items"
                              : ""
                          }
                        />
                      </button>
                    );
                  },
                )}
              </div>
            )}
            {calendarMode !== "Month" && (
              <input
                type="date"
                aria-label="Selected calendar day"
                value={selectedDay}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSelectedDay(e.target.value);
                  setMonth(e.target.value.slice(0, 7));
                }}
              />
            )}
            <div className="n-calendar-head">
              <button
                onClick={() => {
                  setSelectedDay(state.today);
                  setMonth(state.today.slice(0, 7));
                }}
              >
                Today
              </button>
              <select
                aria-label="Calendar type"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {[
                  "All",
                  "Task",
                  "Assignment",
                  "Class",
                  "Reminder",
                  "Workout",
                  "Bill",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <Card
              title={
                calendarMode === "Week"
                  ? `Week from ${formatDate(selectedDay)}`
                  : formatDate(selectedDay)
              }
            >
              {items
                .filter(
                  (i) =>
                    (calendarMode === "Week"
                      ? i.date >= selectedDay &&
                        i.date <= addDays(selectedDay, 6)
                      : i.date === selectedDay) &&
                    (kind === "All" || i.kind === kind),
                )
                .map((i) =>
                  row(
                    i,
                    i.collection,
                    false,
                    `${i.kind} · ${i.time || formatDate(i.date)}`,
                  ),
                )}
              {!items.some((i) => i.date === selectedDay) &&
                calendarMode !== "Week" && (
                  <p>Nothing scheduled for this day.</p>
                )}
            </Card>
            <button
              className="n-service"
              onClick={() => boundary("Apple / Google Calendar")}
            >
              Connected calendars <ChevronRight size={14} />
            </button>
          </>
        )}
        {tab === "notes" && (
          <>
            <div className="n-folder-row">
              <select
                aria-label="Note folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="all">All notes</option>
                <option value="pinned">Pinned</option>
                {state.folders.map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button onClick={() => edit("folders")}>+ Folder</button>
              {state.folders.some((f) => f.id === folder) && (
                <button
                  onClick={() =>
                    edit(
                      "folders",
                      state.folders.find((f) => f.id === folder),
                    )
                  }
                >
                  Edit folder
                </button>
              )}
            </div>
            {state.notes
              .filter(matches)
              .filter(
                (n) =>
                  folder === "all" ||
                  (folder === "pinned" ? n.pinned : n.folderId === folder),
              )
              .map((n) => (
                <section
                  className="n-card"
                  style={{
                    borderLeft: n.color ? `4px solid ${n.color}` : undefined,
                  }}
                  key={n.id}
                >
                  <button className="n-note" onClick={() => edit("notes", n)}>
                    <strong>
                      {n.pinned && <Pin size={13} />}{" "}
                      {n.title || "Untitled note"}
                    </strong>
                    <p>{n.body?.slice(0, 130) || "No additional text"}</p>
                    <small>
                      {formatDate(n.updatedAt)} ·{" "}
                      {(n.checklist || []).filter((x) => x.done).length}/
                      {(n.checklist || []).length} checklist items ·{" "}
                      {(n.images || []).length} images
                    </small>
                  </button>
                  <button
                    aria-label={`${n.pinned ? "Unpin" : "Pin"} ${n.title}`}
                    onClick={() =>
                      dispatch({
                        type: "toggle",
                        collection: "notes",
                        id: n.id,
                      })
                    }
                  >
                    {n.pinned ? "Unpin" : "Pin"}
                  </button>
                </section>
              ))}
            {state.notes.length === 0 && (
              <Card>
                <p>No notes yet. Write your first one.</p>
              </Card>
            )}
          </>
        )}
        {tab === "reminders" && (
          <>
            <form className="n-capture" onSubmit={e => { e.preventDefault(); if(capture.trim()) { edit("reminders", {title:capture.trim()}); setCapture(""); } }}>
              <ReleaseIcon name="bell" size={16}/><input aria-label="Capture reminder" placeholder="Remind me to…" value={capture} onChange={e => setCapture(e.target.value)}/>{capture.trim() && <button type="submit">Review</button>}
            </form>
            <div className="n-reminder-counts">
              {[["Today",r => r.date === state.today],["Scheduled",r => r.date > state.today],["All",() => true],["Flagged",r => r.flagged]].map(([name,predicate]) => <button key={name} aria-pressed={reminderFocus === name} onClick={() => { setFilter("All"); setReminderFocus(name); }}><b>{state.reminders.filter(r=>!r.completed && predicate(r)).length}</b><span>{name}</span></button>)}
            </div>
            <Card title="Lists" detail={String(state.reminderLists.length+1)} action={<button onClick={()=>edit("reminderLists")}>Add list</button>}>
              {[{id:"",title:"Reminders",color:"#36d3ff"},...state.reminderLists].map(list => <div className="n-list-row" key={list.id}><button onClick={()=>{setFilter(list.id);setReminderFocus("List");}}><i style={{background:list.color||"#36d3ff"}}/><strong>{list.title}</strong><span>{state.reminders.filter(r=>!r.completed && (r.listId||"")===list.id).length}</span><ChevronRight size={13}/></button>{list.id && <button aria-label={`Edit ${list.title} list`} onClick={()=>edit("reminderLists",list)}><Ellipsis size={16}/></button>}</div>)}
            </Card>
            {(reminderFocus || query) && <Card title={query ? "Results" : reminderFocus === "List" ? state.reminderLists.find(l=>l.id===filter)?.title || "Reminders" : reminderFocus} action={<button onClick={()=>{setReminderFocus(null);setQuery("");}}>Close</button>}>
              {state.reminders.filter(matches).filter(r => query || (filter === "All" || (r.listId||"") === filter) && (reminderFocus === "Today" ? r.date === state.today : reminderFocus === "Scheduled" ? r.date > state.today : reminderFocus === "Flagged" ? r.flagged : true)).sort((a,b)=>Number(a.completed)-Number(b.completed)||Number(b.flagged)-Number(a.flagged)||(a.date||"9999").localeCompare(b.date||"9999")).map(r=>row(r,"reminders",true,`${r.flagged ? "Flagged · " : ""}${r.date && r.date < state.today && !r.completed ? "Overdue · " : ""}${formatDate(r.date)} ${r.time||""}`))}
            </Card>}
            <button
              className="n-service"
              onClick={() => boundary("Notifications")}
            >
              Notification settings <ChevronRight size={14} />
            </button>
          </>
        )}
        {tab === "finance" && (
          <FinancePanel state={state} dispatch={dispatch} edit={edit} />
        )}
        {tab === "health" && (
          <>
            <HealthHistory state={state} dispatch={dispatch} edit={edit} />
            <div className="n-segment">
              {["Lifting", "Running", "Nutrition"].map((t) => (
                <button
                  key={t}
                  aria-pressed={healthTab === t}
                  onClick={() => setHealthTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <Card
              title={healthTab === "Nutrition" ? "Today's meals" : healthTab}
              action={
                <button
                  onClick={() =>
                    edit(healthTab === "Nutrition" ? "nutrition" : "workouts", {
                      type: healthTab === "Running" ? "run" : "lift",
                    })
                  }
                >
                  + Add
                </button>
              }
            >
              {healthTab === "Nutrition"
                ? state.nutrition.map((m) =>
                    row(
                      m,
                      "nutrition",
                      false,
                      `${m.calories} kcal · ${m.protein}g protein`,
                    ),
                  )
                : state.workouts
                    .filter(
                      (w) =>
                        w.type === (healthTab === "Running" ? "run" : "lift"),
                    )
                    .map((w) =>
                      row(
                        w,
                        "workouts",
                        false,
                        `${formatDate(w.date)} · ${w.duration} min`,
                      ),
                    )}
            </Card>
            <button
              className="n-service"
              onClick={() => boundary("HealthKit / Strava")}
            >
              Connect health data <ChevronRight size={14} />
            </button>
          </>
        )}
        {tab === "meals" && (
          <>
            <Card
              title="Today"
              detail={`${state.nutrition.filter((m) => m.date === state.today).reduce((n, m) => n + Number(m.calories), 0)} kcal`}
            >
              {state.nutrition
                .filter((m) => m.date === state.today)
                .map((m) =>
                  row(
                    m,
                    "nutrition",
                    false,
                    `${m.protein}g protein · ${m.carbs}g carbs · ${m.fat}g fat`,
                  ),
                )}
            </Card>
            <Card title="Meal log">
              {state.nutrition.map((m) =>
                row(m, "nutrition", false, formatDate(m.date)),
              )}
            </Card>
            <MealPlanner state={state} dispatch={dispatch} />
          </>
        )}
        {tab === "travel" && (
          <>
            <Card title="Trips">
              {state.trips.map((t) =>
                row(
                  t,
                  "trips",
                  false,
                  `${formatDate(t.startDate)} — ${formatDate(t.endDate)}`,
                ),
              )}
            </Card>
            <TravelPanel state={state} dispatch={dispatch} />
          </>
        )}
        {tab === "more" && (
          <>
            {tool ? (
              <>
                <button onClick={() => setTool(null)}>‹ More</button>
                <Card
                  title={
                    tool === "shopping"
                      ? "Shopping list"
                      : tool === "bucket"
                        ? "Bucket list"
                        : tool === "orders"
                          ? "Order tracking"
                          : "Weekly review"
                  }
                  action={
                    tool !== "review" && (
                      <button onClick={() => edit(tool)}>+ Add</button>
                    )
                  }
                >
                  {tool === "review" ? (
                    <WeeklyReview state={state} />
                  ) : (
                    state[tool].map((item) =>
                      row(item, tool, tool !== "orders", item.status),
                    )
                  )}
                </Card>
              </>
            ) : (
              <Card title="Tools">
                {[
                  ["shopping", "Shopping list"],
                  ["orders", "Order tracking"],
                  ["bucket", "Bucket list"],
                  ["review", "Weekly review"],
                ].map(([key, title]) => (
                  <button
                    key={key}
                    className="n-service"
                    onClick={() => setTool(key)}
                  >
                    {title}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </Card>
            )}
            <Card title="Settings">
              <button
                className="n-service"
                onClick={() =>
                  dispatch({
                    type: "setting",
                    value: { dark: !state.settings.dark },
                  })
                }
              >
                Appearance <span>{state.settings.dark ? "Dark" : "Light"}</span>
              </button>
              <button
                className="n-service"
                onClick={() => boundary("Connected accounts")}
              >
                Connected accounts <ChevronRight size={14} />
              </button>
              <button
                className="n-service"
                onClick={() => boundary("Notch Pro")}
              >
                Notch Pro <ChevronRight size={14} />
              </button>
              <button
                className="n-service"
                onClick={() => setSheet({ kind: "reset" })}
              >
                Reset sample data <ChevronRight size={14} />
              </button>
            </Card>
            <DemoSettings state={state} dispatch={dispatch} />
            <small className="n-demo-credit">
              Notch browser demo · fictional data
            </small>
            <a
              className="n-store"
              href="https://apps.apple.com/us/app/notch-student-school-planner/id6791906668"
              target="_blank"
              rel="noreferrer"
            >
              Notch on the App Store ↗
            </a>
          </>
        )}
        <div className="n-bottom-space" />
      </div>
      {state.notice && (
        <div className="n-notice" role="status">
          <span>{state.notice}</span>
          {state.history.length > 0 && (
            <button onClick={() => dispatch({ type: "undo" })}>Undo</button>
          )}
          <button
            aria-label="Dismiss notice"
            onClick={() => dispatch({ type: "notice", message: "" })}
          >
            ×
          </button>
        </div>
      )}
      <nav
        className="n-nav"
        aria-label="Notch tabs"
        ref={navRef}
        inert={sheet ? "" : undefined}
      >
        <div className="n-nav-items">
        {(state.settings.tabOrder || sections).map((s) => {
          const i = sections.indexOf(s);
          return (
            <button
              key={s}
              aria-current={tab === s ? "page" : undefined}
              onClick={() =>
                tab === s
                  ? scroll.current?.scrollTo({ top: 0, behavior: "instant" })
                  : changeTab(s)
              }
            >
              <ReleaseIcon name={releaseIcons[i]} size={20} />
              <span>{titleCase(s)}</span>
            </button>
          );
        })}
        </div>
      </nav>
      {sheet && (
        <Sheet
          title={
            sheet.kind === "edit"
              ? `${state[sheet.collection].some((x) => x.id === sheet.id) ? "Edit" : "New"} ${names[sheet.collection]}`
              : sheet.kind === "boundary"
                ? sheet.service
                : sheet.kind === "quick"
                  ? "Quick add"
                  : sheet.kind === "reset"
                    ? "Reset demo"
                    : "One thing"
          }
          onClose={() => setSheet(null)}
        >
          {sheet.kind === "edit" ? (
            <EntityForm
              sheet={sheet}
              state={state}
              dispatch={dispatch}
              close={() => setSheet(null)}
            />
          ) : sheet.kind === "quick" ? (
            <div className="n-quick-grid">
              {[
                "tasks",
                "assignments",
                "notes",
                "reminders",
                "spending",
                "workouts",
                "nutrition",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    edit(
                      c,
                      c === "assignments"
                        ? { classId: state.classes[0]?.id }
                        : {},
                    )
                  }
                >
                  + {names[c]}
                </button>
              ))}
              <button onClick={() => boundary("AI assistant")}>
                Ask Notch…
              </button>
            </div>
          ) : sheet.kind === "boundary" ? (
            <div className="n-boundary">
              <p>
                {`${sheet.service} requires native features or an account connection. This browser demo does not connect accounts, request permissions, make purchases or run AI.`}
              </p>
              <button className="n-primary" onClick={() => setSheet(null)}>
                Back to demo
              </button>
            </div>
          ) : sheet.kind === "reset" ? (
            <div className="n-boundary">
              <p>Replace your changes with the fictional starting data?</p>
              <button
                className="n-primary"
                onClick={() => {
                  dispatch({ type: "reset" });
                  setSheet(null);
                }}
              >
                Reset sample data
              </button>
            </div>
          ) : (
            <form
              className="n-form"
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({
                  type: "oneThing",
                  value: new FormData(e.currentTarget).get("oneThing").trim(),
                });
                setSheet(null);
              }}
            >
              <input
                name="oneThing"
                aria-label="One thing"
                defaultValue={state.oneThing}
              />
              <button className="n-primary">Save</button>
            </form>
          )}
        </Sheet>
      )}
    </section>
  );
}
export function EntityForm({ sheet, state, dispatch, close }) {
  const c = sheet.collection;
  const [v, setV] = useState({
      category: "Personal",
      priority: "Medium",
      ...(c === "orders"
        ? { status: "Ordered" }
        : c === "assignments"
          ? { status: "not started" }
          : {}),
      dueDate: state.today,
      nextDate: state.today,
      ...(c === "income"
        ? { type: "manual", taxMode: "none", w2Income: true }
        : {}),
      ...(["bills", "incomeRules"].includes(c)
        ? { frequency: "monthly", customDays: 30, billType: "bill" }
        : {}),
      date: state.today,
      startDate: state.today,
      endDate: state.today,
      classId: state.classes[0]?.id || "",
      body: "",
      folderId: "",
      days: [],
      history: [],
      ...sheet.value,
      ...(c === "folders"
        ? {
            noteIds: state.notes
              .filter((n) => n.folderId === sheet.id)
              .map((n) => n.id),
          }
        : {}),
      title: sheet.value.title || sheet.value.name || "",
    }),
    [error, setError] = useState("");
  const set = (k, value) => setV((v) => ({ ...v, [k]: value }));
  const fields = (label, key, type = "text", required = false) => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={v[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
  const select = (label, key, options) => (
    <label>
      {label}
      <select value={v[key] || ""} onChange={(e) => set(key, e.target.value)}>
        {options.map((x) =>
          typeof x === "string" ? (
            <option key={x}>{x}</option>
          ) : (
            <option key={x[0]} value={x[0]}>
              {x[1]}
            </option>
          ),
        )}
      </select>
    </label>
  );
  const exists = state[c].some((x) => x.id === sheet.id);
  return (
    <form
      className="n-form"
      onSubmit={(e) => {
        e.preventDefault();
        const value = {
          ...v,
          title: v.title.trim(),
          ...(["classes", "folders", "trips"].includes(c)
            ? { name: v.title.trim() }
            : {}),
        };
        const err = validateEntity(c, value, state);
        if (err) {
          setError(err);
          return;
        }
        dispatch({ type: "save", collection: c, id: sheet.id, value });
        close();
      }}
    >
      {fields(c === "notes" ? "Title" : "Name", "title", "text", c !== "notes")}
      {c === "tasks" && (
        <>
          {select("Category", "category", [
            "Personal",
            "School",
            "Business",
            "Gym",
            "Shopping",
            "Errands",
          ])}
          {select("Priority", "priority", ["Low", "Medium", "High"])}
          {fields("Due date", "dueDate", "date")}
          {fields("Start time", "startTime", "time")}
          {fields("End time", "endTime", "time")}
        </>
      )}
      {c === "assignments" && (
        <>
          {select(
            "Class",
            "classId",
            state.classes.map((k) => [k.id, k.name]),
          )}
          {select("Type", "type", [
            "assignment",
            "exam",
            "project",
            "reading",
            "quiz",
          ])}
          {fields("Due date", "dueDate", "date")}
          {fields("Due time", "dueTime", "time")}
          {select("Status", "status", [
            "not started",
            "in progress",
            "completed",
          ])}
          {fields("Points earned", "pointsEarned", "number")}
          {fields("Points possible", "pointsPossible", "number")}
        </>
      )}
      {c === "classes" && (
        <>
          {fields("Professor", "professor")}
          {fields("Meeting days (Mon Wed)", "meetingDays")}
          {fields("Start time", "meetingTime", "time")}
          {fields("End time", "meetingEndTime", "time")}
          {fields("Class color", "accentColor", "color")}
        </>
      )}
      {c === "folders" && (
        <fieldset className="n-nested">
          <legend>Notes in this folder</legend>
          {state.notes.map((n) => (
            <label className="n-checkbox" key={n.id}>
              <input
                type="checkbox"
                checked={(v.noteIds || []).includes(n.id)}
                onChange={(e) =>
                  set(
                    "noteIds",
                    e.target.checked
                      ? [...v.noteIds, n.id]
                      : v.noteIds.filter((id) => id !== n.id),
                  )
                }
              />
              {n.title || "Untitled"}
              {n.folderId && n.folderId !== sheet.id
                ? " · moves from another folder"
                : ""}
            </label>
          ))}
        </fieldset>
      )}
      {c === "notes" && (
        <>
          {select("Folder", "folderId", [
            ["", "No folder"],
            ...state.folders.map((f) => [f.id, f.name]),
          ])}
          <NoteBody value={v.body} onChange={(text) => set("body", text)} />
          <label className="n-checkbox">
            <input
              type="checkbox"
              checked={!!v.pinned}
              onChange={(e) => set("pinned", e.target.checked)}
            />
            Pinned
          </label>
        </>
      )}
      {["reminders", "spending", "income", "workouts", "nutrition"].includes(
        c,
      ) && fields("Date", "date", "date")}
      {c === "reminders" && (
        <>
          {fields("Time", "time", "time")}
          <small>
            Saved locally in this sample session. No notification is scheduled.
          </small>
        </>
      )}
      {["spending", "income"].includes(c) &&
        fields(
          "Amount",
          "amount",
          "number",
          c !== "income" || v.type !== "hourly",
        )}
      {c === "spending" &&
        select("Category", "category", [
          "Food",
          "School",
          "Transport",
          "Shopping",
          "Other",
        ])}
      <FinanceFields collection={c} v={v} set={set} state={state} />
      {c === "accounts" && fields("Opening balance", "balance", "number", true)}
      {c === "workouts" && (
        <>
          {select("Type", "type", ["lift", "run"])}
          {fields("Duration (minutes)", "duration", "number")}
          {v.type === "run" && fields("Distance (miles)", "distance", "number")}
        </>
      )}
      {c === "nutrition" && (
        <>
          {fields("Calories", "calories", "number")}
          {fields("Protein (g)", "protein", "number")}
          {fields("Carbs (g)", "carbs", "number")}
          {fields("Fat (g)", "fat", "number")}
        </>
      )}
      {c === "trips" && (
        <>
          {fields("Start date", "startDate", "date")}
          {fields("End date", "endDate", "date")}
        </>
      )}
      {c === "orders" && (
        <>
          {fields("Provider", "provider")}
          {fields("Tracking number", "trackingNumber")}
          {select("Status", "status", ["Ordered", "Shipped", "Delivered"])}
          {fields("Expected arrival", "eta", "date")}
        </>
      )}
      {!["notes", "folders", "habits"].includes(c) && (
        <label>
          Notes
          <textarea
            rows="3"
            value={v.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
      )}
      <AdvancedFields c={c} v={v} set={set} state={state} />
      {error && <p role="alert">{error}</p>}
      <button className="n-primary" type="submit">
        Save
      </button>
      {exists && (
        <button
          type="button"
          className="n-delete"
          onClick={() => {
            dispatch({ type: "delete", collection: c, id: sheet.id });
            close();
          }}
        >
          Delete{c === "classes" ? " class (keeps assignments)" : ""}
        </button>
      )}
    </form>
  );
}
