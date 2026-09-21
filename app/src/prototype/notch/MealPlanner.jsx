import React, { useState } from "react";
import { mealRecipes, recipeNutrition, mealGroceries } from "./mealModel";
import { weekDates } from "./planningModel";
export default function MealPlanner({ state, dispatch }) {
  const [view, setView] = useState("Plan"),
    [date, setDate] = useState(state.today),
    [recipeId, setRecipe] = useState(mealRecipes[0].id),
    [servings, setServings] = useState(1);
  const week = weekDates(date),
    plans = state.mealPlans.filter(
      (p) => p.date >= week[0] && p.date <= week[6],
    );
  return (
    <section className="n-card meal-planner">
      <h2>Meals · plan, shop, prep</h2>
      <div className="n-segment">
        {["Plan", "Groceries", "Prep", "Recipes", "History"].map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {v}
          </button>
        ))}
      </div>
      <label>
        Week containing
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      {view === "Plan" && (
        <>
          <form
            className="n-form"
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({
                type: "save",
                collection: "mealPlans",
                id: crypto.randomUUID(),
                value: {
                  title: mealRecipes.find((r) => r.id === recipeId).title,
                  recipeId,
                  servings: Number(servings),
                  date,
                },
              });
            }}
          >
            <label>
              Recipe
              <select
                value={recipeId}
                onChange={(e) => setRecipe(e.target.value)}
              >
                {mealRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Servings
              <input
                type="number"
                min=".25"
                max="20"
                step=".25"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                required
              />
            </label>
            <button type="submit">Add to {date}</button>
          </form>
          {plans.map((p) => (
            <div className="finance-record" key={p.id}>
              <span>
                {p.date} · {p.title}
                <small>{p.servings} servings</small>
              </span>
              <button
                disabled={state.nutrition.some((n) => n.planId === p.id)}
                onClick={() => dispatch({ type: "logPlannedMeal", id: p.id })}
              >
                {state.nutrition.some((n) => n.planId === p.id)
                  ? "Logged"
                  : "Log meal"}
              </button>
              <button
                onClick={() =>
                  dispatch({
                    type: "delete",
                    collection: "mealPlans",
                    id: p.id,
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </>
      )}
      {view === "Groceries" && (
        <>
          {mealGroceries(plans).map((g) => (
            <div className="finance-record" key={g.id}>
              <span>{g.name}</span>
              <span>
                {g.amount} {g.unitKind}
              </span>
            </div>
          ))}
          <button
            disabled={!plans.length}
            onClick={() =>
              dispatch({ type: "mealGroceries", from: week[0], to: week[6] })
            }
          >
            Update Shopping list for this week
          </button>
        </>
      )}
      {view === "Prep" &&
        plans.map((p) => {
          const recipe = mealRecipes.find((r) => r.id === p.recipeId);
          return (
            <div key={p.id}>
              <h3>
                {p.title} · {p.servings} servings
              </h3>
              {recipe.instructions.map((line, i) => (
                <label className="n-checkbox" key={i}>
                  <input
                    type="checkbox"
                    checked={(p.prepared || []).includes(i)}
                    onChange={(e) =>
                      dispatch({
                        type: "save",
                        collection: "mealPlans",
                        id: p.id,
                        value: {
                          ...p,
                          prepared: e.target.checked
                            ? [...(p.prepared || []), i]
                            : (p.prepared || []).filter((n) => n !== i),
                        },
                      })
                    }
                  />
                  {line}
                </label>
              ))}
            </div>
          );
        })}
      {view === "Recipes" &&
        mealRecipes.map((r) => (
          <article key={r.id}>
            <h3>{r.title}</h3>
            <p>
              {r.slot} · {r.effortMin} minutes · {r.servingsBase} serving
            </p>
            <p>
              {Object.entries(recipeNutrition(r))
                .map(
                  ([k, v]) => `${k}: ${v === null ? "unknown" : Math.round(v)}`,
                )
                .join(" · ")}
            </p>
            <ol>
              {r.instructions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </article>
        ))}
      {view === "History" &&
        state.nutrition
          .filter((n) => n.planId)
          .map((n) => (
            <div className="finance-record" key={n.id}>
              <span>
                {n.date} · {n.title}
              </span>
              <button
                onClick={() =>
                  dispatch({
                    type: "delete",
                    collection: "nutrition",
                    id: n.id,
                  })
                }
              >
                Remove log
              </button>
            </div>
          ))}
      <small>
        Fictional sample recipes and estimated nutrition. Manual planning; no AI
        generation or account connection.
      </small>
    </section>
  );
}
