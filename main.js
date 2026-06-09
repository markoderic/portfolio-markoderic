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
  if (desktopNav.matches) {
    navRoot.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
  } else {
    navRoot.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
}
syncNavMode();
desktopNav.addEventListener("change", syncNavMode);

if (navToggle && navRoot) {
  navToggle.addEventListener("click", () => {
    if (desktopNav.matches) return;
    const isOpen = navRoot.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
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

function syncHeader() {
  if (!siteHeader) return;
  const y = window.scrollY;
  const navOpen = navRoot && navRoot.classList.contains("open") && !desktopNav.matches;
  if (y > 240 && y > lastScroll && !navOpen) {
    siteHeader.classList.add("is-hidden");
  } else {
    siteHeader.classList.remove("is-hidden");
  }
  if (y > 30) siteHeader.classList.add("is-scrolled");
  else siteHeader.classList.remove("is-scrolled");
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

function openModal(modal) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  body.classList.add("modal-locked");
  if (lenis) lenis.stop();
  const focusTarget = modal.querySelector("input, select, textarea, button, a");
  if (focusTarget) focusTarget.focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".modal.open")) {
    body.classList.remove("modal-locked");
    if (lenis) lenis.start();
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

resumeOpenButtons.forEach((b) => b.addEventListener("click", () => openModal(resumeModal)));
resumeCloseButtons.forEach((b) => b.addEventListener("click", () => closeModal(resumeModal)));
projectOpenButtons.forEach((b) => b.addEventListener("click", () => openModal(projectModal)));
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
