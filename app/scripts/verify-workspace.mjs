// NON-BROWSER checks: reducers, resource identities and projective math only.
import test from "node:test";
import { FILM_FPS, timecode } from "../src/prototype/apps/mediaTime.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import * as THREE from "three";
import {
  windowReducer,
  fitBounds,
  unprojectPoint,
} from "../src/prototype/windowState.js";
import {
  resolveRoute,
  printFraction,
} from "../src/prototype/workspaceState.js";
import { projectScreen } from "../src/prototype/screenProjection.js";
import {
  seedDemo,
  demoReducer,
  classStats,
  calendarItems,
  validateEntity,
  isDone,
  addDays,
  meetingWeekdays,
  classMeetings,
} from "../src/prototype/notch/demoState.js";
const size = { width: 1040, height: 650 };
const initial = { windows: [], active: null, serial: 0 };
const change = (s, type, id, rest = {}) =>
  windowReducer(s, { type, id, size, ...rest });
const sample = () => seedDemo("2026-09-16");
const update = (s, type, collection, id, extra = {}) =>
  demoReducer(s, { type, collection, id, ...extra });
test("fresh entry opens no app; explicit routes and simple view bypass entry", () => {
  assert.deepEqual(resolveRoute(), { view: "desk", app: null, bypass: false });
  assert.deepEqual(initial.windows, []);
  assert.deepEqual(resolveRoute("", "?simple"), {
    view: "laptop",
    app: null,
    bypass: true,
  });
  for (const [hash, app] of [
    ["preview", "preview"],
    ["notch", "xcode"],
    ["film", "premiere"],
    ["projects", "finder"],
    ["animalfeed", "youtube"],
  ])
    assert.equal(resolveRoute("#" + hash).app, app);
  assert.equal(resolveRoute("#phone").view, "phone");
  for (const hash of ["#resume", "#paper", "#printer"]) {
    assert.deepEqual(resolveRoute(hash), {
      view: "paper",
      app: null,
      bypass: true,
    });
  }
});
test("two windows overlap, retain independent bounds and raise without duplicates", () => {
  let s = change(initial, "open", "finder");
  s = change(s, "open", "premiere");
  const before = s.windows[1].bounds;
  s = change(s, "focus", "finder");
  assert.equal(s.active, "finder");
  assert.ok(s.windows[0].z > s.windows[1].z);
  s = change(s, "open", "finder");
  assert.equal(s.windows.length, 2);
  assert.deepEqual(s.windows[1].bounds, before);
});
test("minimize hides current window and restores same instance/bounds from dock", () => {
  let s = change(change(initial, "open", "finder"), "open", "xcode");
  const bounds = s.windows[1].bounds;
  s = change(s, "minimize", "xcode");
  assert.equal(s.active, "finder");
  assert.equal(s.windows[1].minimized, true);
  s = change(s, "open", "xcode");
  assert.equal(s.windows.length, 2);
  assert.deepEqual(s.windows[1].bounds, bounds);
  assert.equal(s.windows[1].minimized, false);
});
test("close reveals next highest window and closing last leaves clean desktop", () => {
  let s = change(change(initial, "open", "finder"), "open", "xcode");
  s = change(s, "close", "xcode");
  assert.equal(s.active, "finder");
  s = change(s, "close", "finder");
  assert.equal(s.active, null);
  assert.equal(s.windows.length, 0);
});
test("maximize round trip preserves normal bounds", () => {
  let s = change(initial, "open", "finder");
  const bounds = s.windows[0].bounds;
  s = change(s, "maximize", "finder");
  assert.equal(s.windows[0].max, true);
  s = change(s, "maximize", "finder");
  assert.deepEqual(s.windows[0].bounds, bounds);
  assert.equal(s.windows[0].max, false);
});
test("extreme drag and resize retain a reachable title segment; reset recovers position", () => {
  let s = change(initial, "open", "vscode");
  for (const position of [
    { x: -999, y: -999 },
    { x: 99999, y: 99999 },
  ]) {
    s = change(s, "move", "vscode", { position });
    const b = s.windows[0].bounds;
    assert.ok(
      b.x + b.w >= 72 &&
        b.x <= size.width - 72 &&
        b.y >= 28 &&
        b.y <= size.height - 82,
    );
  }
  for (const type of ["resize", "reset"]) {
    s = change(s, type, null, { size: { width: 351, height: 620 } });
    const b = s.windows[0].bounds;
    assert.ok(
      b.x + b.w >= 72 && b.x <= 351 - 72 && b.y >= 28 && b.y <= 620 - 82,
    );
    if (type === "reset") assert.ok(b.x >= 0 && b.y === 40);
  }
});
test("inverse projection preserves grab offset across desk, device and printer cameras", () => {
  for (const eye of [
    [5.7, 4.6, 12.8],
    [0.1, 1.65, 3],
    [-4, 2.8, 3.8],
  ]) {
    const camera = new THREE.PerspectiveCamera(39, 1440 / 900, 0.1, 100);
    camera.position.set(...eye);
    camera.lookAt(-0.58, 1, -1.1);
    camera.updateMatrixWorld();
    const plane = new THREE.Object3D();
    plane.position.set(-0.58, 1, -1.1);
    plane.rotation.x = -0.18;
    plane.updateMatrixWorld();
    const element = { style: {} };
    projectScreen(
      element,
      plane,
      camera,
      { width: 1440, height: 900 },
      [2.91, 1.819],
      size,
    );
    const matrix = element.style.transform.slice(9, -1).split(",").map(Number);
    for (const [x, y] of [
      [0, 0],
      [600, 40],
      [1040, 650],
      [100, 320],
    ]) {
      const projected = new THREE.Vector4(x, y, 0, 1).applyMatrix4(
        new THREE.Matrix4().fromArray(matrix),
      );
      const actual = unprojectPoint(
        matrix,
        projected.x / projected.w,
        projected.y / projected.w,
      );
      assert.ok(Math.abs(actual.x - x) < 1e-6 && Math.abs(actual.y - y) < 1e-6);
    }
  }
});
test("singular projection is rejected without an invalid drag", () =>
  assert.equal(unprojectPoint(Array(16).fill(0), 50, 50), null));
