import { desktopWorkArea } from './desktopWorkArea.js';
// Canvas480×420; border-box outer borders + existing30px titlebar.
export const GAME_CHROME = Object.freeze({ width: 2, height: 32 });
const ratio = 480 / 420;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
export function fitGameBounds(bounds, size, chrome = GAME_CHROME) {
  const a = desktopWorkArea(size), max = Math.max(0, Math.min(a.w - chrome.width, (a.h - chrome.height) * ratio));
  const content = clamp(Math.min(bounds.w - chrome.width, (bounds.h - chrome.height) * ratio), Math.min(260, max), max);
  const w = Math.min(a.w, content + chrome.width), h = Math.min(a.h, content / ratio + chrome.height);
  return { x: clamp(bounds.x, a.x, a.x + a.w - w), y: clamp(bounds.y, a.y, a.y + a.h - h), w, h };
}
export function gameWindowBounds(size, chrome = GAME_CHROME, largest = false) {
  const a = desktopWorkArea(size), b = fitGameBounds({ x: a.x, y: a.y, w: largest ? a.w : 480 + chrome.width, h: largest ? a.h : 420 + chrome.height }, size, chrome);
  return { ...b, x: a.x + (a.w - b.w) / 2, y: a.y + (a.h - b.h) / 2 };
}
export function resizeGameBounds(start, edge, dx, dy, size, chrome = GAME_CHROME) {
  const a = desktopWorkArea(size), b = fitGameBounds(start, size, chrome), west = edge.includes('w'), north = edge.includes('n');
  const right = b.x + b.w, bottom = b.y + b.h;
  const horizontal = /[ew]/.test(edge), vertical = /[ns]/.test(edge);
  const deltaX = west ? -dx : dx, deltaY = (north ? -dy : dy) * ratio;
  const delta = horizontal && (!vertical || Math.abs(deltaX) >= Math.abs(deltaY)) ? deltaX : deltaY;
  const max = Math.max(0, Math.min((west ? right - a.x : a.x + a.w - b.x) - chrome.width, ((north ? bottom - a.y : a.y + a.h - b.y) - chrome.height) * ratio));
  const content = clamp(b.w - chrome.width + delta, Math.min(260, b.w - chrome.width, max), max);
  const w = Math.min(a.w, content + chrome.width), h = Math.min(a.h, content / ratio + chrome.height);
  return { x: west ? right - w : b.x, y: north ? bottom - h : b.y, w, h };
}
