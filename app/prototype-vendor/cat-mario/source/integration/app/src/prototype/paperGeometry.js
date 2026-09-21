import { PRINTER } from "./sceneScale.js";
export const PAPER_WIDTH = 1.8774;
export const PAPER_HEIGHT = PAPER_WIDTH * 11 / 8.5;
export function fitPaper(size) {
  const height = Math.max(
    1,
    Math.min(size.height - 150, (size.width - 48) / (8.5 / 11)),
  );
  return { width: (height * 8.5) / 11, height };
}
export function paperFeedPosition(progress) {
  const z = PRINTER.slotZ * PRINTER.scale - PAPER_HEIGHT/2 + Math.max(0,Math.min(1,progress))*PAPER_HEIGHT;
  return [Math.sin(PRINTER.rotation)*z+PRINTER.position[0], PRINTER.position[1]+PRINTER.sheetY*PRINTER.scale, Math.cos(PRINTER.rotation)*z+PRINTER.position[2]];
}
