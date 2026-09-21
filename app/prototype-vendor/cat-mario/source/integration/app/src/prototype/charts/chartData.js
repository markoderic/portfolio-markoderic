// Input contract: dated records, finite metric values; absent values stay absent.
export function chartSeries(
  rows,
  metric,
  { from = "", to = "", format = "All", includeMissing = false } = {},
) {
  return rows
    .filter(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        (includeMissing || Number.isFinite(r[metric])) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        (format === "All" || r.format === format),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      value: Number.isFinite(r[metric]) ? r[metric] : null,
    }));
}
export function chartGeometry(points, width = 600, height = 230) {
  const left = 62,
    right = 18,
    top = 16,
    bottom = 38;
  const values = points.map((p) => p.value).filter(Number.isFinite),
    min = Math.min(0, ...values),
    max = Math.max(1, ...values);
  const start = points.length ? Date.parse(points[0].date + "T00:00:00Z") : 0,
    end = points.length ? Date.parse(points.at(-1).date + "T00:00:00Z") : 1;
  const xy = points.map((p) => ({
    ...p,
    x:
      left +
      ((Date.parse(p.date + "T00:00:00Z") - start) /
        Math.max(86400000, end - start)) *
        (width - left - right),
    y: Number.isFinite(p.value)
      ? top + ((max - p.value) / (max - min)) * (height - top - bottom)
      : null,
  }));
  let drawing = false;
  const path = xy
    .map((p) => {
      if (!Number.isFinite(p.value)) {
        drawing = false;
        return "";
      }
      const command = drawing ? "L" : "M";
      drawing = true;
      return `${command}${p.x},${p.y}`;
    })
    .filter(Boolean)
    .join(" ");
  return {
    points: xy,
    min,
    max,
    left,
    right,
    top,
    bottom,
    width,
    height,
    path,
  };
}
export function studioRoute(state, action) {
  if (action.section)
    return {
      ...state,
      section: action.section,
      tab: action.section === "Analytics" ? "Overview" : state.tab,
    };
  if (action.tab && state.section === "Analytics")
    return { ...state, tab: action.tab };
  return state;
}

// Guide follows the pointer; the readout always names a real observed date.
export function inspectChart(geometry, rawX) {
  const x = Math.max(geometry.left, Math.min(geometry.width - geometry.right, rawX));
  const index = geometry.points.reduce((best,p,i) => Math.abs(p.x-x) < Math.abs(geometry.points[best].x-x) ? i : best, 0);
  return { x, index };
}
export function chartKeyIndex(key, index, count) {
  const next = { ArrowLeft: index-1, ArrowDown: index-1, ArrowRight: index+1, ArrowUp: index+1, Home: 0, End: count-1 }[key];
  return next === undefined ? null : Math.max(0, Math.min(count-1, next));
}
