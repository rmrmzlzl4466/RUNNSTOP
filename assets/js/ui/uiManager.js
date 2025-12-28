(function() {
  'use strict';

  window.Game = window.Game || {};

  // === Cached DOM Elements ===
  const elements = {
    phaseFill: null,
    gameContainer: null,
    dashVisual: null,
    dashCdText: null,
    scoreDisplay: null,
    scoreDisplayLeft: null,
    buffBarrier: null,
    buffBooster: null,
    buffMagnet: null,
    targetDisplay: null,
    countdownText: null,
    statusMsg: null,
    coinDisplay: null,
    gemDisplay: null,
    mobileControls: null,
    stormWarning: null,
    playerGauge: null,
    stormGauge: null,
    chaseUI: null,
    // Result screen elements
    lastDist: null,
    lastCoins: null,
    lastGems: null,
    resultTotalScore: null,
    resultHighScore: null,
    resultNewRecord: null,
    resultItemsScore: null,
    resultDistanceScore: null,
    // New result breakdown elements
    resultBitsCount: null,
    resultBitsScore: null,
    resultCoinsCount: null,
    resultCoinsScore: null,
    resultGemsCount: null,
    resultGemsScore: null,
    resultDistCount: null,
    rowBits: null,
    rowCoins: null,
    rowGems: null,
    rowDistance: null,
    btnResultSkip: null,
    highscoreBarFill: null,
    highscoreBarCurrent: null,
    scoreGuidePopup: null,
    // Enhanced animation elements
    glitchOverlay: null,
    legendaryOverlay: null,
    confettiContainer: null,
    resultHeader: null,
    resultCard: null,
    resultFooter: null
  };

  // Platform detection
  const platformInfo = {
    isMobile: false,
    isLowEnd: false,
    prefersReducedMotion: false
  };

  // Result animation state
  let resultAnimState = {
    isAnimating: false,
    skipRequested: false,
    currentStep: 0,
    animFrameId: null,
    data: null
  };

  let lastScoreDisplay = '';
  let floatingTexts = [];

  const UI = {
    /**
     * Initialize UI manager and cache DOM elements
     */
    init: function() {
      elements.phaseFill = document.getElementById('phase-bar-fill');
      elements.gameContainer = document.getElementById('game-surface') || document.getElementById('game-container');
      elements.dashVisual = document.getElementById('btn-dash-visual');
      elements.dashCdText = document.getElementById('dash-cooldown-text');
      elements.scoreDisplay = document.getElementById('score-display');
      elements.scoreDisplayLeft = document.getElementById('score-display-left');
      elements.buffBarrier = document.getElementById('buff-barrier');
      elements.buffBooster = document.getElementById('buff-booster');
      elements.buffMagnet = document.getElementById('buff-magnet');
      elements.targetDisplay = document.getElementById('target-display');
      elements.countdownText = document.getElementById('countdown-text');
      elements.statusMsg = document.getElementById('status-msg');
      elements.coinDisplay = document.getElementById('coin-display');
      elements.gemDisplay = document.getElementById('gem-display');
      elements.mobileControls = document.getElementById('mobile-controls');
      elements.stormWarning = document.getElementById('storm-warning');
      elements.playerGauge = document.getElementById('player-gauge');
      elements.stormGauge = document.getElementById('storm-gauge');
      elements.chaseUI = document.getElementById('chase-ui');
      // Result screen
      elements.lastDist = document.getElementById('last-dist');
      elements.lastCoins = document.getElementById('last-coins');
      elements.lastGems = document.getElementById('last-gems');
      elements.resultTotalScore = document.getElementById('result-total-score');
      elements.resultHighScore = document.getElementById('result-high-score');
      elements.resultNewRecord = document.getElementById('result-new-record');
      elements.resultItemsScore = document.getElementById('result-items-score');
      elements.resultDistanceScore = document.getElementById('result-distance-score');
      // New result breakdown elements
      elements.resultBitsCount = document.getElementById('result-bits-count');
      elements.resultBitsScore = document.getElementById('result-bits-score');
      elements.resultCoinsCount = document.getElementById('result-coins-count');
      elements.resultCoinsScore = document.getElementById('result-coins-score');
      elements.resultGemsCount = document.getElementById('result-gems-count');
      elements.resultGemsScore = document.getElementById('result-gems-score');
      elements.resultDistCount = document.getElementById('result-dist-count');
      elements.rowBits = document.getElementById('row-bits');
      elements.rowCoins = document.getElementById('row-coins');
      elements.rowGems = document.getElementById('row-gems');
      elements.rowDistance = document.getElementById('row-distance');
      elements.btnResultSkip = document.getElementById('btn-result-skip');
      elements.highscoreBarFill = document.getElementById('highscore-bar-fill');
      elements.highscoreBarCurrent = document.getElementById('highscore-bar-current');
      elements.scoreGuidePopup = document.getElementById('score-guide-popup');
      // Enhanced animation elements
      elements.glitchOverlay = document.getElementById('glitch-overlay');
      elements.legendaryOverlay = document.getElementById('legendary-overlay');
      elements.confettiContainer = document.getElementById('confetti-container');
      elements.resultHeader = document.querySelector('#screen-result .result-header');
      elements.resultCard = document.querySelector('#screen-result .result-card');
      elements.resultFooter = document.querySelector('#screen-result .result-footer');

      // Detect platform capabilities
      this.detectPlatform();
    },

    /**
     * Detect platform capabilities for adaptive animations
     */
    detectPlatform: function() {
      platformInfo.isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || ('ontouchstart' in window)
        || (window.innerWidth <= 768);

      platformInfo.isLowEnd = (navigator.hardwareConcurrency || 4) <= 2
        || (navigator.deviceMemory || 4) <= 2;

      platformInfo.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /**
     * Update phase bar UI
     * @param {number} state - Game state (STATE.RUN, STATE.WARNING, STATE.STOP)
     * @param {number} remaining - Time remaining
     * @param {number} max - Max time for this phase
     * @param {Object} STATE - State constants object
     */
    setPhase: function(state, remaining, max, STATE) {
      if (!elements.phaseFill) return;
      const pct = Math.max(0, Math.min(1, remaining / Math.max(0.001, max)));
      elements.phaseFill.style.transform = `scaleX(${pct})`;

      if (state === STATE.STOP) {
        elements.phaseFill.style.background = 'rgba(231, 76, 60, 0.85)';
      } else if (state === STATE.WARNING) {
        elements.phaseFill.style.background = 'rgba(241, 196, 15, 0.85)';
      } else {
        elements.phaseFill.style.background = 'rgba(46, 204, 113, 0.75)';
      }
    },

    /**
     * Set game container glow state
     * @param {number} state - Game state
     * @param {Object} STATE - State constants object
     */
    setStateGlow: function(state, STATE) {
      if (!elements.gameContainer) return;
      elements.gameContainer.classList.remove('state-stop', 'state-warning');
      if (state === STATE.STOP) {
        elements.gameContainer.classList.add('state-stop');
      } else if (state === STATE.WARNING) {
        elements.gameContainer.classList.add('state-warning');
      }
    },

    /**
     * Update dash button UI
     * @param {Object} player - Player object
     */
    updateDash: function(player) {
      if (!elements.dashVisual || !elements.dashCdText) return;

      // [JFB v2] 저스트 프레임 부스터 상태 체크 (Reflex Mode)
      const boosterState = player.getSurvivalBoosterState?.() ?? null;

      // 부스터 관련 클래스 초기화
      elements.dashVisual.classList.remove('boost-mode', 'boost-perfect', 'boost-great', 'boost-wait', 'boost-active');

      if (boosterState === 'wait') {
        // Wait Phase - 회색/노란색, 대기 상태
        const waitRemaining = player.getWaitRemaining?.() ?? 0;
        elements.dashVisual.classList.add('boost-wait');
        elements.dashVisual.classList.remove('not-ready');
        elements.dashVisual.textContent = 'WAIT...';
        elements.dashCdText.textContent = waitRemaining > 0 ? waitRemaining.toFixed(2) : '';
        elements.dashCdText.style.display = 'block';
        return;
      } else if (boosterState === 'active') {
        // Active Phase - Cyan, 강렬한 글로우, 크기 확대
        const remaining = player.getSurvivalBoosterRemaining?.() ?? 0;
        elements.dashVisual.classList.add('boost-active');
        elements.dashVisual.classList.remove('not-ready');
        elements.dashVisual.textContent = 'TAP NOW!!';
        elements.dashCdText.textContent = remaining.toFixed(2);
        elements.dashCdText.style.display = 'block';
        return;
      } else {
        // expired 또는 null
        elements.dashVisual.textContent = 'DASH';
      }

      if (player.canDash && !player.isDead && !player.isBoosting && !player.isDying) {
        elements.dashVisual.classList.remove('not-ready');
        elements.dashCdText.textContent = '';
        elements.dashCdText.style.display = 'none';
      } else {
        elements.dashVisual.classList.add('not-ready');
        const sec = Math.max(0, player.cooldownTimer || 0);
        elements.dashCdText.textContent = sec > 0 ? sec.toFixed(1) : '';
        elements.dashCdText.style.display = sec > 0 ? 'block' : 'none';
      }
    },

    /**
     * Update buff icons UI
     * @param {Object} player - Player object
     */
    updateBuffs: function(player) {
      // Barrier
      if (elements.buffBarrier) {
        if (player.hasBarrier) {
          elements.buffBarrier.classList.add('active');
        } else {
          elements.buffBarrier.classList.remove('active', 'expiring', 'expiring-fast');
        }
      }

      // Booster
      if (elements.buffBooster) {
        if (player.isBoosting) {
          elements.buffBooster.classList.add('active');
        } else {
          elements.buffBooster.classList.remove('active', 'expiring', 'expiring-fast');
        }
      }

      // Magnet (with expiring blink effect)
      if (elements.buffMagnet) {
        if (player.magnetTimer > 0) {
          elements.buffMagnet.classList.add('active');
          elements.buffMagnet.classList.remove('expiring', 'expiring-fast');

          if (player.magnetTimer <= 2) {
            elements.buffMagnet.classList.add('expiring-fast');
          } else if (player.magnetTimer <= 4) {
            elements.buffMagnet.classList.add('expiring');
          }
        } else {
          elements.buffMagnet.classList.remove('active', 'expiring', 'expiring-fast');
        }
      }
    },

    /**
     * Update score display
     * @param {number} score - Current score
     * @param {Function} formatNumber - Number formatting function
     * @param {boolean} force - Force update even if unchanged
     */
    updateScore: function(score, formatNumber, force = false) {
      const val = formatNumber(score);
      if (force || val !== lastScoreDisplay) {
        if (elements.scoreDisplay) {
          elements.scoreDisplay.innerText = `SCORE: ${val}`;
        }
        if (elements.scoreDisplayLeft) {
          elements.scoreDisplayLeft.innerText = val;
        }
        lastScoreDisplay = val;
      }
    },

    /**
     * Update chase/stage gauge UI
     * @param {number} playerDist - Player distance
     * @param {number} stormY - Storm Y position
     * @param {number} currentLevelGoal - Current level goal
     */
    updateChase: function(playerDist, stormY, currentLevelGoal) {
      const stormDist = Math.floor((550 - stormY) / 10);
      const stageLength = window.qaConfig?.stageLength ?? 2000;
      let rangeStart = currentLevelGoal - stageLength;
      if (rangeStart < 0) rangeStart = 0;
      const totalRange = currentLevelGoal - rangeStart;

      // Player position %
      let playerPct = ((playerDist - rangeStart) / totalRange) * 100;
      playerPct = Math.max(0, Math.min(100, playerPct));

      // Storm position %
      let stormPct = ((stormDist - rangeStart) / totalRange) * 100;
      stormPct = Math.max(0, Math.min(100, stormPct));

      if (elements.playerGauge) {
        elements.playerGauge.style.height = `${playerPct}%`;
      }

      if (elements.stormGauge) {
        elements.stormGauge.style.height = `${stormPct}%`;
      }

      // Danger mode
      if (elements.chaseUI) {
        if ((playerDist - stormDist) < 50) {
          elements.chaseUI.classList.add('danger-mode');
        } else {
          elements.chaseUI.classList.remove('danger-mode');
        }
      }
    },

    /**
     * Set target display background color
     * @param {string} color - CSS color value
     */
    setTargetColor: function(color) {
      if (elements.targetDisplay) {
        elements.targetDisplay.style.backgroundColor = color;
      }
    },

    /**
     * Set countdown text
     * @param {string|number} text - Text to display
     * @param {boolean} isNumber - Whether it's a number (affects styling)
     */
    setCountdown: function(text, isNumber = false) {
      if (!elements.countdownText) return;
      elements.countdownText.innerText = text;
      if (isNumber) {
        elements.countdownText.classList.add('countdown-is-number');
        elements.countdownText.classList.remove('countdown-is-text');
      } else {
        elements.countdownText.classList.add('countdown-is-text');
        elements.countdownText.classList.remove('countdown-is-number');
      }
    },

    /**
     * Set status message
     * @param {string} text - Message text
     * @param {boolean} visible - Whether to show
     * @param {string} color - Text color (optional)
     */
    setStatus: function(text, visible = true, color = null) {
      if (!elements.statusMsg) return;
      elements.statusMsg.innerText = text;
      elements.statusMsg.style.display = visible ? 'block' : 'none';
      if (color) {
        elements.statusMsg.style.color = color;
      }
    },

    /**
     * Set coin display value
     * @param {number|string} value
     */
    setCoinDisplay: function(value) {
      if (elements.coinDisplay) {
        elements.coinDisplay.innerText = value;
      }
    },

    /**
     * Set gem display value
     * @param {number|string} value
     */
    setGemDisplay: function(value) {
      if (elements.gemDisplay) {
        elements.gemDisplay.innerText = value;
      }
    },

    /**
     * Show/hide mobile controls
     * @param {boolean} visible
     */
    setMobileControls: function(visible) {
      if (elements.mobileControls) {
        elements.mobileControls.style.display = visible ? 'flex' : 'none';
      }
    },

    /**
     * Show/hide storm warning
     * @param {boolean} visible
     */
    setStormWarning: function(visible) {
      if (elements.stormWarning) {
        elements.stormWarning.style.display = visible ? 'block' : 'none';
      }
    },

    /**
     * Show barrier saved message
     */
    showBarrierSaved: function() {
      this.setStatus('BARRIER SAVED!', true);
    },

    /**
     * Update result screen with game over data (with enhanced animations)
     * @param {Object} data - Result data
     */
    updateResult: function(data) {
      // Store data and start animation
      resultAnimState.data = data;
      resultAnimState.isAnimating = true;
      resultAnimState.skipRequested = false;
      resultAnimState.currentStep = 0;

      const rows = [elements.rowBits, elements.rowCoins, elements.rowGems, elements.rowDistance];

      // Reset all rows to pending state with enter class
      rows.forEach(row => {
        if (row) {
          row.setAttribute('data-status', 'pending');
          row.classList.remove('counting', 'row-animate', 'row-complete');
          row.classList.add('row-enter');
        }
      });

      // Show skip button
      if (elements.btnResultSkip) {
        elements.btnResultSkip.classList.remove('hidden');
      }

      // Hide new record badge and rank badge initially
      if (elements.resultNewRecord) {
        elements.resultNewRecord.style.display = 'none';
        elements.resultNewRecord.classList.remove('record-enter');
      }
      const rankBadge = document.getElementById('result-rank-badge');
      if (rankBadge) {
        rankBadge.style.display = 'none';
        rankBadge.className = 'rank-badge'; // Reset classes
      }

      // Reset high score bar
      if (elements.highscoreBarFill) {
        elements.highscoreBarFill.style.width = '0%';
        elements.highscoreBarFill.classList.remove('bar-exceeded');
      }
      if (elements.highscoreBarCurrent) {
        elements.highscoreBarCurrent.style.left = '0%';
        elements.highscoreBarCurrent.classList.remove('bar-enter');
      }

      // Reset total score
      if (elements.resultTotalScore) {
        elements.resultTotalScore.innerText = '0';
        elements.resultTotalScore.classList.remove('total-enter', 'counting');
      }

      // Set currency earned (instant)
      if (elements.lastDist) elements.lastDist.innerText = data.dist;
      if (elements.lastCoins) elements.lastCoins.innerText = data.coins;
      if (elements.lastGems) elements.lastGems.innerText = data.gems;
      if (elements.resultHighScore) elements.resultHighScore.innerText = data.formatNumber(data.highScore);

      // Update score guide with current multipliers
      this.updateScoreGuide();

      // Add entry animations to result screen elements
      if (elements.resultHeader) {
        elements.resultHeader.classList.remove('glitch-text');
        if (!platformInfo.prefersReducedMotion) {
          // Slight delay for glitch text effect
          setTimeout(() => {
            elements.resultHeader.classList.add('glitch-text');
          }, 100);
        }
      }

      if (elements.resultCard) {
        elements.resultCard.classList.remove('card-enter');
        if (!platformInfo.prefersReducedMotion) {
          // Force reflow and add animation class
          void elements.resultCard.offsetWidth;
          elements.resultCard.classList.add('card-enter');
        }
      }

      if (elements.resultFooter) {
        elements.resultFooter.classList.remove('footer-enter');
        if (!platformInfo.prefersReducedMotion) {
          void elements.resultFooter.offsetWidth;
          elements.resultFooter.classList.add('footer-enter');
        }
      }

      // Start animation sequence
      this.animateResultSequence(data);
    },

    /**
     * Play glitch transition effect
     */
    playGlitchTransition: function() {
      if (!elements.glitchOverlay) return;

      elements.glitchOverlay.classList.remove('active');
      void elements.glitchOverlay.offsetWidth; // Force reflow
      elements.glitchOverlay.classList.add('active');

      // Remove class after animation
      setTimeout(() => {
        elements.glitchOverlay.classList.remove('active');
      }, 500);
    },

    /**
     * Update score guide popup with current multiplier values
     */
    updateScoreGuide: function() {
      const qaConfig = window.qaConfig || {};
      const setBit = document.getElementById('guide-bit-score');
      const setCoin = document.getElementById('guide-coin-score');
      const setGem = document.getElementById('guide-gem-score');
      const setMeter = document.getElementById('guide-meter-score');
      const setMults = {
        bits: document.getElementById('result-bits-mult'),
        coins: document.getElementById('result-coins-mult'),
        gems: document.getElementById('result-gems-mult'),
        dist: document.getElementById('result-dist-mult')
      };

      if (setBit) setBit.innerText = qaConfig.scorePerBit ?? 50;
      if (setCoin) setCoin.innerText = qaConfig.scorePerCoin ?? 200;
      if (setGem) setGem.innerText = qaConfig.scorePerGem ?? 1000;
      if (setMeter) setMeter.innerText = qaConfig.scorePerMeter ?? 10;
      if (setMults.bits) setMults.bits.innerText = qaConfig.scorePerBit ?? 50;
      if (setMults.coins) setMults.coins.innerText = qaConfig.scorePerCoin ?? 200;
      if (setMults.gems) setMults.gems.innerText = qaConfig.scorePerGem ?? 1000;
      if (setMults.dist) setMults.dist.innerText = qaConfig.scorePerMeter ?? 10;
    },

    /**
     * Toggle score guide popup visibility
     */
    toggleScoreGuide: function() {
      if (elements.scoreGuidePopup) {
        const isVisible = elements.scoreGuidePopup.style.display !== 'none';
        elements.scoreGuidePopup.style.display = isVisible ? 'none' : 'flex';
        window.Sound?.sfx?.('btn');
      }
    },

    /**
     * Skip result animation
     */
    skipResultAnimation: function() {
      if (!resultAnimState.isAnimating) return;
      resultAnimState.skipRequested = true;
      window.Sound?.sfx?.('btn');
    },

    /**
     * Animate result screen sequence (slot machine style with enhanced effects)
     * @param {Object} data - Result data
     */
    animateResultSequence: async function(data) {
      const { bits, coins, gems, dist, totalScore, highScore, isNewRecord, formatNumber } = data;
      const qaConfig = window.qaConfig || {};
      const reducedMotion = platformInfo.prefersReducedMotion;

      const scorePerBit = qaConfig.scorePerBit ?? 50;
      const scorePerCoin = qaConfig.scorePerCoin ?? 200;
      const scorePerGem = qaConfig.scorePerGem ?? 1000;
      const scorePerMeter = qaConfig.scorePerMeter ?? 10;

      const bitsScore = bits * scorePerBit;
      const coinsScore = coins * scorePerCoin;
      const gemsScore = gems * scorePerGem;
      const distScore = dist * scorePerMeter;

      // Animation speed multiplier - faster on mobile
      const baseMult = qaConfig.resultAnimSpeed ?? 1.0;
      const speedMult = platformInfo.isMobile ? baseMult * 0.8 : baseMult;

      // Animation config - adaptive based on count size
      const getAnimConfig = (count) => {
        if (count === 0) return { steps: 1, duration: 50 };
        if (count <= 5) return { steps: 5, duration: 200 * speedMult };
        if (count <= 20) return { steps: 10, duration: 350 * speedMult };
        return { steps: 20, duration: 500 * speedMult };
      };

      const delayBetweenRows = Math.max(50, 150 * speedMult);
      const rowSlideDelay = reducedMotion ? 0 : 80;

      // Sound pitch configs for each item type
      const soundConfigs = {
        bits: { type: 'bit', pitchMult: 1.0 },
        coins: { type: 'coin', pitchMult: 1.2 },
        gems: { type: 'gem', pitchMult: 1.5 },
        dist: { type: 'bit', pitchMult: 0.8 }
      };

      // Helper: Trigger row slide-in animation
      const slideInRow = (rowEl, delayMs) => {
        if (!rowEl || reducedMotion) {
          if (rowEl) rowEl.classList.remove('row-enter');
          return;
        }
        setTimeout(() => {
          rowEl.classList.remove('row-enter');
          rowEl.classList.add('row-animate');
        }, delayMs);
      };

      // Trigger all rows to slide in with stagger
      slideInRow(elements.rowBits, rowSlideDelay * 0);
      slideInRow(elements.rowCoins, rowSlideDelay * 1);
      slideInRow(elements.rowGems, rowSlideDelay * 2);
      slideInRow(elements.rowDistance, rowSlideDelay * 3);

      // Wait for slide-in animations to start
      if (!reducedMotion) await this.delay(rowSlideDelay * 4 + 100);

      // Helper function for counting animation with enhanced effects
      const animateCount = async (countEl, scoreEl, targetCount, targetScore, rowEl, soundKey) => {
        // Skip immediately if count is 0
        if (targetCount === 0 || resultAnimState.skipRequested) {
          if (countEl) countEl.innerText = targetCount;
          if (scoreEl) scoreEl.innerText = formatNumber(targetScore);
          if (rowEl) {
            rowEl.setAttribute('data-status', 'done');
            rowEl.classList.remove('counting', 'row-enter', 'row-animate');
          }
          return;
        }

        const config = getAnimConfig(targetCount);
        const soundConfig = soundConfigs[soundKey] || soundConfigs.bits;

        if (rowEl) {
          rowEl.setAttribute('data-status', 'active');
          rowEl.classList.add('counting');

          // Mobile haptic feedback
          if (platformInfo.isMobile && navigator.vibrate) {
            navigator.vibrate(10);
          }
        }

        const stepTime = config.duration / config.steps;
        for (let i = 1; i <= config.steps; i++) {
          if (resultAnimState.skipRequested) break;

          const progress = this.easeOutQuad(i / config.steps);
          const currentCount = Math.floor(targetCount * progress);
          const currentScore = Math.floor(targetScore * progress);

          if (countEl) countEl.innerText = currentCount;
          if (scoreEl) scoreEl.innerText = formatNumber(currentScore);

          // Play tick sound with varied pitch
          if (i % Math.max(1, Math.floor(config.steps / 4)) === 0) {
            window.Sound?.sfx?.(soundConfig.type);
          }

          await this.delay(stepTime);
        }

        // Final values
        if (countEl) countEl.innerText = targetCount;
        if (scoreEl) scoreEl.innerText = formatNumber(targetScore);

        if (rowEl) {
          rowEl.setAttribute('data-status', 'done');
          rowEl.classList.remove('counting');

          // Add completion flash effect
          if (!reducedMotion) {
            rowEl.classList.add('row-complete');
            setTimeout(() => rowEl.classList.remove('row-complete'), 300);
          }
        }

        // Play completion sound
        window.Sound?.sfx?.(soundConfig.type);
      };

      // Step 1: Animate Bits
      await animateCount(
        elements.resultBitsCount,
        elements.resultBitsScore,
        bits,
        bitsScore,
        elements.rowBits,
        'bits'
      );
      if (!resultAnimState.skipRequested && bits > 0) await this.delay(delayBetweenRows);

      // Step 2: Animate Coins
      await animateCount(
        elements.resultCoinsCount,
        elements.resultCoinsScore,
        coins,
        coinsScore,
        elements.rowCoins,
        'coins'
      );
      if (!resultAnimState.skipRequested && coins > 0) await this.delay(delayBetweenRows);

      // Step 3: Animate Gems
      await animateCount(
        elements.resultGemsCount,
        elements.resultGemsScore,
        gems,
        gemsScore,
        elements.rowGems,
        'gems'
      );
      if (!resultAnimState.skipRequested && gems > 0) await this.delay(delayBetweenRows);

      // Step 4: Animate Distance
      await animateCount(
        elements.resultDistCount,
        elements.resultDistanceScore,
        dist,
        distScore,
        elements.rowDistance,
        'dist'
      );
      if (!resultAnimState.skipRequested) await this.delay(delayBetweenRows * 1.5);

      // Step 5: Animate Total Score with fanfare
      if (elements.resultTotalScore) {
        // Add reveal animation
        if (!reducedMotion) {
          elements.resultTotalScore.classList.add('total-enter');
        }

        elements.resultTotalScore.classList.add('counting');

        if (!resultAnimState.skipRequested) {
          const totalSteps = Math.floor(25 * speedMult);
          const totalStepTime = (600 * speedMult) / totalSteps;
          for (let i = 1; i <= totalSteps; i++) {
            if (resultAnimState.skipRequested) break;
            const progress = this.easeOutQuad(i / totalSteps);
            elements.resultTotalScore.innerText = formatNumber(Math.floor(totalScore * progress));
            await this.delay(totalStepTime);
          }
        }

        elements.resultTotalScore.innerText = formatNumber(totalScore);
        elements.resultTotalScore.classList.remove('counting');

        // Play total score fanfare
        window.Sound?.sfx?.('boost_ready');

        // Haptic feedback for total score
        if (platformInfo.isMobile && navigator.vibrate) {
          navigator.vibrate([30, 20, 30]);
        }
      }

      // Step 6: Show Score Rank with enhanced effects
      const rank = this.calculateRank(totalScore);
      this.showRankBadge(rank, reducedMotion);
      if (!resultAnimState.skipRequested) await this.delay(200 * speedMult);

      // Step 7: Animate High Score Bar with enhanced effects
      const maxBarScore = Math.max(highScore, totalScore, 1);
      const currentPct = Math.min(100, (totalScore / maxBarScore) * 100);
      const highPct = Math.min(100, (highScore / maxBarScore) * 100);

      if (elements.highscoreBarFill) {
        elements.highscoreBarFill.style.width = `${highPct}%`;

        // Add exceeded effect if beat high score
        if (isNewRecord && !reducedMotion) {
          setTimeout(() => {
            elements.highscoreBarFill.classList.add('bar-exceeded');
          }, 400);
        }
      }
      if (elements.highscoreBarCurrent) {
        elements.highscoreBarCurrent.style.left = `${currentPct}%`;
        if (!reducedMotion) {
          elements.highscoreBarCurrent.classList.add('bar-enter');
        }
      }

      // Step 8: Show NEW RECORD badge with celebration
      if (isNewRecord) {
        if (!resultAnimState.skipRequested) await this.delay(300 * speedMult);
        if (elements.resultNewRecord) {
          elements.resultNewRecord.style.display = 'inline-block';

          // Add bounce animation
          if (!reducedMotion) {
            elements.resultNewRecord.classList.add('record-enter');

            // Spawn confetti
            this.spawnConfetti();

            // Haptic for new record
            if (platformInfo.isMobile && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          }

          // Play fanfare for new record
          window.Sound?.sfx?.('boost_perfect');
        }
      }

      // Animation complete
      resultAnimState.isAnimating = false;
      if (elements.btnResultSkip) {
        elements.btnResultSkip.classList.add('hidden');
      }
    },

    /**
     * Spawn confetti particles for celebration
     */
    spawnConfetti: function() {
      if (!elements.confettiContainer || platformInfo.isLowEnd) return;

      const colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
      const count = platformInfo.isMobile ? 20 : 40;

      // Clear previous confetti
      elements.confettiContainer.innerHTML = '';

      for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.animationDuration = `${2 + Math.random() * 2}s`;

        // Random shape
        if (Math.random() > 0.5) {
          confetti.style.borderRadius = '50%';
        } else {
          confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        }

        elements.confettiContainer.appendChild(confetti);
      }

      // Clean up after animation
      setTimeout(() => {
        if (elements.confettiContainer) {
          elements.confettiContainer.innerHTML = '';
        }
      }, 4000);
    },

    /**
     * Spawn legendary sparkles for S-rank
     */
    spawnLegendarySparkles: function() {
      if (!elements.legendaryOverlay || platformInfo.isLowEnd) return;

      const count = platformInfo.isMobile ? 15 : 30;

      for (let i = 0; i < count; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'legendary-sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        sparkle.style.animationDelay = `${Math.random() * 0.8}s`;

        elements.legendaryOverlay.appendChild(sparkle);
      }

      // Clean up
      setTimeout(() => {
        elements.legendaryOverlay.querySelectorAll('.legendary-sparkle').forEach(el => el.remove());
      }, 2500);
    },

    /**
     * Calculate score rank based on total score
     * @param {number} score - Total score
     * @returns {Object} Rank info {grade, color, label}
     */
    calculateRank: function(score) {
      const thresholds = window.qaConfig?.rankThresholds ?? {
        S: 100000,
        A: 50000,
        B: 25000,
        C: 10000
      };

      if (score >= thresholds.S) return { grade: 'S', color: '#f1c40f', label: 'LEGENDARY!' };
      if (score >= thresholds.A) return { grade: 'A', color: '#2ecc71', label: 'EXCELLENT!' };
      if (score >= thresholds.B) return { grade: 'B', color: '#3498db', label: 'GREAT!' };
      if (score >= thresholds.C) return { grade: 'C', color: '#9b59b6', label: 'GOOD' };
      return { grade: 'D', color: '#95a5a6', label: 'KEEP GOING' };
    },

    /**
     * Show rank badge in result screen with enhanced effects
     * @param {Object} rank - Rank info from calculateRank
     * @param {boolean} reducedMotion - Whether to skip animations
     */
    showRankBadge: function(rank, reducedMotion = false) {
      const rankEl = document.getElementById('result-rank-badge');
      const rankLabel = document.getElementById('result-rank-label');

      if (rankEl) {
        rankEl.innerText = rank.grade;
        rankEl.style.display = 'flex';

        // Reset and add rank-specific class
        rankEl.className = 'rank-badge';

        if (!reducedMotion) {
          // Add spin-in animation
          rankEl.classList.add('rank-enter');

          // Add rank-specific glow class
          rankEl.classList.add(`rank-${rank.grade.toLowerCase()}`);

          // S-rank legendary effects
          if (rank.grade === 'S') {
            // Trigger legendary overlay flash
            if (elements.legendaryOverlay) {
              elements.legendaryOverlay.classList.remove('active');
              void elements.legendaryOverlay.offsetWidth;
              elements.legendaryOverlay.classList.add('active');

              // Spawn sparkles
              this.spawnLegendarySparkles();

              // Remove after animation
              setTimeout(() => {
                elements.legendaryOverlay.classList.remove('active');
              }, 1200);
            }

            // Strong haptic for legendary
            if (platformInfo.isMobile && navigator.vibrate) {
              navigator.vibrate([50, 30, 100, 30, 150]);
            }
          }
        } else {
          // Just set colors without animation
          rankEl.style.borderColor = rank.color;
          rankEl.style.color = rank.color;
        }
      }

      if (rankLabel) {
        rankLabel.innerText = rank.label;
        rankLabel.style.color = rank.color;
      }
    },

    /**
     * EaseOut quadratic function for smooth animation
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased progress
     */
    easeOutQuad: function(t) {
      return t * (2 - t);
    },

    /**
     * Promise-based delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay: function(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Reset UI for game start
     */
    resetForGameStart: function() {
      this.setTargetColor('#222');
      this.setCountdown('GO!', false);
      this.setStatus('RUN UP!', true, '#ffffff'); // 흰색
      this.setCoinDisplay('0');
      this.setGemDisplay('0');
      this.setMobileControls(true);
      floatingTexts = [];
    },

    /**
     * Handle state transition to WARNING
     * @param {string} color - Target color
     */
    onWarningStart: function(color) {
      this.setTargetColor(color);
      this.setStatus('FIND COLOR!', true, color); // 색상 패널과 동일한 색상
    },

    /**
     * Handle WARNING state update
     * @param {number} cycleTimer - Time remaining
     */
    onWarningUpdate: function(cycleTimer) {
      this.setCountdown(Math.ceil(cycleTimer), true);
    },

    /**
     * Handle state transition to STOP
     */
    onStopStart: function() {
      this.setCountdown('STOP!', false);
      this.setStatus('CHARGE!', true, '#e74c3c'); // 빨간색
    },

    /**
     * Handle state transition to RUN
     */
    onRunStart: function() {
      this.setTargetColor('#222');
      this.setCountdown('GO!', false);
      this.setStatus('GO!', false, 'white');
    },

    /**
     * Show floating toast near player
     * @param {Object} player - Player reference for position
     * @param {string} msg - Message to display
     * @param {string} color - Text color
     * @param {number} ms - Lifetime in milliseconds
     */
    showToast: function(player, msg, color = '#fff', ms = 900) {
      if (!player) return;
      if (floatingTexts.length > 24) floatingTexts.shift();
      floatingTexts.push({
        text: msg,
        x: player.x,
        y: player.y - player.radius - 40,
        life: Math.max(0.1, ms / 1000),
        color
      });
    },

    /**
     * Update floating text lifetimes/positions
     * @param {number} dt - Delta time (seconds)
     */
    updateFloatingTexts: function(dt) {
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= dt;
        ft.y -= 30 * dt;
        if (ft.life <= 0) {
          floatingTexts.splice(i, 1);
        }
      }
    },

    /**
     * Expose floating texts for renderer
     * @returns {Array}
     */
    getFloatingTexts: function() {
      return floatingTexts;
    }
  };

  window.Game.UI = UI;

  // Global toast function for UI feedback (non-game context)
  let toastTimeout = null;
  window.showToast = function(msg, type = 'info', duration = 1000) {
    const el = document.getElementById('toast-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.opacity = '1';
    el.className = `toast-${type}`;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 300);
    }, duration);
  };
})();
