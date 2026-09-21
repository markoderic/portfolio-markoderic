import React, { useState } from "react";
import { weekDates } from "./planningModel";
import { dateAdd } from "./financeModel";
export function DayReview({ state, dispatch, edit }) {
  const [reflection, setReflection] = useState("");
  return (
    <section className="n-card">
      <h2>Goals</h2>
      {state.goals.map((g) => (
        <button
          className="finance-navigation"
          key={g.id}
          onClick={() => edit("goals", g)}
        >
          {g.title}
          <span>{g.progressPercent || 0}%</span>
        </button>
      ))}
      <button onClick={() => edit("goals")}>+ Goal</button>
      <details>
        <summary>Close the sample day</summary>
        <label>
          Reflection
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={2}
          />
        </label>
        <button
          disabled={state.dayHistory.some((d) => d.date === state.today)}
          onClick={() => dispatch({ type: "closeDay", reflection })}
        >
          {state.dayHistory.some((d) => d.date === state.today)
            ? "Day recorded"
            : "Record day"}
        </button>
        {state.dayHistory.map((d) => (
          <article key={d.date}>
            <strong>{d.date}</strong>
            <p>{d.oneThing}</p>
            <p>
              {d.tasks} tasks · {d.habits} habits
            </p>
            <p>{d.reflection}</p>
          </article>
        ))}
      </details>
    </section>
  );
}
export function WeeklyReview({ state }) {
  const week = weekDates(state.today),
    previous = week.map((d) => dateAdd(d, -7));
  const metrics = (days) => ({
    tasks: state.tasks.filter(
      (t) => t.completed && days.includes(t.completedAt),
    ).length,
    workouts: state.workouts.filter((w) => days.includes(w.date)).length,
    habits: state.habits.reduce(
      (s, h) => s + (h.history || []).filter((d) => days.includes(d)).length,
      0,
    ),
    spending: state.spending
      .filter((s) => days.includes(s.date))
      .reduce((sum, s) => sum + Number(s.amount), 0),
  });
  const current = metrics(week),
    prior = metrics(previous);
  return (
    <div>
      <p>
        {week[0]} – {week[6]}
      </p>
      <table className="weekly-review">
        <thead>
          <tr>
            <th>Measure</th>
            <th>This week</th>
            <th>Last week</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(current).map((k) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{current[k].toFixed(k === "spending" ? 2 : 0)}</td>
              <td>{prior[k].toFixed(k === "spending" ? 2 : 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small>Computed from fictional dated records.</small>
    </div>
  );
}
export function CalendarTimeGrid({ items, day, edit }) {
  return (
    <div className="calendar-time-grid" aria-label={`Time blocks for ${day}`}>
      {Array.from({ length: 24 }, (_, hour) => (
        <div key={hour}>
          <time>{String(hour).padStart(2, "0")}:00</time>
          <section>
            {items
              .filter(
                (i) =>
                  i.date === day &&
                  i.time &&
                  Number(i.time.split(":")[0]) === hour,
              )
              .map((item, i) => (
                <button
                  key={item.id + "-" + i}
                  onClick={() => edit(item.collection, item)}
                >
                  {item.time} · {item.title}
                  <small>{item.kind}</small>
                </button>
              ))}
          </section>
        </div>
      ))}
    </div>
  );
}
