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
      name: 'Basics',
      description: 'Learn move and dash',
      hints: {
        move: {
          pc: 'Move with WASD',
          mobile: 'Move the joystick',
        },
        dash: {
          pc: 'Press Space to dash',
          mobile: 'Tap the dash button',
        }
      },
    },
    2: {
      name: 'Core Cycle',
      description: 'Experience RUN/WARNING/STOP',
      hints: {
        safeJudgment: {
          pc: 'Watch the safe color and stand on it',
          mobile: 'Stand on the safe color tile',
        },
      },
    },
    3: {
      name: 'Hazards',
      description: 'Avoid storm and obstacles',
      hints: {
        avoidStorm: {
          pc: 'Avoid the storm',
          mobile: 'Avoid the storm',
        },
        collectItem: {
          pc: 'Grab the item',
          mobile: 'Grab the item',
        }
      },
    },
    4: {
      name: 'Simulation',
      description: 'Finish 500m to clear',
      hints: {
        completeRun: {
          pc: 'Complete the tutorial run!',
          mobile: 'Complete the tutorial run!',
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

    // Tutorial uses a dedicated palette and no gimmicks for stability
    next.theme = { paletteId: 'TUTORIAL' };
    next.gimmick = { id: 'NONE', params: {} };

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
