const body = document.body;
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------------------
   Page transition + first-load loader
   - First external visit shows the count-up loader (index only).
   - In-site navigation plays a smooth cover/reveal overlay.
--------------------------------------------------------------------------- */
const loader = document.querySelector(".page-loader");
const loaderBar = document.querySelector(".loader-track span");
const loaderCount = document.querySelector("[data-loader-count]");
const transition = document.querySelector("[data-transition]");

let navFlag = false;
try { navFlag = sessionStorage.getItem("md-nav") === "1"; } catch (e) { navFlag = false; }

function revealReady() {
  body.classList.add("site-ready");
  body.classList.remove("is-loading");
}

function runLoader(done) {
  if (prefersReducedMotion || !loader) {
    if (loaderBar) loaderBar.style.transform = "scaleX(1)";
    if (loaderCount) loaderCount.textContent = "100";
    done();
    return;
  }
  let progress = 0;
  const tick = () => {
    progress += Math.random() * 9 + 4;
    if (progress >= 100) progress = 100;
    if (loaderBar) loaderBar.style.transform = `scaleX(${progress / 100})`;
    if (loaderCount) loaderCount.textContent = String(Math.round(progress)).padStart(2, "0");
    if (progress < 100) {
      setTimeout(tick, 90 + Math.random() * 90);
    } else {
      setTimeout(done, 280);
    }
  };
  setTimeout(tick, 120);
}

function clearEntering() {
  // Reveal the page from under the transition overlay.
  root.classList.remove("is-entering");
  try { sessionStorage.removeItem("md-nav"); } catch (e) {}
  window.setTimeout(() => {
    if (transition) transition.classList.remove("is-cover");
  }, 30);
}

window.addEventListener("load", () => {
  if (navFlag || root.classList.contains("is-entering")) {
    // Arrived via an in-site link: skip the loader, reveal from overlay.
    if (loader) loader.setAttribute("hidden", "");
    revealReady();
    clearEntering();
  } else {
    runLoader(() => {
      revealReady();
      window.setTimeout(() => loader && loader.setAttribute("hidden", ""), 900);
    });
  }
});

// Intercept same-page internal links for a smooth animated transition.
function isInternalPageLink(link) {
  const href = link.getAttribute("href") || "";
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (link.target === "_blank" || link.hasAttribute("download")) return false;
  if (/^https?:\/\//i.test(href) && link.hostname !== window.location.hostname) return false;
  // Same-document hash links are handled by the smooth-scroll logic, not here.
  if (/^[^/]*#/.test(href) && !/\.html/i.test(href)) return false;
  return /\.html(\?|#|$)/i.test(href) || href === "/" || href.endsWith("/");
}

if (transition && !prefersReducedMotion) {
  document.querySelectorAll('a[data-link]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      if (!isInternalPageLink(link)) return;
      const dest = link.getAttribute("href");
      const destPath = dest.split("#")[0].split("?")[0];
      const destHash = dest.includes("#") ? "#" + dest.split("#")[1] : "";
      const current = window.location.pathname.split("/").pop() || "index.html";
      // Same page: smooth-scroll to the anchor (or top) instead of reloading.
      if (destPath === current || destPath === "" || (current === "index.html" && destPath === "index.html")) {
        event.preventDefault();
        if (destHash && document.querySelector(destHash)) {
          scrollToTarget(destHash);
        } else {
          scrollToTarget(document.body);
        }
        return;
      }
      event.preventDefault();
      try { sessionStorage.setItem("md-nav", "1"); } catch (e) {}
      transition.classList.add("is-cover", "is-leaving");
      window.setTimeout(() => { window.location.href = dest; }, 520);
    });
  });
}

// Restore from bfcache without a stuck overlay.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    root.classList.remove("is-entering");
    if (transition) transition.classList.remove("is-cover", "is-leaving");
    try { sessionStorage.removeItem("md-nav"); } catch (e) {}
  }
});

/* ---------------------------------------------------------------------------
   Smooth scroll (Lenis, with graceful fallback to native)
--------------------------------------------------------------------------- */
let lenis = null;

function initLenis() {
  if (prefersReducedMotion || typeof window.Lenis === "undefined") return;
  lenis = new window.Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  lenis.on("scroll", onScroll);
  // Keep GSAP ScrollTrigger (if loaded) in sync with Lenis' smooth scroll.
  if (window.ScrollTrigger) lenis.on("scroll", window.ScrollTrigger.update);
}

