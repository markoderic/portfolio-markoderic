const body = document.body;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------------------
   Page loader with count-up
--------------------------------------------------------------------------- */
const loader = document.querySelector(".page-loader");
const loaderBar = document.querySelector(".loader-track span");
const loaderCount = document.querySelector("[data-loader-count]");

function runLoader(done) {
  if (prefersReducedMotion) {
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

window.addEventListener("load", () => {
  runLoader(() => {
    body.classList.add("site-ready");
    body.classList.remove("is-loading");
    window.setTimeout(() => loader && loader.setAttribute("hidden", ""), 900);
  });
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

// Intercept in-page anchor links so they use the smooth scroller.
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

// Load Lenis from CDN; if it fails the site still scrolls natively.
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

// Stagger children within any [data-stagger] group for a cascading reveal.
document.querySelectorAll("[data-stagger]").forEach((group) => {
  group.querySelectorAll("[data-reveal]").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 90, 540)}ms`;
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
   About statement — word-by-word lighting
--------------------------------------------------------------------------- */
const aboutStatement = document.querySelector("[data-reveal-words]");
if (aboutStatement && !prefersReducedMotion) {
  const words = aboutStatement.textContent.trim().split(/\s+/);
  aboutStatement.textContent = "";
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    span.style.transitionDelay = `${index * 28}ms`;
    aboutStatement.appendChild(span);
    aboutStatement.appendChild(document.createTextNode(" "));
  });

  if ("IntersectionObserver" in window) {
    const wordObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          aboutStatement.classList.add("lit");
          wordObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    wordObserver.observe(aboutStatement);
  } else {
    aboutStatement.classList.add("lit");
  }
}

/* ---------------------------------------------------------------------------
   Navigation
--------------------------------------------------------------------------- */
const navRoot = document.querySelector("[data-nav-root]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navTriggers = document.querySelectorAll("[data-nav-trigger]");
const navLinks = document.querySelectorAll(".nav-panel a, .nav-panel button");
const desktopNav = window.matchMedia("(min-width: 1101px)");

function syncNavMode() {
  if (!navRoot || !navToggle) return;
  navRoot.classList.toggle("open", desktopNav.matches);
  navToggle.setAttribute("aria-expanded", String(desktopNav.matches));
}

syncNavMode();
desktopNav.addEventListener("change", syncNavMode);

if (navToggle && navRoot) {
  navToggle.addEventListener("click", () => {
    const isOpen = navRoot.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function closeAllNavItems() {
  document.querySelectorAll(".nav-item.active").forEach((item) => {
    item.classList.remove("active");
    const trigger = item.querySelector("[data-nav-trigger]");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}

navTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const item = trigger.closest(".nav-item");
    const wasActive = item && item.classList.contains("active");
    closeAllNavItems();
    if (item && !wasActive) {
      item.classList.add("active");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    closeAllNavItems();
    if (navRoot && navToggle && !desktopNav.matches) {
      navRoot.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
});

document.addEventListener("click", (event) => {
  if (navRoot && !navRoot.contains(event.target)) {
    closeAllNavItems();
  }
});

/* ---------------------------------------------------------------------------
   Header auto-hide + floating action
--------------------------------------------------------------------------- */
const siteHeader = document.querySelector(".site-header");
const floatingAction = document.querySelector(".floating-action");
const floatingActionBlockers = document.querySelectorAll(
  ".feature-project, .project-split, .media-section, .about-band, .profile-section, .channel-section, .contact-section, .site-footer"
);

let lastScroll = 0;

function syncFloatingAction() {
  if (!floatingAction) return;
  const actionY = window.innerHeight - 72;
  const isBlocked = Array.from(floatingActionBlockers).some((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= actionY && rect.bottom >= actionY;
  });
  const shouldShow = window.scrollY > window.innerHeight * 0.6;
  floatingAction.classList.toggle("visible", shouldShow && !isBlocked);
}

function syncHeader() {
  if (!siteHeader) return;
  const y = window.scrollY;
  const navOpen = navRoot && navRoot.classList.contains("open") && !desktopNav.matches;
  if (y > 240 && y > lastScroll && !navOpen) {
    siteHeader.classList.add("is-hidden");
  } else {
    siteHeader.classList.remove("is-hidden");
  }
  lastScroll = y;
}

/* ---------------------------------------------------------------------------
   Hero parallax (scroll) + pointer 3D motion
--------------------------------------------------------------------------- */
const heroShots = document.querySelectorAll(".hero-shot");
const parallaxEls = document.querySelectorAll("[data-parallax]");
const imgParallaxEls = document.querySelectorAll("[data-img-parallax]");

function applyParallax() {
  if (prefersReducedMotion) return;
  const y = window.scrollY;
  parallaxEls.forEach((el) => {
    const speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
    el.style.setProperty("--scroll-y", `${(y * speed).toFixed(1)}px`);
  });

  // Cover-image parallax: image drifts as its frame moves through the viewport.
  const vh = window.innerHeight;
  imgParallaxEls.forEach((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > vh + 200) return;
    const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // ~ -1..1
    const shift = Math.max(-6, Math.min(6, progress * -8));
    img.style.transform = `translateY(${shift.toFixed(2)}%) scale(1.16)`;
  });
}

function onScroll() {
  syncFloatingAction();
  syncHeader();
  applyParallax();
}

syncFloatingAction();
applyParallax();
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", syncFloatingAction);

let targetPointerX = 0;
let targetPointerY = 0;
let currentPointerX = 0;
let currentPointerY = 0;
let pointerTicking = false;

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

if (!prefersReducedMotion && finePointer) {
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
const marqueeTrack = document.querySelector("[data-marquee]");
if (marqueeTrack && !prefersReducedMotion) {
  let offset = 0;
  let half = marqueeTrack.scrollWidth / 2;
  window.addEventListener("resize", () => { half = marqueeTrack.scrollWidth / 2; });

  const speed = 0.6;
  function animateMarquee() {
    offset -= speed;
    if (Math.abs(offset) >= half) offset = 0;
    marqueeTrack.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(animateMarquee);
  }
  requestAnimationFrame(animateMarquee);
}

/* ---------------------------------------------------------------------------
   Custom cursor + magnetic buttons
--------------------------------------------------------------------------- */
const cursor = document.querySelector("[data-cursor]");
const magneticEls = document.querySelectorAll("[data-magnetic]");

if (cursor && finePointer && !prefersReducedMotion) {
  // Hide the OS cursor so there's no double cursor.
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
    // Dot tracks the pointer instantly — feels precise, no lag.
    if (dot) dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
  }, { passive: true });

  window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("active"));

  function renderCursor() {
    // Ring eases behind for a smooth, premium trail.
    rx += (tx - rx) * 0.35;
    ry += (ty - ry) * 0.35;
    if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  const hoverTargets = document.querySelectorAll(
    "a, button, .service-card, [data-magnetic], .resume-preview"
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
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

/* ---------------------------------------------------------------------------
   Tilt cards (subtle 3D on media/service cards)
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
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
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
