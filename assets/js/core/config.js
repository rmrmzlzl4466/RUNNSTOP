(function() {
  const defaultQAConfig = {
    // Economy
    coinRate: 0.3,
    itemRate: 0.03,
    minCoinRunLength: 13,

    // Physics
    baseSpeed: 960,
    friction: 0.93,
    stopFriction: 0.81,
    baseAccel: 3000,
    turnAccelMult: 4.5,    // [추가] 방향 전환 가속도 배율 (기본 2배)
    dashForce: 1000,       // [Legacy] 기존 고정 대쉬 힘 (하위 호환용)
    minDashForce: 600,     // 차징: 최소 대쉬 힘 (짧은 탭)
    maxDashForce: 4000,    // 차징: 최대 대쉬 힘 (풀 차징, 최대 5000)
    maxChargeTime: 1.2,    // 차징: 풀 차징까지 걸리는 시간 (초)
    dashCooldown: 0.7,     // 대쉬 쿨다운 (초)
    chargeSlowdown: 1.0,   // 차징 중 이동속도 감소율 (0.0=정지, 1.0=감소없음)
    joystickSens: 2.0, // 조이스틱 X축 민감도 (1.0~3.0)
    playerScale: 1.2,
    wallPaddingCap: 25, // 벽 이동 제한 상한선 (Giant Mode 대응)

    // Rules
    baseMagnet: 50,
    magnetRange: 160,
    stormBaseSpeed: 150,
    boostDist: 1000,
    deathDelay: 1.0,
    morphTrigger: 3.5,
    morphDuration: 0.5,
    cycleSpeedMult: 1.0,
    stopPhaseDuration: 0.5,
    safetyThreshold: 0.4, // 생존 판정: 안전 패널과 겹치는 비율 (0.1~0.9)
    stageLength: 2500, // 테마 전환 및 게이지 구간 길이 (m)

    // [JFB v2] Just Frame Booster (Reflex Mode)
    jfbDelayMin: 0.0,    // Wait Phase 최소 딜레이 (초)
    jfbDelayMax: 0.0,    // Wait Phase 최대 딜레이 (초)
    jfbWindow: 0.35,      // Active Window 지속 시간 (초)

    // Scoring
    scorePerSecond: 50,
    scorePerMeter: 10,
    scorePerBit: 50,
    scorePerCoin: 200,
    scorePerGem: 1000,

    // Sound
    sfxVol: 1.0,
    bgmVol: 0.15,
    scoreSfxVol: 0.20,
    coinSfxVol: 0.10,
    itemSfxVol: 0.15,
    dashSfxVol: 0.4,

    // Visuals
    trailLength: 90,
    trailOpacity: 0.6,
    visualMode: 'A',
    cameraOffsetPct: 0.75,

    // Dynamic Camera Zoom Settings
    camera: {
      // Zoom levels per state
      zoomRun: 1.0,        // RUN 상태 기본 줌
      zoomWarning: 1.15,   // WARNING 상태 줌 (조여오는 압박)
      zoomStop: 1.35,      // STOP 상태 줌 (최대 확대, 집중)
      zoomBoost: 0.85,     // BOOST 상태 줌 (광각, 해방감)

      // Transition speeds (lerp factor per second)
      // Higher = faster transition
      lerpRunToWarning: 0.15,    // 느리게 (5-7초에 걸쳐 천천히)
      lerpWarningToStop: 8.0,    // 빠르게 (0.2-0.3초)
      lerpStopToBoost: 15.0,     // 매우 빠르게 (0.1초)
      lerpBoostToRun: 1.5,       // 부드럽게 (1.0초)

      // Default lerp for other transitions
      lerpDefault: 3.0,

      // Horizontal Stabilization (X축 안정화)
      // 0.0 = 완전 고정 (화면 중앙), 1.0 = 플레이어 1:1 추적
      panRatioX: 0.35
    }
  };

  // 스탯 계산 공식 중앙화 - 매직 넘버 제거
  const Formulas = {
    // 이동속도: 기본값 + (레벨-1) * 20
    getSpeed: (lvl, base) => base + (lvl - 1) * 20,

    // 대시 쿨다운: 최소 0.3초, 레벨당 0.05초 감소
    getCool: (lvl) => Math.max(0.3, 1.0 - (lvl - 1) * 0.05),

    // 마그넷 보너스 범위: (레벨-1) * 10
    getMagnetBonus: (lvl) => (lvl - 1) * 10,

    // 코인 배율: 1.0 + (레벨-1) * 0.1
    getGreed: (lvl) => 1.0 + (lvl - 1) * 0.1,

    // 업그레이드 비용: 레벨 * 100
    getUpgradeCost: (lvl) => lvl * 100
  };

  window.GameConfig = { defaultQAConfig, Formulas };
})();
