// Dates are export labels. UTC arithmetic never shifts them into a browser timezone.
export const studioRanges = [
  {
    id: "active",
    label: "Active creation period",
    from: "2025-12-10",
    to: "2026-02-28",
  },
  { id: "lifetime", label: "Lifetime" },
  { id: "last90", label: "Last 90 days", days: 90 },
  { id: "last28", label: "Last 28 days", days: 28 },
  { id: "last7", label: "Last 7 days", days: 7 },
];
export const studioMetrics = {
  views: { key: "views", label: "Views", digits: 0 },
  watchHours: { key: "watchHours", label: "Watch time (hours)", digits: 1 },
  subscribersNet: {
    key: "subscribersNet",
    label: "Net subscribers",
    digits: 0,
  },
  impressions: {
    key: "impressions",
    label: "Thumbnail impressions",
    digits: 0,
  },
  ctrPercent: { key: "ctrPercent", label: "Thumbnail CTR", digits: 2 },
};
export function studioRange(snapshot, id = "active") {
  const preset = studioRanges.find((r) => r.id === id) || studioRanges[0];
  const to = preset.to || snapshot.period.to;
  const from = preset.days
    ? new Date(Date.parse(to + "T00:00:00Z") - (preset.days - 1) * 86400000)
        .toISOString()
        .slice(0, 10)
    : preset.from || snapshot.period.from;
  return {
    ...preset,
    from: from < snapshot.period.from ? snapshot.period.from : from,
    to,
  };
}
export function studioPeriod(snapshot, id) {
  const range = studioRange(snapshot, id);
  const rows = snapshot.daily.filter(
    (r) => r.date >= range.from && r.date <= range.to,
  );
  const missing = {};
  const totals = {};
  for (const key of ["views", "watchHours", "subscribersNet", "impressions"]) {
    const known = rows.filter((r) => Number.isFinite(r[key]));
    missing[key] = rows.length - known.length;
    // Lifetime always preserves the exported aggregate (watch-hour precision differs).
    totals[key] =
      range.id === "lifetime"
        ? snapshot.totals[key]
        : known.length
          ? Math.round(known.reduce((s, r) => s + r[key], 0) * 1e4) / 1e4
          : null;
  }
  totals.ctrPercent =
    range.id === "lifetime" ? snapshot.totals.ctrPercent : null;
  return {
    range,
    rows,
    totals,
    missing,
    countingChange: range.to >= snapshot.source.countingChangeOn,
  };
}
export function studioValue(value, key, summary = false) {
  if (!Number.isFinite(value)) return "Unavailable";
  return (
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits:
        summary && key === "watchHours" ? 0 : (studioMetrics[key]?.digits ?? 4),
    }).format(value) + (key === "ctrPercent" ? "%" : "")
  );
}
export function contentRows(snapshot, query = "", sort = "views") {
  const key = ["views", "watchHours", "subscribersNet", "impressions"].includes(
    sort,
  )
    ? sort
    : "views";
  return snapshot.content
    .filter((r) => r.title.toLowerCase().includes(query.toLowerCase().trim()))
    .slice()
    .sort(
      (a, b) =>
        (b[key] ?? -Infinity) - (a[key] ?? -Infinity) ||
        a.id.localeCompare(b.id),
    );
}
