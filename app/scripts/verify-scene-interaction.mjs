// Pure Node behavior/math and mocked Web Audio checks. No browser or listening.
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  clampIcon,
  arrangeIcons,
  crossedDragThreshold,
  interpolateBounds,
} from "../src/prototype/interactionMath.js";
import { PRINTER } from "../src/prototype/sceneScale.js";
import { fitPaper, paperFeedPosition, PAPER_HEIGHT } from "../src/prototype/paperGeometry.js";
import {
  projectionVisible,
  projectScreen,
  maskPhone,
  roundedOutline,
} from "../src/prototype/screenProjection.js";
import { resolveRoute } from "../src/prototype/workspaceState.js";
const camera = () => {
  const c = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  c.position.set(0, 0, 5);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
};
test("reject rear-facing, near-plane-crossing and camera-behind screens without replacing transform", () => {
  const c = camera(),
    p = new THREE.Object3D(),
    el = { style: { transform: "last safe matrix" } };
  assert.equal(projectionVisible(p, c, [2, 1]), true);
  for (const [position, rotation] of [
    [
      [0, 0, 0],
      [0, Math.PI, 0],
    ],
    [
      [0, 0, 5],
      [0, 0, 0],
    ],
    [
      [0, 0, 4.8],
      [0, Math.PI / 3, 0],
    ],
    [
      [0, 0, 6],
      [0, 0, 0],
    ],
  ]) {
    p.position.set(...position);
    p.rotation.set(...rotation);
    projectScreen(el, p, c, { width: 1000, height: 625 }, [2, 1], {
      width: 1000,
      height: 625,
    });
    assert.equal(el.style.visibility, "hidden");
    assert.equal(el.style.transform, "last safe matrix");
  }
});
test("valid screen transform remains finite during rapid camera pose changes and resize", () => {
  const c = camera(),
    p = new THREE.Object3D(),
    el = { style: {} };
  for (let i = 0; i < 160; i++) {
    c.position.set(
      Math.sin(i) * 4,
      Math.cos(i) * 2,
      1 + Math.abs(Math.sin(i / 3)) * 9,
    );
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld();
    projectScreen(el, p, c, { width: 800 + i * 5, height: 600 + i }, [2, 1], {
      width: 1000,
      height: 625,
    });
    assert.equal(el.style.visibility, "visible");
    assert.ok(
      el.style.transform
        .slice(9, -1)
        .split(",")
        .every((x) => Number.isFinite(Number(x))),
    );
  }
});
test("rounded phone occlusion is applied only in front of the laptop and cleared after return", () => {
  const c = camera(),
    phone = new THREE.Object3D(),
    laptop = new THREE.Object3D(),
    el = { style: {} };
  phone.position.z = 1;
  maskPhone(el, phone, c, { width: 1000, height: 625 }, laptop);
  assert.match(el.style.clipPath, /evenodd/);
  assert.equal(roundedOutline(0.339, 0.695, 0.058).length, 52);
  phone.position.z = -1;
  maskPhone(el, phone, c, { width: 1000, height: 625 }, laptop);
  assert.equal(el.style.clipPath, "none");
  phone.position.z = 5.1;
  maskPhone(el, phone, c, { width: 1000, height: 625 }, laptop);
  assert.equal(el.style.clipPath, "none");
});
test("icon layout and resize recovery keep every icon away from menu and dock", () => {
  for (const size of [
    { width: 1040, height: 650 },
    { width: 1366, height: 768 },
    { width: 351, height: 620 },
  ]) {
    const layout = arrangeIcons(size);
    assert.equal(
      new Set(Object.values(layout).map((p) => `${p.x},${p.y}`)).size,
      9, // Eight existing applications plus Classic Cat Mario.
    );
    for (const p of [
      ...Object.values(layout),
      { x: -999, y: -100 },
      { x: 9000, y: 9000 },
    ]) {
      const b = clampIcon(p, size);
      assert.ok(
        b.x >= 4 &&
          b.x + 80 <= size.width &&
          b.y >= 36 &&
          b.y + 82 < size.height - 50,
      );
    }
  }
});
test("selection jitter is not drag; mouse and deliberate touch have different thresholds", () => {
  assert.equal(
    crossedDragThreshold({ x: 10, y: 10 }, { x: 12, y: 12 }, "mouse", 50),
    false,
  );
  assert.equal(
    crossedDragThreshold({ x: 10, y: 10 }, { x: 16, y: 10 }, "mouse", 5),
    true,
  );
  assert.equal(
    crossedDragThreshold({ x: 10, y: 10 }, { x: 35, y: 10 }, "touch", 100),
    false,
  );
  assert.equal(
    crossedDragThreshold({ x: 10, y: 10 }, { x: 35, y: 10 }, "touch", 190),
    true,
  );
});
test("max/restore interpolation starts from live bounds and never overshoots", () => {
  const from = { x: 40, y: 60, w: 800, h: 500 },
    to = { x: 0, y: 28, w: 1040, h: 572 };
  const live = interpolateBounds(from, to, 0.4);
  assert.deepEqual(interpolateBounds(live, from, 0), live);
  assert.deepEqual(interpolateBounds(live, from, 1), from);
  for (let i = 0; i <= 30; i++)
    for (const [k, v] of Object.entries(interpolateBounds(from, to, i / 30)))
      assert.ok(v >= Math.min(from[k], to[k]) && v <= Math.max(from[k], to[k]));
});
test("paper fits whole letter sheet at laptop, desktop and portrait sizes; deep links do not open Preview", () => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 600 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    const p = fitPaper(size);
    assert.ok(
      p.height <= size.height - 150 + 0.001 &&
        p.width <= size.width - 48 + 0.001,
    );
    assert.ok(Math.abs(p.width / p.height - 8.5 / 11) < 1e-9);
  }
  for (const hash of ["#resume", "#paper", "#printer"])
    assert.deepEqual(resolveRoute(hash), {
      view: "paper",
      app: null,
      bypass: true,
    });
});
test("paper emerges on printer axis with letter aspect and bounded endpoints", () => {
  const a = new THREE.Vector3(...paperFeedPosition(0)),
    b = new THREE.Vector3(...paperFeedPosition(1));
  assert.ok(Math.abs(a.distanceTo(b) - PAPER_HEIGHT) < 1e-9);
  assert.equal(a.y, PRINTER.position[1] + PRINTER.sheetY * PRINTER.scale);
  assert.equal(b.y, PRINTER.position[1] + PRINTER.sheetY * PRINTER.scale);
  assert.deepEqual(paperFeedPosition(-1), a.toArray());
  assert.deepEqual(paperFeedPosition(2), b.toArray());
});

