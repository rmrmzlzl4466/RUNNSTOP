const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx = new AudioCtx();

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

  var Sound = window.Sound = {
    play(freq, type, dur=0.1) {
      if (actx.state === 'suspended') actx.resume();
      try { const osc = actx.createOscillator(); const gain = actx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, actx.currentTime); gain.gain.setValueAtTime(0.12 * (qaConfig?.sfxVol ?? 1), actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime+dur); osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime+dur); } catch(e){}
    },
    playClip(path, volume) {
      try {
        const audio = getPooledClip(path);
        audio.volume = volume ?? qaConfig?.sfxVol ?? 1;
        audio.play().catch(() => {});
      } catch(e) {
        console.error(`[Sound] Error playing clip: ${path}`, e);
      }
    },
    sfx(type) {
      const getScorePath = './assets/sounds/stage/get_score.wav';
      const getCoinPath = './assets/sounds/stage/get_coin.wav';
      const getItemPath = './assets/sounds/stage/collect_item.wav';
      const getDashPath = './assets/sounds/player/move_Dash.wav';
      switch(type) {
        case 'coin':
          this.playClip(getCoinPath, qaConfig?.coinSfxVol);
          break;
        case 'bit':
        case 'gem':
          this.playClip(getScorePath, qaConfig?.scoreSfxVol);
          break;
        case 'item':
          this.playClip(getItemPath, qaConfig?.itemSfxVol);
          break;
        case 'dash':
          this.playClip(getDashPath, qaConfig?.dashSfxVol);
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
        case 'jfb_active':
          // Active 시작 - 날카로운 "팅!" 신호음
          this.playArpeggio([1760, 2093, 2637], 'sine', 0.03, 0.12);
          break;
        case 'jfb_fail':
          // 부정출발 - 낮은 버저음
          this.playChord([220, 277], 'sawtooth', 0.25, 0.15);
          break;
      }
    },
    // [JUST FRAME BOOSTER] 화음 재생 (동시에 여러 음)
    playChord(freqs, type, dur = 0.1, vol = 0.1) {
      if (actx.state === 'suspended') actx.resume();
      try {
        const baseVol = vol * (qaConfig?.sfxVol ?? 1);
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
      if (actx.state === 'suspended') actx.resume();
      try {
        const baseVol = 0.12 * (qaConfig?.sfxVol ?? 1);
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
    }
    ,
    _bgmGain: null,
    _bgmStep: 0,
    _bgmNextTime: 0,
    _bgmRaf: null,
    bgmStart() {
      if (this._bgmRaf) return;
      if (actx.state === 'suspended') actx.resume();
      try {
        if (!this._bgmGain) { this._bgmGain = actx.createGain(); this._bgmGain.gain.value = (qaConfig?.bgmVol ?? 0.15); this._bgmGain.connect(actx.destination); }
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
      if (actx) {
        if (isMuted) actx.suspend(); // 오디오 엔진 전체 일시정지 (가장 확실함)
        else actx.resume(); // 재개
      }
    }

  };
