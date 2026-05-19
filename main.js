const body = document.body;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px"
  });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 45, 260)}ms`;
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const floatingAction = document.querySelector(".floating-action");
const floatingActionBlockers = document.querySelectorAll(".statement-band, .work-list, .profile-section, .contact-section, .site-footer");

function syncFloatingAction() {
  if (!floatingAction) return;

  const actionY = window.innerHeight - 72;
  const isBlocked = Array.from(floatingActionBlockers).some((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= actionY && rect.bottom >= actionY;
  });
  const shouldShow = window.scrollY > window.innerHeight * 0.55;
  floatingAction.classList.toggle("visible", shouldShow && !isBlocked);
}

syncFloatingAction();
window.addEventListener("scroll", syncFloatingAction, { passive: true });
window.addEventListener("resize", syncFloatingAction);

const heroShots = document.querySelectorAll(".hero-shot");
let pointerX = 0;
let pointerY = 0;
let heroTicking = false;

function updateHeroMotion() {
  heroShots.forEach((shot, index) => {
    const depth = (index + 1) * 0.55;
    shot.style.setProperty("--pointer-x", `${pointerX * depth}px`);
    shot.style.setProperty("--pointer-y", `${pointerY * depth}px`);
    shot.style.translate = `var(--pointer-x, 0px) var(--pointer-y, 0px)`;
  });

  heroTicking = false;
}

if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    pointerX = ((event.clientX / window.innerWidth) - 0.5) * 14;
    pointerY = ((event.clientY / window.innerHeight) - 0.5) * 10;

    if (!heroTicking) {
      requestAnimationFrame(updateHeroMotion);
      heroTicking = true;
    }
  }, { passive: true });
}

const resumeModal = document.getElementById("resumeModal");
const resumeOpenButtons = document.querySelectorAll("[data-open-resume]");
const resumeCloseButtons = document.querySelectorAll("[data-close-resume]");
let lastFocusedElement = null;

function openResumeModal() {
  if (!resumeModal) return;

  lastFocusedElement = document.activeElement;
  resumeModal.classList.add("open");
  resumeModal.setAttribute("aria-hidden", "false");
  body.classList.add("resume-locked");

  const closeButton = resumeModal.querySelector("[data-close-resume]");
  if (closeButton) {
    closeButton.focus();
  }
}

function closeResumeModal() {
  if (!resumeModal) return;

  resumeModal.classList.remove("open");
  resumeModal.setAttribute("aria-hidden", "true");
  body.classList.remove("resume-locked");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
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