test("audio awaits first unlock, deduplicates clicks, generates a roller feed and fades on interruption", async () => {
  const sources = [];
  let release;
  class AudioMock {
    constructor() {
      this.state = "suspended";
      this.currentTime = 1;
      this.sampleRate = 48000;
      this.destination = {};
      AudioMock.instance = this;
    }
    resume() {
      return new Promise((r) => {
        release = () => {
          this.state = "running";
          r();
        };
      });
    }
    createBuffer(_, n) {
      const data = new Float32Array(n);
      return { duration: n / this.sampleRate, getChannelData: () => data };
    }
    createBufferSource() {
      const s = {
        connect(n) {
          return n;
        },
        disconnect() {},
        start() {
          s.started = true;
        },
        stop(t) {
          s.stopped = t;
        },
      };
      sources.push(s);
      return s;
    }
    createGain() {
      return {
        gain: { value: 0, cancelScheduledValues() {}, setTargetAtTime() {} },
        connect(n) {
          return n;
        },
        disconnect() {},
      };
    }
    createBiquadFilter() {
      return {
        frequency: { value: 0 },
        connect(n) {
          return n;
        },
        disconnect() {},
      };
    }
  }
  globalThis.window = { AudioContext: AudioMock };
  const { playSound, startPrinterSound } =
    await import("../src/prototype/sound.js");
  const prefs = { muted: false, volume: 0.4 };
  const pending = playSound("click", prefs);
  assert.equal(sources.length, 0);
  release();
  await pending;
  assert.equal(sources.length, 1);
  await playSound("click", prefs);
  assert.equal(sources.length, 1);
  AudioMock.instance.currentTime += 0.1;
  await playSound("lamp", prefs);
  assert.equal(sources.length, 2);
  const stop = startPrinterSound(prefs),
    feed = sources.at(-1);
  assert.ok(feed.buffer.duration >= 2);
  const data = feed.buffer.getChannelData(0);
  assert.ok(data.every(Number.isFinite));
  assert.ok(
    Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length) > 0.05,
  );
  stop();
  assert.ok(
    feed.stopped > AudioMock.instance.currentTime &&
      feed.stopped < AudioMock.instance.currentTime + 0.1,
  );
  startPrinterSound(prefs);
  const second = sources.at(-1);
  startPrinterSound(prefs);
  assert.ok(second.stopped);
  const count = sources.length;
  await playSound("click", { muted: true, volume: 0.4 });
  startPrinterSound({ muted: true, volume: 0.4 });
  assert.equal(sources.length, count);
  delete globalThis.window;
});
