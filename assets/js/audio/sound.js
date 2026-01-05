/**
 * Sound Module
 * [STEP 7] This module has been updated to support multiple audio formats.
 * For production builds, it is recommended to convert .wav files to .ogg or .mp3
 * to reduce file size. The code will automatically prioritize and fall back.
 */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = new AudioCtx();

const masterGain = actx.createGain();
masterGain.connect(actx.destination);
let isAudioGloballyEnabled = true;

// [STEP 7] Sound format fallback logic
const SOUND_EXT_CANDIDATES = ['ogg', 'mp3', 'wav'];
const soundMap = {
  'get_score': './assets/sounds/stage/get_score',
  'get_coin': './assets/sounds/stage/get_coin',
  'collect_item': './assets/sounds/stage/collect_item',
  'move_Dash': './assets/sounds/player/move_Dash'
};
const resolvedSoundUrls = new Map();
const SPEED_AUDIO = {
  ready: false,
  windSrc: null,
  windFilter: null,
  windGain: null,
  whineOsc: null,
  whineGain: null,
  lastPulseAt: 0
};
const BGM_THEME_MAP = {
  DEFAULT: 'neon_base',
  NEON_BASE: 'neon_base',
  NEON_CITY: 'neon_city',
  CIRCUIT: 'neon_base',
  GLITCH: 'glitch',
  VOID: 'void',
  SUNSET: 'sunset',
  STORM: 'storm',
  TUTORIAL: 'tutorial'
};
const BGM_THEMES = {
  neon_base: {
    tempo: 118,
    root: 196,
    scale: [0, 3, 5, 7, 10],
    patterns: [
      [0, 2, 4, 2, 1, 2, 4, 2, 0, 2, 4, 2, 1, 2, 3, 2],
      [0, -1, 2, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1, 1, -1]
    ],
    variantSemis: [0, 2, 4],
    pad: [0, 7, 12],
    wave: 'triangle',
    padWave: 'sine',
    padGain: 0.08,
    noteGain: 0.12,
    filter: 12000
  },
  neon_city: {
    tempo: 124,
    root: 220,
    scale: [0, 2, 4, 7, 9],
    patterns: [
      [0, 2, 4, 2, 0, 3, 4, 3, 0, 2, 4, 2, 1, 3, 4, 3],
      [0, -1, 2, -1, 4, -1, 3, -1, 0, -1, 2, -1, 4, -1, 1, -1]
    ],
    variantSemis: [0, 2, 5],
    pad: [0, 4, 7],
    wave: 'triangle',
    padWave: 'sine',
    padGain: 0.07,
    noteGain: 0.12,
    filter: 12000
  },
  glitch: {
    tempo: 132,
    root: 233.08,
    scale: [0, 1, 5, 6, 10],
    patterns: [
      [0, 3, 1, 3, 2, 4, 1, 4, 0, 3, 1, 3, 2, 4, 1, 4],
      [0, -1, 4, -1, 1, -1, 3, -1, 2, -1, 4, -1, 1, -1, 0, -1]
    ],
    variantSemis: [0, 1, -1],
    pad: [0, 6, 12],
    wave: 'square',
    padWave: 'triangle',
    padGain: 0.06,
    noteGain: 0.1,
    filter: 9000,
    glitchChance: 0.35
  },
  void: {
    tempo: 84,
    root: 174.61,
    scale: [0, 3, 5, 7, 10],
    patterns: [
      [0, -1, 2, -1, 0, -1, 3, -1, 0, -1, 2, -1, 1, -1, 2, -1],
      [0, -1, 0, -1, 2, -1, 0, -1, 3, -1, 0, -1, 2, -1, 1, -1]
    ],
    variantSemis: [0, -2, -4],
    pad: [0, 7, 12],
    wave: 'sine',
    padWave: 'triangle',
    padGain: 0.07,
    noteGain: 0.09,
    filter: 7000
  },
  sunset: {
    tempo: 100,
    root: 261.63,
    scale: [0, 2, 4, 7, 9],
    patterns: [
      [0, 2, 4, 2, 1, 2, 4, 2, 0, 2, 4, 2, 1, 2, 3, 2],
      [0, -1, 2, -1, 4, -1, 2, -1, 0, -1, 2, -1, 3, -1, 1, -1]
    ],
    variantSemis: [0, 2, 4],
    pad: [0, 4, 9],
    wave: 'sine',
    padWave: 'sine',
    padGain: 0.08,
    noteGain: 0.11,
    filter: 12000
  },
  storm: {
    tempo: 136,
    root: 196,
    scale: [0, 3, 5, 6, 10],
    patterns: [
      [0, 2, 4, 2, 0, 3, 4, 3, 0, 2, 4, 2, 0, 3, 4, 3],
      [0, 2, 4, 2, 1, 2, 4, 2, 0, 2, 4, 2, 1, 2, 3, 2]
    ],
    variantSemis: [0, 3, 5],
    pad: [0, 5, 10],
    wave: 'triangle',
    padWave: 'triangle',
    padGain: 0.06,
    noteGain: 0.13,
    filter: 11000,
    pulse: true
  },
  tutorial: {
    tempo: 96,
    root: 220,
    scale: [0, 3, 5, 7, 10],
    patterns: [
      [0, -1, 2, -1, 0, -1, 2, -1, 0, -1, 3, -1, 0, -1, 2, -1]
    ],
    variantSemis: [0],
    pad: [0, 7, 12],
    wave: 'sine',
    padWave: 'sine',
    padGain: 0.07,
    noteGain: 0.1,
    filter: 10000
  }
};
const BGM_STATE = {
  active: false,
  themeId: null,
  stageId: null,
  nextNoteTime: 0,
  stepIndex: 0,
  tempo: 120,
  stepDur: 0.125,
  pattern: [],
  scale: [],
  rootFreq: 220,
  wave: 'triangle',
  padWave: 'sine',
  padIntervals: [0, 7, 12],
  padGain: 0.06,
  noteGain: 0.1,
  filterCutoff: 12000,
  glitchChance: 0,
  pulse: false,
  loopSteps: 16
};

