import React, { useEffect, useRef, useState } from "react";
import { entryStages, entryStatus } from "./entryState";
export default function BootConsole({
  stages,
  loading,
  loaded,
  total,
  errors,
  failed,
}) {
  const status = entryStatus(stages, { loading, errors, failed });
  const started = useRef(performance.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const measure = () => setElapsed(performance.now() - started.current);
    measure();
    if (status.ready || status.hasError) return;
    const timer = setInterval(measure, 100);
    return () => clearInterval(timer);
  }, [status.ready, status.hasError]);
  return (
    <div className="terminal-console" aria-label="Workspace initialization">
      <span>&gt; Marko Deric / Workspace</span>
      {entryStages.map(([id, label]) => (
        <span key={id} data-stage={id}>
          {label} · {stages[id] ? "ready" : failed ? "unavailable" : "loading…"}
        </span>
      ))}
      <span className="terminal-progress" aria-live="off">
        {total > 0
          ? `Asset transfers · ${loaded} / ${total}`
          : status.ready
            ? "No pending asset transfers"
            : failed
              ? "Asset transfers stopped"
              : "Asset transfers · waiting for initialization"}
        {` · ${(elapsed / 1000).toFixed(1)}s elapsed`}
        {errors.length > 0 ? ` · ${errors.length} failed` : ""}
      </span>
      <span role="status" aria-live="polite">
        {status.message}
      </span>
      <span className="terminal-cursor" aria-hidden="true">
        ▌
      </span>
    </div>
  );
}