function scrollToTarget(target) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: -90 });
  } else {
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  }
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    if (!id || id === "#") return;
    const el = document.querySelector(id);
    if (!el) return;
    event.preventDefault();
    scrollToTarget(el);
  });
});

(function loadLenis() {
  if (prefersReducedMotion) return;
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js";
  script.onload = initLenis;
  script.onerror = () => { /* native scroll fallback */ };
  document.head.appendChild(script);
})();

/* ---------------------------------------------------------------------------
   Reveal on scroll
--------------------------------------------------------------------------- */
const revealItems = document.querySelectorAll("[data-reveal]");

document.querySelectorAll("[data-stagger]").forEach((group) => {
  group.querySelectorAll("[data-reveal]").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 90, 600)}ms`;
  });
});

if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

/* ---------------------------------------------------------------------------
   Word-by-word lighting for big statements
--------------------------------------------------------------------------- */
document.querySelectorAll("[data-reveal-words]").forEach((statement) => {
  if (prefersReducedMotion) { statement.classList.add("lit"); return; }
  const words = statement.textContent.trim().split(/\s+/);
  statement.textContent = "";
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    span.style.transitionDelay = `${index * 26}ms`;
    statement.appendChild(span);
    statement.appendChild(document.createTextNode(" "));
  });
  if ("IntersectionObserver" in window) {
    const wordObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          statement.classList.add("lit");
          wordObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    wordObserver.observe(statement);
  } else {
    statement.classList.add("lit");
  }
});

/* ---------------------------------------------------------------------------
   Count-up stats
--------------------------------------------------------------------------- */
function animateCount(el) {
  const target = parseFloat(el.getAttribute("data-count"));
  if (isNaN(target)) return;
  const decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
  const prefix = el.getAttribute("data-count-prefix") || "";
  const suffix = el.getAttribute("data-count-suffix") || "";
  if (prefersReducedMotion) {
    el.textContent = prefix + target.toFixed(decimals) + suffix;
    return;
  }
  const duration = 1500;
  const start = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = target * eased;
    el.textContent = prefix + value.toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = prefix + target.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(frame);
}

const countEls = document.querySelectorAll("[data-count]");
if (countEls.length && "IntersectionObserver" in window) {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  countEls.forEach((el) => countObserver.observe(el));
} else {
  countEls.forEach((el) => animateCount(el));
}

/* ---------------------------------------------------------------------------
   Navigation (page-based)
--------------------------------------------------------------------------- */
const navRoot = document.querySelector("[data-nav-root]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll(".nav-pill a");
const desktopNav = window.matchMedia("(min-width: 1001px)");

function syncNavMode() {
  if (!navRoot || !navToggle) return;
  // Starts open on both desktop and mobile; the toggle can collapse it.
  // Don't fight a user's manual collapse when they resize.
  if (navRoot.dataset.userToggled) return;
  if (desktopNav.matches) {
    navRoot.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
  } else {
    navRoot.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
}
syncNavMode();
desktopNav.addEventListener("change", () => {
  // On a breakpoint change, reset to the sensible default for that size.
  delete navRoot.dataset.userToggled;
  syncNavMode();
});

if (navToggle && navRoot) {
  navToggle.addEventListener("click", () => {
    const isOpen = navRoot.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navRoot.dataset.userToggled = "1";
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (navRoot && navToggle && !desktopNav.matches) {
      navRoot.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
});

document.addEventListener("click", (event) => {
  if (navRoot && navToggle && !desktopNav.matches && !navRoot.contains(event.target)) {
    navRoot.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

/* ---------------------------------------------------------------------------
   Header auto-hide
--------------------------------------------------------------------------- */
const siteHeader = document.querySelector(".site-header");
let lastScroll = 0;
let headerHidden = false;

function setHeaderHidden(hidden) {
  if (hidden === headerHidden || !siteHeader) return;
  headerHidden = hidden;
  siteHeader.classList.toggle("is-hidden", hidden);
}

function syncHeader() {
  if (!siteHeader) return;
  const y = Math.max(0, window.scrollY);
  const delta = y - lastScroll;
  const navOpen = navRoot && navRoot.classList.contains("open") && !desktopNav.matches;

  siteHeader.classList.toggle("is-scrolled", y > 30);

  // Hysteresis: ignore sub-8px jitter so smooth scrolling never flickers the header.
  if (navOpen || y < 320) {
    setHeaderHidden(false);
  } else if (delta > 8) {
    setHeaderHidden(true);
  } else if (delta < -8) {
    setHeaderHidden(false);
  }

  lastScroll = y;
}

/* ---------------------------------------------------------------------------
   Parallax (scroll) + scrub-driven showcase
--------------------------------------------------------------------------- */
const heroShots = document.querySelectorAll(".hero-shot");
const parallaxEls = document.querySelectorAll("[data-parallax]");
const imgParallaxEls = document.querySelectorAll("[data-img-parallax]");
const scrubSections = document.querySelectorAll("[data-scrub]");

function applyParallax() {
  if (prefersReducedMotion) return;
  const y = window.scrollY;
  parallaxEls.forEach((el) => {
    const speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
    el.style.setProperty("--scroll-y", `${(y * speed).toFixed(1)}px`);
  });

  const vh = window.innerHeight;
  imgParallaxEls.forEach((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > vh + 200) return;
    const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
    const shift = Math.max(-6, Math.min(6, progress * -8));
    img.style.transform = `translateY(${shift.toFixed(2)}%) scale(1.16)`;
  });
}

// Apple-style pinned scrub: drive a 0..1 progress as the tall section
// scrolls through the viewport, then advance stepped feature panels.
function applyScrub() {
  if (prefersReducedMotion) return;
  const vh = window.innerHeight;
  scrubSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const total = rect.height - vh;
    if (total <= 0) return;
    let p = (-rect.top) / total;
    p = Math.max(0, Math.min(1, p));
    section.style.setProperty("--p", p.toFixed(4));

    const steps = section.querySelectorAll("[data-step]");
    if (steps.length) {
      // Map progress across steps; keep the first step active until ~12%.
      const active = Math.min(steps.length - 1, Math.floor(p * steps.length * 1.0001));
      steps.forEach((step, i) => step.classList.toggle("is-active", i === active));
      const bars = section.querySelectorAll("[data-step-dot]");
      bars.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
    }

    // Scroll-zoom video: play once it has zoomed in, pause when small/out of range.
    if (section.hasAttribute("data-video-zoom")) {
      const vid = section.querySelector("video");
      if (vid) {
        if (p > 0.12 && p < 0.99) {
          if (vid.paused) vid.play().catch(() => {});
        } else if (!vid.paused) {
          vid.pause();
        }
      }
    }
  });
}

function onScroll() {
  syncHeader();
  applyParallax();
  applyScrub();
}

applyParallax();
applyScrub();
syncHeader();
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { applyParallax(); applyScrub(); });

/* ---------------------------------------------------------------------------
   Hero pointer 3D motion
--------------------------------------------------------------------------- */
let targetPointerX = 0;
let targetPointerY = 0;
let currentPointerX = 0;
let currentPointerY = 0;
let pointerTicking = false;
const heroName = document.querySelector(".hero-name");

function updatePointerMotion() {
  currentPointerX += (targetPointerX - currentPointerX) * 0.2;
  currentPointerY += (targetPointerY - currentPointerY) * 0.2;

  const rotateY = currentPointerX * 34;
  const rotateX = currentPointerY * -21;
  const depthX = 16 + currentPointerX * 26;
  const depthY = 15 + currentPointerY * 20;
  const shadowX = 20 + currentPointerX * -28;
  const shadowY = 24 + currentPointerY * -24;
  const rimX = -12 + currentPointerX * 22;
  const rimY = -10 + currentPointerY * 16;

  body.style.setProperty("--name-ry", `${rotateY.toFixed(2)}deg`);
  body.style.setProperty("--name-rx", `${rotateX.toFixed(2)}deg`);
  body.style.setProperty("--name-depth-x", `${depthX.toFixed(2)}px`);
  body.style.setProperty("--name-depth-y", `${depthY.toFixed(2)}px`);
  body.style.setProperty("--name-shadow-x", `${shadowX.toFixed(2)}px`);
  body.style.setProperty("--name-shadow-y", `${shadowY.toFixed(2)}px`);
  body.style.setProperty("--name-rim-x", `${rimX.toFixed(2)}px`);
  body.style.setProperty("--name-rim-y", `${rimY.toFixed(2)}px`);
  body.style.setProperty("--name-glow-x", `${(currentPointerX * 30).toFixed(2)}%`);
  body.style.setProperty("--name-glow-y", `${(currentPointerY * 20).toFixed(2)}%`);
  body.style.setProperty("--pointer-x", `${(currentPointerX * 22).toFixed(2)}px`);
  body.style.setProperty("--pointer-y", `${(currentPointerY * 16).toFixed(2)}px`);

  heroShots.forEach((shot, index) => {
    const depth = (index + 1) * 10;
    shot.style.setProperty("--shot-x", `${(-currentPointerX * depth).toFixed(2)}px`);
    shot.style.setProperty("--shot-y", `${(-currentPointerY * depth).toFixed(2)}px`);
  });

  if (Math.abs(targetPointerX - currentPointerX) > 0.001 || Math.abs(targetPointerY - currentPointerY) > 0.001) {
    requestAnimationFrame(updatePointerMotion);
  } else {
    pointerTicking = false;
  }
}

if (!prefersReducedMotion && finePointer && heroName) {
  window.addEventListener("pointermove", (event) => {
    targetPointerX = (event.clientX / window.innerWidth) - 0.5;
    targetPointerY = (event.clientY / window.innerHeight) - 0.5;
    if (!pointerTicking) {
      requestAnimationFrame(updatePointerMotion);
      pointerTicking = true;
    }
  }, { passive: true });
}

/* ---------------------------------------------------------------------------
   Marquee — continuous, seamless
--------------------------------------------------------------------------- */
document.querySelectorAll("[data-marquee]").forEach((marqueeTrack) => {
  if (prefersReducedMotion) return;
  let offset = 0;
  let half = marqueeTrack.scrollWidth / 2;
  const dir = marqueeTrack.hasAttribute("data-marquee-reverse") ? 1 : -1;
  window.addEventListener("resize", () => { half = marqueeTrack.scrollWidth / 2; });
  const speed = 0.6;
  function animateMarquee() {
    offset += speed * dir;
    if (Math.abs(offset) >= half) offset = 0;
    marqueeTrack.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(animateMarquee);
  }
  requestAnimationFrame(animateMarquee);
});

/* ---------------------------------------------------------------------------
   Custom cursor + magnetic buttons
--------------------------------------------------------------------------- */
const cursor = document.querySelector("[data-cursor]");
const magneticEls = document.querySelectorAll("[data-magnetic]");

if (cursor && finePointer && !prefersReducedMotion) {
  document.documentElement.classList.add("has-cursor");
  const dot = cursor.querySelector(".cursor-dot");
  const ring = cursor.querySelector(".cursor-ring");

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let rx = tx;
  let ry = ty;

  window.addEventListener("pointermove", (event) => {
    tx = event.clientX;
    ty = event.clientY;
    cursor.classList.add("active");
    if (dot) dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
  }, { passive: true });

  window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("active"));

  function renderCursor() {
    rx += (tx - rx) * 0.35;
    ry += (ty - ry) * 0.35;
    if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  const hoverTargets = document.querySelectorAll(
    "a, button, .service-card, [data-magnetic], .resume-preview, .device-phone"
  );
  hoverTargets.forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });
}

if (finePointer && !prefersReducedMotion) {
  magneticEls.forEach((el) => {
    const strength = 0.32;
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const relX = event.clientX - rect.left - rect.width / 2;
      const relY = event.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${(relX * strength).toFixed(1)}px, ${(relY * strength).toFixed(1)}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------------------------------------------------------------------------
   Tilt cards
--------------------------------------------------------------------------- */
const tiltCards = document.querySelectorAll("[data-tilt-card]");
if (finePointer && !prefersReducedMotion) {
  tiltCards.forEach((card) => {
    card.style.transformStyle = "preserve-3d";
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${(px * 5).toFixed(2)}deg) rotateX(${(-py * 5).toFixed(2)}deg)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

/* ---------------------------------------------------------------------------
   Modals + project form
--------------------------------------------------------------------------- */
const resumeModal = document.getElementById("resumeModal");
const projectModal = document.getElementById("projectModal");
const resumeOpenButtons = document.querySelectorAll("[data-open-resume]");
const resumeCloseButtons = document.querySelectorAll("[data-close-resume]");
const projectOpenButtons = document.querySelectorAll("[data-open-project]");
const projectCloseButtons = document.querySelectorAll("[data-close-project]");
let lastFocusedElement = null;

function openModal(modal, trigger) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  body.classList.add("modal-locked");
  if (lenis) lenis.stop();

  // Origin-aware "pops up from where you clicked, flies to center and zooms in".
  const dialog = modal.querySelector(".resume-dialog, .project-dialog");
  if (dialog && trigger && !prefersReducedMotion) {
    const tr = trigger.getBoundingClientRect();
    const dx = Math.round((tr.left + tr.width / 2) - window.innerWidth / 2);
    const dy = Math.round((tr.top + tr.height / 2) - window.innerHeight / 2);
    dialog.style.transition = "none";
    dialog.style.transformOrigin = "center center";
    dialog.style.transform = `translate(${dx}px, ${dy}px) scale(0.12)`;
    dialog.style.opacity = "0";
    void dialog.offsetWidth; // flush
    requestAnimationFrame(() => {
      dialog.style.transition = "transform 480ms cubic-bezier(.16,1,.3,1), opacity 320ms ease";
      dialog.style.transform = "translate(0px, 0px) scale(1)";
      dialog.style.opacity = "1";
    });
  }

  const focusTarget = modal.querySelector("input, select, textarea, button, a");
  if (focusTarget) focusTarget.focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  // Clear the origin-zoom inline styles once it has faded out.
  const dialog = modal.querySelector(".resume-dialog, .project-dialog");
  if (dialog) {
    window.setTimeout(() => {
      dialog.style.transition = "";
      dialog.style.transform = "";
      dialog.style.opacity = "";
      dialog.style.transformOrigin = "";
    }, 300);
  }
  if (!document.querySelector(".modal.open")) {
    body.classList.remove("modal-locked");
    if (lenis) lenis.start();
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

resumeOpenButtons.forEach((b) => b.addEventListener("click", () => openModal(resumeModal, b)));
resumeCloseButtons.forEach((b) => b.addEventListener("click", () => closeModal(resumeModal)));
projectOpenButtons.forEach((b) => b.addEventListener("click", () => openModal(projectModal, b)));
projectCloseButtons.forEach((b) => b.addEventListener("click", () => closeModal(projectModal)));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal(resumeModal);
    closeModal(projectModal);
    if (navRoot && navToggle && !desktopNav.matches) {
      navRoot.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  }
});

const projectForm = document.querySelector("[data-project-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.remove("success", "error");
  if (type) formStatus.classList.add(type);
}

if (projectForm) {
  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const endpoint = projectForm.getAttribute("action") || "";
    if (!endpoint || endpoint.includes("YOUR_FORM_ID")) {
      setFormStatus("Add your Formspree form endpoint before this form can send.", "error");
      return;
    }
    const formData = new FormData(projectForm);
    const name = String(formData.get("name") || "").trim();
    formData.set("_subject", `Project inquiry from ${name || "portfolio visitor"}`);

    projectForm.classList.add("is-sending");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setFormStatus("Sending your project brief...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.errors && data.errors.length
          ? data.errors.map((error) => error.message).join(" ")
          : "Something went wrong. Please try again or email me directly.";
        throw new Error(message);
      }
      projectForm.reset();
      setFormStatus("Project brief sent. I will get back to you soon.", "success");
    } catch (error) {
      setFormStatus(error.message || "Something went wrong. Please try again or email me directly.", "error");
    } finally {
      projectForm.classList.remove("is-sending");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send project brief";
      }
    }
  });
}

/* ---------------------------------------------------------------------------
   Brand logo cube — auto-spins, click-and-drag to rotate
--------------------------------------------------------------------------- */
const brandCube = document.querySelector(".brand-cube");
if (brandCube) {
  let ry = -22, rx = 18, dragging = false, lastX = 0, lastY = 0, moved = 0;
  const idleSpin = prefersReducedMotion ? 0 : 0.25;
  brandCube.style.animation = "none";

  const apply = () => { brandCube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };

  brandCube.addEventListener("pointerdown", (event) => {
    dragging = true; moved = 0; lastX = event.clientX; lastY = event.clientY;
    if (brandCube.setPointerCapture) brandCube.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  window.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    ry += dx * 0.6;
    rx -= dy * 0.6;
    rx = Math.max(-85, Math.min(85, rx));
    lastX = event.clientX; lastY = event.clientY;
  });

  window.addEventListener("pointerup", () => { dragging = false; });
  window.addEventListener("pointercancel", () => { dragging = false; });

  // Don't navigate the brand link when the cube was actually dragged.
  const brandLink = brandCube.closest("a");
  if (brandLink) {
    brandLink.addEventListener("click", (event) => {
      if (moved > 6) { event.preventDefault(); event.stopImmediatePropagation(); moved = 0; }
    }, true);
  }

  function spinCube() {
    if (!dragging) ry += idleSpin;
    apply();
    requestAnimationFrame(spinCube);
  }
  spinCube();
}

/* ---------------------------------------------------------------------------
   Text scramble / decode on scroll-in (short labels)
--------------------------------------------------------------------------- */
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*<>";
function scrambleElement(el) {
  const finalText = el.dataset.scrambleText;
  if (!finalText) return;
  const len = finalText.length;
  const duration = 620;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const revealCount = p * len * 1.5;
    let out = "";
    for (let i = 0; i < len; i++) {
      const ch = finalText[i];
      if (ch === " ") { out += " "; continue; }
      if (i < revealCount) out += ch;
      else out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = finalText;
  }
  requestAnimationFrame(tick);
}

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const scrambleTargets = document.querySelectorAll(".section-kicker, .project-tag");
  const scrambleObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (!el.dataset.scrambleText) el.dataset.scrambleText = el.textContent.trim();
      scrambleElement(el);
      scrambleObserver.unobserve(el);
    });
  }, { threshold: 0.9 });
  scrambleTargets.forEach((el) => scrambleObserver.observe(el));
}

/* ---------------------------------------------------------------------------
   Scroll-velocity skew (subtle, on [data-skew] blocks)
--------------------------------------------------------------------------- */
const skewEls = document.querySelectorAll("[data-skew]");
if (skewEls.length && !prefersReducedMotion) {
  let prevY = window.scrollY;
  let skew = 0;
  function skewLoop() {
    const y = window.scrollY;
    const v = y - prevY;
    prevY = y;
    const target = Math.max(-3.2, Math.min(3.2, v * 0.22));
    skew += (target - skew) * 0.12;
    if (Math.abs(skew) < 0.01) skew = 0;
    skewEls.forEach((el) => { el.style.transform = `skewY(${skew.toFixed(2)}deg)`; });
    requestAnimationFrame(skewLoop);
  }
  requestAnimationFrame(skewLoop);
}

/* ---------------------------------------------------------------------------
   Generic "draw" trigger (charts / SVG strokes) on scroll-in
--------------------------------------------------------------------------- */
if ("IntersectionObserver" in window) {
  const drawObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-drawn");
        drawObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-draw]").forEach((el) => drawObserver.observe(el));
}

/* ---------------------------------------------------------------------------
   Horizontal pinned gallery — vertical scroll drives sideways motion
--------------------------------------------------------------------------- */
const hGallery = document.querySelector("[data-hgallery]");
if (hGallery) {
  const track = hGallery.querySelector("[data-hgallery-track]");
  function layoutGallery() {
    if (!track) return;
    if (window.matchMedia("(max-width: 900px)").matches) {
      hGallery.style.height = "";
      track.style.transform = "";
      return;
    }
    const distance = track.scrollWidth - window.innerWidth;
    // Tall enough that the whole track scrolls through while pinned.
    hGallery.style.height = `${window.innerHeight + Math.max(0, distance) + window.innerHeight * 0.4}px`;
  }
  function moveGallery() {
    if (!track || prefersReducedMotion) return;
    if (window.matchMedia("(max-width: 900px)").matches) { track.style.transform = ""; return; }
    const rect = hGallery.getBoundingClientRect();
    const total = hGallery.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    let p = (-rect.top) / total;
    p = Math.max(0, Math.min(1, p));
    const distance = track.scrollWidth - window.innerWidth;
    track.style.transform = `translate3d(${(-p * Math.max(0, distance)).toFixed(1)}px,0,0)`;
  }
  layoutGallery();
  window.addEventListener("resize", () => { layoutGallery(); moveGallery(); });
  window.addEventListener("scroll", moveGallery, { passive: true });
  // also drive from Lenis if present (onScroll already calls window scroll listeners)
  moveGallery();
}

/* ---------------------------------------------------------------------------
   Hero dot field — a faint grid that lights up and parts around the cursor.
   Pure pointer interaction (no scroll). Static fallback for touch / reduced
   motion; pauses when the hero scrolls off-screen or the tab is hidden.
--------------------------------------------------------------------------- */
const heroGrid = document.querySelector("[data-hero-grid]");
if (heroGrid) {
  const ctx = heroGrid.getContext("2d");
  const GAP = 34;     // spacing between dots (css px)
  const R = 165;      // cursor influence radius (css px)
  let w = 0, h = 0, cols = 0, rows = 0, offX = 0, offY = 0;
  let px = -9999, py = -9999, tpx = -9999, tpy = -9999;
  let visible = true, t = 0;

  function size() {
    const r = heroGrid.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    heroGrid.width = Math.round(w * dpr);
    heroGrid.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1;
    rows = Math.ceil(h / GAP) + 1;
    offX = (w - (cols - 1) * GAP) / 2;
    offY = (h - (rows - 1) * GAP) / 2;
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.beginPath();
        ctx.arc(offX + i * GAP, offY + j * GAP, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function draw() {
    px += (tpx - px) * 0.16;
    py += (tpy - py) * 0.16;
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let x = offX + i * GAP, y = offY + j * GAP;
        let a = 0.045 + 0.012 * Math.sin(t * 0.9 + i * 0.6 + j * 0.45); // idle breathing
        let rad = 1;
        const dx = x - px, dy = y - py;
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const e = (1 - d / R) ** 2;
          a += e * 0.5;
          rad += e * 1.8;
          const push = e * 7;             // part away from the pointer
          x += (dx / (d + 0.001)) * push;
          y += (dy / (d + 0.001)) * push;
        }
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fill();
      }
    }
  }

  size();

  if (prefersReducedMotion || !finePointer) {
    drawStatic();
    window.addEventListener("resize", () => { size(); drawStatic(); });
  } else {
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", (e) => {
      const r = heroGrid.getBoundingClientRect();
      tpx = e.clientX - r.left;
      tpy = e.clientY - r.top;
    }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; }, { threshold: 0 }).observe(heroGrid);
    }
    (function loop() {
      if (visible && !document.hidden) draw();
      requestAnimationFrame(loop);
    })();
  }
}

/* ---------------------------------------------------------------------------
   GSAP ScrollTrigger — cinematic scroll layer (loaded from CDN; optional).
   Additive: layers richer, scroll-driven motion onto big media + headings
   without disturbing the existing pinned-scrub showcases or reveal system.
   Skipped entirely under reduced motion or if the library failed to load.
--------------------------------------------------------------------------- */
function initGsap() {
  if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // A) The hero content lifts away as you scroll past it (transform only — an
  // opacity tween here fights the children's entrance-reveal transitions).
  const hero = document.querySelector(".hero");
  const heroInner = document.querySelector(".hero-inner");
  if (hero && heroInner) {
    gsap.to(heroInner, {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 },
    });
  }

  // B) Big media blocks wipe open with a clip-path reveal as they arrive.
  const wipeTargets = document.querySelectorAll(
    ".feature-project-media, .project-split-media, .channel-avatar, .service-card, .hcard-media, .media-frame, .resume-preview"
  );
  wipeTargets.forEach((el) => {
    gsap.fromTo(el,
      { clipPath: "inset(11% 6% 11% 6%)", opacity: 0.5 },
      {
        clipPath: "inset(0% 0% 0% 0%)", opacity: 1, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", end: "top 52%", scrub: 0.8 },
      }
    );
  });

  // C) Section titles drift with depth as they pass through the viewport.
  const driftTargets = document.querySelectorAll(
    ".section-heading h2, .statement-band h2, .about-statement, .analytics-head h2, .feature-project-copy h2, .hgallery-head h2"
  );
  driftTargets.forEach((el) => {
    gsap.fromTo(el, { yPercent: 9 }, {
      yPercent: -9, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 },
    });
  });

  window.ScrollTrigger.refresh();
}

// GSAP is loaded via deferred CDN scripts before main.js. Run the setup once
// the entrance reveals have settled, so ScrollTrigger.refresh()'s style recalc
// can't freeze an in-progress reveal transition.
function bootGsap() {
  if (document.readyState === "complete") window.setTimeout(initGsap, 1300);
  else window.addEventListener("load", () => window.setTimeout(initGsap, 1300));
}
bootGsap();
