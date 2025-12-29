/**
 * Stage Configuration Data
 *
 * ====================================
 * STAGE STRUCTURE
 * ====================================
 *
 * - Stages 1-10: Main progression (unique experiences)
 * - Stages 11-13: Loop section (repeats infinitely after completion)
 *
 * ====================================
 * FIELD CLASSIFICATION (POLICY-B)
 * ====================================
 *
 * GLOBAL-ONLY KEYS (QA 탭에서만 조절, Stage tuning 무시):
 * - runPhaseDuration, stopPhaseDuration
 * - firstWarningTimeBase, warningTimeBase, warningTimeMin, warningTimeMult
 * - friction, stopFriction, baseAccel, turnAccelMult
 * - minDashForce, maxDashForce, maxChargeTime, dashCooldown, chargeSlowdown
 * - baseMagnet, magnetRange, morphTrigger, morphDuration
 *
 * STAGE-ONLY KEYS (Stage Tuning에서만 조절):
 * - coinRate, minCoinRunLength
 * - barrierRate (실드 드랍률 - 모든 행)
 * - boosterRate, magnetRate (코인 라인 끝에서 드랍률)
 * - stormSpeedMult, baseSpeedMult
 * - scoreMult
 * - theme, gimmick
 *
 * ====================================
 * THEME/GIMMICK SCHEMA (Section C)
 * ====================================
 *
 * theme: {
 *   paletteId: 'NEON_CITY' | 'CIRCUIT' | 'GLITCH' | 'VOID' | 'SUNSET' | 'STORM' | 'DEFAULT',
 *   safeColorBias?: number (0-1, optional emphasis on safe color)
 * }
 *
 * gimmick: {
 *   id: 'NONE' | 'SAFE_FADE' | 'GLITCH_SWAP' | 'STORM_PULSE',
 *   params: { ... gimmick-specific parameters ... }
 * }
 *
 * Gimmick Params:
 * - SAFE_FADE: { intensity: 0.0-1.0 }
 * - GLITCH_SWAP: { rate: 0.0-1.0, maxSwapsPerSecond: number }
 * - STORM_PULSE: { interval: seconds, duration: seconds, mult: 1.0-2.0 }
 */

// ====================================
// STAGE TUNING DEFAULTS
// ====================================
// STAGE-ONLY 키만 포함 (Global-only 키는 제거됨)
window.STAGE_TUNING_DEFAULTS = {
  // Economy (STAGE-ONLY)
  coinRate: null,
  minCoinRunLength: null,
  // Item Drop Rates (STAGE-ONLY) - 개별 아이템 드랍률
  barrierRate: null,   // 실드 드랍률 (모든 행에서)
  boosterRate: null,   // 부스터 드랍률 (코인 라인 끝에서)
  magnetRate: null,    // 자석 드랍률 (코인 라인 끝에서)
  // Speed curves (STAGE-ONLY)
  stormSpeedMult: null,
  baseSpeedMult: null,
  // Score (STAGE-ONLY)
  scoreMult: null,
  // Theme/Gimmick (STAGE-ONLY, Section C)
  theme: null,
  gimmick: null
  // NOTE: Global-only timing values are NOT included here
  // They are always taken from qaConfig (see stageConfig.js POLICY-B)
};

// ====================================
// PALETTE DEFINITIONS (Section C)
// ====================================
window.STAGE_PALETTES = {
  DEFAULT: {
    id: 'DEFAULT',
    name: 'Default',
    colors: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'],
    safeColor: '#2ecc71',
    dangerColor: '#e74c3c'
  },
  NEON_CITY: {
    id: 'NEON_CITY',
    name: 'Neon City',
    colors: ['#ff0080', '#00ffff', '#00ff41', '#ffff00', '#ff00ff', '#0080ff'],
    safeColor: '#00ff41',
    dangerColor: '#ff0080'
  },
  CIRCUIT: {
    id: 'CIRCUIT',
    name: 'Circuit Board',
    colors: ['#00ff00', '#003300', '#00cc00', '#006600', '#00ff66', '#009933'],
    safeColor: '#00ff00',
    dangerColor: '#003300'
  },
  GLITCH: {
    id: 'GLITCH',
    name: 'Glitch',
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff'],
    safeColor: '#00ff00',
    dangerColor: '#ff0000'
  },
  VOID: {
    id: 'VOID',
    name: 'Void',
    colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483', '#000000'],
    safeColor: '#0f3460',
    dangerColor: '#e94560'
  },
  SUNSET: {
    id: 'SUNSET',
    name: 'Sunset',
    colors: ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#341f97'],
    safeColor: '#54a0ff',
    dangerColor: '#ff6b6b'
  },
  STORM: {
    id: 'STORM',
    name: 'Storm',
    colors: ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7', '#1a252f'],
    safeColor: '#95a5a6',
    dangerColor: '#2c3e50'
  }
};

