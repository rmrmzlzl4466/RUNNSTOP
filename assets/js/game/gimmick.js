/**
 * Gimmick Module (Section C)
 *
 * Handles stage-specific gimmick effects:
 * - SAFE_FADE: Safe color panels glow during STOP phase
 * - GLITCH_SWAP: Panels randomly swap colors during WARNING
 * - STORM_PULSE: Storm speed pulses periodically
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  // === Internal State ===
  let _swappedTiles = new Map(); // Map<"row:col", newColorIndex> for GLITCH_SWAP
  let _lastSwapTime = 0;
  let _stormPulseTimer = 0;
  let _stormPulseMult = 1.0;

  /**
   * Reset gimmick state (call on game start/stage change)
   */
  function reset() {
    _swappedTiles.clear();
    _lastSwapTime = 0;
    _stormPulseTimer = 0;
    _stormPulseMult = 1.0;
  }

  /**
   * Get current gimmick config from StageConfig
   */
  function getCurrentGimmick() {
    const effective = window.GameModules?.StageConfig?.getEffective?.() ?? {};
    return effective.gimmick ?? { id: 'NONE', params: {} };
  }

  /**
   * Get current theme/palette from StageConfig
   */
  function getCurrentTheme() {
    const effective = window.GameModules?.StageConfig?.getEffective?.() ?? {};
    return effective.theme ?? { paletteId: 'DEFAULT' };
  }

  // ============================================
  // SAFE_FADE: Safe color glow during STOP phase
  // ============================================

  /**
   * Calculate safe tile glow intensity for SAFE_FADE gimmick
   * @param {string} gameState - Current game state (RUN/WARNING/STOP)
   * @param {number} cycleTimer - Remaining time in current phase
   * @param {number} stopPhaseDuration - Total STOP phase duration
   * @returns {number} Glow intensity (0-1), 0 if gimmick not active
   */
  function getSafeFadeIntensity(gameState, cycleTimer, stopPhaseDuration) {
    const gimmick = getCurrentGimmick();
    if (gimmick.id !== 'SAFE_FADE') return 0;

    const STATE = window.GameModules?.Runtime?.STATE ?? {};
    if (gameState !== STATE.STOP) return 0;

    const intensity = gimmick.params?.intensity ?? 0.5;
    // Pulse effect during STOP phase
    const pulseSpeed = 3.0;
    const elapsed = stopPhaseDuration - cycleTimer;
    const pulse = Math.sin(elapsed * pulseSpeed * Math.PI) * 0.5 + 0.5;

    return intensity * pulse;
  }

  /**
   * Get glow color for safe tiles (based on palette)
   * @returns {string} Hex color for glow effect
   */
  function getSafeFadeGlowColor() {
    const theme = getCurrentTheme();
    const palette = window.STAGE_PALETTES?.[theme.paletteId] ?? window.STAGE_PALETTES?.DEFAULT;
    return palette?.safeColor ?? '#00ff00';
  }

  // ============================================
  // GLITCH_SWAP: Random color swaps during WARNING
  // ============================================

  /**
   * Update GLITCH_SWAP state (call from loop.js)
   * @param {string} gameState - Current game state
   * @param {number} nowSec - Current time in seconds
   * @param {Object} runtime - Game runtime object
   */
  function updateGlitchSwap(gameState, nowSec, runtime) {
    const gimmick = getCurrentGimmick();
    if (gimmick.id !== 'GLITCH_SWAP') {
      _swappedTiles.clear();
      return;
    }

    const STATE = window.GameModules?.Runtime?.STATE ?? {};

    // Only active during WARNING
    if (gameState !== STATE.WARNING) {
      _swappedTiles.clear();
      return;
    }

    const rate = gimmick.params?.rate ?? 0.3;
    const maxSwapsPerSecond = gimmick.params?.maxSwapsPerSecond ?? 2;
    const swapInterval = 1.0 / maxSwapsPerSecond;

    if (nowSec - _lastSwapTime < swapInterval) return;
    _lastSwapTime = nowSec;

    // Get visible row range
    const player = runtime?.player ?? window.player;
    if (!player) return;

    const CELL_H = runtime?.grid?.CELL_H ?? 100;
    const COLS = runtime?.grid?.COLS ?? 6;
    const playerRow = Math.floor(player.y / CELL_H);
    const viewRange = 15; // Rows visible on screen

    // Random swap some tiles
    for (let r = playerRow - 5; r <= playerRow + viewRange; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < rate * 0.1) { // Low probability per tile
          const key = `${r}:${c}`;
          const rowData = window.Game?.LevelManager?.getRow?.(r);
          if (!rowData) continue;

          const originalColor = rowData.colors[c];
          // Swap to a different random color
          let newColor;
          do {
            newColor = Math.floor(Math.random() * 6);
          } while (newColor === originalColor);

          _swappedTiles.set(key, newColor);

          // Clear swap after a short time
          setTimeout(() => {
            _swappedTiles.delete(key);
          }, 200 + Math.random() * 300);
        }
      }
    }
  }

  /**
   * Get swapped color for a tile (if any)
   * @param {number} row - Tile row
   * @param {number} col - Tile column
   * @returns {number|null} Swapped color index or null if not swapped
   */
  function getSwappedColor(row, col) {
    const key = `${row}:${col}`;
    return _swappedTiles.has(key) ? _swappedTiles.get(key) : null;
  }

  /**
   * Check if GLITCH_SWAP is active
   */
  function isGlitchSwapActive() {
    const gimmick = getCurrentGimmick();
    return gimmick.id === 'GLITCH_SWAP' && _swappedTiles.size > 0;
  }

  /**
   * Get visual glitch intensity for screen effects
   */
  function getGlitchIntensity(gameState) {
    const gimmick = getCurrentGimmick();
    if (gimmick.id !== 'GLITCH_SWAP') return 0;

    const STATE = window.GameModules?.Runtime?.STATE ?? {};
    if (gameState !== STATE.WARNING) return 0;

    return gimmick.params?.rate ?? 0.3;
  }

  // ============================================
  // STORM_PULSE: Storm speed modulation
  // ============================================

  /**
   * Update STORM_PULSE timer and calculate multiplier
   * @param {number} dt - Delta time
   * @param {string} gameState - Current game state
   * @returns {number} Storm speed multiplier (1.0 = normal)
   */
  function updateStormPulse(dt, gameState) {
    const gimmick = getCurrentGimmick();
    if (gimmick.id !== 'STORM_PULSE') {
      _stormPulseMult = 1.0;
      _stormPulseTimer = 0;
      return 1.0;
    }

    const interval = gimmick.params?.interval ?? 3.0;
    const duration = gimmick.params?.duration ?? 0.5;
    const mult = gimmick.params?.mult ?? 1.5;

    _stormPulseTimer += dt;

    // Check if we're in a pulse
    const cycleTime = _stormPulseTimer % interval;
    if (cycleTime < duration) {
      // During pulse - ease in/out
      const pulseProgress = cycleTime / duration;
      const easedPulse = Math.sin(pulseProgress * Math.PI); // 0 -> 1 -> 0
      _stormPulseMult = 1.0 + (mult - 1.0) * easedPulse;
    } else {
      _stormPulseMult = 1.0;
    }

    return _stormPulseMult;
  }

  /**
   * Get current storm pulse multiplier
   */
  function getStormPulseMult() {
    return _stormPulseMult;
  }

  /**
   * Check if storm is currently pulsing (for visual feedback)
   */
  function isStormPulsing() {
    const gimmick = getCurrentGimmick();
    if (gimmick.id !== 'STORM_PULSE') return false;
    return _stormPulseMult > 1.05;
  }

  // ============================================
  // Palette Helpers
  // ============================================

  /**
   * Get palette colors for current stage
   * @returns {string[]} Array of hex colors
   */
  function getPaletteColors() {
    const theme = getCurrentTheme();
    const palette = window.STAGE_PALETTES?.[theme.paletteId] ?? window.STAGE_PALETTES?.DEFAULT;
    return palette?.colors ?? ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];
  }

  /**
   * Get danger color for current palette
   */
  function getDangerColor() {
    const theme = getCurrentTheme();
    const palette = window.STAGE_PALETTES?.[theme.paletteId] ?? window.STAGE_PALETTES?.DEFAULT;
    return palette?.dangerColor ?? '#e74c3c';
  }

  // ============================================
  // Module Export
  // ============================================

  window.GameModules.Gimmick = {
    // Core
    reset,
    getCurrentGimmick,
    getCurrentTheme,

    // SAFE_FADE
    getSafeFadeIntensity,
    getSafeFadeGlowColor,

    // GLITCH_SWAP
    updateGlitchSwap,
    getSwappedColor,
    isGlitchSwapActive,
    getGlitchIntensity,

    // STORM_PULSE
    updateStormPulse,
    getStormPulseMult,
    isStormPulsing,

    // Palette
    getPaletteColors,
    getDangerColor
  };

  console.log('[GIMMICK] Module loaded');
})();
