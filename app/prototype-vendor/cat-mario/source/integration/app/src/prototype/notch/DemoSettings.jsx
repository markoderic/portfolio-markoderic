import React, { useState } from "react";
import { sections } from "./demoState";
export default function DemoSettings({ state, dispatch }) {
  const [checkpoint, setCheckpoint] = useState(null);
  const order = state.settings.tabOrder || sections;
  function move(i, n) {
    const next = [...order],
      j = i + n;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    dispatch({ type: "setting", value: { tabOrder: next } });
  }
  return (
    <section className="n-card">
      <details>
        <summary>Navigation order</summary>
        {order.map((tab, i) => (
          <div className="finance-record" key={tab}>
            <span>{tab}</span>
            <button
              aria-label={`Move ${tab} earlier`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              aria-label={`Move ${tab} later`}
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </details>
      <details>
        <summary>Session data</summary>
        <p>Only this browser’s fictional demo records are included.</p>
        <button
          onClick={() => {
            const { history, notice, ...data } = state;
            const blob = new Blob(
                [
                  JSON.stringify(
                    { format: "notch-browser-demo-v1", data },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
              url = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = url;
            a.download = "notch-sample-session.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Export sample JSON
        </button>
        <button onClick={() => setCheckpoint(structuredClone(state))}>
          Save session checkpoint
        </button>
        <button
          disabled={!checkpoint}
          onClick={() =>
            dispatch({ type: "restoreCheckpoint", value: checkpoint })
          }
        >
          Restore checkpoint
        </button>
        <small>
          Checkpoint stays in memory until reload. Native Notch backups are
          separate.
        </small>
      </details>
      <details>
        <summary>Privacy & help</summary>
        <p>
          Edits stay in this page’s memory. Reset or reload clears the sample
          session. No bank, health, calendar or email account connects to the
          demo.
        </p>
        <p>
          Tap a row to edit. Save applies the draft; Cancel keeps the previous
          record. Undo reverses the latest saved sample change. Return to the
          laptop preserves your phone session.
        </p>
      </details>
    </section>
  );
}