// ====================================
// GIMMICK DEFINITIONS (Section C)
// ====================================
window.GIMMICK_TYPES = {
  NONE: {
    id: 'NONE',
    name: 'None',
    description: 'No special gimmick'
  },
  SAFE_FADE: {
    id: 'SAFE_FADE',
    name: 'Safe Fade',
    description: 'Safe color panels glow during STOP phase',
    defaultParams: { intensity: 0.5 }
  },
  GLITCH_SWAP: {
    id: 'GLITCH_SWAP',
    name: 'Glitch Swap',
    description: 'Panels randomly swap colors during WARNING',
    defaultParams: { rate: 0.3, maxSwapsPerSecond: 2 }
  },
  STORM_PULSE: {
    id: 'STORM_PULSE',
    name: 'Storm Pulse',
    description: 'Storm speed pulses periodically',
    defaultParams: { interval: 3.0, duration: 0.5, mult: 1.5 }
  }
};

// ====================================
// STAGE CONFIGURATIONS
// ====================================
window.STAGE_CONFIG = [
  // ============================================
  // Main Progression (1-10)
  // ============================================
  {
    id: 1,
    themeIdx: 0,
    length: 2000,
    name: "BOOT SEQUENCE",
    theme: { paletteId: 'DEFAULT' },
    gimmick: { id: 'NONE', params: {} },
    tuning: {
      // Tutorial - use defaults
    }
  },
  {
    id: 2,
    themeIdx: 0,
    length: 2300,
    name: "DIGITAL CIRCUIT",
    theme: { paletteId: 'CIRCUIT' },
    gimmick: { id: 'NONE', params: {} },
    tuning: {
      stormSpeedMult: 1.05
    }
  },
  {
    id: 3,
    themeIdx: 1,
    length: 2600,
    name: "NEON ALLEY",
    theme: { paletteId: 'NEON_CITY' },
    gimmick: { id: 'SAFE_FADE', params: { intensity: 0.3 } },
    tuning: {
      stormSpeedMult: 1.1
    }
  },
  {
    id: 4,
    themeIdx: 1,
    length: 2900,
    name: "GLITCH CITY",
    theme: { paletteId: 'GLITCH' },
    gimmick: { id: 'GLITCH_SWAP', params: { rate: 0.2, maxSwapsPerSecond: 1 } },
    tuning: {
      stormSpeedMult: 1.15
    }
  },
  {
    id: 5,
    themeIdx: 0,
    length: 3200,
    name: "DATA HIGHWAY",
    theme: { paletteId: 'CIRCUIT' },
    gimmick: { id: 'STORM_PULSE', params: { interval: 4.0, duration: 0.5, mult: 1.3 } },
    tuning: {
      baseSpeedMult: 1.1,
      stormSpeedMult: 1.2
    }
  },
  {
    id: 6,
    themeIdx: 2,
    length: 3500,
    name: "VOID ENTRANCE",
    theme: { paletteId: 'VOID' },
    gimmick: { id: 'SAFE_FADE', params: { intensity: 0.5 } },
    tuning: {
      stormSpeedMult: 1.25
    }
  },
  {
    id: 7,
    themeIdx: 1,
    length: 3800,
    name: "CYBER STORM",
    theme: { paletteId: 'STORM' },
    gimmick: { id: 'STORM_PULSE', params: { interval: 3.0, duration: 0.8, mult: 1.5 } },
    tuning: {
      stormSpeedMult: 1.35
    }
  },
  {
    id: 8,
    themeIdx: 2,
    length: 4100,
    name: "THE VOID",
    theme: { paletteId: 'VOID' },
    gimmick: { id: 'GLITCH_SWAP', params: { rate: 0.4, maxSwapsPerSecond: 2 } },
    tuning: {
      stormSpeedMult: 1.4,
      scoreMult: 1.5
    }
  },
  {
    id: 9,
    themeIdx: 0,
    length: 4400,
    name: "SYSTEM REBOOT",
    theme: { paletteId: 'CIRCUIT' },
    gimmick: { id: 'SAFE_FADE', params: { intensity: 0.6 } },
    tuning: {
      stormSpeedMult: 1.3
    }
  },
  {
    id: 10,
    themeIdx: 2,
    length: 4500,
    name: "INFINITE HORIZON",
    theme: { paletteId: 'SUNSET' },
    gimmick: { id: 'STORM_PULSE', params: { interval: 2.5, duration: 1.0, mult: 1.8 } },
    tuning: {
      stormSpeedMult: 1.5,
      scoreMult: 2.0
    }
  },

  // ============================================
  // Loop Section (11-13) - Repeats forever
  // ============================================
  {
    id: 11,
    themeIdx: 0,
    length: 3500,
    name: "LOOP: ALPHA",
    isLoop: true,
    theme: { paletteId: 'NEON_CITY' },
    gimmick: { id: 'GLITCH_SWAP', params: { rate: 0.3, maxSwapsPerSecond: 2 } },
    tuning: {
      stormSpeedMult: 1.4,
      scoreMult: 2.5
    }
  },
  {
    id: 12,
    themeIdx: 1,
    length: 4000,
    name: "LOOP: BETA",
    isLoop: true,
    theme: { paletteId: 'GLITCH' },
    gimmick: { id: 'STORM_PULSE', params: { interval: 2.0, duration: 0.8, mult: 1.6 } },
    tuning: {
      stormSpeedMult: 1.5,
      scoreMult: 3.0
    }
  },
  {
    id: 13,
    themeIdx: 2,
    length: 4500,
    name: "LOOP: OMEGA",
    isLoop: true,
    theme: { paletteId: 'VOID' },
    gimmick: { id: 'SAFE_FADE', params: { intensity: 0.8 } },
    tuning: {
      stormSpeedMult: 1.6,
      scoreMult: 4.0
    }
  }
];

