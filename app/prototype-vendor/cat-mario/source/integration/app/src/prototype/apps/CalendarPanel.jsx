import React, { useEffect, useRef, useState } from "react";
export function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export default function CalendarPanel({ visible, close, requestMeeting, now, focusAllowed = true }) {
  const [month, setMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [date, setDate] = useState(() => localDate(now)),
    [time, setTime] = useState("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [notes, setNotes] = useState("");
  const panel = useRef();
  // Only an opening edge may focus; time/content/menu rerenders must not steal it.
  useEffect(() => {
    if (visible && focusAllowed) panel.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [visible]);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <aside
      ref={panel}
      className="calendar-side-panel"
      data-open={visible}
      inert={visible ? undefined : ""}
      aria-hidden={!visible}
      aria-label="Calendar and meeting request"
      onKeyDown={(e) => {
        if (visible && e.key === "Escape" && !e.defaultPrevented && !e.repeat && !e.isComposing && !e.nativeEvent?.isComposing && e.keyCode !== 229 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <header>
        <strong>
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </strong>
        <button onClick={close} aria-label="Close calendar">
          ×
        </button>
      </header>
      <div className="calendar-panel-body">
        <div className="calendar-month-controls">
          <button
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <strong>
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
        <div className="meeting-calendar-grid">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <small key={d}>{d}</small>
          ))}
          {Array.from({ length: month.getDay() }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const value = localDate(
              new Date(month.getFullYear(), month.getMonth(), i + 1),
            );
            return (
              <button
                key={value}
                aria-label={value}
                aria-pressed={date === value}
                aria-current={value === localDate(now) ? "date" : undefined}
                onClick={() => setDate(value)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            setDate(localDate(now));
            setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
          }}
        >
          Today
        </button>
        <h2>Request a conversation</h2>
        <p>
          Choose a preferred time and draft a request in Mail. Marko will need
          to confirm the time; this does not reserve a slot or create a meeting
          link.
        </p>
        <form
          id="meeting-request"
          onSubmit={(e) => {
            e.preventDefault();
            requestMeeting({ date, time, timezone, notes });
            close();
          }}
        >
          <label>
            Preferred date
            <input
              type="date"
              value={date}
              min={localDate(now)}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Preferred time
            <input
              type="time"
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label>
            Timezone
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {[
                ...new Set([
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                  "America/New_York",
                  "America/Chicago",
                  "America/Denver",
                  "America/Los_Angeles",
                  "Europe/London",
                  "Europe/Belgrade",
                  "Asia/Tokyo",
                  "Australia/Sydney",
                  "UTC",
                ]),
              ].map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </label>
          <label>
            Notes (optional)
            <textarea
              value={notes}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>
        </form>
      </div>
      <footer className="calendar-panel-action">
        <button type="submit" form="meeting-request">
          Draft request → Mail
        </button>
        <small>Review before sending. A request is not a booking.</small>
      </footer>
    </aside>
  );
}
