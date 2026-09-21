import React, { useReducer, useState } from "react";
import {
  LayoutDashboard,
  Clapperboard,
  ChartNoAxesCombined,
  Play,
} from "lucide-react";
import LineChart from "../charts/LineChart";
import { studioRoute } from "../charts/chartData";
import snapshot from "../assets/animalfeed-snapshot.json";
import {
  studioRanges,
  studioMetrics,
  studioPeriod,
  studioValue,
  contentRows,
} from "./studioData";

function MetricCards({ period }) {
  return (
    <div
      className="yt-metrics yt-snapshot-metrics"
      aria-label={`${period.range.label} channel metrics`}
    >
      {Object.keys(studioMetrics).filter(key => period.totals[key] !== null).map((key) => (
        <div key={key}>
          <small>{studioMetrics[key].label}</small>
          <strong
            title={
              key === "watchHours"
                ? `${studioValue(period.totals[key], key)} hours`
                : undefined
            }
          >
            {studioValue(period.totals[key], key, true)}
          </strong>
        </div>
      ))}
    </div>
  );
}
function Trend({ period, metric, title }) {
  return (
    <LineChart
      key={`${period.range.id}-${metric}`}
      rows={period.rows}
      range={period.range}
      title={title}
      metrics={[studioMetrics[metric]]}
      provenance={`${period.range.label} · ${snapshot.source.label} · retrieved ${snapshot.source.retrievedOn}`}
    />
  );
}
export function StudioContentTable() {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("views");
  const rows = contentRows(snapshot, query, sort);
  return (
    <section
      className="yt-video-section"
      aria-label="Lifetime video performance"
    >
      <h2>Video performance · Lifetime</h2>

      <div className="yt-table-controls">
        <label>
          Find a video
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles"
          />
        </label>
        <label>
          Sort highest first
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {["views", "watchHours", "subscribersNet", "impressions"].map(
              (key) => (
                <option key={key} value={key}>
                  {studioMetrics[key].label}
                </option>
              ),
            )}
          </select>
        </label>
        <span role="status">
          {rows.length} of {snapshot.content.length} videos
        </span>
      </div>
      <div
        className="yt-table-scroll"
        tabIndex={0}
        aria-label="Scrollable lifetime video metrics"
      >
        <table>
          <caption>
            Exported per-video Lifetime figures · {snapshot.period.from} –{" "}
            {snapshot.period.to}
          </caption>
          <thead>
            <tr>
              <th scope="col">Video</th>
              <th scope="col">Published</th>
              <th scope="col">Duration (s)</th>
              {Object.keys(studioMetrics).map((key) => (
                <th scope="col" key={key}>
                  {studioMetrics[key].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((video) => (
              <tr key={video.id}>
                <th scope="row">
                  <a
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {video.title} ↗
                  </a>
                </th>
                <td>{video.published || "Unavailable"}</td>
                <td>{video.durationSeconds ?? "Unavailable"}</td>
                {Object.keys(studioMetrics).map((key) => (
                  <td key={key}>{studioValue(video[key], key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p role="status">No video titles match.</p>}
    </section>
  );
}
// initialView/initialRange allow deterministic non-browser render coverage; visitors default to Dashboard/active creation period.
export default function YouTubeStudio({
  initialView = { section: "Dashboard", tab: "Overview" },
  initialRange = "active",
}) {
  const [{ section, tab }, route] = useReducer(studioRoute, initialView);
  const [rangeId, setRange] = useState(initialRange);
  const period = studioPeriod(snapshot, rangeId);
  return (
    <div className="youtube-app">
      <header>
        <span className="yt-logo">
          <Play size={12} fill="currentColor" />
        </span>
        <strong>Studio</strong>
      </header>
      <div className="yt-layout">
        <aside>
          <a
            href={snapshot.channel.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Visit AnimalFeed YouTube channel"
          >
            <img src="/animalfeedpfp.jpeg" alt="AnimalFeed profile picture" />
            <strong>{snapshot.channel.name}</strong>
          </a>
          <small>{snapshot.channel.handle}</small>
          {[
            ["Dashboard", LayoutDashboard],
            ["Content", Clapperboard],
            ["Analytics", ChartNoAxesCombined],
          ].map(([name, Icon]) => (
            <button
              key={name}
              aria-current={section === name ? "page" : undefined}
              onClick={() => route({ section: name })}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </aside>
        <section className="yt-content">
          <h1>Channel {section.toLowerCase()}</h1>
          {section !== "Content" && (
            <>
              <div className="yt-period-controls">
                <label>
                  Channel date range
                  <select
                    value={period.range.id}
                    onChange={(e) => setRange(e.target.value)}
                  >
                    {studioRanges.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p aria-live="polite">
                  <strong>{period.range.label}</strong>
                  <br />
                  {period.range.from} – {period.range.to} <span>inclusive</span>
                </p>
              </div>
              <MetricCards period={period} />
            </>
          )}
          {section === "Dashboard" ? (
            <>
              <Trend period={period} metric="views" title="Channel views" />
              <div className="yt-insight">
                <h2>AnimalFeed</h2>
                <p>
                  Explore the channel’s exported views, watch time and
                  subscriber changes, or open the individual videos.
                </p>
                <button onClick={() => route({ section: "Analytics" })}>
                  Explore analytics →
                </button>
                <button onClick={() => route({ section: "Content" })}>
                  View 72 videos →
                </button>
              </div>
            </>
          ) : section === "Content" ? (
            <StudioContentTable />
          ) : (
            <>
              <div
                className="yt-tabs"
                role="tablist"
                aria-label="Analytics views"
              >
                {["Overview", "Content", "Audience"].map((t, i) => (
                  <button
                    role="tab"
                    id={`analytics-${t}`}
                    aria-controls="analytics-panel"
                    aria-selected={tab === t}
                    tabIndex={tab === t ? 0 : -1}
                    key={t}
                    onClick={() => route({ tab: t })}
                    onKeyDown={(e) => {
                      const tabs = ["Overview", "Content", "Audience"];
                      const next = {
                        ArrowRight: (i + 1) % 3,
                        ArrowLeft: (i + 2) % 3,
                        Home: 0,
                        End: 2,
                      }[e.key];
                      if (next !== undefined) {
                        e.preventDefault();
                        route({ tab: tabs[next] });
                        document
                          .getElementById(`analytics-${tabs[next]}`)
                          ?.focus();
                      }
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id="analytics-panel"
                aria-labelledby={`analytics-${tab}`}
              >
                {tab === "Overview" ? (
                  <>
                    <Trend
                      period={period}
                      metric="views"
                      title="Channel views"
                    />
                    <Trend
                      period={period}
                      metric="subscribersNet"
                      title="Net subscriber change"
                    />
                  </>
                ) : tab === "Audience" ? (
                  <>
                    <Trend
                      period={period}
                      metric="subscribersNet"
                      title="Net subscriber change"
                    />
                  </>
                ) : (
                  <>
                    <Trend
                      period={period}
                      metric="views"
                      title="Channel views"
                    />
                    <Trend
                      period={period}
                      metric="impressions"
                      title="Thumbnail impressions"
                    />
                    <StudioContentTable />
                  </>
                )}
              </div>
            </>
          )}
          <details className="yt-data-notes">
            <summary>Data notes & source</summary>
            <p>{snapshot.source.label} · retrieved {snapshot.source.retrievedOn}. Exported snapshot; no live connection.</p>
            <p>Net subscribers is the change during the selected period, not the current subscriber count. Dates retain export labels; reporting timezone is unverified. Negative values represent a net loss. Demographics and new/returning viewers were not included in this export.</p>
            <p>Per-video figures remain Lifetime regardless of channel range. Per-video subscribers and impressions do not reconcile to channel totals; the cause is unknown. No format breakdown was exported.</p>
            {period.range.id !== "lifetime" && <p>Cards sum available daily observations. {Object.keys(studioMetrics).filter(k => period.missing[k] > 0).map(k => `${studioMetrics[k].label}: ${period.missing[k]} missing dates`).join("; ")}.</p>}
            {period.countingChange && <p>Studio notes a change in how views are counted from August 27, 2026. Comparisons across that date may not use the same counting method.</p>}
            <p>
              Lifetime covers {snapshot.period.from}–{snapshot.period.to}. The
              active creation period assumes December 10, 2025 through February
              28, 2026 inclusive. Last 7/28/90 days end on the last exported
              date, September 15, 2026.
            </p>
            <p>
              December 10–14 have no daily views, watch-time or impressions
              observations. Subscriber change is explicitly zero. Views and
              watch time are also blank on August 18, September 4 and September
              8. Missing values remain gaps.
            </p>
            <p>
              Lifetime cards preserve the supplied channel aggregate. Shorter
              periods sum daily observations. Daily watch hours differ from the
              Lifetime aggregate by 0.0003 hours because of export precision.
            </p>
            <p>
              Lifetime thumbnail CTR is the exported 5.29%. Shorter-period CTR
              is unavailable; daily percentages are never added or averaged.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
