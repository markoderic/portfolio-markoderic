export const MAIL_ENDPOINT = "https://formspree.io/f/xpqnqaaa";
export const emptyDraft = () => ({
  name: "",
  email: "",
  subject: "",
  details: "",
  type: "",
  timeline: "",
  budget: "",
  _gotcha: "",
});
export function validateDraft(d) {
  if (d._gotcha) return "Unable to submit this form.";
  if (!d.name.trim() || !d.subject.trim() || !d.details.trim())
    return "Add your name, subject and message.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
    return "Enter a valid reply email.";
  return "";
}
export function meetingDraft(draft, { date, time, timezone, notes = "" }) {
  const request = `Meeting request\nPreferred date: ${date}\nPreferred time: ${time}\nTimezone: ${timezone}${notes.trim() ? `\nNotes: ${notes.trim()}` : ""}\nAwaiting confirmation — these are preferences, not confirmed availability.`;
  return {
    ...draft,
    subject: draft.subject || "Request a conversation",
    details: [draft.details, request].filter(Boolean).join("\n\n"),
  };
}
// One controller lives above window mounts: closing/reopening cannot duplicate a send.
export function createMailSender(
  fetcher = (...args) => fetch(...args),
  online = () => navigator.onLine,
) {
  let pending = false;
  return async (draft) => {
    if (pending)
      return {
        ok: false,
        duplicate: true,
        message: "A message is already sending.",
      };
    const error = validateDraft(draft);
    if (error) return { ok: false, message: error };
    if (!online())
      return {
        ok: false,
        message:
          "You’re offline. Your draft is kept; reconnect before sending.",
      };
    pending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const body = new FormData();
      Object.entries(draft).forEach(([k, v]) => body.set(k, String(v)));
      body.set("_subject", `${draft.subject.trim()} — ${draft.name.trim()}`);
      const response = await fetcher(MAIL_ENDPOINT, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (response.ok)
        return {
          ok: true,
          message: "Message submitted. Thank you for reaching out.",
        };
      if (response.status === 429)
        return {
          ok: false,
          message:
            "Too many requests. Your draft is kept; wait before trying again.",
        };
      if (response.status >= 500)
        return {
          ok: false,
          message:
            "The mail service is unavailable. Your draft is kept; try again later.",
        };
      const data = await response.json().catch(() => ({}));
      return {
        ok: false,
        message:
          data.errors
            ?.map((e) => e.message)
            .filter(Boolean)
            .join(" ") ||
          "The form could not be accepted. Check your details or use your email app.",
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error.name === "AbortError"
            ? "The request timed out. Delivery is uncertain; your draft is kept. Check before resending."
            : "Connection failed. Delivery is uncertain; your draft is kept. Check before resending.",
      };
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  };
}

// Completion applies to the submitted snapshot, never a newer meeting draft.
export function finishMail(state, submitted, result) {
  return {
    ...state,
    sending: false,
    status: result.message,
    draft:
      result.ok && JSON.stringify(state.draft) === JSON.stringify(submitted)
        ? emptyDraft()
        : state.draft,
  };
}
