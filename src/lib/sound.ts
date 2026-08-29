const MUTE_KEY = "huepot_mute";

export type SoundKind = "click" | "pot" | "take" | "urgent" | "round" | "fog";

let ctx: AudioContext | null = null;
let muted = false;
let urgentTimer = 0;
const muteListeners = new Set<(value: boolean) => void>();

function readMute() {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
}

function writeMute() {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  for (const listener of muteListeners) listener(muted);
}

function audio() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function onMuteChange(listener: (value: boolean) => void) {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

export function unlockSound() {
  if (typeof window === "undefined") return;
  readMute();
  const node = audio();
  if (node.state === "suspended") void node.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  writeMute();
  if (muted) stopUrgent();
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

function hexToFreq(color?: string) {
  if (!color) return 640;
  const raw = color.replace("#", "");
  const n = Number.parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
  if (!Number.isFinite(n)) return 640;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 500 + ((r * 3 + g * 5 + b) % 380);
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
  slide?: number,
) {
  const node = audio();
  const start = node.currentTime + delay;
  const osc = node.createOscillator();
  const amp = node.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(node.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export function playFx(kind: SoundKind, color?: string) {
  if (typeof window === "undefined" || muted) return;
  unlockSound();
  if (kind === "click") {
    const freq = hexToFreq(color);
    tone(freq, 0.07, "triangle", 0.07);
    tone(freq * 2.02, 0.05, "sine", 0.04, 0.018);
    buzz(12);
    return;
  }
  if (kind === "pot") {
    tone(523, 0.09, "triangle", 0.055);
    tone(659, 0.11, "triangle", 0.05, 0.06);
    tone(784, 0.16, "sine", 0.06, 0.12);
    return;
  }
  if (kind === "take") {
    stopUrgent();
    tone(110, 0.32, "sine", 0.09);
    tone(55, 0.4, "triangle", 0.05, 0.02);
    tone(392, 0.16, "triangle", 0.08, 0.08);
    tone(523, 0.18, "triangle", 0.07, 0.16);
    tone(659, 0.26, "sine", 0.08, 0.26);
    tone(784, 0.42, "sine", 0.07, 0.4);
    buzz([28, 40, 18, 50, 28]);
    return;
  }
  if (kind === "urgent") {
    tone(196, 0.1, "triangle", 0.045);
    tone(147, 0.14, "sine", 0.035, 0.06);
    return;
  }
  if (kind === "fog") {
    tone(196, 0.18, "sine", 0.03);
    tone(147, 0.28, "triangle", 0.025, 0.08);
    return;
  }
  tone(698, 0.1, "sine", 0.045);
  tone(880, 0.16, "sine", 0.04, 0.08);
}

export function beginUrgent() {
  stopUrgent();
  playFx("urgent");
  if (typeof window === "undefined") return;
  urgentTimer = window.setInterval(() => playFx("urgent"), 1000);
}

export function stopUrgent() {
  if (!urgentTimer) return;
  window.clearInterval(urgentTimer);
  urgentTimer = 0;
}

if (typeof window !== "undefined") readMute();
