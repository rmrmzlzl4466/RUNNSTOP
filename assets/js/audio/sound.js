const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  try {
    actx = AudioCtx ? new AudioCtx() : null;
  } catch (err) {
    console.warn('[Sound] AudioContext init blocked', err);
    actx = null;
  }
  let isUnlocked = false;

  // Simple clip pool to avoid allocating <audio> on every pickup (jank on iOS Safari)
  const clipPool = new Map(); // path -> Array<HTMLAudioElement>

  function getPooledClip(path) {
    let pool = clipPool.get(path);
    if (!pool) {
      pool = [];
      clipPool.set(path, pool);
    }
    // Reuse an idle clip if available
    const reusable = pool.find(a => a.paused || a.ended);
    if (reusable) {
      reusable.currentTime = 0;
      return reusable;
    }
    // Create a small pool lazily (cap length to avoid unbounded growth)
    if (pool.length < 3) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      pool.push(audio);
      return audio;
    }
    // Fallback to first clip
    const fallback = pool[0];
    fallback.currentTime = 0;
    return fallback;
  }

  function handleResumePromise(res, label) {
    if (res?.then) {
      res.then(() => { isUnlocked = true; }).catch((err) => console.warn(`[Sound] ${label} blocked`, err));
      return false;
    }
    return true;
  }

  function safeResume() {
    if (!actx) return false;
    try {
      const res = actx.resume?.();
      const ok = handleResumePromise(res, 'AudioContext resume');
      if (!ok) return false;
      isUnlocked = actx.state === 'running';
      return isUnlocked;
    } catch (err) {
      console.warn('[Sound] AudioContext resume failed', err);
      return false;
    }
  }

  function unlock() {
    if (!actx) return false;
    if (actx.state === 'running') {
      isUnlocked = true;
      return true;
    }
    try {
      const res = actx.resume?.();
      if (!handleResumePromise(res, 'Audio unlock')) {
        return false;
      }
      isUnlocked = actx.state === 'running';
      return isUnlocked;
    } catch (err) {
      console.warn('[Sound] Audio unlock failed', err);
      return false;
    }
  }

  var Sound = window.Sound = {
    get isUnlocked() { return isUnlocked; },
    unlock,
    play(freq, type, dur=0.1) {
      if (!isUnlocked || !actx) return;
      if (actx.state === 'suspended' && !safeResume()) return;
      try { const osc = actx.createOscillator(); const gain = actx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, actx.currentTime); gain.gain.setValueAtTime(0.12 * (window.qaConfig?.sfxVol ?? 1), actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime+dur); osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime+dur); } catch(e){}
    },
    playClip(path, volume) {
      if (!isUnlocked) return;
      try {
        const audio = getPooledClip(path);
        audio.volume = volume ?? window.qaConfig?.sfxVol ?? 1;
        const res = audio.play();
        if (res?.catch) res.catch((err) => console.warn('[Sound] playClip blocked', err));
      } catch(e) {
        console.error(`[Sound] Error playing clip: ${path}`, e);
      }
    },
    sfx(type) {
      if (!isUnlocked) return;
      const getScorePath = './assets/sounds/stage/get_score.wav';
      const getCoinPath = './assets/sounds/stage/get_coin.wav';
      const getItemPath = './assets/sounds/stage/collect_item.wav';
      const getDashPath = './assets/sounds/player/move_Dash.wav';
      switch(type) {
        case 'coin':
          this.playClip(getCoinPath, window.qaConfig?.coinSfxVol);
          break;
        case 'bit':
        case 'gem':
          this.playClip(getScorePath, window.qaConfig?.scoreSfxVol);
          break;
        case 'item':
          this.playClip(getItemPath, window.qaConfig?.itemSfxVol);
          break;
        case 'dash':
          this.playClip(getDashPath, window.qaConfig?.dashSfxVol);
          break;
        case 'jump': this.play(200, 'sawtooth', 0.15); break;
        case 'die': this.play(100, 'sawtooth', 0.5); break;
        case 'alert': this.play(1200, 'square', 0.1); break;
        case 'btn': this.play(400, 'sine', 0.1); break;

        // [JFB v2] 저스트 프레임 부스터 효과음 (Reflex Mode)
        case 'boost_ready':
          // 생존 성공 시 - 밝은 차임 소리
          this.playChord([880, 1100, 1320], 'sine', 0.15, 0.12);
          break;
        case 'boost_perfect':
          // PERFECT 발동 - 화려한 상승 아르페지오
          this.playArpeggio([523, 659, 784, 1047], 'square', 0.08, 0.15);
          break;
        case 'boost_rush':
          // 부스터 질주 사운드 - 시원하게 상승하는 바람 + 가속음
          this.playBoostRush();
          break;
        case 'jfb_active':
          // Active 시작 - 날카로운 "팅!" 신호음
          this.playArpeggio([1760, 2093, 2637], 'sine', 0.03, 0.12);
          break;
        case 'jfb_fail':
          // 부정출발 - 낮은 버저음
          this.playChord([220, 277], 'sawtooth', 0.25, 0.15);
          break;
        case 'slowmo_enter':
          // 슬로우모션 진입 - 시간이 느려지는 "우웅~" 효과
          this.playSlowMoEnter();
          break;
        case 'booster_pickup':
          // 부스터 아이템 획득 - 순간적인 터보 불꽃 사운드
          this.playBoosterPickup();
          break;
      }
    },
    // [JUST FRAME BOOSTER] 화음 재생 (동시에 여러 음)
    playChord(freqs, type, dur = 0.1, vol = 0.1) {
      if (!isUnlocked || !actx) return;
      if (actx.state === 'suspended' && !safeResume()) return;
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
          gain.connect(actx.destination);
          osc.start();
          osc.stop(actx.currentTime + dur);
        });
      } catch(e) {}
    },
    // [JUST FRAME BOOSTER] 아르페지오 재생 (순차적으로 음 재생)
    playArpeggio(freqs, type, interval = 0.05, dur = 0.1) {
      if (!isUnlocked || !actx) return;
      if (actx.state === 'suspended' && !safeResume()) return;
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
          gain.connect(actx.destination);
          osc.start(startTime);
          osc.stop(startTime + dur);
        });
      } catch(e) {}
    },
    // [BOOSTER] 시원하게 질주하는 바람 + 가속 사운드
    playBoostRush() {
      if (!isUnlocked || !actx) return;
      if (actx.state === 'suspended' && !safeResume()) return;
      try {
        const now = actx.currentTime;
        const duration = 0.8;
        const baseVol = 0.15 * (window.qaConfig?.sfxVol ?? 1);

        // 1. 바람/러쉬 노이즈 (화이트 노이즈 + 하이패스 필터)
        const bufferSize = actx.sampleRate * duration;
        const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const noise = actx.createBufferSource();
        noise.buffer = noiseBuffer;

        // 하이패스 필터로 바람 느낌
        const highpass = actx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(800, now);
        highpass.frequency.linearRampToValueAtTime(2000, now + duration * 0.3);
        highpass.frequency.linearRampToValueAtTime(1200, now + duration);

        // 밴드패스로 "우우웅" 느낌 추가
        const bandpass = actx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1000, now);
        bandpass.frequency.linearRampToValueAtTime(3000, now + duration * 0.4);
        bandpass.frequency.linearRampToValueAtTime(1500, now + duration);
        bandpass.Q.value = 1.5;

        const noiseGain = actx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(baseVol * 0.5, now + 0.05);
        noiseGain.gain.linearRampToValueAtTime(baseVol * 0.7, now + duration * 0.3);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(actx.destination);
        noise.start(now);
        noise.stop(now + duration);

        // 2. 상승하는 스위프 톤 (시원한 가속감)
        const sweepOsc = actx.createOscillator();
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(150, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(600, now + duration * 0.5);
        sweepOsc.frequency.exponentialRampToValueAtTime(400, now + duration);

        const sweepGain = actx.createGain();
        sweepGain.gain.setValueAtTime(0, now);
        sweepGain.gain.linearRampToValueAtTime(baseVol * 0.3, now + 0.08);
        sweepGain.gain.linearRampToValueAtTime(baseVol * 0.4, now + duration * 0.4);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        sweepOsc.connect(sweepGain);
        sweepGain.connect(actx.destination);
        sweepOsc.start(now);
        sweepOsc.stop(now + duration);

        // 3. 고주파 "휘이잉" 효과 (속도감)
        const whooshOsc = actx.createOscillator();
        whooshOsc.type = 'sine';
        whooshOsc.frequency.setValueAtTime(800, now);
        whooshOsc.frequency.exponentialRampToValueAtTime(2500, now + duration * 0.3);
        whooshOsc.frequency.exponentialRampToValueAtTime(1200, now + duration);

        const whooshGain = actx.createGain();
        whooshGain.gain.setValueAtTime(0, now);
        whooshGain.gain.linearRampToValueAtTime(baseVol * 0.15, now + 0.1);
        whooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

        whooshOsc.connect(whooshGain);
        whooshGain.connect(actx.destination);
        whooshOsc.start(now);
        whooshOsc.stop(now + duration);

      } catch(e) {}
    },
    // [SLOWMO] 매트릭스 스타일 슬로우모션 진입 사운드
    playSlowMoEnter() {
      if (!isUnlocked || !actx) return;
      if (actx.state === 'suspended' && !safeResume()) return;
      try {
        const now = actx.currentTime;
        const duration = 0.5;
        const baseVol = 0.2 * (window.qaConfig?.sfxVol ?? 1);

        // 1. 저주파 하강 스위프 (시간이 느려지는 느낌)
        const bassOsc = actx.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(200, now);
        bassOsc.frequency.exponentialRampToValueAtTime(60, now + duration * 0.7);
        bassOsc.frequency.setValueAtTime(50, now + duration);

        const bassGain = actx.createGain();
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(baseVol * 0.6, now + 0.05);
        bassGain.gain.linearRampToValueAtTime(baseVol * 0.4, now + duration * 0.5);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        bassOsc.connect(bassGain);
        bassGain.connect(actx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + duration);

        // 2. 중주파 "우웅" 하강 (감속 느낌)
        const midOsc = actx.createOscillator();
        midOsc.type = 'triangle';
        midOsc.frequency.setValueAtTime(400, now);
        midOsc.frequency.exponentialRampToValueAtTime(100, now + duration * 0.6);

        const midGain = actx.createGain();
        midGain.gain.setValueAtTime(0, now);
        midGain.gain.linearRampToValueAtTime(baseVol * 0.3, now + 0.08);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

        midOsc.connect(midGain);
        midGain.connect(actx.destination);
        midOsc.start(now);
        midOsc.stop(now + duration);

        // 3. 고주파 디튠 효과 (시간 왜곡)
        const detuneOsc = actx.createOscillator();
        detuneOsc.type = 'sawtooth';
        detuneOsc.frequency.setValueAtTime(800, now);
        detuneOsc.frequency.exponentialRampToValueAtTime(200, now + duration * 0.8);
        detuneOsc.detune.setValueAtTime(0, now);
        detuneOsc.detune.linearRampToValueAtTime(-100, now + duration);

        // 로우패스 필터로 부드럽게
        const lpf = actx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(2000, now);
        lpf.frequency.exponentialRampToValueAtTime(300, now + duration);

        const detuneGain = actx.createGain();
        detuneGain.gain.setValueAtTime(0, now);
        detuneGain.gain.linearRampToValueAtTime(baseVol * 0.15, now + 0.1);
        detuneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        detuneOsc.connect(lpf);
        lpf.connect(detuneGain);
        detuneGain.connect(actx.destination);
        detuneOsc.start(now);
        detuneOsc.stop(now + duration);

      } catch(e) {}
    },
    // [BOOSTER PICKUP] 터보 불꽃 버스트 사운드 - 강렬한 "푸아아!" 효과
    playBoosterPickup() {
      if (!isUnlocked || !actx) return;
      if (actx.state === 'suspended' && !safeResume()) return;
      try {
        const now = actx.currentTime;
        const duration = 0.35;
        const baseVol = 0.5 * (window.qaConfig?.sfxVol ?? 1);  // 볼륨 2배 증가

        // 1. 강렬한 노이즈 버스트 (폭발/불꽃음)
        const bufferSize = actx.sampleRate * duration;
        const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const noise = actx.createBufferSource();
        noise.buffer = noiseBuffer;

        // 로우패스 + 하이패스로 "푸아" 느낌
        const lowpass = actx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(4000, now);
        lowpass.frequency.exponentialRampToValueAtTime(800, now + duration);

        const noiseGain = actx.createGain();
        noiseGain.gain.setValueAtTime(baseVol, now);  // 즉시 최대 볼륨
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);

        noise.connect(lowpass);
        lowpass.connect(noiseGain);
        noiseGain.connect(actx.destination);
        noise.start(now);
        noise.stop(now + duration);

        // 2. 터보 휘슬 (급상승)
        const turboOsc = actx.createOscillator();
        turboOsc.type = 'sawtooth';
        turboOsc.frequency.setValueAtTime(200, now);
        turboOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
        turboOsc.frequency.exponentialRampToValueAtTime(600, now + duration);

        const turboGain = actx.createGain();
        turboGain.gain.setValueAtTime(baseVol * 0.6, now);
        turboGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.5);

        turboOsc.connect(turboGain);
        turboGain.connect(actx.destination);
        turboOsc.start(now);
        turboOsc.stop(now + duration);

        // 3. 강한 저주파 펀치 (쿵!)
        const punchOsc = actx.createOscillator();
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(120, now);
        punchOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        const punchGain = actx.createGain();
        punchGain.gain.setValueAtTime(baseVol * 0.8, now);
        punchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        punchOsc.connect(punchGain);
        punchGain.connect(actx.destination);
        punchOsc.start(now);
        punchOsc.stop(now + 0.2);

        // 4. 불꽃 스파크 (치직!)
        const sparkOsc = actx.createOscillator();
        sparkOsc.type = 'square';
        sparkOsc.frequency.setValueAtTime(4000, now);
        sparkOsc.frequency.exponentialRampToValueAtTime(1500, now + 0.1);

        const sparkGain = actx.createGain();
        sparkGain.gain.setValueAtTime(baseVol * 0.3, now);
        sparkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        sparkOsc.connect(sparkGain);
        sparkGain.connect(actx.destination);
        sparkOsc.start(now);
        sparkOsc.stop(now + 0.15);

        // 5. 추가: 중주파 "우웅" (터보 느낌)
        const midOsc = actx.createOscillator();
        midOsc.type = 'triangle';
        midOsc.frequency.setValueAtTime(400, now);
        midOsc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        midOsc.frequency.exponentialRampToValueAtTime(300, now + duration);

        const midGain = actx.createGain();
        midGain.gain.setValueAtTime(baseVol * 0.4, now);
        midGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);

        midOsc.connect(midGain);
        midGain.connect(actx.destination);
        midOsc.start(now);
        midOsc.stop(now + duration);

      } catch(e) { console.error('[Sound] booster_pickup error:', e); }
    },
    _bgmGain: null,
    _bgmStep: 0,
    _bgmNextTime: 0,
    _bgmRaf: null,
    bgmStart() {
      if (!isUnlocked || !actx) return;
      if (this._bgmRaf) return;
      if (actx.state === 'suspended' && !safeResume()) return;
      try {
        if (!this._bgmGain) { this._bgmGain = actx.createGain(); this._bgmGain.gain.value = (window.qaConfig?.bgmVol ?? 0.15); this._bgmGain.connect(actx.destination); }
        const seq = [
          // 8-step loop: (base, melody)
          [110, 440], [110, 0], [110, 523.25], [110, 0],
          [98, 392], [98, 0], [98, 466.16], [98, 0],
        ];
        const stepDur = 0.32; // seconds
        const lookahead = 0.1; // schedule ahead to survive throttling
        this._bgmStep = 0;
        this._bgmNextTime = actx.currentTime;
        const scheduleStep = (time) => {
          const [bass, lead] = seq[this._bgmStep % seq.length];
          const mk = (freq, type, dur, gainVal) => {
            if (!freq) return;
            const o = actx.createOscillator();
            const g = actx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, time);
            g.gain.setValueAtTime(gainVal, time);
            g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
            o.connect(g); g.connect(this._bgmGain);
            o.start(time); o.stop(time + dur);
          };
          mk(bass, 'triangle', stepDur * 0.95, 0.14);
          mk(lead, 'square',   stepDur * 0.55, 0.06);
          this._bgmStep++;
        };
        const tick = () => {
          if (!this._bgmRaf) return;
          const now = actx.currentTime;
          while (this._bgmNextTime < now + lookahead) {
            scheduleStep(this._bgmNextTime);
            this._bgmNextTime += stepDur;
          }
          this._bgmRaf = requestAnimationFrame(tick);
        };
        this._bgmRaf = requestAnimationFrame(tick);
      } catch(e) {}
    },
    bgmStop() {
      if (this._bgmRaf) { cancelAnimationFrame(this._bgmRaf); this._bgmRaf = null; }
    },
    bgmSetEnabled(on) { if (on) this.bgmStart(); else this.bgmStop(); },
    bgmSetVolume(v){
      const vol = Math.max(0, Math.min(0.25, v));
      if (this._bgmGain) this._bgmGain.gain.value = vol;
    },
    toggleMute(isMuted) {
      if (!actx) return;
      try {
        if (isMuted) {
          actx.suspend?.();
        } else {
          const res = actx.resume?.();
          if (!handleResumePromise(res, 'resume')) return;
          isUnlocked = actx.state === 'running';
        }
      } catch (err) {
        console.warn('[Sound] toggleMute failed', err);
      }
    }

  };
