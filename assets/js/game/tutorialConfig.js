(function() {
  'use strict';

  const TUTORIAL_STEP_CONFIG = {
    1: {
      name: '기본 조작',
      description: '이동과 대쉬를 익혀요',
      lockGameState: 'RUN',
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      successCondition: { moveCount: 1, dashCount: 1 },
      hints: ['좌우로 움직여 보세요', '대쉬 버튼을 눌러보세요']
    },
    2: {
      name: '핵심 메커니즘',
      description: 'RUN / WARNING / STOP 사이클 체험',
      lockGameState: null,
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      warningTimeBase: 10.0,
      stopPhaseDuration: 2.0,
      successCondition: { safeJudgmentCount: 2 },
      hints: ['경고 시 안전 색상을 찾아요', 'STOP에서 안전 타일에 서세요']
    },
    3: {
      name: '위험 요소',
      description: '스톰과 장애물을 피하며 달리기',
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 0.5,
      obstaclesEnabled: true,
      itemsEnabled: true,
      successCondition: { distance: 300 },
      hints: ['스톰 경고에 주의하세요', '아이템 효과를 체험하세요']
    },
    4: {
      name: '실전 시뮬레이션',
      description: '500m 완주로 마무리',
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 1.0,
      obstaclesEnabled: true,
      itemsEnabled: true,
      successCondition: { distance: 500 },
      hints: []
    }
  };

  function getConfig(step) {
    return TUTORIAL_STEP_CONFIG[step] || TUTORIAL_STEP_CONFIG[1];
  }

  function applyOverrides(effectiveConfig, step) {
    const stepCfg = getConfig(step);
    if (!stepCfg) return effectiveConfig;

    const nextConfig = { ...effectiveConfig };

    if (stepCfg.warningTimeBase !== undefined) nextConfig.warningTimeBase = stepCfg.warningTimeBase;
    if (stepCfg.stopPhaseDuration !== undefined) nextConfig.stopPhaseDuration = stepCfg.stopPhaseDuration;
    if (stepCfg.stormSpeedMult !== undefined) {
      nextConfig.stormSpeed *= stepCfg.stormSpeedMult;
      nextConfig.stormSpeedMult *= stepCfg.stormSpeedMult;
    }

    // 아이템/코인 비활성화
    if (stepCfg.itemsEnabled === false) {
      nextConfig.coinRate = 0;
      nextConfig.minCoinRunLength = 0;
      nextConfig.barrierRate = 0;
      nextConfig.boosterRate = 0;
      nextConfig.magnetRate = 0;
    }

    return nextConfig;
  }

  window.TutorialConfig = {
    STEP_CONFIG: TUTORIAL_STEP_CONFIG,
    getConfig,
    applyOverrides
  };
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialConfig = window.TutorialConfig;
})();
