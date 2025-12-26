/**
 * Stage Configuration Data
 *
 * - Stages 1-10: Main progression (unique experiences)
 * - Stages 11-13: Loop section (repeats infinitely after completion)
 *
 * Per-Stage Tuning:
 * 스테이지별로 오버라이드할 값만 tuning 객체에 추가
 * null = STAGE_DEFAULTS 사용 (core/config.js)
 *
 * 사용 가능한 tuning 필드:
 * - 물리: baseSpeed, friction, stopFriction, baseAccel, turnAccelMult
 * - 대쉬: dashForce, minDashForce, maxDashForce, maxChargeTime, dashCooldown, chargeSlowdown
 * - 마그넷: baseMagnet, magnetRange
 * - 스폰: coinRate, minCoinRunLength, itemRate, itemWeights
 * - 속도: stormBaseSpeed, stormSpeedMult, baseSpeedMult
 * - 타이밍: firstWarningTimeBase, runPhaseDuration, warningTimeBase, warningTimeMin, warningTimeMult, stopPhaseDuration (기본적으로 전역 제어)
 * - 점수: scoreMult
 * - 모프: morphTrigger, morphDuration
 *
 * Global-only vs Stage-tunable:
 * - Global-only (qaConfig): runPhaseDuration, firstWarningTimeBase, warningTimeBase, warningTimeMin, warningTimeMult, stopPhaseDuration, stormBaseSpeed
 * - Stage-tunable: coinRate, itemRate, stormSpeedMult, baseSpeedMult, scoreMult, itemWeights, physics values (friction 등)
 */

// Stage tuning defaults (null = use qaConfig/global defaults)
window.STAGE_TUNING_DEFAULTS = {
  coinRate: null,
  minCoinRunLength: null,
  itemRate: null,
  itemWeights: null,
  stormSpeedMult: null,
  baseSpeedMult: null,
  scoreMult: null,
  // Global-only timing values intentionally null to enforce qaConfig control
  firstWarningTimeBase: null,
  runPhaseDuration: null,
  warningTimeBase: null,
  warningTimeMin: null,
  warningTimeMult: null,
  stopPhaseDuration: null
};

window.STAGE_CONFIG = [
  // ============================================
  // Main Progression (1-10)
  // ============================================
  {
    id: 1,
    themeIdx: 0,
    length: 2000,
    name: "BOOT SEQUENCE",
    tuning: {
      // 튜토리얼 느낌 - 기본값 사용
    }
  },
  {
    id: 2,
    themeIdx: 0,
    length: 2300,
    name: "DIGITAL CIRCUIT",
    tuning: {
      // 약간 빨라지기 시작
      stormSpeedMult: 1.05
    }
  },
  {
    id: 3,
    themeIdx: 1,
    length: 2600,
    name: "NEON ALLEY",
    tuning: {
      // 네온 거리 - 미끄러운 바닥
      friction: 0.96,
      stopFriction: 0.88,
      stormSpeedMult: 1.1
    }
  },
  {
    id: 4,
    themeIdx: 1,
    length: 2900,
    name: "GLITCH CITY",
    tuning: {
      // 글리치 - 예측 불가능한 물리
      friction: 0.90,
      turnAccelMult: 5.5,
      stormSpeedMult: 1.15
    }
  },
  {
    id: 5,
    themeIdx: 0,
    length: 3200,
    name: "DATA HIGHWAY",
    tuning: {
      // 고속도로 - 빠른 속도
      baseSpeed: 1100,
      stormSpeedMult: 1.2
    }
  },
  {
    id: 6,
    themeIdx: 2,
    length: 3500,
    name: "VOID ENTRANCE",
    tuning: {
      // 보이드 입구 - 무거운 느낌
      friction: 0.85,
      stopFriction: 0.75,
      baseAccel: 2500,
      stormSpeedMult: 1.25
    }
  },
  {
    id: 7,
    themeIdx: 1,
    length: 3800,
    name: "CYBER STORM",
    tuning: {
      // 사이버 폭풍 - 빠르고 위험
      stormSpeedMult: 1.35,
      warningTimeBase: null,
      stopPhaseDuration: null
    }
  },
  {
    id: 8,
    themeIdx: 2,
    length: 4100,
    name: "THE VOID",
    tuning: {
      // 보이드 본체 - 극한 환경
      friction: 0.80,
      stopFriction: 0.70,
      stormSpeedMult: 1.4,
      scoreMult: 1.5
    }
  },
  {
    id: 9,
    themeIdx: 0,
    length: 4400,
    name: "SYSTEM REBOOT",
    tuning: {
      // 재부팅 - 정상화되는 느낌
      stormSpeedMult: 1.3
    }
  },
  {
    id: 10,
    themeIdx: 2,
    length: 4500,
    name: "INFINITE HORIZON",
    tuning: {
      // 마지막 스테이지 - 최고 난이도
      stormSpeedMult: 1.5,
      warningTimeBase: null,
      stopPhaseDuration: null,
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
    tuning: {
      stormSpeedMult: 1.4,
      warningTimeBase: null,
      scoreMult: 2.5
    }
  },
  {
    id: 12,
    themeIdx: 1,
    length: 4000,
    name: "LOOP: BETA",
    isLoop: true,
    tuning: {
      // 빙판 루프
      friction: 0.97,
      stopFriction: 0.92,
      stormSpeedMult: 1.5,
      warningTimeBase: null,
      scoreMult: 3.0
    }
  },
  {
    id: 13,
    themeIdx: 2,
    length: 4500,
    name: "LOOP: OMEGA",
    isLoop: true,
    tuning: {
      // 최종 루프 - 극한
      friction: 0.78,
      stopFriction: 0.68,
      stormSpeedMult: 1.6,
      warningTimeBase: null,
      stopPhaseDuration: null,
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
})();
