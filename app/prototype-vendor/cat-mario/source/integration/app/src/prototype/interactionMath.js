export const desktopIds = [
  "finder",
  "premiere",
  "vscode",
  "xcode",
  "notch",
  "youtube",
  "preview",
  "mail",
  "catmario",
];
export function clampIcon(p, size) {
  return {
    x: Math.max(4, Math.min(p.x, size.width - 84)),
    y: Math.max(36, Math.min(p.y, size.height - 144)),
  };
}
export function arrangeIcons(size) {
  const rows = Math.max(1, Math.floor((size.height - 186) / 86) + 1);
  return Object.fromEntries(
    desktopIds.map((id, i) => [
      id,
      clampIcon(
        {
          x: size.width - 92 - Math.floor(i / rows) * 88,
          y: 42 + (i % rows) * 86,
        },
        size,
      ),
    ]),
  );
}
export function crossedDragThreshold(start, point, pointerType, elapsed) {
  return (
    Math.hypot(point.x - start.x, point.y - start.y) >=
      (pointerType === "touch" ? 10 : 5) &&
    (pointerType !== "touch" || elapsed >= 180)
  );
}
export function interpolateBounds(from, to, t) {
  const k = 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  return Object.fromEntries(
    ["x", "y", "w", "h"].map((key) => [
      key,
      from[key] + (to[key] - from[key]) * k,
    ]),
  );
}
