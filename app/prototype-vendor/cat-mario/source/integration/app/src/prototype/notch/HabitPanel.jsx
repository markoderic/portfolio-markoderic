import React from "react";
import { habitDue, habitStreak } from "./planningModel";
import { dateAdd } from "./financeModel";
export default function HabitPanel({ state, dispatch, edit }) {
  return (
    <section className="n-card">
      {state.habits.map((h) => {
        const streak = habitStreak(h, state.today, state.restDays),
          todayDone = h.history?.includes(state.today);
        return (
          <div className="habit-detail" key={h.id}>
            <div className="n-row">
              <button
                className="n-check"
                aria-label={`Mark ${h.title}`}
                aria-pressed={!!todayDone}
                disabled={h.archived}
                onClick={() =>
                  dispatch({ type: "toggle", collection: "habits", id: h.id })
                }
              >
                {todayDone ? "✓" : ""}
              </button>
              <button onClick={() => edit("habits", h)}>{h.title}</button>
              <small>
                {h.archived
                  ? "Archived"
                  : habitDue(h, state.today, state.restDays)
                    ? "Due today"
                    : "Flexible / rest"}
              </small>
            </div>
            <p>
              {streak.count} kept in this run · best {streak.best} ·{" "}
              {streak.bank} freezes
            </p>
            <div className="habit-mini-grid">
              {Array.from({ length: 14 }, (_, i) =>
                dateAdd(state.today, i - 13),
              ).map((d) => (
                <button
                  key={d}
                  aria-label={`${h.title}, ${d}`}
                  aria-pressed={h.history?.includes(d) || false}
                  disabled={h.archived}
                  onClick={() =>
                    dispatch({
                      type: "toggle",
                      collection: "habits",
                      id: h.id,
                      day: d,
                    })
                  }
                >
                  {d.slice(-2)}
                </button>
              ))}
            </div>
            <button
              onClick={() => dispatch({ type: "archiveHabit", id: h.id })}
            >
              {h.archived ? "Resume habit" : "Archive habit"}
            </button>
          </div>
        );
      })}
      <button
        aria-pressed={state.restDays.includes(state.today)}
        onClick={() => dispatch({ type: "restDay", day: state.today })}
      >
        {state.restDays.includes(state.today)
          ? "Remove today’s rest day"
          : "Plan today as a rest day"}
      </button>
    </section>
  );
}
