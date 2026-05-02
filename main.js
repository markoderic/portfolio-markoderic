const onceRevealElements = document.querySelectorAll(".once-reveal");
const projectRevealElements = document.querySelectorAll(".project-card.reveal");

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
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    } else {
      entry.target.classList.remove("visible");
    }
  });
}, {
  threshold: 0.22,
  rootMargin: "0px 0px -10% 0px"
});

projectRevealElements.forEach((element) => {
  element.style.transitionDelay = "0ms";
  projectObserver.observe(element);
});

const glow = document.querySelector(".cursor-glow");

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let glowX = mouseX;
let glowY = mouseY;

window.addEventListener("mousemove", (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
});

function animateGlow() {
  glowX += (mouseX - glowX) * 0.08;
  glowY += (mouseY - glowY) * 0.08;

  glow.style.left = `${glowX}px`;
  glow.style.top = `${glowY}px`;

  requestAnimationFrame(animateGlow);
}

animateGlow();

const parallaxItems = document.querySelectorAll(".parallax");

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;

  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.speed || 0.05);
    item.style.transform = `translateY(${scrollY * speed}px)`;
  });
}, {
  passive: true
});


const topBar = document.querySelector(".top-bar");
let navHoverTimeout;

function showTopBar() {
  topBar.classList.remove("nav-hidden");
  clearTimeout(navHoverTimeout);

  if (window.scrollY > 120) {
    navHoverTimeout = setTimeout(() => {
      topBar.classList.add("nav-hidden");
    }, 1800);
  }
}

function hideTopBar() {
  if (window.scrollY > 120) {
    topBar.classList.add("nav-hidden");
  }
}

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

document.getElementById("year").textContent = new Date().getFullYear();


const projectCards = document.querySelectorAll(".project-card");

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function updateProjectStack() {
  const viewportHeight = window.innerHeight;

  const progressValues = Array.from(projectCards).map((card) => {
    const rect = card.getBoundingClientRect();

    // Longer range and less movement = smoother, less cluttered overlap.
    const start = viewportHeight * 0.96;
    const end = viewportHeight * 0.22;
    const rawProgress = (start - rect.top) / (start - end);
    const clamped = Math.min(Math.max(rawProgress, 0), 1);

    return smoothStep(clamped);
  });

  projectCards.forEach((card, index) => {
    const progress = progressValues[index];
    const nextProgress = progressValues[index + 1] || 0;

    // Earlier but gentler fade so previous cards recede before they look messy.
    const nextTakeover = smoothStep(Math.min(Math.max((nextProgress - 0.12) / 0.78, 0), 1));

    const y = (1 - progress) * 24 - nextTakeover * 18;
    const scale = 0.99 + progress * 0.01 - nextTakeover * 0.035;
    const rotate = 0;
    const opacity = Math.max(0.16, (0.88 + progress * 0.12) * (1 - nextTakeover * 0.82));

    card.style.setProperty("--stack-progress", progress.toFixed(3));
    card.style.setProperty("--takeover-fade", nextTakeover.toFixed(3));
    card.style.transform = `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`;
    card.style.opacity = `${opacity}`;
    card.style.pointerEvents = nextTakeover > 0.72 ? "none" : "auto";
    card.style.zIndex = `${20 + index}`;
  });
}

window.addEventListener("scroll", updateProjectStack, { passive: true });
window.addEventListener("resize", updateProjectStack);
updateProjectStack();


const resumeModal = document.getElementById("resumeModal");
const resumeOpenButtons = document.querySelectorAll("[data-open-resume]");
const resumeCloseButtons = document.querySelectorAll("[data-close-resume]");

function openResumeModal() {
  resumeModal.classList.add("open");
  resumeModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("resume-locked");
}

function closeResumeModal() {
  resumeModal.classList.remove("open");
  resumeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("resume-locked");
}

resumeOpenButtons.forEach((button) => {
  button.addEventListener("click", openResumeModal);
});

resumeCloseButtons.forEach((button) => {
  button.addEventListener("click", closeResumeModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && resumeModal.classList.contains("open")) {
    closeResumeModal();
  }
});