test("paper feed is bounded, two seconds and restartable from a new start", () => {
  assert.equal(printFraction(100, 100), 0);
  assert.equal(printFraction(100, 1100), 0.5);
  assert.equal(printFraction(100, 5000), 1);
  assert.equal(printFraction(5000, 5000), 0);
  assert.equal(printFraction(100, 0), 0);
});
test("task completion synchronizes shared calendar, and undo reopens task", () => {
  let s = sample();
  s = update(s, "toggle", "tasks", "t1");
  assert.equal(isDone(s.tasks[0]), true);
  assert.equal(isDone(calendarItems(s).find((e) => e.id === "t1")), true);
  s = demoReducer(s, { type: "tab", tab: "calendar" });
  s = demoReducer(s, { type: "undo" });
  assert.equal(s.tab, "calendar");
  assert.equal(s.tasks[0].completed, false);
});
test("task due-date edits move the same item on calendar, without duplicates", () => {
  let s = sample();
  s = update(s, "save", "tasks", "t1", {
    value: { ...s.tasks[0], dueDate: "2026-09-20" },
  });
  assert.equal(calendarItems(s).filter((i) => i.id === "t1").length, 1);
  assert.equal(calendarItems(s).find((i) => i.id === "t1").date, "2026-09-20");
});
test("assignment status and weighted grade follow represented SchoolEngine rules", () => {
  let s = sample();
  assert.equal(classStats(s, "c1").grade, 90);
  assert.equal(classStats(s, "c1").completed, 1);
  s = update(s, "toggle", "assignments", "a1");
  assert.equal(classStats(s, "c1").completed, 2);
  assert.equal(classStats(s, "c1").grade, 15);
  assert.equal(isDone(calendarItems(s).find((i) => i.id === "a1")), true);
});
test("invalid title, class, amount and reversed time/date are rejected", () => {
  let s = sample();
  for (const [collection, v] of [
    ["tasks", { title: "  " }],
    ["assignments", { title: "Essay", classId: "missing" }],
    ["spending", { title: "Food", amount: -1 }],
    ["tasks", { title: "Test", startTime: "14:00", endTime: "13:00" }],
    [
      "trips",
      { title: "Trip", startDate: "2026-10-04", endDate: "2026-10-01" },
    ],
  ])
    assert.ok(validateEntity(collection, v, s));
  const next = update(s, "save", "tasks", "bad", { value: { title: "" } });
  assert.equal(next.tasks.length, s.tasks.length);
  assert.ok(next.notice);
});
test("class deletion follows native deleteClass: preserve assignments and task links; undo restores class", () => {
  let s = sample();
  s.tasks[0].classId = "c1";
  s = update(s, "delete", "classes", "c1");
  assert.equal(
    s.classes.some((c) => c.id === "c1"),
    false,
  );
  assert.equal(s.assignments.filter((a) => a.classId === "c1").length, 2);
  assert.equal(s.tasks[0].classId, "c1");
  s = demoReducer(s, { type: "undo" });
  assert.equal(
    s.classes.some((c) => c.id === "c1"),
    true,
  );
});
test("folder deletion preserves notes and undo restores folder membership", () => {
  let s = sample();
  s = update(s, "delete", "folders", "f1");
  assert.equal(s.notes.length, 2);
  assert.equal(s.notes[0].folderId, "");
  s = demoReducer(s, { type: "undo" });
  assert.equal(s.notes[0].folderId, "f1");
});
test("note save, pin, delete and undo preserve entered text", () => {
  let s = sample();
  s = update(s, "save", "notes", "n1", {
    value: { ...s.notes[0], body: "Edited sample text" },
  });
  s = update(s, "toggle", "notes", "n1");
  assert.equal(s.notes[0].pinned, false);
  s = update(s, "delete", "notes", "n1");
  s = demoReducer(s, { type: "undo" });
  assert.equal(s.notes[0].body, "Edited sample text");
});
test("habit completion is date-specific and reversible", () => {
  let s = sample();
  s = update(s, "toggle", "habits", "h1");
  assert.deepEqual(s.habits[0].history, ["2026-09-16"]);
  s = update(s, "toggle", "habits", "h1");
  assert.deepEqual(s.habits[0].history, []);
});
test("demo reset returns fictional baseline and clears bounded undo history", () => {
  let s = sample();
  for (let i = 0; i < 30; i++) s = update(s, "toggle", "tasks", "t1");
  assert.equal(s.history.length, 20);
  s = demoReducer(s, { type: "reset" });
  assert.deepEqual(s, sample());
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
});
test("resume PDF identity remains the current supplied PDF", () => {
  const hash = crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(
        new URL(
          "../src/prototype/assets/marko-deric-resume-2026.pdf",
          import.meta.url,
        ),
      ),
    )
    .digest("hex");
  assert.equal(
    hash,
    "b518b55127004162fb1c64728f234ea5ec923acfb25dc81f2207830142956cdd",
  );
});
test("audio waveform is finite, covers real export duration, and is not constant synthetic data", () => {
  const a = JSON.parse(
    fs.readFileSync(
      new URL("../src/prototype/assets/film-audio.json", import.meta.url),
    ),
  );
  assert.equal(a.peaks.length, 2394);
  assert.ok(Math.abs(a.duration - 23.94) <= 2 / a.sampleRate);
  assert.ok(a.peaks.every((p) => Number.isFinite(p) && p >= 0));
  assert.ok(new Set(a.peaks).size > 1000);
});
test("curated Swift copies match their recorded source hashes", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("../src/prototype/assets/source/manifest.json", import.meta.url),
    ),
  );
  for (const f of manifest.files) {
    const file = new URL(
      "../src/prototype/assets/source/" + f.copy.split("/").at(-1),
      import.meta.url,
    );
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      f.sha256,
    );
  }
});
test("optimized phone preserves every geometry accessor byte and asset attribution", () => {
  const read = (name) => {
    const b = fs.readFileSync(new URL(name, import.meta.url));
    const len = b.readUInt32LE(12);
    return {
      j: JSON.parse(b.subarray(20, 20 + len)),
      bin: b.subarray(28 + len),
    };
  };
  const before = read("../public/assets/iphone-15-pro.glb"),
    after = read("../src/prototype/assets/phone-workspace.glb");
  assert.deepEqual(after.j.meshes, before.j.meshes);
  assert.deepEqual(after.j.asset, before.j.asset);
  assert.equal(after.j.accessors.length, before.j.accessors.length);
  for (let i = 0; i < before.j.accessors.length; i++) {
    const a = before.j.accessors[i],
      b = after.j.accessors[i];
    if (a.bufferView === undefined) continue;
    const av = before.j.bufferViews[a.bufferView],
      bv = after.j.bufferViews[b.bufferView];
    assert.deepEqual(
      before.bin.subarray(
        av.byteOffset || 0,
        (av.byteOffset || 0) + av.byteLength,
      ),
      after.bin.subarray(
        bv.byteOffset || 0,
        (bv.byteOffset || 0) + bv.byteLength,
      ),
    );
  }
  assert.ok(after.bin.length < before.bin.length);
});

test("class recurrence follows native weekday parsing and excludes paused/finished classes", () => {
  assert.deepEqual(meetingWeekdays("MWF"), [1, 3, 5]);
  assert.deepEqual(meetingWeekdays("Tue/Thu"), [2, 4]);
  const s = sample();
  let events = classMeetings(s, "2026-09-14", "2026-09-20");
  assert.equal(events.length, 4);
  assert.equal(events.filter((e) => e.id === "c1").length, 2);
  s.classes[0].completed = true;
  events = classMeetings(s, "2026-09-14", "2026-09-20");
  assert.equal(events.length, 2);
});

test("film timecode and frame-step basis match probed 60fps export", () => {
  assert.equal(FILM_FPS, 60);
  assert.equal(timecode(1 / 60), "00:00:00:01");
  assert.equal(timecode(59 / 60), "00:00:00:59");
  assert.equal(timecode(1), "00:00:01:00");
  assert.equal(timecode(61.5), "00:01:01:30");
});
