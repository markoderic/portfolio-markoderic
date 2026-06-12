import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { initSite } from "./lib/site.js";
import { initThree } from "./lib/three-app.js";
import Home from "./pages/Home.jsx";
import Projects from "./pages/Projects.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import { ResumeModal, ProjectModal } from "./components/Modals.jsx";

// Runs once at module load — the React equivalent of the vanilla inline <head>
// script: hide the page for the boot loader and feature-detect WebGL before any
// page content mounts.
if (typeof document !== "undefined") {
  document.body.classList.add("is-loading");
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const big = window.matchMedia("(min-width: 760px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (gl && big && !reduce) document.documentElement.classList.add("webgl");
  } catch (e) {}
}

function Cursor() {
  return (
    <div className="cursor" aria-hidden="true" data-cursor>
      <span className="cursor-dot"></span>
      <span className="cursor-ring"></span>
    </div>
  );
}

function PageTransition() {
  return (
    <div className="page-transition" data-transition aria-hidden="true">
      <span className="page-transition-mark">
        Marko Deric<span></span>
      </span>
    </div>
  );
}

function Loader() {
  return (
    <div className="page-loader" aria-hidden="true">
      <div className="loader-stage">
        <span className="loader-mark" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i}></span>
          ))}
        </span>
        <p className="loader-tag">Marko Deric — Portfolio</p>
        <canvas className="loader-dots-canvas" data-loader-dots width="112" height="80"></canvas>
        <div className="loader-meter">
          <div className="loader-track"><span></span></div>
        </div>
        <span className="loader-count" data-loader-count>00</span>
      </div>
    </div>
  );
}

function Header() {
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " is-current" : "");
  return (
    <header className="site-header" aria-label="Primary navigation">
      <NavLink className="brand-link" to="/" aria-label="Go to top" data-magnetic>
        <span className="brand-cube" aria-hidden="true">
          <span className="cube-face cube-front">M</span>
          <span className="cube-face cube-back">D</span>
          <span className="cube-face cube-right"></span>
          <span className="cube-face cube-left"></span>
          <span className="cube-face cube-top"></span>
          <span className="cube-face cube-bottom"></span>
        </span>
        <span className="brand-text">Marko Deric</span>
      </NavLink>

      <div className="nav-shell open" data-nav-root>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded="true"
          aria-controls="siteNav"
          data-nav-toggle
          data-magnetic
        >
          <span>Menu</span>
          <span className="nav-toggle-mark" aria-hidden="true"></span>
        </button>
        <nav className="nav-pill" id="siteNav" aria-label="Portfolio sections" data-nav-menu>
          <NavLink to="/" end className={navClass}>
            Overview
          </NavLink>
          <NavLink to="/projects" className={navClass}>
            Projects
          </NavLink>
          <NavLink to="/about" className={navClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={navClass}>
            Contact
          </NavLink>
        </nav>
      </div>

      <NavLink className="header-cta" to="/contact" data-magnetic>
        <span>Start a project</span>
        <span className="cta-dots" aria-hidden="true"></span>
      </NavLink>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <p>
        &copy; <span id="year"></span> Marko Deric
      </p>
      <p>Built with React, Three.js, and a focus on motion.</p>
    </footer>
  );
}

// Re-runs the ported vanilla behaviour + WebGL for each freshly mounted page.
// (initSite/initThree are idempotent: globals bind once, page content re-inits.)
function PageShell({ children }) {
  useEffect(() => {
    initSite();
    initThree();
    try {
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    } catch (e) {}
    window.scrollTo(0, 0);
  }, []);
  return children;
}

export default function App() {
  const location = useLocation();
  // Page transition = a mini version of the first-load boot loader: the black
  // dot-mark cover snaps in, the scroll reset + content swap + WebGL init all
  // happen while it's fully opaque, it holds a beat, then lifts to reveal the
  // new page blur-fading in at the top. Nothing of either page can spoil.
  const [shown, setShown] = useState(location);
  const [phase, setPhase] = useState("idle"); // idle | exit | cover | enter

  useEffect(() => {
    if (location.pathname === shown.pathname) return;
    // Freeze smooth scrolling instantly so leftover momentum can't keep the
    // old page visibly moving while the loader rises.
    try {
      if (window.__lenis) window.__lenis.stop();
    } catch (e) {}
    document.body.classList.add("is-routing");
    setPhase("exit");
    const swap = window.setTimeout(() => {
      // Reset scroll behind the opaque loader — Lenis must be moved with
      // force or it restores the old offset.
      try {
        if (window.__lenis) {
          window.__lenis.scrollTo(0, { immediate: true, force: true });
          window.__lenis.start();
        }
      } catch (e) {}
      window.scrollTo(0, 0);
      setShown(location);
      setPhase("cover"); // new page mounts + boots while still hidden
    }, 260);
    return () => window.clearTimeout(swap);
  }, [location, shown]);

  useEffect(() => {
    if (phase !== "cover") return;
    // Hold the loader a beat (it reads as a quick load), then lift it.
    const reveal = window.setTimeout(() => {
      document.body.classList.remove("is-routing");
      setPhase("enter");
    }, 470);
    return () => window.clearTimeout(reveal);
  }, [phase]);

  useEffect(() => {
    if (phase !== "enter") return;
    const settle = window.setTimeout(() => setPhase("idle"), 660);
    return () => window.clearTimeout(settle);
  }, [phase, shown]);

  const wrapClass = "page-wrap" + (phase === "idle" ? "" : ` is-${phase}`);

  return (
    <>
      <Cursor />
      <PageTransition />
      <Loader />
      <Header />
      <div className="route-loader" aria-hidden="true">
        <span className="loader-mark" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i}></span>
          ))}
        </span>
        <span className="route-loader-tag">Marko Deric</span>
      </div>
      <div key={shown.pathname} className={wrapClass}>
        <Routes location={shown}>
          <Route path="/" element={<PageShell><Home /></PageShell>} />
          <Route path="/projects" element={<PageShell><Projects /></PageShell>} />
          <Route path="/about" element={<PageShell><About /></PageShell>} />
          <Route path="/contact" element={<PageShell><Contact /></PageShell>} />
        </Routes>
      </div>
      <Footer />
      <ResumeModal />
      <ProjectModal />
    </>
  );
}
