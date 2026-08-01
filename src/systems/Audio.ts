let ctx: AudioContext | null = null;
let filter: BiquadFilterNode | null = null;
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

let oggBuffers: Record<string, AudioBuffer> = {};
let rawBuffers: Record<string, ArrayBuffer> = {};
let bgmSource: AudioBufferSourceNode | null = null;
let _initialized = false;

/* GainNode pool — reuse instead of GC thrash during heavy sfx */
const GAIN_POOL_SIZE = 24;
let gainPool: GainNode[] = [];
let gainPoolIdx = 0;

/* Pre-rendered noise buffer — no per-call allocation */
let noiseBuf: AudioBuffer | null = null;

function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const sr = c.sampleRate;
    noiseBuf = c.createBuffer(1, sr * 0.5, sr);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

async function loadOgg(key: string, path: string): Promise<void> {
  try {
    const resp = await fetch(path);
    rawBuffers[key] = await resp.arrayBuffer();
  } catch { /* fallback to procedural */ }
}

async function decodePending(): Promise<void> {
  if (!ctx) return;
  for (const [key, buf] of Object.entries(rawBuffers)) {
    if (oggBuffers[key]) continue;
    try {
      oggBuffers[key] = await ctx.decodeAudioData(buf);
    } catch { /* skip */ }
  }
}

export async function loadAudioAssets(): Promise<void> {
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, '');
  const p = (f: string) => base + '/assets/audio/' + f;
  await Promise.all([
    loadOgg('bgm', p('sci_fi_platformer02.ogg')),
    loadOgg('beam', p('beam.ogg')),
    loadOgg('explosion', p('explosion.ogg')),
    loadOgg('hurt', p('hurt.ogg')),
  ]);
}

function playOgg(key: string, volume = 1, playbackRate = 1): boolean {
  const buf = oggBuffers[key];
  if (!buf) return false;
  try {
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const g = getPoolGain();
    g.gain.value = volume;
    src.connect(g);
    src.start();
    return true;
  } catch { return false; }
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 22000;
    filter.Q.value = 0.5;
    filter.connect(ctx.destination);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 1;
    bgmGain.connect(filter);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1;
    sfxGain.connect(filter);

    /* Pre-allocate gain node pool */
    for (let i = 0; i < GAIN_POOL_SIZE; i++) {
      gainPool.push(ctx.createGain());
    }
  }
  return ctx;
}

function getPoolGain(): GainNode {
  const g = gainPool[gainPoolIdx];
  gainPoolIdx = (gainPoolIdx + 1) % GAIN_POOL_SIZE;
  /* Drop stale connections so overlapping sounds don't modulate each other */
  g.gain.value = 0;
  g.disconnect();
  g.connect(getOut());
  return g;
}

function getOut(): AudioNode { getCtx(); return sfxGain!; }

function tone(freq: number, dur: number, type: OscillatorType, vol: number): void {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = getPoolGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    o.start(); o.stop(c.currentTime + dur);
  } catch {}
}

/* Scheduled tone — pause-safe arpeggios without setTimeout */
function toneAt(freq: number, dur: number, type: OscillatorType, vol: number, at: number): void {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = getPoolGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = c.currentTime + at;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    o.start(t0); o.stop(t0 + dur);
  } catch {}
}

