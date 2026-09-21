import React, { useRef, useState } from "react";
// Browser adaptation: literal text + Markdown marks, never injected HTML or native RTF.
export default function NoteBody({ value, onChange }) {
  const input = useRef(),
    [preview, setPreview] = useState(false);
  function mark(token) {
    const node = input.current;
    if (!node) return;
    const start = node.selectionStart,
      end = node.selectionEnd,
      text = value.slice(start, end) || "text";
    onChange(value.slice(0, start) + token + text + token + value.slice(end));
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(
        start + token.length,
        start + token.length + text.length,
      );
    });
  }
  return (
    <div className="note-rich-body">
      <div className="n-segment">
        <button
          type="button"
          disabled={preview}
          onClick={() => mark("**")}
          aria-label="Bold selected text"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          disabled={preview}
          onClick={() => mark("_")}
          aria-label="Italic selected text"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? "Edit text" : "Preview formatting"}
        </button>
      </div>
      {preview ? (
        <div className="note-formatted" tabIndex={0}>
          {value.split("\n").map((line, i) => (
            <p key={i}>
              {line
                .split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
                .map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j}>{part.slice(2, -2)}</strong>
                  ) : part.startsWith("_") && part.endsWith("_") ? (
                    <em key={j}>{part.slice(1, -1)}</em>
                  ) : (
                    part
                  ),
                )}
            </p>
          ))}
        </div>
      ) : (
        <label>
          Note
          <textarea
            ref={input}
            rows={9}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
