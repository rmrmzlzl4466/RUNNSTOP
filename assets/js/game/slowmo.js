/**
 * SlowMo Module - Safe, defensive slow motion system
 *
 * Design principles:
 * - SlowMo is a "visual effect" only - never affects input timing
 * - Immediately cancels on PERFECT/GREAT input or boost start
 * - Never applies during boosting
 * - All state is in runtime.slowMo, accessed via these safe APIs
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

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

    // Get duration
    const duration = cfg.durationSec ?? 0.22;
    if (duration <= 0) return false;

    // Activate slow motion
    runtime.slowMo.active = true;
    runtime.slowMo.remaining = duration;
    runtime.slowMo.scaleBase = cfg.scale ?? 0.7;
    runtime.slowMo.easeOutSec = cfg.easeOutSec ?? 0.08;
    runtime.slowMo.applyMask = cfg.applyMask ?? 'world_only';
    runtime.slowMo.lastTriggerTime = nowSec;
    runtime.slowMo.reason = reason;

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

    runtime.slowMo.active = false;
    runtime.slowMo.remaining = 0;
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
    runtime.slowMo.remaining = 0;
    runtime.slowMo.reason = 'force_off';
    runtime.slowMo.blockUntil = 0;
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
    if (!runtime.slowMo.active || runtime.slowMo.remaining <= 0) {
      return 1.0;
    }

    // Calculate scale with ease-out
    const easeOut = runtime.slowMo.easeOutSec ?? 0;
    if (easeOut > 0 && runtime.slowMo.remaining < easeOut) {
      // Ease out: lerp from scaleBase to 1.0
      const t = Math.max(0, runtime.slowMo.remaining / easeOut);
      return 1.0 - (1.0 - runtime.slowMo.scaleBase) * t;
    }

    return runtime.slowMo.scaleBase ?? 1.0;
  }

  /**
   * Update slow motion state (call once per frame)
   * @param {Object} runtime - Game runtime state
   * @param {number} dtReal - Real (unscaled) delta time
   */
  function update(runtime, dtReal) {
    if (!runtime?.slowMo) return;

    if (runtime.slowMo.active && runtime.slowMo.remaining > 0) {
      runtime.slowMo.remaining = Math.max(0, runtime.slowMo.remaining - dtReal);

      if (runtime.slowMo.remaining === 0) {
        runtime.slowMo.active = false;
        runtime.slowMo.reason = 'timeout';
      }
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
    update,
    checkCancelPolicy
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
    }
  };
})();
