/**
 * SlowMo Module - Matrix-style cinematic slow motion
 *
 * Design: "Neo dodging bullets" feel
 * - Smooth ease-in: Time gradually slows down (0.15s ramp)
 * - Deep slowdown: 0.15x scale (85% slower) for dramatic effect
 * - Hold phase: Time freezes at peak slowdown
 * - Smooth ease-out: Gradual return to normal speed
 * - Visual feedback: Color shift, motion trail enhancement
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  // Phase constants for clarity
  const PHASE = {
    INACTIVE: 0,
    EASE_IN: 1,    // Ramping down to slow
    HOLD: 2,       // At peak slowdown
    EASE_OUT: 3    // Ramping back to normal
  };

  /**
   * Easing function: cubic ease-in-out for smooth transitions
   * t: 0 to 1, returns 0 to 1
   */
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Easing function: dramatic ease-in (slow start, fast end)
   */
  function easeInQuart(t) {
    return t * t * t * t;
  }

  /**
   * Easing function: smooth ease-out (fast start, slow end)
   */
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  /**
   * Start slow motion effect
   * @param {Object} runtime - Game runtime state
   * @param {Object} qaConfig - QA configuration
   * @param {number} nowSec - Current time in seconds
   * @param {string} reason - Trigger reason for debugging
   * @returns {boolean} Whether slowmo was started
   */
  function start(runtime, qaConfig, nowSec, reason) {
    if (!runtime?.slowMo) return false;

    const cfg = qaConfig?.slowMo || {};
    if (!cfg.enabled) return false;

    // Block if player is boosting
    if (cfg.blockWhileBoosting !== false && window.player?.isBoosting) {
      return false;
    }

    // Block if within block window
    if (nowSec < (runtime.slowMo.blockUntil ?? 0)) {
      return false;
    }

    // Block if too soon after last trigger (minInterval)
    const minInterval = cfg.minIntervalSec ?? 0;
    if (minInterval > 0 && runtime.slowMo.lastTriggerTime) {
      if ((nowSec - runtime.slowMo.lastTriggerTime) < minInterval) {
        return false;
      }
    }

    // Matrix-style timing configuration
    const easeInDuration = cfg.easeInSec ?? 0.12;      // Time to reach peak slow
    const holdDuration = cfg.holdSec ?? 0.25;          // Time at peak slowdown
    const easeOutDuration = cfg.easeOutSec ?? 0.20;    // Time to return to normal
    const targetScale = cfg.scale ?? 0.15;             // How slow (0.15 = 85% slower)

    const totalDuration = easeInDuration + holdDuration + easeOutDuration;
    if (totalDuration <= 0) return false;

    // Activate slow motion with Matrix-style phases
    runtime.slowMo.active = true;
    runtime.slowMo.phase = PHASE.EASE_IN;
    runtime.slowMo.phaseTime = 0;
    runtime.slowMo.easeInDuration = easeInDuration;
    runtime.slowMo.holdDuration = holdDuration;
    runtime.slowMo.easeOutDuration = easeOutDuration;
    runtime.slowMo.targetScale = targetScale;
    runtime.slowMo.currentScale = 1.0;
    runtime.slowMo.totalRemaining = totalDuration;
    runtime.slowMo.applyMask = cfg.applyMask ?? 'world_only';
    runtime.slowMo.lastTriggerTime = nowSec;
    runtime.slowMo.reason = reason;

    // Visual effect flags
    runtime.slowMo.visualIntensity = 0;  // 0 to 1, for color/blur effects

    // Play slowmo enter sound
    window.Sound?.sfx?.('slowmo_enter');

    return true;
  }

  /**
   * Cancel slow motion effect
   * @param {Object} runtime - Game runtime state
   * @param {Object} qaConfig - QA configuration
   * @param {number} nowSec - Current time in seconds
   * @param {string} reason - Cancel reason for debugging
   * @param {boolean} setBlockWindow - Whether to set block window after cancel
   */
  function cancel(runtime, qaConfig, nowSec, reason, setBlockWindow = true) {
    if (!runtime?.slowMo) return;

    // If active, smoothly transition out instead of hard cut
    if (runtime.slowMo.active && runtime.slowMo.phase !== PHASE.EASE_OUT) {
      // Force into ease-out phase for smooth exit
      runtime.slowMo.phase = PHASE.EASE_OUT;
      runtime.slowMo.phaseTime = 0;
      // Quick ease-out on cancel (half duration)
      runtime.slowMo.easeOutDuration = Math.min(runtime.slowMo.easeOutDuration * 0.5, 0.1);
      runtime.slowMo.reason = reason;
      return;
    }

    // Full cancel
    runtime.slowMo.active = false;
    runtime.slowMo.phase = PHASE.INACTIVE;
    runtime.slowMo.currentScale = 1.0;
    runtime.slowMo.visualIntensity = 0;
    runtime.slowMo.reason = reason;

    if (setBlockWindow) {
      const cfg = qaConfig?.slowMo || {};
      const blockDur = cfg.blockWindowAfterBoostSec ?? 0.2;
      runtime.slowMo.blockUntil = nowSec + blockDur;
    }
  }

  /**
   * Force off slow motion (for death/game over)
   * @param {Object} runtime - Game runtime state
   */
  function forceOff(runtime) {
    if (!runtime?.slowMo) return;

    runtime.slowMo.active = false;
    runtime.slowMo.phase = PHASE.INACTIVE;
    runtime.slowMo.currentScale = 1.0;
    runtime.slowMo.visualIntensity = 0;
    runtime.slowMo.totalRemaining = 0;
    runtime.slowMo.reason = 'force_off';
    runtime.slowMo.blockUntil = 0;
  }

  /**
   * Update slow motion state (call once per frame with REAL dt)
   * @param {Object} runtime - Game runtime state
   * @param {number} dtReal - Real (unscaled) delta time
   */
  function update(runtime, dtReal) {
    if (!runtime?.slowMo) return;
    if (!runtime.slowMo.active) return;

    const sm = runtime.slowMo;
    sm.phaseTime += dtReal;
    sm.totalRemaining = Math.max(0, sm.totalRemaining - dtReal);

    // Phase state machine
    switch (sm.phase) {
      case PHASE.EASE_IN: {
        const t = Math.min(sm.phaseTime / sm.easeInDuration, 1);
        const eased = easeInQuart(t);  // Dramatic entry
        sm.currentScale = 1.0 - (1.0 - sm.targetScale) * eased;
        sm.visualIntensity = eased;

        if (t >= 1) {
          sm.phase = PHASE.HOLD;
          sm.phaseTime = 0;
        }
        break;
      }

      case PHASE.HOLD: {
        sm.currentScale = sm.targetScale;
        sm.visualIntensity = 1.0;

        if (sm.phaseTime >= sm.holdDuration) {
          sm.phase = PHASE.EASE_OUT;
          sm.phaseTime = 0;
        }
        break;
      }

      case PHASE.EASE_OUT: {
        const t = Math.min(sm.phaseTime / sm.easeOutDuration, 1);
        const eased = easeOutQuart(t);  // Smooth exit
        sm.currentScale = sm.targetScale + (1.0 - sm.targetScale) * eased;
        sm.visualIntensity = 1.0 - eased;

        if (t >= 1) {
          sm.active = false;
          sm.phase = PHASE.INACTIVE;
          sm.currentScale = 1.0;
          sm.visualIntensity = 0;
          sm.reason = 'completed';
        }
        break;
      }
    }
  }

  /**
   * Get world time scale based on slow motion state
   * @param {Object} runtime - Game runtime state
   * @param {Object} qaConfig - QA configuration
   * @param {number} nowSec - Current time in seconds
   * @param {boolean} playerIsBoosting - Whether player is currently boosting
   * @returns {number} Time scale (1.0 = normal, <1.0 = slow)
   */
  function getWorldScale(runtime, qaConfig, nowSec, playerIsBoosting) {
    if (!runtime?.slowMo) return 1.0;

    const cfg = qaConfig?.slowMo || {};

    // Never apply during boosting
    if (cfg.blockWhileBoosting !== false && playerIsBoosting) {
      return 1.0;
    }

    // Check if blocked
    if (nowSec < (runtime.slowMo.blockUntil ?? 0)) {
      return 1.0;
    }

    // Check if active
    if (!runtime.slowMo.active) {
      return 1.0;
    }

    return runtime.slowMo.currentScale ?? 1.0;
  }

  /**
   * Get visual effect intensity (for color/blur effects)
   * @param {Object} runtime - Game runtime state
   * @returns {number} Intensity from 0 to 1
   */
  function getVisualIntensity(runtime) {
    if (!runtime?.slowMo?.active) return 0;
    return runtime.slowMo.visualIntensity ?? 0;
  }

  /**
   * Get current phase name (for debugging)
   * @param {Object} runtime - Game runtime state
   * @returns {string} Phase name
   */
  function getPhaseName(runtime) {
    if (!runtime?.slowMo) return 'none';
    switch (runtime.slowMo.phase) {
      case PHASE.EASE_IN: return 'ease_in';
      case PHASE.HOLD: return 'hold';
      case PHASE.EASE_OUT: return 'ease_out';
      default: return 'inactive';
    }
  }

  /**
   * Check if slow motion should be cancelled based on cancel policy
   * @param {Object} runtime - Game runtime state
   * @param {Object} qaConfig - QA configuration
   * @param {string} event - Event type ('boost_press', 'boost_start')
   * @param {number} nowSec - Current time in seconds
   */
  function checkCancelPolicy(runtime, qaConfig, event, nowSec) {
    if (!runtime?.slowMo?.active) return;

    const cfg = qaConfig?.slowMo || {};
    const policy = cfg.cancelPolicy ?? 'on_boost_press';

    if (policy === event) {
      cancel(runtime, qaConfig, nowSec, event, true);
    }
  }

  // Export to GameModules
  window.GameModules.SlowMo = {
    start,
    cancel,
    forceOff,
    getWorldScale,
    getVisualIntensity,
    getPhaseName,
    update,
    checkCancelPolicy,
    PHASE
  };

  // Also expose on window.Game for external access (controls.js)
  window.Game = window.Game || {};
  window.Game.SlowMo = {
    start: function(reason) {
      const runtime = window.Game?.runtime;
      const qaConfig = window.qaConfig;
      const nowSec = performance.now() / 1000;
      return start(runtime, qaConfig, nowSec, reason);
    },
    cancel: function(reason, options = {}) {
      const runtime = window.Game?.runtime;
      const qaConfig = window.qaConfig;
      const nowSec = performance.now() / 1000;
      cancel(runtime, qaConfig, nowSec, reason, options.setBlockWindow ?? true);
    },
    forceOff: function() {
      const runtime = window.Game?.runtime;
      forceOff(runtime);
    },
    getVisualIntensity: function() {
      const runtime = window.Game?.runtime;
      return getVisualIntensity(runtime);
    }
  };
})();
