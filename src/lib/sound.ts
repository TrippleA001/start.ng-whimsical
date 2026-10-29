/**
 * Three cues, no generative pad: warp (the dive), tick (focus / step),
 * launch (card → player). Everything is synthesised — no audio files.
 *
 * The AudioContext is only created on the first cue, which always follows a
 * real user gesture (the category click), so autoplay policy is never tested.
 */

export type Cue = "warp" | "tick" | "launch" | "back";

const KEY = "startng-whimsical-sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

try {
  const stored = window.localStorage.getItem(KEY);
  if (stored === "off") enabled = false;
} catch {
  /* storage blocked — keep the default */
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(ac: AudioContext, seconds: number) {
  const length = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  return src;
}

function cue(c: Cue) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac || !master) return;
  const now = ac.currentTime;

  if (c === "tick") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1760, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.12);
    return;
  }

  if (c === "back") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.24);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.34);
    return;
  }

  const dur = c === "warp" ? 0.85 : 0.62;
  const src = noise(ac, dur + 0.1);
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  filter.type = "bandpass";
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(c === "warp" ? 220 : 400, now);
  filter.frequency.exponentialRampToValueAtTime(
    c === "warp" ? 3600 : 1500,
    now + dur * 0.45,
  );
  filter.frequency.exponentialRampToValueAtTime(180, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(c === "warp" ? 0.5 : 0.34, now + 0.09);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(now);
  src.stop(now + dur + 0.05);

  const sub = ac.createOscillator();
  const subGain = ac.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(c === "warp" ? 150 : 220, now);
  sub.frequency.exponentialRampToValueAtTime(42, now + dur * 0.8);
  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.exponentialRampToValueAtTime(0.3, now + 0.06);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.95);
  sub.connect(subGain).connect(master);
  sub.start(now);
  sub.stop(now + dur);
}

export const sound = {
  play: cue,
  get enabled() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    try {
      window.localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch {
      /* storage blocked — the choice applies for this session */
    }
    return enabled;
  },
};
