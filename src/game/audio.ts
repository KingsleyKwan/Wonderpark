let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let music: GainNode | null = null;
let sfx: GainNode | null = null;
let musicTimer = 0;
let muted = false;
let musicOn = true;

export function isMuted() {
  return muted;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    music = ctx.createGain();
    sfx = ctx.createGain();
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = 0.7;
    music.gain.value = 0.18;
    sfx.gain.value = 0.55;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(v: boolean) {
  muted = v;
  if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.7, ctx.currentTime, 0.04);
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.12, decay = 0.08) {
  if (!ctx || !sfx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g);
  g.connect(sfx);
  o.start();
  o.stop(ctx.currentTime + dur + decay);
}

export function sfxPlace() {
  beep(420, 0.06, "square", 0.07);
  beep(640, 0.08, "triangle", 0.05);
}

export function sfxDemolish() {
  beep(140, 0.12, "sawtooth", 0.08);
}

export function sfxClick() {
  beep(880, 0.04, "square", 0.04);
}

export function sfxCash() {
  beep(660, 0.05, "triangle", 0.06);
  beep(990, 0.08, "triangle", 0.05);
}

export function sfxScream() {
  if (!ctx || !sfx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(420, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.4);
  g.gain.setValueAtTime(0.05, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
  o.connect(g);
  g.connect(sfx);
  o.start();
  o.stop(ctx.currentTime + 0.5);
}

export function sfxBreak() {
  beep(90, 0.2, "square", 0.1);
  beep(70, 0.25, "sawtooth", 0.07);
}

export function tickMusic(dt: number) {
  if (!ctx || !music || muted || !musicOn) return;
  musicTimer += dt;
  if (musicTimer < 0.45) return;
  musicTimer = 0;
  const scale = [196, 247, 294, 330, 392, 330, 294, 247];
  const i = Math.floor(ctx.currentTime * 2.2) % scale.length;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = scale[i]!;
  g.gain.setValueAtTime(0.045, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  o.connect(g);
  g.connect(music);
  o.start();
  o.stop(ctx.currentTime + 0.42);
}

export function onVisibility() {
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (!muted) void ctx.resume();
  });
}
