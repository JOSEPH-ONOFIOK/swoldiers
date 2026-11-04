// Small synth sound effects, so the game ships without audio files.
import type { GameEvent } from "./sim";

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
export const sound = { on: true };

export function unlockAudio() {
  ctx ??= new AudioContext();
  void ctx.resume();
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
}

function tone(freq: number, end: number, time: number, vol: number, type: OscillatorType = "square") {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(end, t + time);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + time);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(t + time);
}

function hiss(time: number, vol: number, cutoff: number) {
  if (!ctx || !noise) return;
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(), t = ctx.currentTime;
  s.buffer = noise;
  f.type = "lowpass";
  f.frequency.value = cutoff;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + time);
  s.connect(f).connect(g).connect(ctx.destination);
  s.start();
  s.stop(t + time);
}

const SFX: Record<GameEvent, () => void> = {
  shot: () => hiss(0.06, 0.08, 2600),
  shotgun: () => (hiss(0.18, 0.22, 1800), tone(120, 50, 0.12, 0.1)),
  boom: () => (hiss(0.4, 0.3, 700), tone(90, 30, 0.35, 0.18)),
  pickup: () => tone(880, 1320, 0.06, 0.035),
  hurt: () => tone(190, 80, 0.13, 0.09, "sawtooth"),
  kill: () => tone(240, 90, 0.08, 0.04),
  wave: () => tone(330, 495, 0.2, 0.06),
  chopper: () => (tone(440, 660, 0.14, 0.07), hiss(0.5, 0.08, 400)),
  reload: () => tone(600, 300, 0.05, 0.04),
  heal: () => tone(520, 1040, 0.22, 0.06, "triangle"),
  flex: () => tone(110, 330, 0.3, 0.1),
  dead: () => tone(300, 40, 0.8, 0.14, "sawtooth"),
  extract: () => tone(440, 1320, 0.5, 0.1),
};

let last: Partial<Record<GameEvent, number>> = {};
export function play(events: GameEvent[]) {
  if (!sound.on || !ctx) return;
  const now = performance.now();
  for (const e of events) {
    if (now - (last[e] ?? 0) < 45) continue; // a burst of the same sound just gets loud
    last[e] = now;
    SFX[e]();
  }
}
export function resetSfx() {
  last = {};
}
