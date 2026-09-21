let context;
let unlocking;
const unlockListeners = new Set();
export const getSoundContext = () => context;
export const subscribeSoundUnlock = (listener) => {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
};
let printerStop = () => {};
let lastClick = -Infinity;
export async function unlockSound() {
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state !== "running") {
      unlocking ||= context.resume().finally(() => {
        unlocking = null;
      });
      await unlocking;
    }
    if (context.state !== "running") return false;
    for (const listener of unlockListeners) listener();
    return true;
  } catch {
    return false;
  }
}
// Every deliberate sound awaits the gesture's resume promise. No hover/scroll audio.
export async function playSound(kind, preferences, owned) {
  if (preferences.muted || !preferences.volume || !(await unlockSound()))
    return;
  if (owned) {
    if (!owned.valid()) return;
    preferences = owned.read();
    if (preferences.muted || !preferences.volume) return;
  }
  if (kind === "click" && !owned?.deduplicated) {
    if (context.currentTime - lastClick < 0.085) return;
    lastClick = context.currentTime;
  }
  const duration = kind === "lamp" ? 0.085 : 0.038;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate;
    const noise = Math.random() * 2 - 1;
    // Lamp: two mechanical detents and a resonant body. Trackpad: dry high tap.
    data[i] =
      kind === "lamp"
        ? noise *
            (Math.exp(-t * 180) +
              (t > 0.018 ? 0.65 * Math.exp(-(t - 0.018) * 210) : 0)) +
          Math.sin(t * 2 * Math.PI * 640) * Math.exp(-t * 65) * 0.42
        : noise * Math.exp(-t * 300) * 0.6 +
          Math.sin(t * 2 * Math.PI * 2100) * Math.exp(-t * 190) * 0.28;
  }
  return startBuffer(
    buffer,
    preferences.volume * (kind === "lamp" ? 0.25 : 0.17),
    kind === "lamp" ? 2600 : 4800,
  );
}
function startBuffer(buffer, volume, frequency, offset = 0, duration) {
  const source = context.createBufferSource(),
    gain = context.createGain(),
    filter = context.createBiquadFilter();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(context.destination);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  if (offset > 0) {
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.setTargetAtTime(volume, context.currentTime, 0.005);
  }
  if (duration === undefined) source.start();
  else source.start(context.currentTime, offset, duration);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(0, context.currentTime, 0.015);
    source.stop(context.currentTime + 0.07);
  };
}
// Starts with a live feed frame; a delayed unlock joins its remaining interval.
// Mechanical motor, pulsed rollers and short engagement/release transients.
export function startPrinterSound(preferences, progress = 0) {
  printerStop();
  if (
    !context ||
    context.state !== "running" ||
    preferences.muted ||
    !preferences.volume || !Number.isFinite(progress) || progress < 0 || progress >= 1
  )
    return null;
  const duration = 2.08;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate;
    const envelope = Math.min(1, t / 0.045, (duration - t) / 0.1);
    const roller = 0.65 + 0.35 * Math.sin(2 * Math.PI * 13 * t);
    const motor =
      Math.sin(2 * Math.PI * 125 * t) * 0.32 +
      Math.sin(2 * Math.PI * 251 * t) * 0.13;
    const mechanism =
      (Math.random() * 2 - 1) *
      (0.22 * roller +
        0.45 * Math.exp(-t * 28) +
        0.3 * Math.exp(-Math.abs(t - 1.92) * 65));
    data[i] = (motor * roller + mechanism) * envelope;
  }
  printerStop = startBuffer(buffer, preferences.volume * 0.28, 1500, progress * 2, (1 - progress) * 2);
  return printerStop;
}
