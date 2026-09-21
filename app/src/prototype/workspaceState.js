export const routeMap = {
  projects: "finder",
  about: "finder",
  experience: "finder",
  resume: "preview",
  contact: "mail",
  film: "premiere",
  portfolio: "vscode",
  notch: "xcode",
  animalfeed: "youtube",
  controls: "controls",
};
const apps = new Set([
  "finder",
  "premiere",
  "vscode",
  "xcode",
  "youtube",
  "preview",
  "mail",
  "controls",
  "catmario",
]);
export function resolveRoute(hash = "", search = "") {
  // Retain links from the earlier HashRouter portfolio as well as workspace links.
  const id = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const simple = new URLSearchParams(search).has("simple");
  const paper = ["resume", "paper", "printer"].includes(id);
  const app = paper ? null : routeMap[id] || (apps.has(id) ? id : null);
  return {
    view: paper
      ? "paper"
      : id === "phone"
        ? "phone"
        : app || id === "laptop" || simple
          ? "laptop"
          : "desk",
    app,
    bypass: !!(app || paper || id === "phone" || id === "laptop") || simple,
  };
}
export function printFraction(start, now) {
  return Math.max(0, Math.min(1, (now - start) / 2000));
}
