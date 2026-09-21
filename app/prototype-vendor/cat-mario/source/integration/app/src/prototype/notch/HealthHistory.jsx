import React from "react";
import LineChart from "../charts/LineChart";
import { dateAdd, sum } from "./financeModel";
export default function HealthHistory({ state, dispatch, edit }) {
  const rows = Array.from({ length: 28 }, (_, i) => {
    const date = dateAdd(state.today, i - 27),
      workouts = state.workouts.filter((w) => w.date === date);
    return {
      date,
      minutes: sum(workouts, (w) => Number(w.duration) || 0),
      miles: sum(
        workouts.filter((w) => w.type === "run"),
        (w) => Number(w.distance) || 0,
      ),
      volume: sum(workouts, (w) =>
        sum(
          w.exercises || [],
          (e) => Number(e.sets) * Number(e.reps) * Number(e.weight),
        ),
      ),
    };
  });
  return (
    <section className="n-card">
      <h2>Workout history</h2>
      <LineChart
        rows={rows}
        title="Your sample training"
        metrics={[
          { key: "minutes", label: "Minutes" },
          { key: "miles", label: "Miles" },
          { key: "volume", label: "Lifting volume (lb)" },
        ]}
        provenance="Computed from fictional workout records"
      />
      <details>
        <summary>Nutrition goals</summary>
        {["calories", "protein", "carbs", "fat"].map((key) => (
          <label className="nutrition-goal" key={key}>
            {key}
            <input
              type="number"
              min="0"
              value={
                state.settings.nutritionGoals?.[key] ??
                { calories: 2200, protein: 160, carbs: 230, fat: 70 }[key]
              }
              onChange={(e) =>
                dispatch({
                  type: "setting",
                  value: {
                    nutritionGoals: {
                      ...state.settings.nutritionGoals,
                      [key]: Math.max(0, Number(e.target.value)),
                    },
                  },
                })
              }
            />
          </label>
        ))}
      </details>
      <h3>Plan a workout</h3>
      <div className="habit-mini-grid">
        {Array.from({ length: 7 }, (_, i) => dateAdd(state.today, i)).map(
          (d) => (
            <button
              key={d}
              onClick={() =>
                edit("workouts", {
                  date: d,
                  title: "Planned workout",
                  type: "lift",
                })
              }
            >
              {d.slice(-2)}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
