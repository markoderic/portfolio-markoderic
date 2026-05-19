const body = document.body;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const loader = document.querySelector(".page-loader");

window.addEventListener("load", () => {
  window.setTimeout(() => {
    body.classList.add("site-ready");
    body.classList.remove("is-loading");
  }, prefersReducedMotion ? 0 : 900);

  window.setTimeout(() => {
    if (loader) {
      loader.setAttribute("hidden", "");
    }
  }, prefersReducedMotion ? 0 : 1700);
});

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

navTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const item = trigger.closest(".nav-item");
    const wasActive = item && item.classList.contains("active");

    document.querySelectorAll(".nav-item.active").forEach((activeItem) => {
      activeItem.classList.remove("active");
      const activeTrigger = activeItem.querySelector("[data-nav-trigger]");
      if (activeTrigger) {
        activeTrigger.setAttribute("aria-expanded", "false");
      }
    });

    if (item && !wasActive) {
      item.classList.add("active");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-item.active").forEach((item) => {
      item.classList.remove("active");
      const trigger = item.querySelector("[data-nav-trigger]");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    if (navRoot && navToggle && !desktopNav.matches) {
      navRoot.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
});

document.addEventListener("click", (event) => {
  if (navRoot && !navRoot.contains(event.target)) {
    document.querySelectorAll(".nav-item.active").forEach((item) => {
      item.classList.remove("active");
      const trigger = item.querySelector("[data-nav-trigger]");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }
});

const floatingAction = document.querySelector(".floating-action");
const floatingActionBlockers = document.querySelectorAll(".feature-project, .project-split, .media-section, .profile-section, .channel-section, .contact-section, .site-footer");

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

syncFloatingAction();
window.addEventListener("scroll", syncFloatingAction, { passive: true });
window.addEventListener("resize", syncFloatingAction);

const heroShots = document.querySelectorAll(".hero-shot");
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

if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    targetPointerX = (event.clientX / window.innerWidth) - 0.5;
    targetPointerY = (event.clientY / window.innerHeight) - 0.5;

    if (!pointerTicking) {
      requestAnimationFrame(updatePointerMotion);
      pointerTicking = true;
    }
  }, { passive: true });
}

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

  const focusTarget = modal.querySelector("input, select, textarea, button, a");
  if (focusTarget) {
    focusTarget.focus();
  }
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal.open")) {
    body.classList.remove("modal-locked");
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

resumeOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openModal(resumeModal));
});

resumeCloseButtons.forEach((button) => {
  button.addEventListener("click", () => closeModal(resumeModal));
});

projectOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openModal(projectModal));
});

projectCloseButtons.forEach((button) => {
  button.addEventListener("click", () => closeModal(projectModal));
});

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

  if (type) {
    formStatus.classList.add(type);
  }
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
        headers: {
          Accept: "application/json"
        }
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
