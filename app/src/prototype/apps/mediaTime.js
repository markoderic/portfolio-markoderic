// ffprobe of the supplied export reports r_frame_rate = avg_frame_rate = 60/1.
export const FILM_FPS = 60;
export function timecode(seconds, fps = FILM_FPS) {
  const f = Math.floor(Math.max(0, seconds || 0) * fps + 1e-7);
  return [
    Math.floor(f / (fps * 3600)),
    Math.floor(f / (fps * 60)) % 60,
    Math.floor(f / fps) % 60,
    f % fps,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