function noiseBurst(duration: number, startFreq: number, endFreq: number, vol: number): void {
  try {
    const c = getCtx();
    const buf = getNoiseBuffer(c);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 1;
    const offset = Math.random() * (buf.duration - duration);
    const nf = c.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(startFreq, c.currentTime);
    nf.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
    const ng = getPoolGain();
    ng.gain.setValueAtTime(vol, c.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(nf); nf.connect(ng);
    src.start(c.currentTime, offset, duration);
    src.stop(c.currentTime + duration);
  } catch {}
}

/* ── BGM ── */
let bgmPlaying = false;
let bgmTimer: ReturnType<typeof setInterval> | null = null;
const bgmOscs: OscillatorNode[] = [];

function bgmCleanup(): void {
  bgmOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
  bgmOscs.length = 0;
  if (bgmTimer !== null) { clearInterval(bgmTimer); bgmTimer = null; }
  if (bgmSource) { try { bgmSource.stop(); bgmSource.disconnect(); } catch {} bgmSource = null; }
}

let _sfxMuted = false;
let _bgmMuted = false;

export const Audio = {
  init(): void {
    if (_initialized) return;
    _initialized = true;
    getCtx();
    decodePending();
  },
  setOverclock(active: boolean): void {
    try {
      getCtx();
      if (active) {
        filter!.Q.setTargetAtTime(8, ctx!.currentTime, 0.05);
        filter!.frequency.setTargetAtTime(18000, ctx!.currentTime, 0.05);
      } else {
        filter!.Q.setTargetAtTime(0.5, ctx!.currentTime, 0.1);
        filter!.frequency.setTargetAtTime(22000, ctx!.currentTime, 0.1);
      }
    } catch {}
  },
  jump: () => {
    if (!playOgg('beam', 0.3, 1.5))
      tone(520, 0.12, 'square', 0.06);
  },
  dblJump: () => {
    if (!playOgg('beam', 0.25, 2.0))
      { tone(700, 0.08, 'square', 0.05); tone(900, 0.08, 'sine', 0.04); }
  },
  coin: () => {
    toneAt(880, 0.06, 'sine', 0.07, 0);
    toneAt(1100, 0.06, 'sine', 0.05, 0.06);
  },
  powerup: () => {
    [660, 880, 1100, 1320].forEach((f, i) => toneAt(f, 0.1, 'sine', 0.06, i * 0.05));
  },
  hit: () => {
    if (!playOgg('hurt'))
      { noiseBurst(0.15, 2000, 200, 0.12); tone(180, 0.12, 'square', 0.04); }
  },
  die: () => {
    if (!playOgg('explosion', 0.6))
      { noiseBurst(0.3, 3000, 80, 0.15); toneAt(200, 0.15, 'sawtooth', 0.06, 0.05); toneAt(120, 0.2, 'sawtooth', 0.06, 0.15); }
  },
  stomp: () => {
    noiseBurst(0.1, 500, 80, 0.15);
    tone(130, 0.12, 'square', 0.06);
  },
  nearMiss: () => {
    noiseBurst(0.07, 6000, 1500, 0.05);
    toneAt(1500, 0.06, 'sine', 0.03, 0);
    toneAt(1900, 0.08, 'sine', 0.02, 0.04);
  },
  combo: (n: number) => {
    const base = 660 + Math.min(n, 10) * 40;
    toneAt(base, 0.08, 'sine', 0.06, 0);
    toneAt(base * 1.25, 0.1, 'sine', 0.05, 0.05);
  },
  setFilter(cutoff: number): void {
    try { getCtx(); filter!.frequency.setTargetAtTime(cutoff, ctx!.currentTime, 0.05); } catch {}
  },

  get sfxMuted(): boolean { return _sfxMuted; },
  get bgmMuted(): boolean { return _bgmMuted; },

  setSfxMuted(muted: boolean): void {
    _sfxMuted = muted;
    try { getCtx(); sfxGain!.gain.value = muted ? 0 : 1; } catch {}
  },

  setBgmMuted(muted: boolean): void {
    _bgmMuted = muted;
    try { getCtx(); bgmGain!.gain.value = muted ? 0 : 1; } catch {}
  },

  startBGM(): void {
    if (bgmPlaying) return;
    bgmPlaying = true;

    /* Try .ogg BGM first */
    const buf = oggBuffers['bgm'];
    if (buf) {
      try {
        const c = getCtx();
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(bgmGain!);
        src.start();
        bgmSource = src;
        return;
      } catch {}
    }

    /* Fallback: procedural synthwave */
    const c = getCtx();
    const bgmOut = bgmGain!;

    const chordFreqs = [220, 261.63, 329.63];
    chordFreqs.forEach(freq => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      g.gain.value = 0.012;
      o.connect(g);

      const pf = c.createBiquadFilter();
      pf.type = 'lowpass';
      pf.frequency.value = 350;
      pf.Q.value = 1.5;
      g.connect(pf); pf.connect(bgmOut);
      o.start();
      bgmOscs.push(o);

      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 0.15 + Math.random() * 0.1;
      lfoG.gain.value = 120;
      lfo.connect(lfoG); lfoG.connect(pf.frequency);
      lfo.start();
      bgmOscs.push(lfo);
    });

    const bass = c.createOscillator();
    const bassG = c.createGain();
    bass.type = 'square';
    bass.frequency.value = 55;
    bassG.gain.value = 0.035;
    bass.connect(bassG);
    const bf = c.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.value = 160;
    bassG.connect(bf); bf.connect(bgmOut);
    bass.start();
    bgmOscs.push(bass);

    const arpNotes = [440, 523.25, 659.25, 783.99, 659.25, 523.25];
    let arpIdx = 0;
    const arp = c.createOscillator();
    const arpG = c.createGain();
    arp.type = 'triangle';
    arp.frequency.value = arpNotes[0];
    arpG.gain.value = 0.02;
    const af = c.createBiquadFilter();
    af.type = 'lowpass';
    af.frequency.value = 2500;
    arp.connect(arpG); arpG.connect(af); af.connect(bgmOut);
    arp.start();
    bgmOscs.push(arp);

    bgmTimer = setInterval(() => {
      arpIdx = (arpIdx + 1) % arpNotes.length;
      arp.frequency.setTargetAtTime(arpNotes[arpIdx], c.currentTime, 0.02);
      arpG.gain.setTargetAtTime(0.025, c.currentTime, 0.01);
      arpG.gain.setTargetAtTime(0.001, c.currentTime + 0.15, 0.05);
    }, 170);
  },

  stopBGM(): void {
    bgmPlaying = false;
    bgmCleanup();
  },

  duckBGM(): void {
    try {
      const c = getCtx();
      bgmGain!.gain.setTargetAtTime(0.15, c.currentTime, 0.02);
      bgmGain!.gain.setTargetAtTime(1, c.currentTime + 0.2, 0.15);
    } catch {}
  },
};
