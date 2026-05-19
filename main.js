const body = document.body;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const themeButtons = document.querySelectorAll("[data-theme-option]");
const storedTheme = (() => {
  try {
    return localStorage.getItem("portfolio-theme");
  } catch {
    return null;
  }
})();

function setTheme(theme, persist = true) {
  if (!theme) return;

  body.dataset.theme = theme;

  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === theme));
  });

  if (persist) {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      // Local storage can be unavailable in private or restricted browsing modes.
    }
  }
}

setTheme(storedTheme || body.dataset.theme || "prism", false);

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(button.dataset.themeOption);
  });
});

const onceRevealElements = document.querySelectorAll(".once-reveal");
const projectRevealElements = document.querySelectorAll(".project-card.reveal");

if ("IntersectionObserver" in window) {
  const onceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        onceObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.16
  });

  onceRevealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
    onceObserver.observe(element);
  });

  const projectObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("visible", entry.isIntersecting);
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px"
  });

  projectRevealElements.forEach((element) => {
    projectObserver.observe(element);
  });
} else {
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.add("visible");
  });
}

const glow = document.querySelector(".cursor-glow");
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let glowX = mouseX;
let glowY = mouseY;

if (glow && !prefersReducedMotion) {
  window.addEventListener("pointermove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }, {
    passive: true
  });

  function animateGlow() {
    glowX += (mouseX - glowX) * 0.075;
    glowY += (mouseY - glowY) * 0.075;

    glow.style.left = `${glowX}px`;
    glow.style.top = `${glowY}px`;

    requestAnimationFrame(animateGlow);
  }

  animateGlow();
}

const parallaxItems = document.querySelectorAll(".parallax");
let tickingParallax = false;

function updateParallax() {
  const scrollY = window.scrollY;

  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.speed || 0.04);
    item.style.setProperty("--parallax-y", `${scrollY * speed}px`);
  });

  tickingParallax = false;
}

if (!prefersReducedMotion && parallaxItems.length) {
  window.addEventListener("scroll", () => {
    if (!tickingParallax) {
      requestAnimationFrame(updateParallax);
      tickingParallax = true;
    }
  }, {
    passive: true
  });

  updateParallax();
}

const topBar = document.querySelector(".top-bar");
let navHoverTimeout;

function showTopBar() {
  if (!topBar) return;

  topBar.classList.remove("nav-hidden");
  clearTimeout(navHoverTimeout);

  if (window.scrollY > 120) {
    navHoverTimeout = setTimeout(() => {
      topBar.classList.add("nav-hidden");
    }, 1800);
  }
}

function hideTopBar() {
  if (topBar && window.scrollY > 120) {
    topBar.classList.add("nav-hidden");
  }
}

if (topBar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY <= 70) {
      topBar.classList.remove("nav-hidden");
    } else {
      clearTimeout(navHoverTimeout);
      topBar.classList.add("nav-hidden");
    }
  }, {
    passive: true
  });

  window.addEventListener("pointermove", (event) => {
    if (event.clientY <= 105) {
      showTopBar();
    }
  }, {
    passive: true
  });

  topBar.addEventListener("mouseenter", showTopBar);

  topBar.addEventListener("mouseleave", () => {
    if (window.scrollY > 120) {
      navHoverTimeout = setTimeout(hideTopBar, 350);
    }
  });

  window.addEventListener("touchstart", (event) => {
    if (event.touches[0] && event.touches[0].clientY <= 105) {
      showTopBar();
    }
  }, {
    passive: true
  });
}

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const projectCards = document.querySelectorAll(".project-card");
let tickingProjects = false;

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function resetProjectStack() {
  projectCards.forEach((card) => {
    card.style.setProperty("--stack-y", "0px");
    card.style.setProperty("--stack-scale", "1");
    card.style.setProperty("--card-opacity", "1");
    card.style.setProperty("--veil", "0");
    card.style.zIndex = "";
  });
}

function updateProjectStack() {
  if (window.innerWidth < 961 || prefersReducedMotion) {
    resetProjectStack();
    tickingProjects = false;
    return;
  }

  const viewportHeight = window.innerHeight;
  const progressValues = Array.from(projectCards).map((card) => {
    const rect = card.getBoundingClientRect();
    const start = viewportHeight * 0.94;
    const end = viewportHeight * 0.2;
    const rawProgress = (start - rect.top) / (start - end);
    return smoothStep(Math.min(Math.max(rawProgress, 0), 1));
  });

  projectCards.forEach((card, index) => {
    const progress = progressValues[index] || 0;
    const nextProgress = progressValues[index + 1] || 0;
    const takeover = smoothStep(Math.min(Math.max((nextProgress - 0.08) / 0.86, 0), 1));
    const y = (1 - progress) * 18 - takeover * 18;
    const scale = 0.985 + progress * 0.015 - takeover * 0.035;
    const opacity = Math.max(0.22, (0.88 + progress * 0.12) * (1 - takeover * 0.74));

    card.style.setProperty("--stack-y", `${y.toFixed(2)}px`);
    card.style.setProperty("--stack-scale", scale.toFixed(3));
    card.style.setProperty("--card-opacity", opacity.toFixed(3));
    card.style.setProperty("--veil", takeover.toFixed(3));
    card.style.zIndex = `${20 + index}`;
  });

  tickingProjects = false;
}

function requestProjectStackUpdate() {
  if (!tickingProjects) {
    requestAnimationFrame(updateProjectStack);
    tickingProjects = true;
  }
}

if (projectCards.length) {
  window.addEventListener("scroll", requestProjectStackUpdate, {
    passive: true
  });
  window.addEventListener("resize", requestProjectStackUpdate);
  updateProjectStack();
}

if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
  projectCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 7;
      const rotateX = ((0.5 - (y / rect.height)) * 6);

      card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--shine-x", `${((x / rect.width) * 100).toFixed(1)}%`);
      card.style.setProperty("--shine-y", `${((y / rect.height) * 100).toFixed(1)}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--shine-x", "50%");
      card.style.setProperty("--shine-y", "50%");
    });
  });

  document.querySelectorAll(".button, .resume-nav-button, .theme-swatch, .contact-link").forEach((item) => {
    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      item.style.setProperty("--magnet-x", `${(x * 0.08).toFixed(2)}px`);
      item.style.setProperty("--magnet-y", `${(y * 0.1).toFixed(2)}px`);
    });

    item.addEventListener("pointerleave", () => {
      item.style.setProperty("--magnet-x", "0px");
      item.style.setProperty("--magnet-y", "0px");
    });
  });
}

const resumeModal = document.getElementById("resumeModal");
const resumeOpenButtons = document.querySelectorAll("[data-open-resume]");
const resumeCloseButtons = document.querySelectorAll("[data-close-resume]");

function openResumeModal() {
  if (!resumeModal) return;

  resumeModal.classList.add("open");
  resumeModal.setAttribute("aria-hidden", "false");
  body.classList.add("resume-locked");
}

function closeResumeModal() {
  if (!resumeModal) return;

  resumeModal.classList.remove("open");
  resumeModal.setAttribute("aria-hidden", "true");
  body.classList.remove("resume-locked");
}

resumeOpenButtons.forEach((button) => {
  button.addEventListener("click", openResumeModal);
});

resumeCloseButtons.forEach((button) => {
  button.addEventListener("click", closeResumeModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && resumeModal && resumeModal.classList.contains("open")) {
    closeResumeModal();
  }
});
