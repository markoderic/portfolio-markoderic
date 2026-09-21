// Display-local border-box geometry, before the screen's CSS projection.
export const DESKTOP_CHROME = Object.freeze({ menuHeight: 28, dockHeight: 56, dockBottom: 9, gap: 6 });
export function desktopWorkArea(size) {
  const width = Math.max(0, size.width || 0), height = Math.max(0, size.height || 0);
  const top = Math.min(height, Math.max(0, size.chrome?.menuBottom ?? DESKTOP_CHROME.menuHeight));
  const inset = Math.max(0, size.chrome?.dockInset ?? DESKTOP_CHROME.dockHeight + DESKTOP_CHROME.dockBottom);
  const bottom = Math.max(top, height - inset - DESKTOP_CHROME.gap);
  return { x: 0, y: top, w: width, h: bottom - top };
}
export function measureDesktopChrome(menu, dock, size) {
  // offset* includes actual border/padding without transformed screen coordinates.
  if (!menu?.offsetHeight || !dock?.offsetHeight || size.height <= 0) return null;
  return { menuBottom: menu.offsetTop + menu.offsetHeight, dockInset: Math.max(0, size.height - dock.offsetTop) };
}
