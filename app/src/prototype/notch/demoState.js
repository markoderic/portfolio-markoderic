import { mealMutation } from "./mealModel.js";
import { planningMutation, nextTaskDate } from "./planningModel.js";
import {
  seedFinance,
  financeMutation,
  usesCredit,
  occurrences,
} from "./financeModel.js";
// Browser-only sample model. Source mapping and omitted native behavior: docs/redesign/12-notch-inventory.md.
export const sections = [
  "dashboard",
  "tasks",
  "reminders",
  "finance",
  "school",
  "calendar",
  "health",
  "meals",
  "notes",
  "travel",
  "more",
];
export const dayString = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dayString(d);
}
export const isDone = (item) =>
  typeof item.completed === "boolean"
    ? item.completed
    : item.status === "completed";
export function seedDemo(today = dayString()) {
  return {
    today,
    tasks: [
      {
        id: "t1",
        title: "Prepare studio presentation",
        category: "School",
        dueDate: today,
        priority: "High",
        startTime: "14:00",
        endTime: "15:00",
        completed: false,
        notes: "Choose three experiments to share.",
      },
      {
        id: "t2",
        title: "Pick up groceries",
        category: "Personal",
        dueDate: today,
        priority: "Medium",
        completed: false,
      },
      {
        id: "t3",
        title: "Read the design brief",
        category: "School",
        dueDate: addDays(today, -1),
        completed: true,
        completedAt: today,
      },
    ],
    habits: [
      { id: "h1", title: "Read 20 minutes", days: [], history: [] },
      { id: "h2", title: "Go for a walk", days: [], history: [today] },
    ],
    classes: [
      {
        id: "c1",
        name: "Design Studio",
        professor: "Professor Lee",
        meetingDays: "Mon Wed",
        meetingTime: "10:00",
        meetingEndTime: "11:15",
        accentColor: "#9470d6",
        notes: "Sample class",
      },
      {
        id: "c2",
        name: "Creative Coding",
        professor: "Professor Morgan",
        meetingDays: "Tue Thu",
        meetingTime: "13:00",
        meetingEndTime: "14:15",
        accentColor: "#4385c3",
      },
    ],
    assignments: [
      {
        id: "a1",
        title: "Interaction study",
        classId: "c1",
        type: "project",
        dueDate: addDays(today, 1),
        status: "in progress",
        priority: "High",
        pointsPossible: 100,
        pointsEarned: 0,
      },
      {
        id: "a2",
        title: "Animation sketch",
        classId: "c2",
        dueDate: addDays(today, 3),
        status: "not started",
        priority: "Medium",
      },
      {
        id: "a3",
        title: "Reading response",
        classId: "c1",
        dueDate: today,
        status: "completed",
        pointsPossible: 20,
        pointsEarned: 18,
      },
    ],
    notes: [
      {
        id: "n1",
        title: "Studio ideas",
        body: "Make the interaction clear before adding motion.\n\nTry a paper prototype first.",
        folderId: "f1",
        pinned: true,
        updatedAt: today,
        checklist: [],
      },
      {
        id: "n2",
        title: "Weekend",
        body: "Walk by the river.\nBring a sketchbook.",
        folderId: "",
        pinned: false,
        updatedAt: today,
        checklist: [],
      },
    ],
    folders: [{ id: "f1", name: "School" }],
    reminders: [
      {
        id: "r1",
        title: "Return library books",
        date: addDays(today, 1),
        time: "16:00",
        completed: false,
      },
    ],
    spending: [
      { id: "s1", title: "Coffee", amount: 4.5, category: "Food", date: today },
      {
        id: "s2",
        title: "Sketchbook",
        amount: 12,
        category: "School",
        date: today,
      },
    ],
    income: [{ id: "i1", title: "Sample paycheck", amount: 250, date: today }],
    accounts: [{ id: "ac1", title: "Checking", balance: 820 }],
    workouts: [
      {
        id: "w1",
        title: "Upper body",
        split: "Upper body",
        type: "lift",
        duration: 45,
        date: today,
        notes: "Three sets per exercise.",
      },
    ],
    nutrition: [
      {
        id: "m1",
        title: "Oats and berries",
        mealName: "Oats and berries",
        calories: 380,
        protein: 15,
        carbs: 61,
        fat: 9,
        date: today,
      },
    ],
    trips: [
      {
        id: "tr1",
        title: "Weekend in Chicago",
        name: "Weekend in Chicago",
        startDate: addDays(today, 9),
        endDate: addDays(today, 11),
        notes: "Sample itinerary",
        legs: [],
      },
    ],
    shopping: [{ id: "sh1", title: "Oat milk", completed: false }],
    orders: [],
    bucket: [
      { id: "b1", title: "Visit a new national park", completed: false },
    ],
    goals: [],
    reminderLists: [{ id: "rl1", title: "Personal", color: "#558be0" }],
    restDays: [],
    dayHistory: [],
    mealPlans: [],
    countries: [],
    cities: [],
    ...seedFinance(today),
    oneThing: "Finish the interaction study",
    settings: { dark: false },
    tab: "dashboard",
    history: [],
    notice: "",
  };
}
export function validateEntity(collection, value, state) {
  for (const [c, key] of [
    ["bills", "dueDate"],
    ["incomeRules", "nextDate"],
    ["savings", "date"],
    ["income", "date"],
    ["spending", "date"],
  ]) {
    if (
      collection === c &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value[key] || "") ||
        !Number.isFinite(Date.parse(value[key])))
    )
      return "Choose a valid date.";
  }
  if (
    collection === "mealPlans" &&
    (!(Number(value.servings) > 0) ||
      Number(value.servings) > 20 ||
      !value.date)
  )
    return "Choose a date and up to 20 servings.";
  if (
    value.progressPercent !== undefined &&
    (Number(value.progressPercent) < 0 || Number(value.progressPercent) > 100)
  )
    return "Progress must be between 0 and 100.";
  if (
    value.exercises?.some(
      (e) =>
        !e.name.trim() ||
        ["sets", "reps", "weight"].some(
          (k) => !Number.isFinite(Number(e[k])) || Number(e[k]) < 0,
        ),
    )
  )
    return "Exercise names and valid nonnegative set values are required.";

  const title = value.title ?? value.name ?? "";
  if (!title.trim() && collection !== "notes") return "Add a name or title.";
  for (const field of [
    "progressPercent",
    "estimatedPrice",
    "energy",
    "distance",
    "amount",
    "initialAmount",
    "targetAmount",
    "minimumPayment",
    "originalBalance",
    "interestRate",
    "shares",
    "costBasis",
    "currentPrice",
    "currentValue",
    "amountInvested",
    "hourlyWage",
    "hours",
    "manualTaxAmount",
    "deductionPercent",
    "annualGrossIncome",
    "customDays",
    "balance",
    "duration",
    "calories",
    "protein",
    "carbs",
    "fat",
    "pointsPossible",
    "pointsEarned",
  ])
    if (
      value[field] !== undefined &&
      value[field] !== "" &&
      (!Number.isFinite(Number(value[field])) ||
        (field !== "balance" && Number(value[field]) < 0))
    )
      return `${field} must be a valid nonnegative number.`;
  if (
    ["spending", "bills", "savings", "incomeRules", "budgets"].includes(
      collection,
    ) &&
    !(Number(value.amount) > 0)
  )
    return "Enter an amount greater than zero.";
  if (
    collection === "assignments" &&
    !state.classes.some((c) => c.id === value.classId)
  )
    return "Choose an existing class.";
  if (
    value.paymentMethod === "Credit card" &&
    !state.debts.some((d) => d.id === value.debtId)
  )
    return "Choose a card for credit spending.";
  if (value.accountId && !state.accounts.some((a) => a.id === value.accountId))
    return "Choose an existing account.";
  if (value.frequency === "custom" && !(Number(value.customDays) >= 1))
    return "Custom frequency must be at least one day.";
  if (
    collection === "income" &&
    !(value.type === "hourly"
      ? Number(value.hourlyWage) * Number(value.hours) > 0
      : Number(value.amount) > 0)
  )
    return "Enter positive income or wage and hours.";
  if (value.startTime && value.endTime && value.endTime <= value.startTime)
    return "End time must be after start time.";
  if (value.startDate && value.endDate && value.endDate < value.startDate)
    return "End date must not precede start date.";
  return "";
}
function record(state, next, notice) {
  const { history, notice: _, ...snapshot } = state;
  return { ...next, history: [...history.slice(-19), snapshot], notice };
}
export function demoReducer(state, action) {
  if (action.type === "tab")
    return {
      ...state,
      tab: sections.includes(action.tab) ? action.tab : "dashboard",
    };
  if (action.type === "notice") return { ...state, notice: action.message };
  if (action.type === "restoreCheckpoint")
    return record(
      state,
      { ...action.value, tab: state.tab },
      "Sample checkpoint restored. Undo is available.",
    );
  if (action.type === "reset") return seedDemo(state.today);
  if (action.type === "undo") {
    const previous = state.history.at(-1);
    return previous
      ? {
          ...previous,
          tab: state.tab,
          history: state.history.slice(0, -1),
          notice: "Change undone.",
        }
      : state;
  }
  if (action.type === "setting")
    return record(
      state,
      { ...state, settings: { ...state.settings, ...action.value } },
      "Appearance updated.",
    );
  if (action.type === "oneThing")
    return record(
      state,
      { ...state, oneThing: action.value },
      "One thing saved.",
    );
  if (["payBill", "payDebt", "postIncome"].includes(action.type)) {
    const next = financeMutation(state, action);
    return next === state
      ? state
      : record(state, next, "Sample finance updated. Undo is available.");
  }
  if (
    ["archiveHabit", "restDay", "closeDay", "reorder"].includes(action.type)
  ) {
    const next = planningMutation(state, action);
    return next === state
      ? state
      : record(state, next, "Planning updated. Undo is available.");
  }
  if (["logPlannedMeal", "mealGroceries"].includes(action.type)) {
    const next = mealMutation(state, action);
    return next === state
      ? state
      : record(state, next, "Meal plan updated. Undo is available.");
  }
  if (action.type === "travelVisit") {
    const collection = action.kind === "city" ? "cities" : "countries";
    return record(
      state,
      {
        ...state,
        [collection]: state[collection].includes(action.name)
          ? state[collection].filter((n) => n !== action.name)
          : [...state[collection], action.name],
      },
      "Travel collection updated.",
    );
  }
  const { collection, id } = action;
  if (!Array.isArray(state[collection])) return state;
  if (action.type === "save") {
    const error = validateEntity(collection, action.value, state);
    if (error) return { ...state, notice: error };
    const item = { ...action.value, id, updatedAt: state.today };
    const list = state[collection].some((x) => x.id === id)
      ? state[collection].map((x) => (x.id === id ? item : x))
      : [...state[collection], item];
    let next = { ...state, [collection]: list };
    if (collection === "folders" && Array.isArray(item.noteIds)) {
      next.notes = state.notes.map((n) =>
        item.noteIds.includes(n.id)
          ? { ...n, folderId: id }
          : n.folderId === id
            ? { ...n, folderId: "" }
            : n,
      );
    }
    if (collection === "spending") {
      const old = state.spending.find((e) => e.id === id);
      next.debts = state.debts.map((d) => ({
        ...d,
        balance: Math.max(
          0,
          Number(d.balance) -
            (old && usesCredit(old) && old.debtId === d.id
              ? Number(old.amount)
              : 0) +
            (usesCredit(item) && item.debtId === d.id
              ? Number(item.amount)
              : 0),
        ),
      }));
    }
    return record(state, next, "Saved in this sample session.");
  }
  if (action.type === "delete") {
    let next = {
      ...state,
      [collection]: state[collection].filter((x) => x.id !== id),
    };
    if (collection === "spending") {
      const old = state.spending.find((e) => e.id === id);
      if (old && usesCredit(old))
        next.debts = state.debts.map((d) =>
          d.id === old.debtId
            ? {
                ...d,
                balance: Math.max(0, Number(d.balance) - Number(old.amount)),
              }
            : d,
        );
    }
    if (collection === "folders")
      next.notes = state.notes.map((n) =>
        n.folderId === id ? { ...n, folderId: "" } : n,
      );
    if (collection === "reminderLists")
      next.reminders = state.reminders.map((r) =>
        r.listId === id ? { ...r, listId: "" } : r,
      );
    // EntityForms.deleteClass removes the class only; retain its assignment/task records.
    return record(state, next, "Deleted. Undo is available.");
  }
  if (action.type === "toggle") {
    const list = state[collection].map((item) => {
      if (item.id !== id) return item;
      if (collection === "habits") {
        const history = item.history || [];
        return {
          ...item,
          history: history.includes(action.day || state.today)
            ? history.filter((d) => d !== (action.day || state.today))
            : [...history, action.day || state.today],
        };
      }
      if (collection === "assignments")
        return { ...item, status: isDone(item) ? "not started" : "completed" };
      if (collection === "notes") return { ...item, pinned: !item.pinned };
      return {
        ...item,
        completed: !item.completed,
        completedAt: !item.completed ? state.today : "",
      };
    });
    let next = { ...state, [collection]: list };
    if (collection === "tasks") {
      const old = state.tasks.find((t) => t.id === id),
        date = old && !old.completed ? nextTaskDate(old, state.today) : null;
      const successorId = `${id}-next`;
      if (date && !state.tasks.some((t) => t.id === successorId))
        next.tasks = [
          {
            ...old,
            id: successorId,
            dueDate: date,
            completed: false,
            completedAt: "",
            notifyLead: -1,
          },
          ...list,
        ];
    }
    return record(state, next, "Updated. Undo is available.");
  }
  return state;
}
export const gradeLetters = [
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
];
export function classStats(state, id, range) {
  const all = state.assignments.filter((a) => !id || a.classId === id);
  const graded = all.filter(
    (a) =>
      Number(a.pointsPossible) > 0 && (isDone(a) || Number(a.pointsEarned) > 0),
  );
  const scoped = range
    ? all.filter(
        (a) => a.dueDate && a.dueDate >= range.from && a.dueDate <= range.to,
      )
    : all;
  const grade = graded.length
    ? (graded.reduce((s, a) => s + Number(a.pointsEarned || 0), 0) /
        graded.reduce((s, a) => s + Number(a.pointsPossible), 0)) *
      100
    : null;
  const chosen = state.classes.find((c) => c.id === id)?.gradeLetter;
  const manual = gradeLetters.includes(chosen) ? chosen : "";
  const cutoffs = [93, 90, 87, 83, 80, 77, 73, 70, 67, 63, 60, -Infinity];
  return {
    total: scoped.length,
    completed: scoped.filter(isDone).length,
    percent: scoped.length
      ? Math.round((scoped.filter(isDone).length / scoped.length) * 100)
      : 0,
    grade,
    displayLetter:
      manual ||
      (grade === null
        ? null
        : gradeLetters[cutoffs.findIndex((n) => grade >= n)]),
    gradeSource: manual
      ? "Chosen grade"
      : grade === null
        ? "No grade set yet"
        : "Estimated from points",
  };
}
export function calendarBills(state, from, to) {
  return state.bills.flatMap((b) =>
    occurrences(b, from, to).map((o) => ({
      ...b,
      date: o.date,
      collection: "bills",
      kind: "Bill",
      time: "",
      completed: o.paid,
    })),
  );
}
export function calendarItems(state) {
  return [
    ["tasks", "dueDate", "Task"],
    ["assignments", "dueDate", "Assignment"],
    ["reminders", "date", "Reminder"],
    ["workouts", "date", "Workout"],
  ]
    .flatMap(([collection, key, kind]) =>
      state[collection]
        .filter((x) => x[key])
        .map((x) => ({
          ...x,
          date: x[key],
          collection,
          kind,
          time: x.startTime || x.dueTime || x.time || "",
        })),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
// Port of SchoolEngine.meetingWeekdays: token prefixes and compact M/T/W/R/F/S/U.
export function meetingWeekdays(text = "") {
  const days = new Set();
  const prefixes = [
    ["su", 0],
    ["mo", 1],
    ["tu", 2],
    ["we", 3],
    ["th", 4],
    ["fr", 5],
    ["sa", 6],
  ];
  for (const token of text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)) {
    const match =
      token.length >= 2 ? prefixes.find(([p]) => token.startsWith(p)) : null;
    if (match) days.add(match[1]);
    else
      for (const c of token) {
        const value = { m: 1, t: 2, w: 3, r: 4, f: 5, s: 6, u: 0 }[c];
        if (value !== undefined) days.add(value);
      }
  }
  return [...days].sort();
}
export function classMeetings(state, from, through) {
  const result = [];
  let date = from;
  // Explicit bound protects a malformed date range from unbounded work.
  for (let i = 0; i < 93 && date <= through; i++, date = addDays(date, 1)) {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    for (const c of state.classes.filter((c) => !c.completed && !c.paused))
      if (meetingWeekdays(c.meetingDays).includes(weekday))
        result.push({
          ...c,
          title: c.name,
          date,
          collection: "classes",
          kind: "Class",
          time: c.meetingTime || "",
        });
  }
  return result;
}
