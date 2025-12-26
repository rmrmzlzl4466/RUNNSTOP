(function() {
  'use strict';

  /**
   * GLOBAL_CONFIG - 전 스테이지 동일하게 적용되는 설정
   * 게임 메카닉의 핵심 규칙들
   */
  const GLOBAL_CONFIG = {
    // === 입력 ===
    joystickSens: 2.0,       // 조이스틱 민감도 (1.0~3.0)
    wallPaddingCap: 25,      // 벽 이동 제한 상한선

    // === 부스터 메카닉 ===
    boostDist: 1000,              // 부스터 이동 거리
    boostInvincibleDuration: 1.0, // 부스트 종료 후 무적 시간 (초)
    jfbDelayMin: 0.0,             // JFB Wait Phase 최소 딜레이
    jfbDelayMax: 0.0,             // JFB Wait Phase 최대 딜레이
    jfbWindow: 0.35,              // JFB Active Window 지속 시간

    // === 점수 기본값 ===
    scorePerSecond: 50,
    scorePerMeter: 10,
    scorePerBit: 50,
    scorePerCoin: 200,
    scorePerGem: 1000,

    // === 사운드 ===
    sfxVol: 1.0,
    bgmVol: 0.15,
    scoreSfxVol: 0.20,
    coinSfxVol: 0.10,
    itemSfxVol: 0.15,
    dashSfxVol: 0.4,

    // === 비주얼 ===
    trailLength: 90,
    trailOpacity: 0.6,
    visualMode: 'A',
    playerScale: 1.2,
    cameraOffsetPct: 0.75,

    // === 카메라 ===
    camera: {
      zoomRun: 1.0,
      zoomWarning: 1.15,
      zoomStop: 1.35,
      zoomBoost: 0.85,
      lerpRunToWarning: 0.15,
      lerpWarningToStop: 8.0,
      lerpStopToBoost: 15.0,
      lerpBoostToRun: 1.5,
      lerpDefault: 3.0,
      panRatioX: 0.35
    },

    // === 규칙 ===
    deathDelay: 1.0,
    safetyThreshold: 0.4    // 생존 판정 비율 (0.1~0.9)
  };

  /**
   * STAGE_DEFAULTS - 스테이지별 조절 가능한 설정의 기본값
   * 각 스테이지에서 오버라이드 가능
   */
  const STAGE_DEFAULTS = {
    // === 물리 ===
    baseSpeed: 960,
    friction: 0.93,          // 이동 중 마찰 (높을수록 미끄러움)
    stopFriction: 0.81,      // 정지 시 마찰
    baseAccel: 3000,
    turnAccelMult: 4.5,      // 방향 전환 가속도 배율

    // === 대쉬 ===
    dashForce: 1000,         // Legacy 고정 대쉬
    minDashForce: 600,       // 차징 최소 힘
    maxDashForce: 4000,      // 차징 최대 힘
    maxChargeTime: 1.2,      // 풀 차징 시간
    dashCooldown: 0.7,       // 대쉬 쿨다운
    chargeSlowdown: 1.0,     // 차징 중 속도 감소율

    // === 마그넷 ===
    baseMagnet: 50,
    magnetRange: 160,

    // === 스폰 ===
    coinRate: 0.3,
    minCoinRunLength: 13,
    itemRate: 0.03,
    itemWeights: { barrier: 0.2, booster: 0.4, magnet: 0.4 },

    // === 속도 ===
    stormBaseSpeed: 150,
    stormSpeedMult: 1.0,
    baseSpeedMult: 1.0,

    // === 타이밍 ===
    firstWarningTimeBase: 12.0,  // 첫 경고 시간
    runPhaseDuration: 3.0,       // RUN 상태 지속
    warningTimeBase: 7.0,        // 경고 기본 시간
    warningTimeMin: 3.0,         // 경고 최소 시간
    warningTimeMult: 1.0,        // 경고 시간 배율
    stopPhaseDuration: 0.5,      // STOP 상태 지속

    // === 점수 ===
    scoreMult: 1.0,

    // === 모프 ===
    morphTrigger: 3.5,
    morphDuration: 0.5
  };

  /**
   * 스탯 계산 공식 (업그레이드 시스템용)
   */
  const Formulas = {
    getSpeed: (lvl, base) => base + (lvl - 1) * 20,
    getCool: (lvl) => Math.max(0.3, 1.0 - (lvl - 1) * 0.05),
    getMagnetBonus: (lvl) => (lvl - 1) * 10,
    getGreed: (lvl) => 1.0 + (lvl - 1) * 0.1,
    getUpgradeCost: (lvl) => lvl * 100
  };

  /**
   * createQAConfig - GLOBAL + STAGE_DEFAULTS 병합하여 qaConfig 생성
   */
  function createFullConfig() {
    return {
      ...GLOBAL_CONFIG,
      ...STAGE_DEFAULTS,
      camera: { ...GLOBAL_CONFIG.camera }
    };
  }

  // Export
  window.GameConfig = {
    GLOBAL: GLOBAL_CONFIG,
    STAGE_DEFAULTS: STAGE_DEFAULTS,
    Formulas,
    createFullConfig
  };
})();
