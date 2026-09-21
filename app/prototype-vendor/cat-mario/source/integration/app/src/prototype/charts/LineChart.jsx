import React, { useId, useMemo, useState } from "react";
import { chartGeometry, chartSeries, inspectChart, chartKeyIndex } from "./chartData";
export default function LineChart({
  rows,
  metrics,
  title,
  provenance,
  initialMetric,
  range,
  compact = false,
}) {
  const id = useId(),
    [metric, setMetric] = useState(initialMetric || metrics[0].key),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [active, setActive] = useState(0),
    [pointerX, setPointerX] = useState(null);
  const points = useMemo(
      () =>
        chartSeries(rows, metric, {
          from: range?.from || from,
          to: range?.to || to,
          includeMissing: true,
        }),
      [rows, metric, from, to, range?.from, range?.to],
    ),
    g = chartGeometry(points);
  const current = g.points[Math.min(active, Math.max(0, g.points.length - 1))];
  const definition = metrics.find((m) => m.key === metric);
  const label = definition?.label || metric;
  const valueText = (value) =>
    Number.isFinite(value)
      ? value.toLocaleString("en-US", {
          maximumFractionDigits: definition?.digits ?? 4,
        })
      : "No observation";
  const inspection = current
    ? `${current.date} · ${valueText(current.value)}${Number.isFinite(current.value) ? " " + label : ""}`
    : "";
  const missing = points.filter((p) => p.value === null).length;
  function move(i) {
    setPointerX(null);
    setActive(Math.max(0, Math.min(g.points.length - 1, i)));
  }
  return (
    <figure className={`interactive-chart ${compact ? "compact-chart" : ""}`}>
      <figcaption id={id}>
        <strong>{title}</strong>

      </figcaption>
      <div className="chart-controls">
        {metrics.length > 1 && (
          <label>
            Metric
            <select
              value={metric}
              onChange={(e) => {
                setMetric(e.target.value);
                move(0);
              }}
            >
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {!range && !compact && (
          <>
            <label>
              From
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  move(0);
                }}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  move(0);
                }}
              />
            </label>
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                move(0);
              }}
            >
              All dates
            </button>
          </>
        )}
      </div>
      {range && !compact && (
        <p className="chart-range">
          {range.from} – {range.to} · {label}
        </p>
      )}
      <svg
        onPointerMove={(e) => {
          // SVG's screen CTM includes its viewBox and CSS scale; do not divide by a fixed pixel width.
          const svg = e.currentTarget, matrix = svg.getScreenCTM?.();
          let x;
          if (matrix && svg.createSVGPoint) {
            const point = svg.createSVGPoint(); point.x = e.clientX; point.y = e.clientY;
            x = point.matrixTransform(matrix.inverse()).x;
          } else {
            const box = svg.getBoundingClientRect(); x = (e.clientX-box.left)/box.width*600;
          }
          const hit = inspectChart(g, x); setActive(hit.index); setPointerX(hit.x);
        }}
        onPointerDown={(e) => e.currentTarget.focus({ preventScroll: true })}
        onKeyDown={(e) => {
          const next = chartKeyIndex(e.key, Math.min(active, points.length-1), points.length);
          if (next !== null && points.length) { e.preventDefault(); e.stopPropagation(); move(next); }
        }}
        viewBox="0 0 600 230"
        tabIndex={points.length ? 0 : -1}
        role="slider"
        aria-label={`${title}: ${label}. Arrow keys inspect dates; Home and End jump to endpoints.`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, points.length-1)}
        aria-valuenow={Math.min(active, Math.max(0, points.length-1))}
        aria-valuetext={inspection || "No observations"}
        aria-describedby={`${id}-inspection`}
      >
        <path className="chart-axis" d="M62,16V192H582" />
        {[0, 0.5, 1].map((t) => {
          const y = 16 + t * 176,
            value = g.max - t * (g.max - g.min);
          return (
            <g key={t}>
              <path className="chart-grid" d={`M62,${y}H582`} />
              <text x="54" y={y + 4} textAnchor="end">
                {new Intl.NumberFormat(undefined, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value)}
              </text>
            </g>
          );
        })}
        {points.length > 0 && (
          <>
            <path className="chart-line" d={g.path} />
            <text x="62" y="220">
              {points[0].date}
            </text>
            <text x="582" y="220" textAnchor="end">
              {points.at(-1).date}
            </text>
          </>
        )}
        {g.points.map(
          (p, i) =>
            Number.isFinite(p.value) && (
              <circle
                key={`${p.date}-${i}`}
                className="chart-point"
                cx={p.x}
                cy={p.y}
                r={i === active ? 5 : 3}
              >
                <title>{`${p.date}: ${valueText(p.value)} ${label}`}</title>
              </circle>
            ),
        )}
        {current && <path className="chart-guide" d={`M${pointerX ?? current.x},16V192`} />}
      </svg>
      {points.length ? (
        <>
          <output id={`${id}-inspection`} aria-live="polite">{inspection}</output>
          <details>
            <summary>Data table & notes</summary>
            {provenance && <p>{provenance}</p>}
          {missing > 0 && (
            <p className="chart-gap-note">
              {missing} {missing === 1 ? "date has" : "dates have"} no
              observation for {label.toLowerCase()}. Gaps are not zero.
            </p>
          )}
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{label}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr key={i}>
                    <td>{p.date}</td>
                    <td>{valueText(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p role="status">
          {rows.length
            ? "No values in this range."
            : "Dated analytics have not been imported."}
        </p>
      )}
    </figure>
  );
}