function noteFreq(root, semitone) {
  return root * Math.pow(2, semitone / 12);
}

function buildScale(root, scale) {
  if (!Array.isArray(scale) || scale.length === 0) return [root];
  return scale.map((semi) => noteFreq(root, semi));
}

function resolveBgmTheme(stageConfig) {
  const paletteId = stageConfig?.theme?.paletteId ?? 'NEON_BASE';
  const mapped = BGM_THEME_MAP[String(paletteId).toUpperCase()] ?? 'neon_base';
  const themeId = String(mapped).toLowerCase();
  const theme = BGM_THEMES[themeId] ?? BGM_THEMES.neon_base;
  const stageId = stageConfig?.id ?? 1;
  const variantIndex = (stageId - 1) % (theme.patterns?.length ?? 1);
  const variantSemis = theme.variantSemis ?? [0];
  const rootShift = variantSemis[variantIndex % variantSemis.length] ?? 0;
  const root = noteFreq(theme.root ?? 220, rootShift);
  const tempo = (theme.tempo ?? 120) + (stageConfig?.isLoop ? 6 : 0);
  const pattern = theme.patterns?.[variantIndex] ?? theme.patterns?.[0] ?? [];
  return { themeId, theme, stageId, root, tempo, pattern };
}

async function resolveSoundUrl(name) {
  if (resolvedSoundUrls.has(name)) {
    return resolvedSoundUrls.get(name);
  }
  const basePath = soundMap[name];
  if (!basePath) {
    console.error(`[Sound] Unknown sound name in map: ${name}`);
    return null;
  }

  for (const ext of SOUND_EXT_CANDIDATES) {
    const url = `${basePath}.${ext}`;
    try {
      // Use HEAD request to check for file existence without downloading it
      const response = await fetch(url, { method: 'HEAD', cache: 'reload' });
      if (response.ok) {
        console.log(`[Sound] Resolved and cached sound '${name}' to '${url}'`);
        resolvedSoundUrls.set(name, url);
        return url;
      }
    } catch (e) {
      // This can happen due to network errors or CORS, continue to next candidate
    }
  }

  // If no new formats are found, fall back to the original .wav and cache it
  const fallbackUrl = `${basePath}.wav`;
  console.warn(`[Sound] Could not find .ogg or .mp3 for '${name}', falling back to ${fallbackUrl}`);
  resolvedSoundUrls.set(name, fallbackUrl);
  return fallbackUrl;
}


// Simple clip pool for <audio> elements
const clipPool = new Map(); // path -> Array<HTMLAudioElement>

