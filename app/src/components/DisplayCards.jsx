import { useEffect, useRef, useState } from "react";
import { PenTool, Code2, Clapperboard } from "lucide-react";

// Port of 21st.dev's "Display Cards" (stacked, skewed, hover-to-lift) restyled
// with the site's own CSS so it reads as native to the portfolio — Tailwind is
// intentionally not used in this app (its preflight reset fights styles.css).
// Click a card and it pops out of the stack, un-skews and expands so the full
// description is readable; click it again and it slides back in.
const DEFAULT_CARDS = [
  {
    Icon: PenTool,
    title: "Design",
    description: "Layout, type, and motion that stay calm.",
    details:
      "Layout, type, and motion that keep an interface calm and obvious to use — from first sketch to a full design system.",
    meta: "UI design · Design systems · Prototyping · Motion",
  },
  {
    Icon: Code2,
    title: "Build",
    description: "Hand-written front-end. Real, working products.",
    details:
      "Hand-written front-end. I build real, working products — including offline-capable PWAs with no framework and no backend.",
    meta: "HTML & CSS · JavaScript · PWAs · State & data",
  },
  {
    Icon: Clapperboard,
    title: "Tell",
    description: "Video and branding that find an audience.",
    details:
      "Video, branding, and content that give the work a voice and help it find an audience — proven on a 3M+ view channel.",
    meta: "Video editing · Branding · Short-form · Copy",
  },
];

export default function DisplayCards({ cards = DEFAULT_CARDS }) {
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const toggle = (i) => setActive((cur) => (cur === i ? -1 : i));

  // Clicking anywhere outside the popped-out card (or pressing Escape) sends
  // it back into the stack — no need to click the card itself again.
  useEffect(() => {
    if (active < 0) return;
    const onPointerDown = (e) => {
      const activeCard = rootRef.current?.querySelector(".display-card.is-active");
      // Let the active card's own click handler do the toggle.
      if (activeCard && activeCard.contains(e.target)) return;
      setActive(-1);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setActive(-1);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  return (
    <div ref={rootRef} className={"display-cards" + (active >= 0 ? " has-active" : "")}>
      {cards.map(({ Icon, title, description, details, meta }, i) => (
        <article
          className={"display-card" + (active === i ? " is-active" : "")}
          key={title}
          style={{ "--i": i }}
          role="button"
          tabIndex={0}
          aria-expanded={active === i}
          onClick={() => toggle(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(i);
            }
          }}
        >
          <div className="display-card-head">
            <span className="display-card-icon" aria-hidden="true">
              <Icon size={14} strokeWidth={2.2} />
            </span>
            <p className="display-card-title">{title}</p>
          </div>
          <p className="display-card-desc">{description}</p>
          <p className="display-card-details">{details}</p>
          <p className="display-card-meta">{meta}</p>
        </article>
      ))}
    </div>
  );
}
