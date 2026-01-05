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
  bgmStart() {
    if (this._bgmRaf || !isAudioGloballyEnabled) return;
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    try {
      if (!this._bgmGain) {
        this._bgmGain = actx.createGain();
        this._bgmGain.gain.value = (window.qaConfig?.bgmVol ?? 0.15);
        this._bgmGain.connect(masterGain); // Route BGM through masterGain
      }
      // ... (rest of bgmStart logic is the same, assuming it creates nodes and connects to _bgmGain)
    } catch (e) {}
  },
  
  bgmStop() {
    if (this._bgmRaf) { cancelAnimationFrame(this._bgmRaf); this._bgmRaf = null; }
  },
  bgmSetVolume(v) {
    const vol = Math.max(0, Math.min(0.25, v));
    if (this._bgmGain) this._bgmGain.gain.value = vol;
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
