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
    resultDistanceScore: null
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
     * Update result screen with game over data
     * @param {Object} data - Result data
     */
    updateResult: function(data) {
      const { dist, coins, gems, totalScore, highScore, isNewRecord, itemScore, distanceBonus, formatNumber } = data;

      if (elements.lastDist) elements.lastDist.innerText = dist;
      if (elements.lastCoins) elements.lastCoins.innerText = coins;
      if (elements.lastGems) elements.lastGems.innerText = gems;
      if (elements.resultTotalScore) elements.resultTotalScore.innerText = formatNumber(totalScore);
      if (elements.resultHighScore) elements.resultHighScore.innerText = formatNumber(highScore);
      if (elements.resultNewRecord) elements.resultNewRecord.style.display = isNewRecord ? 'inline-block' : 'none';
      if (elements.resultItemsScore) elements.resultItemsScore.innerText = formatNumber(itemScore);
      if (elements.resultDistanceScore) elements.resultDistanceScore.innerText = formatNumber(distanceBonus);
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
})();
