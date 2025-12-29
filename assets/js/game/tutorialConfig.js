(function() {
  'use strict';

  const TUTORIAL_STEP_CONFIG = {
    1: {
      name: 'Welcome Sequence',
      description: '기본 이동과 STOP 규칙을 익히는 단계',
      lockGameState: 'run_only',
      enableStorm: true,
      enableObstacles: false,
      enableItems: false,
      stormSpeedMult: 0.7,
      warningTimeBase: 9.0,
      stopPhaseDuration: 0.6,
      success: { moveCount: 1, dashCount: 0, safeJudgmentCount: 1, distance: 150 },
      hints: ['화면의 안내에 따라 이동을 연습하세요.', 'STOP 표시 시 즉시 멈추면 안전합니다.']
    },
    2: {
      name: 'Dash Basics',
      description: '대쉬 차징과 사용 타이밍을 익히는 단계',
      lockGameState: 'run_warning',
      enableStorm: true,
      enableObstacles: true,
      enableItems: false,
      stormSpeedMult: 0.85,
      warningTimeBase: 8.0,
      stopPhaseDuration: 0.6,
      success: { moveCount: 2, dashCount: 2, safeJudgmentCount: 2, distance: 250 },
      hints: ['길을 가로막는 장애물을 대쉬로 통과해보세요.', 'STOP 전에 대쉬를 마치고 안전 구역에 서세요.']
    },
    3: {
      name: 'Storm Awareness',
      description: '스톰 속도와 경고 시간을 조율하는 단계',
      lockGameState: 'full_cycle',
      enableStorm: true,
      enableObstacles: true,
      enableItems: true,
      stormSpeedMult: 1.0,
      warningTimeBase: 7.0,
      stopPhaseDuration: 0.55,
      success: { moveCount: 3, dashCount: 3, safeJudgmentCount: 3, distance: 300 },
      hints: ['경고 시간이 짧아지니 패턴을 미리 읽으세요.', '아이템을 활용해 안전 구역을 확보하세요.']
    },
    4: {
      name: 'Final Check',
      description: '튜토리얼에서 배운 내용을 종합적으로 검증',
      lockGameState: 'full_cycle',
      enableStorm: true,
      enableObstacles: true,
      enableItems: true,
      stormSpeedMult: 1.15,
      warningTimeBase: 6.5,
      stopPhaseDuration: 0.5,
      success: { moveCount: 4, dashCount: 4, safeJudgmentCount: 4, distance: 350 },
      hints: ['경고에 맞춰 빠르게 이동하고 멈추세요.', '스톰 속도가 빨라지니 대쉬 타이밍을 조절하세요.']
    }
  };

  function getTutorialConfig(step) {
    return TUTORIAL_STEP_CONFIG[step] || TUTORIAL_STEP_CONFIG[1];
  }

  function applyTutorialOverrides(effectiveConfig = {}, step) {
    const tutorialConfig = getTutorialConfig(step);
    const updated = { ...effectiveConfig };

    // Apply tunables
    if (tutorialConfig.warningTimeBase != null) {
      updated.warningTimeBase = tutorialConfig.warningTimeBase;
    }
    if (tutorialConfig.stopPhaseDuration != null) {
      updated.stopPhaseDuration = tutorialConfig.stopPhaseDuration;
    }

    const mult = tutorialConfig.stormSpeedMult ?? 1;
    updated.stormSpeedMult = (effectiveConfig.stormSpeedMult ?? 1) * mult;
    updated.stormSpeed = (effectiveConfig.stormSpeed ?? 0) * mult;

    // Annotate tutorial metadata
    updated.tutorial = {
      step,
      lockGameState: tutorialConfig.lockGameState,
      enableStorm: tutorialConfig.enableStorm,
      enableObstacles: tutorialConfig.enableObstacles,
      enableItems: tutorialConfig.enableItems,
      success: tutorialConfig.success,
      hints: tutorialConfig.hints
    };

    return updated;
  }

  const TutorialConfig = {
    STEP_CONFIG: TUTORIAL_STEP_CONFIG,
    getConfig: getTutorialConfig,
    applyOverrides: applyTutorialOverrides
  };

  window.TutorialConfig = TutorialConfig;
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialConfig = TutorialConfig;
})();