// ============================================
// Precomputed values for performance
// ============================================
window.STAGE_CUMULATIVE = [];
window.LOOP_START_DISTANCE = 0;
window.LOOP_SECTION_LENGTH = 0;
window.LOOP_START_INDEX = 10;

(function() {
  let cumulative = 0;

  window.STAGE_CONFIG.forEach((stage, idx) => {
    window.STAGE_CUMULATIVE[idx] = cumulative;
    cumulative += stage.length;

    if (stage.isLoop && window.LOOP_START_DISTANCE === 0) {
      window.LOOP_START_DISTANCE = window.STAGE_CUMULATIVE[idx];
      window.LOOP_START_INDEX = idx;
    }
  });

  const loopStages = window.STAGE_CONFIG.filter(s => s.isLoop);
  window.LOOP_SECTION_LENGTH = loopStages.reduce((sum, s) => sum + s.length, 0);

  console.log('[STAGES] Configuration loaded:');
  console.log('  - Total stages:', window.STAGE_CONFIG.length);
  console.log('  - Loop starts at:', window.LOOP_START_DISTANCE + 'm (Stage ' + (window.LOOP_START_INDEX + 1) + ')');
  console.log('  - Loop cycle length:', window.LOOP_SECTION_LENGTH + 'm');
  console.log('  - Palettes available:', Object.keys(window.STAGE_PALETTES).join(', '));
  console.log('  - Gimmicks available:', Object.keys(window.GIMMICK_TYPES).join(', '));
})();
