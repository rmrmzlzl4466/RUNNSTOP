(function() {
  'use strict';

  const TUTORIAL_STEP_CONFIG = {
    1: {
      lockGameState: 'RUN',
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      successCondition: { moveCount: 1, dashCount: 1 },
      eventTriggers: [], // 1단계는 즉시 시작
    },
    2: {
      lockGameState: null,
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      warningTimeBase: 10.0,
      stopPhaseDuration: 2.0,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'], // 튜토리얼 전용 색상
      successCondition: { safeJudgmentCount: 2 },
      eventTriggers: [
        { type: 'distance', value: 50, action: 'start_run_stop_cycle', triggered: false }
      ],
    },
    3: {
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 0.5,
      obstaclesEnabled: true,
      itemsEnabled: true,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'], // 튜토리얼 전용 색상
      successCondition: { distance: 300 },
      eventTriggers: [
        { type: 'fixed_position', value: 100, action: 'spawn_item_shield', triggered: false },
        { type: 'distance', value: 150, action: 'activate_storm', triggered: false }
      ],
    },
    4: {
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 1.0,
      obstaclesEnabled: true,
      itemsEnabled: true,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'], // 튜토리얼 전용 색상
      successCondition: { distance: 500 },
      eventTriggers: [], // 4단계는 즉시 모든 요소 활성화
    },
  };

  const TUTORIAL_TEXTS = {
    1: {
      name: '기본 조작',
      description: '이동과 대쉬를 배웁니다',
      hints: {
        move: {
          pc: 'WASD 키를 눌러 이동하세요',
          mobile: '조이스틱을 움직여 이동하세요',
        },
        dash: {
          pc: '스페이스바를 눌러 대쉬하세요',
          mobile: '대쉬 버튼을 누르세요',
        }
      },
    },
    2: {
      name: '핵심 메커니즘',
      description: 'RUN/WARNING/STOP 사이클을 배웁니다',
      hints: {
        safeJudgment: {
          pc: '경고 시 안전 색상을 확인하고 타일 위에 서세요',
          mobile: '경고 시 안전 색상을 확인하고 타일 위에 서세요',
        },
      },
    },
    3: {
      name: '위험 요소',
      description: '스톰과 장애물을 피하세요',
      hints: {
        avoidStorm: {
          pc: '스톰을 피하세요',
          mobile: '스톰을 피하세요',
        },
        collectItem: {
          pc: '아이템을 획득하세요',
          mobile: '아이템을 획득하세요',
        }
      },
    },
    4: {
      name: '실전 시뮬레이션',
      description: '500m를 완주하세요',
      hints: {
        completeRun: {
          pc: '최종 튜토리얼을 완료하세요!',
          mobile: '최종 튜토리얼을 완료하세요!',
        }
      },
    },
  };

  // StageConfig 오버라이드 함수
  function getTutorialConfig(step) {
    return TUTORIAL_STEP_CONFIG[step] || TUTORIAL_STEP_CONFIG[1];
  }

  function applyTutorialOverrides(effectiveConfig, step) {
    const tutorialConfig = getTutorialConfig(step);
    const next = Object.assign({}, effectiveConfig);

    if (tutorialConfig.stormSpeedMult !== undefined) {
      next.stormSpeed = (effectiveConfig.stormSpeed ?? 0) * tutorialConfig.stormSpeedMult;
    }
    if (tutorialConfig.warningTimeBase !== undefined) {
      next.warningTimeBase = tutorialConfig.warningTimeBase;
    }
    if (tutorialConfig.stopPhaseDuration !== undefined) {
      next.stopPhaseDuration = tutorialConfig.stopPhaseDuration;
    }
    if (tutorialConfig.colorPalette !== undefined) {
      next.colorPalette = tutorialConfig.colorPalette;
    }

    // Additional tutorial-only flags for loop.js to branch on
    next._tutorialRules = {
      lockGameState: tutorialConfig.lockGameState,
      stormEnabled: tutorialConfig.stormEnabled !== false,
      obstaclesEnabled: tutorialConfig.obstaclesEnabled !== false,
      itemsEnabled: tutorialConfig.itemsEnabled !== false
    };

    // Disable storm entirely when stormEnabled is false
    if (tutorialConfig.stormEnabled === false) {
      next.stormSpeed = 0;
    }

    return next;
  }

  window.TutorialConfig = {
    STEP_CONFIG: TUTORIAL_STEP_CONFIG,
    TEXTS: TUTORIAL_TEXTS, // 텍스트도 외부에서 접근 가능하도록 추가
    getConfig: getTutorialConfig,
    getTexts: (step) => TUTORIAL_TEXTS[step] || null,
    applyOverrides: applyTutorialOverrides,
  };
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialConfig = window.TutorialConfig;
})();
