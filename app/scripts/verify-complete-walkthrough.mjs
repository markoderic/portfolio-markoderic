// Non-browser source/state/mock tests. Never makes a network request.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createMailSender,
  emptyDraft,
  finishMail,
  meetingDraft,
  MAIL_ENDPOINT,
} from "../src/prototype/apps/mailState.js";
import {
  chartSeries,
  chartGeometry,
  studioRoute,
} from "../src/prototype/charts/chartData.js";
import { resolveRoute } from "../src/prototype/workspaceState.js";
import { fitBounds, windowReducer } from "../src/prototype/windowState.js";
import {
  paperState,
  zoomPaper,
  trackpadTarget,
  orbitPose,
} from "../src/prototype/sceneInteraction.js";
import {
  demoReducer,
  seedDemo,
  validateEntity,
  classStats,
  calendarBills,
} from "../src/prototype/notch/demoState.js";
import {
  financeResult,
  balanceSeries,
  occurrences,
  monthAdd,
  netIncome,
  investmentValue,
} from "../src/prototype/notch/financeModel.js";
import {
  habitStreak,
  habitDue,
  archiveHabit,
} from "../src/prototype/notch/planningModel.js";
import {
  mealGroceries,
  recipeNutrition,
  mealRecipes,
} from "../src/prototype/notch/mealModel.js";
const draft = {
  ...emptyDraft(),
  name: "Test visitor",
  email: "visitor@example.com",
  subject: "Mock only",
  details: "This is never sent.",
};
const seed = () => seedDemo("2026-09-17");
test("Mail validates and honeypot blocks before network", async () => {
  let calls = 0;
  const send = createMailSender(
    async () => {
      calls++;
      throw Error("must not call");
    },
    () => true,
  );
  assert.equal((await send(emptyDraft())).ok, false);
  assert.equal((await send({ ...draft, email: "bad" })).ok, false);
  assert.equal((await send({ ...draft, _gotcha: "bot" })).ok, false);
  assert.equal(calls, 0);
});
test("Mail uses production endpoint/fields and only response.ok means success", async () => {
  let request;
  const send = createMailSender(
    async (url, options) => {
      request = { url, ...options };
      return { ok: true };
    },
    () => true,
  );
  assert.equal(
    (
      await send({
        ...draft,
        type: "Web app",
        budget: "Not sure yet",
        timeline: "Flexible",
      })
    ).ok,
    true,
  );
  assert.equal(request.url, MAIL_ENDPOINT);
  assert.equal(request.method, "POST");
  assert.equal(request.headers.Accept, "application/json");
  assert.equal(request.body.get("details"), draft.details);
  assert.equal(request.body.get("email"), draft.email);
  assert.equal(request.body.get("budget"), "Not sure yet");
});
test("Mail duplicate send is rejected while first response is pending", async () => {
  let release,
    calls = 0;
  const send = createMailSender(
    () => {
      calls++;
      return new Promise((r) => (release = r));
    },
    () => true,
  );
  const first = send(draft);
  assert.equal((await send(draft)).duplicate, true);
  release({ ok: true });
  assert.equal((await first).ok, true);
  assert.equal(calls, 1);
});
test("Mail offline, rate limits, service failure and validation errors retain the input", async () => {
  const original = structuredClone(draft);
  for (const [response, pattern] of [
    [{ ok: false, status: 429 }, /Too many/],
    [{ ok: false, status: 503 }, /unavailable/],
    [
      {
        ok: false,
        status: 422,
        json: async () => ({ errors: [{ message: "Invalid reply email" }] }),
      },
      /Invalid reply/,
    ],
  ]) {
    const send = createMailSender(
      async () => response,
      () => true,
    );
    assert.match((await send(draft)).message, pattern);
    assert.deepEqual(draft, original);
  }
  const send = createMailSender(
    () => {
      throw Error("no request");
    },
    () => false,
  );
  assert.match((await send(draft)).message, /offline/);
});
test("Mail network failure reports uncertain delivery and permits an explicit later retry", async () => {
  let calls = 0;
  const send = createMailSender(
    async () => {
      if (++calls === 1) throw Error("connection");
      return { ok: true };
    },
    () => true,
  );
  assert.match((await send(draft)).message, /uncertain/);
  assert.equal((await send(draft)).ok, true);
});
test("Meeting selection appends a preference without erasing existing draft or sending", () => {
  const next = meetingDraft(draft, {
    date: "2026-10-01",
    time: "14:30",
    timezone: "America/New_York",
  });
  assert.ok(next.details.startsWith(draft.details));
  assert.match(next.details, /Awaiting confirmation/);
  assert.match(next.details, /America\/New_York/);
  assert.equal(next.subject, draft.subject);
});
test("Studio section and nested analytics navigation are independent", () => {
  let s = studioRoute(
    { section: "Dashboard", tab: "Audience" },
    { section: "Analytics" },
  );
  assert.equal(s.tab, "Overview");
  s = studioRoute(s, { tab: "Content" });
  assert.equal(s.section, "Analytics");
  s = studioRoute(s, { section: "Dashboard" });
  assert.deepEqual(studioRoute(s, { tab: "Audience" }), s);
});
test("Chart dates, metric values, filters and no-data handling preserve provenance boundaries", () => {
  const rows = [
    { date: "2026-09-02", views: 20, subs: 0 },
    { date: "2026-09-01", views: 0 },
    { date: "2026-09-03", views: NaN },
    { date: "bad", views: 999 },
  ];
  const before = structuredClone(rows);
  assert.deepEqual(
    chartSeries(rows, "views").map((p) => p.value),
    [0, 20],
  );
  assert.equal(chartSeries(rows, "subs").length, 1);
  assert.deepEqual(
    chartSeries(rows, "views", { from: "2026-09-02", to: "2026-09-02" }),
    [{ date: "2026-09-02", value: 20 }],
  );
  assert.deepEqual(chartSeries(rows, "missing"), []);
  assert.deepEqual(rows, before);
  for (const series of [
    [],
    chartSeries(rows, "views"),
    [{ date: "2026-01-01", value: -4 }],
  ])
    assert.ok(
      chartGeometry(series).points.every(
        (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
      ),
    );
});
test("Fresh/#desk routes require entry; explicit project, resume and simple routes bypass", () => {
  assert.equal(resolveRoute("").bypass, false);
  assert.equal(resolveRoute("#desk").bypass, false);
  for (const hash of ["#resume", "#paper", "#portfolio", "#xcode", "#phone"])
    assert.equal(resolveRoute(hash).bypass, true);
  assert.equal(resolveRoute("#desk", "?simple").bypass, true);
});
test("Windows cross edges directly and reducer does not pull released coordinates back", () => {
  const size = { width: 1000, height: 650 },
    bounds = { x: -140, y: 510, w: 780, h: 400 };
  assert.deepEqual(fitBounds(bounds, size), bounds);
  let s = {
    windows: [{ id: "mail", bounds, max: false, z: 1 }],
    active: "mail",
    serial: 1,
  };
  s = windowReducer(s, { type: "move", id: "mail", size, position: bounds });
  assert.deepEqual(s.windows[0].bounds, bounds);
  const safe = fitBounds({ ...bounds, x: -10000, y: 10000 }, size);
  assert.equal(safe.x + safe.w, 72);
  assert.equal(safe.y, 568);
});
test("Completed paper survives return and reopen, while direct opening never claims a print", () => {
  const base = { completed: false, printing: false, progress: 0 };
  assert.equal(paperState(base, "open").completed, false);
  let s = paperState(base, "start");
  s = paperState(s, "complete");
  s = paperState(s, "cancel");
  assert.equal(s.completed, true);
  assert.equal(s.progress, 1);
  s = paperState(s, "open");
  assert.equal(s.printing, false);
  s = paperState(s, "start");
  assert.equal(s.progress, 0);
  assert.equal(paperState(s, "cancel").completed, true);
});
test("Paper zoom reverses to same fit and overview orbit is bounded", () => {
  let z = 1;
  for (let i = 0; i < 10; i++) z = zoomPaper(z, "in");
  assert.equal(z, 2.2);
  for (let i = 0; i < 10; i++) z = zoomPaper(z, "out");
  assert.equal(z, 1);
  assert.equal(zoomPaper(1.8, "fit"), 1);
  assert.deepEqual(orbitPose(90, -90), { yaw: 0.48, pitch: -0.16 });
});
test("Trackpad capture excludes phone descendants and non-laptop controls, including keyboard click targets", () => {
  const target = (laptop, excluded, control) => ({
    closest: (s) =>
      s === ".mac-desktop"
        ? laptop
        : s.startsWith(".phone-host")
          ? excluded
          : control,
  });
  assert.equal(trackpadTarget(target(true, false, true)), true);
  assert.equal(trackpadTarget(target(false, true, true)), false);
  assert.equal(trackpadTarget(target(true, true, true)), false);
  assert.equal(trackpadTarget(target(false, false, true)), false);
});
test("Ledger history ends at current cash and edits/undo update cash and chart together", () => {
  let s = seed(),
    before = financeResult(s).current;
  assert.equal(balanceSeries(s).at(-1).cash, before);
  s = demoReducer(s, {
    type: "save",
    collection: "spending",
    id: "new",
    value: { title: "Lunch", amount: 15, date: s.today, paymentMethod: "Cash" },
  });
  assert.equal(financeResult(s).current, before - 15);
  assert.equal(balanceSeries(s).at(-1).cash, before - 15);
  s = demoReducer(s, { type: "undo" });
  assert.equal(financeResult(s).current, before);
});
test("Credit charges affect card debt, not cash, and edits/delete reverse the prior amount", () => {
  let s = seed(),
    cash = financeResult(s).current,
    card = s.debts[0].balance;
  const value = {
    title: "Card purchase",
    amount: 20,
    date: s.today,
    paymentMethod: "Credit card",
    debtId: "debt1",
  };
  s = demoReducer(s, {
    type: "save",
    collection: "spending",
    id: "credit",
    value,
  });
  assert.equal(financeResult(s).current, cash);
  assert.equal(s.debts[0].balance, card + 20);
  s = demoReducer(s, {
    type: "save",
    collection: "spending",
    id: "credit",
    value: { ...value, amount: 12 },
  });
  assert.equal(s.debts[0].balance, card + 12);
  s = demoReducer(s, { type: "delete", collection: "spending", id: "credit" });
  assert.equal(s.debts[0].balance, card);
});
test("Monthly recurring bills keep anchor; paid cycle logs cash once and undo restores both", () => {
  assert.equal(monthAdd("2026-01-31", 1), "2026-02-28");
  assert.deepEqual(
    occurrences(
      { dueDate: "2026-01-31", frequency: "monthly" },
      "2026-01-01",
      "2026-03-31",
    ).map((o) => o.date),
    ["2026-01-31", "2026-02-28", "2026-03-31"],
  );
  let s = seed(),
    before = financeResult(s).current;
  const action = { type: "payBill", id: "bill1", date: s.bills[0].dueDate };
  s = demoReducer(s, action);
  assert.equal(financeResult(s).current, before - 25);
  assert.equal(s.spending.at(-1).date, s.today);
  const count = s.spending.length;
  s = demoReducer(s, action);
  assert.equal(s.spending.length, count);
  s = demoReducer(s, { type: "undo" });
  assert.equal(financeResult(s).current, before);
  assert.equal(s.bills[0].paidThrough, "");
});
test("Debt payment is atomic with cash, balance and undo; overpayment is refused", () => {
  let s = seed(),
    cash = financeResult(s).current;
  const act = {
    type: "payDebt",
    id: "debt1",
    amount: 20,
    date: s.today,
    paymentId: "p1",
  };
  s = demoReducer(s, act);
  assert.equal(s.debts[0].balance, 60);
  assert.equal(financeResult(s).current, cash - 20);
  assert.equal(demoReducer(s, { ...act, amount: 100 }).debts[0].balance, 60);
  s = demoReducer(s, { type: "undo" });
  assert.equal(s.debts[0].balance, 80);
  assert.equal(financeResult(s).current, cash);
});
test("Income calculations respect hourly, manual deductions, none default and future dates", () => {
  assert.equal(
    netIncome({
      type: "hourly",
      hourlyWage: 20,
      hours: 8,
      taxMode: "manual",
      manualTaxAmount: 16,
    }),
    144,
  );
  assert.equal(netIncome({ amount: 80, taxMode: "none" }), 80);
  let s = seed(),
    cash = financeResult(s).current;
  s.income.push({
    title: "Future",
    amount: 100,
    date: "2026-09-20",
    taxMode: "none",
  });
  assert.equal(financeResult(s).current, cash);
  assert.equal(investmentValue({ amountInvested: 100, currentValue: 0 }), 0);
});
test("Recurring payday is explicit, advances and cannot duplicate the posted cycle", () => {
  let s = seed();
  s.incomeRules[0].nextDate = s.today;
  const n = s.income.length;
  s = demoReducer(s, { type: "postIncome", id: "rule1" });
  assert.equal(s.income.length, n + 1);
  assert.equal(s.incomeRules[0].nextDate, "2026-09-24");
  assert.equal(
    demoReducer(s, { type: "postIncome", id: "rule1" }).income.length,
    n + 1,
  );
});
test("Task recurrence spawns once, shared calendar state and undo remove successor together", () => {
  let s = seed();
  s.tasks[0].repeatRule = "monthly";
  s.tasks[0].dueDate = "2026-01-31";
  const n = s.tasks.length;
  s = demoReducer(s, { type: "toggle", collection: "tasks", id: "t1" });
  assert.equal(s.tasks.length, n + 1);
  assert.equal(s.tasks[0].dueDate, "2026-02-28");
  s = demoReducer(s, { type: "undo" });
  assert.equal(s.tasks.length, n);
  assert.equal(s.tasks[0].completed, false);
});
test("Habits preserve pauses, flexible targets, history and native freeze forgiveness", () => {
  const h = {
    days: [],
    timesPerWeek: 0,
    history: ["2026-09-14", "2026-09-16"],
  };
  assert.equal(habitStreak(h, "2026-09-17").count, 2);
  assert.equal(habitStreak(h, "2026-09-17").bank, 0);
  assert.equal(habitStreak(h, "2026-09-19").count, 0);
  const archived = archiveHabit(h, true, "2026-09-17"),
    resumed = archiveHabit(archived, false, "2026-09-20");
  assert.deepEqual(resumed.pauses, [
    { from: "2026-09-17", through: "2026-09-19" },
  ]);
  assert.equal(
    habitDue({ ...h, timesPerWeek: 3, history: ["2026-09-14"] }, "2026-09-18"),
    false,
  );
  assert.equal(
    habitDue({ ...h, timesPerWeek: 3, history: ["2026-09-14"] }, "2026-09-19"),
    true,
  );
});
test("Meal nutrition scales servings, preserves unknowns and grocery transfer/logging are idempotent", () => {
  assert.equal(
    recipeNutrition(mealRecipes[0], 2).protein,
    recipeNutrition(mealRecipes[0], 1).protein * 2,
  );
  assert.equal(
    recipeNutrition({
      servingsBase: 1,
      ingredients: [{ ingredientId: "unknown", amount: 100 }],
    }).calories,
    null,
  );
  let s = seed();
  s = demoReducer(s, {
    type: "save",
    collection: "mealPlans",
    id: "plan1",
    value: {
      title: "Breakfast",
      date: s.today,
      recipeId: "recipe1",
      servings: 2,
    },
  });
  assert.equal(
    mealGroceries(s.mealPlans).find((x) => x.id === "oats").amount,
    120,
  );
  s = demoReducer(s, { type: "logPlannedMeal", id: "plan1" });
  const n = s.nutrition.length;
  s = demoReducer(s, { type: "logPlannedMeal", id: "plan1" });
  assert.equal(s.nutrition.length, n);
  const a = { type: "mealGroceries", from: s.today, to: s.today };
  s = demoReducer(s, a);
  const count = s.shopping.length;
  s = demoReducer(s, a);
  assert.equal(s.shopping.length, count);
});
test("Note checklist/images, reminder list removal, travel collection and checkpoint use shared undo", () => {
  let s = seed();
  s = demoReducer(s, {
    type: "save",
    collection: "notes",
    id: "n1",
    value: {
      ...s.notes[0],
      checklist: [{ id: "ck1", text: "Try", done: true }],
      images: [{ id: "im1", name: "local", url: "data:image/png;base64,a" }],
    },
  });
  assert.equal(s.notes[0].checklist[0].done, true);
  s = demoReducer(s, { type: "undo" });
  assert.equal(s.notes[0].checklist.length, 0);
  s = demoReducer(s, { type: "travelVisit", name: "Canada" });
  assert.deepEqual(s.countries, ["Canada"]);
  s = demoReducer(s, { type: "undo" });
  assert.deepEqual(s.countries, []);
  s.reminders[0].listId = "rl1";
  s = demoReducer(s, {
    type: "delete",
    collection: "reminderLists",
    id: "rl1",
  });
  assert.equal(s.reminders[0].listId, "");
});

test("Mail failure retains draft; success clears only the submitted snapshot", () => {
  const state = { draft, sending: true };
  assert.deepEqual(
    finishMail(state, draft, { ok: false, message: "Error" }).draft,
    draft,
  );
  assert.deepEqual(
    finishMail(state, draft, { ok: true, message: "Submitted" }).draft,
    emptyDraft(),
  );
  const changed = meetingDraft(draft, {
    date: "2026-10-01",
    time: "12:00",
    timezone: "UTC",
  });
  assert.deepEqual(
    finishMail({ ...state, draft: changed }, draft, {
      ok: true,
      message: "Submitted",
    }).draft,
    changed,
  );
});
test("School completion scope leaves all-time points grade intact and manual grade wins", () => {
  const s = seed();
  const range = { from: "2026-09-18", to: "2026-09-18" };
  assert.equal(classStats(s, "c1", range).percent, 0);
  assert.equal(classStats(s, "c1", range).total, 1);
  assert.equal(classStats(s, "c1", range).grade, 90);
  assert.equal(classStats(s, "c1", range).displayLetter, "A-");
  s.classes[0].gradeLetter = "B+";
  assert.equal(classStats(s, "c1", range).displayLetter, "B+");
  assert.equal(classStats(s, "c1", range).grade, 90);
});
test("Calendar projects actual bill cycles and folder membership saves atomically", () => {
  let s = seed();
  const bill = s.bills[0];
  const entries = calendarBills(s, bill.dueDate, bill.dueDate);
  assert.equal(entries[0].collection, "bills");
  assert.equal(entries[0].id, bill.id);
  const previous = structuredClone(s.notes);
  s = demoReducer(s, {
    type: "save",
    collection: "folders",
    id: "f1",
    value: { title: "Ideas", name: "Ideas", noteIds: ["n2"] },
  });
  assert.equal(s.notes.find((n) => n.id === "n1").folderId, "");
  assert.equal(s.notes.find((n) => n.id === "n2").folderId, "f1");
  s = demoReducer(s, { type: "undo" });
  assert.deepEqual(s.notes, previous);
  const saved = structuredClone(s);
  s = demoReducer(s, { type: "travelVisit", name: "Canada" });
  s = demoReducer(s, { type: "restoreCheckpoint", value: saved });
  assert.deepEqual(s.countries, []);
  s = demoReducer(s, { type: "undo" });
  assert.deepEqual(s.countries, ["Canada"]);
});
