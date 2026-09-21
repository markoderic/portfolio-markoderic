import React, { useRef, useState } from "react";
import { Send, Mail, Trash2 } from "lucide-react";
import { emptyDraft } from "./mailState";
export default function MailComposer({ mail, setMail, sendMail, onClose }) {
  const discardButton = useRef();
  const [discard, setDiscard] = useState(false),
    [copied, setCopied] = useState("");
  const { draft, sending, status } = mail;
  const field = (key) => ({
    name: key,
    value: draft[key],
    onChange: (e) =>
      setMail((m) => ({
        ...m,
        status: "",
        draft: { ...m.draft, [key]: e.target.value },
      })),
  });
  return (
    <form
      className="mail-composer"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented && discard) {
          e.stopPropagation();
          setDiscard(false);
          discardButton.current?.focus({ preventScroll: true });
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        sendMail();
      }}
    >
      <header>
        <Mail size={17} />
        <strong>New Message</strong>
        <button type="submit" disabled={sending}>
          <Send size={15} />
          {sending ? "Sending…" : "Send"}
        </button>
        <button
          ref={discardButton}
          type="button"
          disabled={sending}
          onClick={() => setDiscard(true)}
        >
          <Trash2 size={14} />
          Discard draft
        </button>
      </header>
      {discard && (
        <div className="mail-discard" role="alert">
          <strong>Discard this draft?</strong>
          <button type="button" onClick={() => setDiscard(false)}>
            Keep writing
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              if (sending) return;
              setMail((m) => ({
                ...m,
                draft: emptyDraft(),
                status: "Draft discarded.",
              }));
              setDiscard(false);
              onClose();
            }}
          >
            Discard
          </button>
        </div>
      )}
      <fieldset disabled={sending}>
        <div className="mail-recipient">
          <span>To</span>
          <strong>Marko Deric &lt;markoderic04@gmail.com&gt;</strong>
        </div>
        <label>
          Name
          <input
            {...field("name")}
            required
            autoComplete="name"
            maxLength={120}
          />
        </label>
        <label>
          Your email
          <input
            {...field("email")}
            type="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label>
          Subject
          <input {...field("subject")} required maxLength={200} />
        </label>
        <label className="mail-honeypot" aria-hidden="true">
          Leave empty
          <input {...field("_gotcha")} tabIndex={-1} autoComplete="off" />
        </label>
        <label className="mail-body-label">
          <span>Message</span>
          <textarea
            {...field("details")}
            required
            rows={8}
            maxLength={12000}
            placeholder="What would you like to talk about?"
          />
        </label>
        <details>
          <summary>Optional project details</summary>
          <label>
            Project type
            <select {...field("type")}>
              <option value="">Choose one</option>
              {[
                "Website or landing page",
                "Web app or dashboard",
                "Video or social content",
                "Brand or portfolio polish",
                "Something else",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Timeline
            <select {...field("timeline")}>
              <option value="">Choose one</option>
              {["ASAP", "2-4 weeks", "1-2 months", "Flexible"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Budget
            <select {...field("budget")}>
              <option value="">Choose one</option>
              {[
                "Student/campus budget",
                "Under $500",
                "$500-$1,500",
                "$1,500+",
                "Not sure yet",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </details>
      </fieldset>
      <footer>
        <p role="status">
          {status ||
            "Draft kept in this workspace, including when you close Mail. Send submits through Formspree."}
        </p>
        <a
          href={`mailto:markoderic04@gmail.com?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.details)}`}
        >
          Use email app ↗
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText("markoderic04@gmail.com");
              setCopied("Address copied.");
            } catch {
              setCopied("markoderic04@gmail.com");
            }
          }}
        >
          Copy address
        </button>
        <span role="status">{copied}</span>
      </footer>
    </form>
  );
}
