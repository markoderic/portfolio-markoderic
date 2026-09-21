import React, { useState } from "react";
import { gradeLetters } from "./demoState";
import { dateAdd } from "./financeModel";
function RowsEditor({ label, rows, onChange, fields, empty }) {
  return (
    <fieldset className="n-nested">
      <legend>{label}</legend>
      {rows.map((r, i) => (
        <div className="nested-row" key={r.id || i}>
          {fields.map(([key, name, type = "text"]) => (
            <label key={key}>
              {name}
              <input
                type={type}
                value={r[key] ?? ""}
                min={type === "number" ? 0 : undefined}
                step={type === "number" ? "any" : undefined}
                onChange={(e) =>
                  onChange(
                    rows.map((x, j) =>
                      i === j
                        ? {
                            ...x,
                            [key]:
                              type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          }
                        : x,
                    ),
                  )
                }
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...rows, { id: crypto.randomUUID(), ...empty }])
        }
      >
        + Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}
export default function AdvancedFields({ c, v, set, state }) {
  const [imageError, setImageError] = useState("");
  const input = (key, label, type = "text") => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={v[key] ?? ""}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  const choose = (key, label, options) => (
    <label>
      {label}
      <select value={v[key] || ""} onChange={(e) => set(key, e.target.value)}>
        {options.map((x) => {
          const [id, name] = Array.isArray(x) ? x : [x, x];
          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </label>
  );
  const check = (key, label) => (
    <label className="n-checkbox">
      <input
        type="checkbox"
        checked={!!v[key]}
        onChange={(e) => set(key, e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <>
      {c === "tasks" && (
        <>
          {choose("repeatRule", "Repeat", [
            ["", "Never"],
            "daily",
            "weekly",
            "monthly",
          ])}
          {choose("classId", "Linked class", [
            ["", "None"],
            ...state.classes.map((x) => [x.id, x.name]),
          ])}
          {choose("notifyLead", "Reminder lead", [
            ["-1", "Off"],
            ["0", "At due time"],
            ["15", "15 minutes"],
            ["60", "1 hour"],
            ["1440", "1 day"],
          ])}
          <small>
            Reminder preference only. No browser notification is scheduled.
          </small>
        </>
      )}
      {c === "habits" && (
        <>
          <label>
            Any days per week
            <select
              value={v.timesPerWeek || 0}
              onChange={(e) => set("timesPerWeek", Number(e.target.value))}
            >
              <option value="0">Scheduled weekdays</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} days per week
                </option>
              ))}
            </select>
          </label>
          {!v.timesPerWeek && (
            <fieldset className="habit-weekdays">
              <legend>Weekdays · empty means every day</legend>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={(v.days || []).includes(i)}
                    onChange={(e) =>
                      set(
                        "days",
                        e.target.checked
                          ? [...(v.days || []), i]
                          : (v.days || []).filter((x) => x !== i),
                      )
                    }
                  />
                  {d}
                </label>
              ))}
            </fieldset>
          )}
          <fieldset className="habit-history">
            <legend>Last 28 days · select to correct history</legend>
            {Array.from({ length: 28 }, (_, i) =>
              dateAdd(state.today, i - 27),
            ).map((d) => (
              <button
                type="button"
                key={d}
                aria-label={`${d} ${v.history?.includes(d) ? "completed" : "not completed"}`}
                aria-pressed={v.history?.includes(d) || false}
                onClick={() =>
                  set(
                    "history",
                    v.history?.includes(d)
                      ? v.history.filter((x) => x !== d)
                      : [...(v.history || []), d],
                  )
                }
              >
                {d.slice(-2)}
              </button>
            ))}
          </fieldset>
        </>
      )}
      {c === "classes" && (
        <>
          {choose("mode", "Class mode", ["in-person", "online"])}
          {choose("gradeLetter", "Class grade", [
            ["", "Auto from points"],
            ...gradeLetters,
          ])}
          {check("completed", "Finished class")}
          {check("paused", "Paused class")}
        </>
      )}
      {c === "assignments" && (
        <>
          {input("link", "Assignment link", "url")}
          {input("grade", "Manual grade")}
          {choose("notifyLead", "Reminder lead", [
            ["-1", "Off"],
            ["0", "At deadline"],
            ["60", "1 hour"],
            ["1440", "1 day"],
          ])}
        </>
      )}
      {["notes", "folders", "reminderLists"].includes(c) &&
        input("color", "Color", "color")}
      {c === "notes" && (
        <>
          <fieldset className="n-nested">
            <legend>Checklist</legend>
            {(v.checklist || []).map((x, i) => (
              <div className="checklist-edit" key={x.id}>
                <input
                  aria-label={`Complete checklist item ${i + 1}`}
                  type="checkbox"
                  checked={!!x.done}
                  onChange={(e) =>
                    set(
                      "checklist",
                      v.checklist.map((r) =>
                        r.id === x.id ? { ...r, done: e.target.checked } : r,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Checklist item ${i + 1}`}
                  value={x.text}
                  onChange={(e) =>
                    set(
                      "checklist",
                      v.checklist.map((r) =>
                        r.id === x.id ? { ...r, text: e.target.value } : r,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={`Remove checklist item ${i + 1}`}
                  onClick={() =>
                    set(
                      "checklist",
                      v.checklist.filter((r) => r.id !== x.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                set("checklist", [
                  ...(v.checklist || []),
                  { id: crypto.randomUUID(), text: "", done: false },
                ])
              }
            >
              + Checklist item
            </button>
          </fieldset>
        </>
      )}
      {["notes", "reminders"].includes(c) && (
        <>
          <label>
            Attach image · stays in this sample session
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  !["image/png", "image/jpeg", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 2000000
                ) {
                  setImageError("Use a PNG, JPEG or WebP under 2 MB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  set("images", [
                    ...(v.images || []),
                    {
                      id: crypto.randomUUID(),
                      name: file.name,
                      url: reader.result,
                    },
                  ]);
                  setImageError("");
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {imageError && <p role="alert">{imageError}</p>}
          {(v.images || []).map((img) => (
            <figure key={img.id}>
              <img className="note-attachment" src={img.url} alt={img.name} />
              <figcaption>
                {img.name}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "images",
                      v.images.filter((x) => x.id !== img.id),
                    )
                  }
                >
                  Remove image
                </button>
              </figcaption>
            </figure>
          ))}
        </>
      )}
      {c === "reminders" && (
        <>
          {choose("listId", "Reminder list", [
            ["", "Reminders"],
            ...state.reminderLists.map((l) => [l.id, l.title]),
          ])}
          {check("flagged", "Flagged")}
        </>
      )}
      {c === "workouts" && (
        <>
          {input("split", "Split name")}
          {input("startTime", "Start time", "time")}
          {input("energy", "Energy (kcal)", "number")}
          {v.type !== "run" && (
            <RowsEditor
              label="Exercises"
              rows={v.exercises || []}
              onChange={(x) => set("exercises", x)}
              fields={[
                ["name", "Exercise"],
                ["sets", "Sets", "number"],
                ["reps", "Reps", "number"],
                ["weight", "Weight (lb)", "number"],
              ]}
              empty={{ name: "", sets: 3, reps: 10, weight: 0 }}
            />
          )}
        </>
      )}
      {c === "trips" && (
        <RowsEditor
          label="Legs"
          rows={v.legs || []}
          onChange={(x) => set("legs", x)}
          fields={[
            ["from", "From"],
            ["to", "To"],
            ["mode", "Mode"],
          ]}
          empty={{ from: "", to: "", mode: "train" }}
        />
      )}
      {c === "shopping" && (
        <>
          {input("estimatedPrice", "Estimated price", "number")}
          {input("store", "Store")}
          {input("category", "Category")}
          {choose("listType", "List", ["grocery", "wishlist"])}
        </>
      )}
      {c === "orders" && (
        <>
          {input("orderDate", "Order date", "date")}
          {input("trackUrl", "Tracking URL", "url")}
        </>
      )}
      {c === "goals" && (
        <>
          {input("targetDate", "Target date", "date")}
          {input("progressPercent", "Progress %", "number")}
          {choose("linkedSavingsGoalId", "Savings goal", [
            ["", "None"],
            ...state.savingsGoals.map((g) => [g.id, g.title]),
          ])}
        </>
      )}
    </>
  );
}
