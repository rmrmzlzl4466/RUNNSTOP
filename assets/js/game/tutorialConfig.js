(function() {
  'use strict';

  const TUTORIAL_STEP_CONFIG = {
    1: {
      lockGameState: 'RUN',
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      minHoldMsBySubStep: { 1: 1200, 2: 1200 },
      successCondition: { moveCount: 1, dashCount: 1 },
      eventTriggers: [],
    },
    2: {
      lockGameState: null,
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      minHoldMs: 1400,
      warningTimeBase: 10.0,
      stopPhaseDuration: 2.0,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'],
      successCondition: { type: 'safe_judgments', value: 2 },
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
      minHoldMs: 1200,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'],
      successCondition: { type: 'distance_relative', value: 300 },
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
      minHoldMs: 1400,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'],
      successCondition: { type: 'stage_end' },
      eventTriggers: [],
    },
  };

  const TUTORIAL_ENTRY = {
    title: 'Tutorial Start',
    meta: 'Approx. 2 min · 4 steps',
    goals: [
      'Learn movement and dash',
      'Understand safe colors',
      'Avoid storm and reach the goal'
    ],
    note: 'Steps advance when you are ready.',
  };

  const TUTORIAL_TEXTS = {
    1: {
      name: 'Basics',
      description: 'Learn move and dash',
      steps: {
        1: {
          title: 'Move',
          body: {
            pc: 'Move with WASD.',
            mobile: 'Move the joystick.'
          },
          target: '#tutorial-joystick-target'
        },
        2: {
          title: 'Dash',
          body: {
            pc: 'Press Space to dash.',
            mobile: 'Tap the dash button.'
          },
          target: '#btn-dash-visual'
        }
      },
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
      steps: {
        1: {
          title: 'Safe Color',
          body: {
            pc: 'Watch the safe color and stand on it.',
            mobile: 'Stand on the safe color tile.'
          },
          target: '#target-display'
        }
      },
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
      steps: {
        1: {
          title: 'Storm Gauge',
          body: {
            pc: 'Watch the storm gauge and keep your distance.',
            mobile: 'Watch the storm gauge and keep your distance.'
          },
          target: '#chase-ui'
        }
      },
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
      name: 'Finish',
      description: 'Reach the end of the stage',
      steps: {
        1: {
          title: 'Finish',
          body: {
            pc: 'Reach the end of the stage.',
            mobile: 'Reach the end of the stage.'
          }
        }
      },
      hints: {
        completeRun: {
          pc: 'Reach the end of the stage!',
          mobile: 'Reach the end of the stage!',
        }
      },
    },
  };

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

    next.theme = { paletteId: 'TUTORIAL' };
    if (tutorialConfig.obstaclesEnabled === false) {
      next.gimmick = { id: 'NONE', params: {} };
    }

    next._tutorialRules = {
      lockGameState: tutorialConfig.lockGameState,
      stormEnabled: tutorialConfig.stormEnabled !== false,
      obstaclesEnabled: tutorialConfig.obstaclesEnabled !== false,
      itemsEnabled: tutorialConfig.itemsEnabled !== false
    };

    if (tutorialConfig.stormEnabled === false) {
      next.stormSpeed = 0;
    }

    return next;
  }

  window.TutorialConfig = {
    ENTRY: TUTORIAL_ENTRY,
    STEP_CONFIG: TUTORIAL_STEP_CONFIG,
    TEXTS: TUTORIAL_TEXTS,
    getConfig: getTutorialConfig,
    getTexts: (step) => TUTORIAL_TEXTS[step] || null,
    applyOverrides: applyTutorialOverrides,
  };
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialConfig = window.TutorialConfig;
})();
