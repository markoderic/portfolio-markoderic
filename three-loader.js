// Only pull in the heavy Three.js bundle when the device can actually use it.
// The `webgl` class is added by an inline head script after feature-detecting
// WebGL + a large-enough, motion-OK viewport.
if (document.documentElement.classList.contains("webgl")) {
  import("./three-app.js").catch((err) => {
    // If anything fails, drop back to the CSS fallbacks (phone + flat name).
    console.error("3D scene failed to load:", err);
    document.documentElement.classList.remove("webgl");
  });
}
