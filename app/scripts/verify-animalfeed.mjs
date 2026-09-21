// Local data/geometry tests only; no network, account access or browser.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  studioRanges,
  studioRange,
  studioPeriod,
  studioValue,
  contentRows,
} from "../src/prototype/apps/studioData.js";
import {
  chartSeries,
  chartGeometry,
} from "../src/prototype/charts/chartData.js";
const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const snapshot = read("../src/prototype/assets/animalfeed-snapshot.json");
const normalized = read(
  "../../docs/redesign/research-assets/animalfeed-2026-09-17/animalfeed-analytics.json",
);
const validation = read(
  "../../docs/redesign/research-assets/animalfeed-2026-09-17/validation.json",
);
const sum = (rows, key) =>
  Math.round(rows.reduce((s, r) => s + (r[key] ?? 0), 0) * 1e4) / 1e4;
test("Local archives match the handoff hashes and the selected snapshot preserves every included value", () => {
  for (const kind of ["daily", "content"]) {
    const data = fs.readFileSync(
      new URL(
        "../../docs/redesign/research-assets/animalfeed-2026-09-17/" +
          validation[kind].archive,
        import.meta.url,
      ),
    );
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      validation[kind].sha256,
    );
  }
  assert.equal(snapshot.daily.length, 280);
  assert.equal(snapshot.content.length, 72);
  for (const collection of ["daily", "content"])
    for (let i = 0; i < snapshot[collection].length; i++)
      for (const [key, value] of Object.entries(snapshot[collection][i]))
        assert.deepEqual(value, normalized[collection][i][key]);
  assert.deepEqual(snapshot.totals, normalized.totals);
  assert.deepEqual(Object.keys(snapshot).sort(), [
    "channel",
    "content",
    "daily",
    "period",
    "source",
    "totals",
  ]);
  assert.deepEqual(Object.keys(snapshot.channel).sort(), [
    "handle",
    "name",
    "url",
  ]);
  assert.ok(
    !JSON.stringify(snapshot).match(
      /@gmail\.com|\.zip|realtimeSubscribersObserved|signed-in|Desktop/,
    ),
  );
});
test("Explicit Lifetime uses supplied aggregates, never rounded daily watch hours or a subscriber snapshot", () => {
  const p = studioPeriod(snapshot, "lifetime");
  assert.equal(p.range.id, "lifetime");
  assert.equal(p.range.from, "2025-12-10");
  assert.equal(p.range.to, "2026-09-15");
  assert.deepEqual(p.totals, {
    views: 2665906,
    watchHours: 7801.2506,
    subscribersNet: 2944,
    impressions: 174557,
    ctrPercent: 5.29,
  });
  assert.equal(sum(snapshot.daily, "watchHours"), 7801.2509);
  assert.notEqual(p.totals.subscribersNet, 2942);
  for (const k of ["views", "subscribersNet", "impressions"])
    assert.equal(sum(snapshot.daily, k), p.totals[k]);
});
test("Every shorter range is inclusive, snapshot-anchored and consistent across rows/cards", () => {
  for (const { id, days } of studioRanges.filter((r) => r.days)) {
    const p = studioPeriod(snapshot, id);
    assert.equal(p.range.to, "2026-09-15");
    assert.equal(p.rows.length, days);
    assert.equal(p.rows[0].date, p.range.from);
    assert.equal(p.rows.at(-1).date, p.range.to);
    for (const k of ["views", "watchHours", "subscribersNet", "impressions"])
      assert.equal(p.totals[k], sum(p.rows, k));
    assert.equal(p.totals.ctrPercent, null);
  }
  assert.equal(studioRange(snapshot, "last7").from, "2026-09-09");
  assert.equal(studioRange(snapshot, "last90").from, "2026-06-18");
  assert.equal(studioRange(snapshot, "not-a-range").id, "active");
});
test("Last 28 days reproduce the observed Studio metrics, including negative net subscribers", () => {
  const p = studioPeriod(snapshot, "last28");
  assert.equal(p.range.from, "2026-08-19");
  assert.equal(p.missing.views, 2);
  assert.equal(p.missing.watchHours, 2);
  assert.equal(p.totals.views, 177);
  assert.equal(p.totals.watchHours, 0.5631);
  assert.equal(p.totals.subscribersNet, -15);
  assert.equal(studioValue(p.totals.watchHours, "watchHours"), "0.6");
  assert.equal(studioValue(p.totals.subscribersNet, "subscribersNet"), "-15");
  assert.equal(studioValue(null, "ctrPercent"), "Unavailable");
  assert.equal(studioValue(5.29, "ctrPercent"), "5.29%");
});
test("Unknown daily observations stay unknown while explicit early subscriber zeroes remain real zeroes", () => {
  const p = studioPeriod(snapshot, "lifetime");
  assert.equal(p.missing.views, 8);
  assert.equal(p.missing.watchHours, 8);
  assert.equal(p.missing.impressions, 5);
  assert.equal(p.missing.subscribersNet, 0);
  for (const r of p.rows.slice(0, 5)) {
    assert.equal(r.views, null);
    assert.equal(r.watchHours, null);
    assert.equal(r.impressions, null);
    assert.equal(r.subscribersNet, 0);
  }
  const series = chartSeries(p.rows, "views", { includeMissing: true });
  assert.equal(series.length, 280);
  assert.equal(series[0].value, null);
  const g = chartGeometry(series);
  assert.equal(g.points[0].x, g.left);
  assert.equal(g.points[0].y, null);
  assert.ok(g.path.startsWith("M" + g.points[5].x + ","));
  assert.equal(g.points.at(-1).x, g.width - g.right);
  const onlyMissing = {
    ...snapshot,
    period: { ...snapshot.period, to: "2025-12-14" },
  };
  assert.equal(studioPeriod(onlyMissing, "last7").totals.views, null);
  assert.equal(studioPeriod(onlyMissing, "last7").totals.subscribersNet, 0);
});
test("Chart paths break at unknown dates and negative values remain below zero in the plotted domain", () => {
  const points = [
    { date: "2026-09-01", value: 10 },
    { date: "2026-09-02", value: null },
    { date: "2026-09-03", value: -4 },
    { date: "2026-09-04", value: 0 },
  ];
  const g = chartGeometry(points);
  assert.equal((g.path.match(/M/g) || []).length, 2);
  assert.equal((g.path.match(/L/g) || []).length, 1);
  assert.ok(g.points[2].y > g.points[3].y);
  assert.equal(g.min, -4);
  assert.ok(!/NaN|null|Infinity/.test(g.path));
  const actual = chartSeries(snapshot.daily, "subscribersNet", {
    from: "2026-02-24",
    to: "2026-02-24",
    includeMissing: true,
  });
  assert.deepEqual(actual, [{ date: "2026-02-24", value: -2 }]);
  assert.equal(chartGeometry(actual).min, -2);
});
test("Filtering uses exact date labels without shifting by local time zone or including adjacent days", () => {
  const rows = chartSeries(snapshot.daily, "views", {
    from: "2026-08-19",
    to: "2026-09-15",
    includeMissing: true,
  });
  assert.equal(rows.length, 28);
  assert.equal(rows[0].date, "2026-08-19");
  assert.equal(rows.at(-1).date, "2026-09-15");
  assert.equal(
    chartSeries(snapshot.daily, "views", {
      from: "2026-09-15",
      to: "2026-09-15",
    }).length,
    1,
  );
  assert.deepEqual(
    chartSeries(snapshot.daily, "views", { from: "2026-09-16" }),
    [],
  );
  assert.deepEqual(
    chartSeries(snapshot.daily, "views", {
      from: "2026-09-15",
      to: "2026-08-19",
    }),
    [],
  );
});
test("Content sorting/search keep all original lifetime values separate from channel aggregation", () => {
  const before = JSON.stringify(snapshot.content);
  const sorted = contentRows(snapshot);
  assert.equal(sorted.length, 72);
  assert.equal(new Set(sorted.map((r) => r.id)).size, 72);
  assert.ok(sorted.every((r, i) => !i || sorted[i - 1].views >= r.views));
  assert.equal(sum(sorted, "views"), 2665906);
  assert.equal(sum(sorted, "subscribersNet"), 3801);
  assert.equal(sum(sorted, "impressions"), 174625);
  assert.notEqual(
    sum(sorted, "subscribersNet"),
    studioPeriod(snapshot).totals.subscribersNet,
  );
  assert.notEqual(
    sum(sorted, "impressions"),
    studioPeriod(snapshot).totals.impressions,
  );
  assert.equal(contentRows(snapshot, "  CUTEST KITTEN  ").length, 2);
  assert.equal(contentRows(snapshot, "no-matching-video-title").length, 0);
  assert.equal(JSON.stringify(snapshot.content), before);
  assert.equal(snapshot.source.countingChangeOn, "2026-08-27");
  assert.ok(
    studioRanges
      .filter((r) => r.id !== "active")
      .every((r) => studioPeriod(snapshot, r.id).countingChange),
  );
});

test("Active creation period is the default, shares card/chart dates, and does not discard Lifetime", () => {
  const p = studioPeriod(snapshot);
  assert.equal(p.range.id, "active");
  assert.equal(p.range.from, "2025-12-10");
  assert.equal(p.range.to, "2026-02-28");
  assert.equal(p.rows.length, 81);
  assert.equal(p.rows.at(-1).date, "2026-02-28");
  assert.equal(p.missing.views, 5);
  assert.equal(p.missing.subscribersNet, 0);
  for (const k of ["views", "watchHours", "subscribersNet", "impressions"])
    assert.equal(p.totals[k], sum(p.rows, k));
  assert.equal(p.totals.ctrPercent, null);
  assert.equal(p.countingChange, false);
  assert.equal(studioValue(7801.2506, "watchHours", true), "7,801");
  assert.equal(studioValue(7801.2506, "watchHours"), "7,801.3");
  assert.equal(snapshot.totals.watchHours, 7801.2506);
  assert.equal(snapshot.daily.length, 280);
});