function getPooledClip(path) {
  let pool = clipPool.get(path);
  if (!pool) {
    pool = [];
    clipPool.set(path, pool);
  }
  const reusable = pool.find(a => a.paused || a.ended);
  if (reusable) {
    reusable.currentTime = 0;
    return reusable;
  }
  if (pool.length < 3) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.muted = !isAudioGloballyEnabled; // Sync with global state
    pool.push(audio);
    return audio;
  }
  const fallback = pool[0];
  fallback.currentTime = 0;
  return fallback;
}

function createNoiseBuffer() {
  const buffer = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

var Sound = window.Sound = {
  // Core play method for Web Audio API sounds
  play(freq, type, dur = 0.1, gainScale = 1) {
    if (!isAudioGloballyEnabled) return;
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    try {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, actx.currentTime);
      const baseGain = 0.12 * (window.qaConfig?.sfxVol ?? 1) * gainScale;
      gain.gain.setValueAtTime(baseGain, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      osc.connect(gain);
      gain.connect(masterGain); // Route through masterGain
      osc.start();
      osc.stop(actx.currentTime + dur);
    } catch (e) {}
  },

  ensureSpeedAudio() {
    if (SPEED_AUDIO.ready) return;
    try {
      const windSrc = actx.createBufferSource();
      windSrc.buffer = createNoiseBuffer();
      windSrc.loop = true;

      const windFilter = actx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 800;

      const windGain = actx.createGain();
      windGain.gain.value = 0;

      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(masterGain);
      windSrc.start();

      const whineOsc = actx.createOscillator();
      whineOsc.type = 'sine';
      whineOsc.frequency.value = 600;

      const whineGain = actx.createGain();
      whineGain.gain.value = 0;

      whineOsc.connect(whineGain);
      whineGain.connect(masterGain);
      whineOsc.start();

      SPEED_AUDIO.windSrc = windSrc;
      SPEED_AUDIO.windFilter = windFilter;
      SPEED_AUDIO.windGain = windGain;
      SPEED_AUDIO.whineOsc = whineOsc;
      SPEED_AUDIO.whineGain = whineGain;
      SPEED_AUDIO.ready = true;
    } catch (e) {
      console.warn('[Sound] Speed audio init failed', e);
    }
  },

  updateSpeedFeedback(speedRatio, nowSec, gameState, STATE) {
    if (!isAudioGloballyEnabled) return;
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    this.ensureSpeedAudio();
    if (!SPEED_AUDIO.ready) return;

    const sr = Math.max(0, Math.min(1.2, speedRatio || 0));
    const isActive = !STATE || gameState !== STATE.STOP;
    const isRun = !STATE || gameState === STATE.RUN;

    let windTarget = 0;
    let windCutoff = 800;
    let whineTarget = 0;
    let whineFreq = 600;

    if (isActive) {
      const w = Math.max(0, Math.min(1, (sr - 0.45) / 0.55));
      const smooth = w * w * (3 - 2 * w);
      windTarget = (0.22 * smooth) * (window.qaConfig?.sfxVol ?? 1);
      windCutoff = 800 + 3200 * smooth;

      const a = Math.max(0, Math.min(1, (sr - 0.6) / 0.35));
      whineTarget = (0.12 * a) * (window.qaConfig?.sfxVol ?? 1);
      if (STATE && gameState === STATE.WARNING) {
        whineTarget *= 0.6;
      }
      whineFreq = 600 + 900 * a;
    }

    if (sr < 0.08) {
      windTarget = 0;
      whineTarget = 0;
    }

    const now = actx.currentTime;
    SPEED_AUDIO.windGain.gain.setTargetAtTime(windTarget, now, 0.08);
    SPEED_AUDIO.windFilter.frequency.setTargetAtTime(windCutoff, now, 0.08);
    SPEED_AUDIO.whineGain.gain.setTargetAtTime(whineTarget, now, 0.08);
    SPEED_AUDIO.whineOsc.frequency.setTargetAtTime(whineFreq, now, 0.08);

    if (isRun && sr > 1.0 && nowSec !== undefined) {
      const extra = Math.min(0.2, sr - 1.0);
      const interval = 0.6 - 0.25 * (extra / 0.2);
      if (nowSec >= (SPEED_AUDIO.lastPulseAt + interval)) {
        this.play(220 + 120 * sr, 'sine', 0.06, 0.18);
        SPEED_AUDIO.lastPulseAt = nowSec;
      }
    }
  },

  // [STEP 7] Updated to be async and use the URL resolver
  async playClip(name, volume) {
    if (!isAudioGloballyEnabled) return;
    const url = await resolveSoundUrl(name);
    if (!url) {
        console.error(`[Sound] Could not resolve sound URL for name: ${name}`);
        return;
    }
    
    try {
      const audio = getPooledClip(url);
      audio.volume = volume ?? window.qaConfig?.sfxVol ?? 1;
      audio.play().catch((e) => { /* Errors are expected if user hasn't interacted */ });
    } catch (e) {
      console.error(`[Sound] Error playing clip: ${url}`, e);
    }
  },

  // [STEP 7] Updated to be async
  async sfx(type) {
    switch (type) {
      case 'coin': await this.playClip('get_coin', window.qaConfig?.coinSfxVol); break;
      case 'bit': case 'gem': await this.playClip('get_score', window.qaConfig?.scoreSfxVol); break;
      case 'item': await this.playClip('collect_item', window.qaConfig?.itemSfxVol); break;
      case 'dash': await this.playClip('move_Dash', window.qaConfig?.dashSfxVol); break;
      case 'jump': this.play(200, 'sawtooth', 0.15); break;
      case 'die': this.play(100, 'sawtooth', 0.5); break;
      case 'alert': this.play(1200, 'square', 0.1); break;
      case 'btn': this.play(400, 'sine', 0.1); break;
      case 'boost_ready': this.playChord([880, 1100, 1320], 'sine', 0.15, 0.12); break;
      case 'boost_perfect': this.playArpeggio([523, 659, 784, 1047], 'square', 0.08, 0.15); break;
      case 'boost_rush': this.playBoostRush(); break;
      case 'jfb_active': this.playArpeggio([1760, 2093, 2637], 'sine', 0.03, 0.12); break;
      case 'jfb_fail': this.playChord([220, 277], 'sawtooth', 0.25, 0.15); break;
      case 'slowmo_enter': this.playSlowMoEnter(); break;
      case 'booster_pickup': this.playBoosterPickup(); break;
    }
  },

  playChord(freqs, type, dur = 0.1, vol = 0.1) {
    if (!isAudioGloballyEnabled) return;
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    try {
      const baseVol = vol * (window.qaConfig?.sfxVol ?? 1);
      freqs.forEach(freq => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(baseVol / freqs.length, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(actx.currentTime + dur);
      });
    } catch (e) {}
  },

  playArpeggio(freqs, type, interval = 0.05, dur = 0.1) {
    if (!isAudioGloballyEnabled) return;
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    try {
      const baseVol = 0.12 * (window.qaConfig?.sfxVol ?? 1);
      freqs.forEach((freq, i) => {
        const startTime = actx.currentTime + i * interval;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(baseVol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + dur);
      });
    } catch (e) {}
  },

  playBoostRush() { /* Complex sounds should be refactored to connect to masterGain */ },
  playSlowMoEnter() { /* Complex sounds should be refactored to connect to masterGain */ },
  playBoosterPickup() { /* Complex sounds should be refactored to connect to masterGain */ },

  _bgmGain: null,
  _bgmBus: null,
  _bgmFilter: null,
  _bgmPadGain: null,
  _bgmPadOscs: null,
  _bgmTimer: null,
  _bgmTargetVol: 0.15,
  _ensureBgmNodes() {
    if (!this._bgmGain) {
      this._bgmGain = actx.createGain();
      this._bgmGain.gain.value = (window.qaConfig?.bgmVol ?? 0.15);
      this._bgmTargetVol = this._bgmGain.gain.value;
      this._bgmGain.connect(masterGain);
    }
    if (!this._bgmFilter) {
      this._bgmFilter = actx.createBiquadFilter();
      this._bgmFilter.type = 'lowpass';
      this._bgmFilter.frequency.value = BGM_STATE.filterCutoff;
      this._bgmFilter.Q.value = 0.2;
      this._bgmFilter.connect(this._bgmGain);
    }
    if (!this._bgmBus) {
      this._bgmBus = actx.createGain();
      this._bgmBus.gain.value = 1.0;
      this._bgmBus.connect(this._bgmFilter);
    }
    if (!this._bgmPadGain) {
      this._bgmPadGain = actx.createGain();
      this._bgmPadGain.gain.value = 0;
      this._bgmPadGain.connect(this._bgmBus);
    }
    if (!this._bgmPadOscs) {
      this._bgmPadOscs = [];
      for (let i = 0; i < 3; i++) {
        const osc = actx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 220;
        osc.connect(this._bgmPadGain);
        osc.start();
        this._bgmPadOscs.push(osc);
      }
    }
  },
  _playBgmTone(time, freq, type, dur, gain) {
    if (!this._bgmBus) return;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(this._bgmBus);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  },
  _applyBgmTheme(themeId, theme, options = {}) {
    this._ensureBgmNodes();
    const now = actx.currentTime;
    const pattern = options.pattern ?? theme.patterns?.[0] ?? [];
    const rootFreq = options.rootFreq ?? theme.root ?? 220;
    const tempo = options.tempo ?? theme.tempo ?? 120;

    BGM_STATE.themeId = themeId;
    BGM_STATE.stageId = options.stageId ?? BGM_STATE.stageId;
    BGM_STATE.pattern = pattern;
    BGM_STATE.loopSteps = Math.max(1, pattern.length || 16);
    BGM_STATE.rootFreq = rootFreq;
    BGM_STATE.scale = buildScale(rootFreq, theme.scale ?? [0, 3, 5, 7, 10]);
    BGM_STATE.tempo = tempo;
    BGM_STATE.stepDur = 60 / Math.max(30, tempo) / 4;
    BGM_STATE.wave = theme.wave ?? 'triangle';
    BGM_STATE.padWave = theme.padWave ?? 'sine';
    BGM_STATE.padIntervals = theme.pad ?? [0, 7, 12];
    BGM_STATE.padGain = theme.padGain ?? 0.06;
    BGM_STATE.noteGain = theme.noteGain ?? 0.1;
    BGM_STATE.filterCutoff = theme.filter ?? 12000;
    BGM_STATE.glitchChance = theme.glitchChance ?? 0;
    BGM_STATE.pulse = theme.pulse === true;
    BGM_STATE.stepIndex = 0;
    BGM_STATE.nextNoteTime = Math.max(BGM_STATE.nextNoteTime, now + 0.05);

    if (this._bgmFilter) {
      this._bgmFilter.frequency.setTargetAtTime(BGM_STATE.filterCutoff, now, 0.2);
    }
    if (this._bgmPadGain) {
      this._bgmPadGain.gain.setTargetAtTime(BGM_STATE.padGain, now, 0.2);
    }
    if (Array.isArray(this._bgmPadOscs)) {
      for (let i = 0; i < this._bgmPadOscs.length; i++) {
        const osc = this._bgmPadOscs[i];
        const interval = BGM_STATE.padIntervals[i % BGM_STATE.padIntervals.length] ?? 0;
        const target = noteFreq(BGM_STATE.rootFreq, interval);
        osc.type = BGM_STATE.padWave;
        osc.frequency.setTargetAtTime(target, now, 0.2);
        osc.detune.setTargetAtTime((i - 1) * 3, now, 0.2);
      }
    }
    if (this._bgmGain) {
      const target = this._bgmTargetVol ?? (window.qaConfig?.bgmVol ?? 0.15);
      this._bgmGain.gain.setTargetAtTime(target * 0.7, now, 0.12);
      this._bgmGain.gain.setTargetAtTime(target, now + 0.25, 0.18);
    }
  },
  _scheduleBgmStep(time, stepIndex) {
    const pattern = BGM_STATE.pattern;
    if (!pattern || pattern.length === 0) return;
    const raw = pattern[stepIndex % pattern.length];
    if (raw !== null && raw !== undefined && raw >= 0) {
      const idx = raw % BGM_STATE.scale.length;
      let freq = BGM_STATE.scale[idx] ?? BGM_STATE.rootFreq;
      if (BGM_STATE.glitchChance > 0 && Math.random() < BGM_STATE.glitchChance) {
        const shift = Math.random() < 0.5 ? -1 : 1;
        freq *= Math.pow(2, shift / 12);
      }
      this._playBgmTone(time, freq, BGM_STATE.wave, BGM_STATE.stepDur * 0.9, BGM_STATE.noteGain);
    }
    if (BGM_STATE.pulse && stepIndex % 8 === 0) {
      const bass = noteFreq(BGM_STATE.rootFreq, -12);
      this._playBgmTone(time, bass, 'sine', BGM_STATE.stepDur * 0.6, BGM_STATE.noteGain * 0.6);
    }
  },
  bgmTick() {
    if (!BGM_STATE.active) return;
    const currentTime = actx.currentTime;
    const lookahead = 0.12;
    while (BGM_STATE.nextNoteTime < currentTime + lookahead) {
      this._scheduleBgmStep(BGM_STATE.nextNoteTime, BGM_STATE.stepIndex);
      BGM_STATE.nextNoteTime += BGM_STATE.stepDur;
      BGM_STATE.stepIndex = (BGM_STATE.stepIndex + 1) % BGM_STATE.loopSteps;
    }
  },
  bgmSetTheme(themeId) {
    if (!themeId) return;
    const upper = String(themeId).toUpperCase();
    const mapped = BGM_THEME_MAP[upper] ?? themeId;
    const key = String(mapped).toLowerCase();
    const theme = BGM_THEMES[key] ?? BGM_THEMES.neon_base;
    if (BGM_STATE.themeId === key) return;
    this._applyBgmTheme(key, theme, {
      stageId: null,
      pattern: theme.patterns?.[0] ?? [],
      rootFreq: theme.root ?? 220,
      tempo: theme.tempo ?? 120
    });
  },
  bgmSetStage(stageConfig) {
    if (!stageConfig) return;
    const resolved = resolveBgmTheme(stageConfig);
    if (BGM_STATE.stageId === resolved.stageId && BGM_STATE.themeId === resolved.themeId) return;
    this._applyBgmTheme(resolved.themeId, resolved.theme, {
      stageId: resolved.stageId,
      pattern: resolved.pattern,
      rootFreq: resolved.root,
      tempo: resolved.tempo
    });
  },
  bgmStart() {
    if (this._bgmTimer || !isAudioGloballyEnabled) return;
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    try {
      this._ensureBgmNodes();
      if (!BGM_STATE.themeId) {
        const stageConfig = window.Game?.runtime?.stage?.currentConfig ?? window.STAGE_CONFIG?.[0];
        if (stageConfig) {
          this.bgmSetStage(stageConfig);
        } else {
          this.bgmSetTheme('neon_base');
        }
      }
      const now = actx.currentTime;
      const target = this._bgmTargetVol ?? (window.qaConfig?.bgmVol ?? 0.15);
      if (this._bgmGain) {
        this._bgmGain.gain.setTargetAtTime(target, now, 0.2);
      }
      if (this._bgmPadGain) {
        this._bgmPadGain.gain.setTargetAtTime(BGM_STATE.padGain, now, 0.2);
      }
      BGM_STATE.active = true;
      BGM_STATE.nextNoteTime = Math.max(BGM_STATE.nextNoteTime, now + 0.05);
      this._bgmTimer = setInterval(() => this.bgmTick(), 50);
    } catch (e) {}
  },
  bgmStop() {
    if (this._bgmTimer) {
      clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
    BGM_STATE.active = false;
    const now = actx.currentTime;
    if (this._bgmGain) this._bgmGain.gain.setTargetAtTime(0, now, 0.2);
    if (this._bgmPadGain) this._bgmPadGain.gain.setTargetAtTime(0, now, 0.2);
  },
  bgmSetVolume(v) {
    const vol = Math.max(0, Math.min(0.25, v));
    this._bgmTargetVol = vol;
    if (this._bgmGain) this._bgmGain.gain.setTargetAtTime(vol, actx.currentTime, 0.1);
  },

  async suspendAudio() {
    if (actx?.state === 'running') {
      try { await actx.suspend(); } catch (e) { console.error('[Sound] Suspend failed', e); }
    }
  },
  async resumeAudio() {
    if (actx?.state === 'suspended') {
      try { await actx.resume(); } catch (e) { console.error('[Sound] Resume failed', e); }
    }
  },
  setAudioEnabled(enabled) {
    isAudioGloballyEnabled = enabled;
    if (masterGain) {
      masterGain.gain.setValueAtTime(enabled ? 1 : 0, actx.currentTime);
    }
    clipPool.forEach(pool => pool.forEach(audio => audio.muted = !enabled));
    if (enabled) {
      if (window.Game?.runtime?.gameActive && window.Game?.runtime?.gameState !== window.GameModules.Runtime.STATE.PAUSE) {
        this.bgmStart();
      }
    } else {
      this.bgmStop();
    }
  }
};
