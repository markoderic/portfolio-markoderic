import React, { useMemo, useRef, useState } from "react";
import geo from "../assets/source/geo.json";
const rings = geo.countries.map((c) => ({
  ...c,
  rings: c.d
    .split(/Z/i)
    .map((r) =>
      [...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [
        Number(m[1]),
        Number(m[2]),
      ]),
    )
    .filter((r) => r.length > 2),
}));
function point(x, y, lon, lat) {
  const a = (((x / 1000) * 360 - 180) * Math.PI) / 180 - lon,
    b = ((90 - (y / 500) * 180) * Math.PI) / 180;
  const px = Math.cos(b) * Math.sin(a),
    py =
      Math.cos(lat) * Math.sin(b) - Math.sin(lat) * Math.cos(b) * Math.cos(a),
    z = Math.sin(lat) * Math.sin(b) + Math.cos(lat) * Math.cos(b) * Math.cos(a);
  return { x: 160 + 142 * px, y: 155 - 142 * py, z };
}
export default function TravelPanel({ state, dispatch }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(""),
    [pose, setPose] = useState({ lon: 0, lat: 0.2 });
  const drag = useRef();
  const suppressClick = useRef(false);
  const countries = geo.countryList.filter((n) =>
    n.toLowerCase().includes(query.toLowerCase()),
  );
  const shapes = useMemo(
    () =>
      rings.map((c) => ({
        ...c,
        path: c.rings
          .map((r) => {
            let drawing = false;
            return r
              .map(([x, y]) => {
                const p = point(x, y, pose.lon, pose.lat);
                if (p.z < 0) {
                  drawing = false;
                  return "";
                }
                const cmd = drawing ? "L" : "M";
                drawing = true;
                return `${cmd}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
              })
              .join(" ");
          })
          .join(" "),
      })),
    [pose],
  );
  function focus(name) {
    setSelected(name);
    const c = geo.countries.find((c) => c.csv === name || c.n === name);
    if (c?.b) {
      const [x, y, x2, y2] = c.b;
      setPose({
        lon: ((((x + x2) / 2 / 1000) * 360 - 180) * Math.PI) / 180,
        lat: ((90 - ((y + y2) / 2 / 500) * 180) * Math.PI) / 180,
      });
    }
  }
  return (
    <section className="n-card travel-panel">
      <h2>
        {state.countries.length} countries · {state.cities.length} cities
      </h2>
      <svg
        className="travel-globe"
        viewBox="0 0 320 310"
        role="img"
        aria-label="Interactive globe. Drag to rotate; use country search or rotation buttons for keyboard access."
        onPointerDown={(e) => {
          suppressClick.current = false;
          drag.current = { x: e.clientX, y: e.clientY, ...pose };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const d = drag.current;
            if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5)
              suppressClick.current = true;
            setPose({
              lon: d.lon - (e.clientX - d.x) * 0.012,
              lat: Math.max(
                -1.4,
                Math.min(1.4, d.lat + (e.clientY - d.y) * 0.009),
              ),
            });
          }
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <radialGradient id="notch-earth">
            <stop stopColor="#376d83" />
            <stop offset="1" stopColor="#142c42" />
          </radialGradient>
          <clipPath id="earth-disc">
            <circle cx="160" cy="155" r="142" />
          </clipPath>
        </defs>
        <circle cx="160" cy="155" r="142" fill="url(#notch-earth)" />
        <g clipPath="url(#earth-disc)">
          {shapes.map((c) => (
            <path
              key={c.n}
              d={c.path}
              fill={
                selected === (c.csv || c.n)
                  ? "#ebbe66"
                  : state.countries.includes(c.csv || c.n)
                    ? "#74c5a6"
                    : "#668993"
              }
              stroke="#1e3f53"
              strokeWidth=".5"
              onClick={(e) => {
                if (!suppressClick.current) focus(c.csv || c.n);
              }}
            >
              <title>{c.csv || c.n}</title>
            </path>
          ))}
        </g>
      </svg>
      <div className="n-segment">
        <button
          aria-label="Rotate globe west"
          onClick={() => setPose((p) => ({ ...p, lon: p.lon - 0.25 }))}
        >
          ←
        </button>
        <button onClick={() => setPose({ lon: 0, lat: 0.2 })}>
          Reset globe
        </button>
        <button
          aria-label="Rotate globe east"
          onClick={() => setPose((p) => ({ ...p, lon: p.lon + 0.25 }))}
        >
          →
        </button>
      </div>
      <label>
        Find country
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries"
        />
      </label>
      <select
        aria-label="Select country"
        value={selected}
        onChange={(e) => focus(e.target.value)}
      >
        <option value="">Choose a country</option>
        {[...new Set([...(selected ? [selected] : []), ...countries])].map(
          (c) => (
            <option key={c}>{c}</option>
          ),
        )}
      </select>
      {selected && (
        <>
          <h3>{selected}</h3>
          <button
            aria-pressed={state.countries.includes(selected)}
            onClick={() => dispatch({ type: "travelVisit", name: selected })}
          >
            {state.countries.includes(selected) ? "✓ Visited" : "Mark visited"}
          </button>
          <h3>Cities</h3>
          {(geo.cities[selected] || []).map((c) => {
            const key = selected + "/" + c.n;
            return (
              <button
                className="finance-navigation"
                key={key}
                aria-pressed={state.cities.includes(key)}
                onClick={() =>
                  dispatch({ type: "travelVisit", kind: "city", name: key })
                }
              >
                {c.n}
                {c.cap ? " · capital" : ""}
                <span>{state.cities.includes(key) ? "✓" : "○"}</span>
              </button>
            );
          })}
        </>
      )}
      <small>
        Fictional travel collection · bundled Notch geography. No geolocation or
        sensor access.
      </small>
    </section>
  );
}
