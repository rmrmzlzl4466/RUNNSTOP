(function() {
  'use strict';

  const MAX_TUTORIAL_STEP = 4;

  const TutorialManager = {
    state: {
      step: 0,
      subStep: 0,
      isActive: false,
      retryCount: 0,
      moveDetected: false,
      dashDetected: false,
      safeJudgmentCount: 0,
      startDistance: 0,
      startDistValue: 0,
      platform: 'unknown',
      activeTriggers: [],
      isRestarting: false
    },

    init() {
      this.state = {
        step: 0,
        subStep: 0,
        isActive: false,
        retryCount: 0,
        moveDetected: false,
        dashDetected: false,
        safeJudgmentCount: 0,
        startDistance: 0,
        startDistValue: 0,
        platform: this.detectPlatform(),
        activeTriggers: [],
        isRestarting: false
      };
    },

    detectPlatform() {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      return isMobile ? 'mobile' : 'pc';
    },

    getResumeStep() {
      if (window.GameData?.tutorialCompleted) return 1;
      const progress = window.GameData?.tutorialProgress ?? 0;
      return Math.min(MAX_TUTORIAL_STEP, Math.max(1, (progress || 0) + 1));
    },

    startTutorial(step = 1, options = {}) {
      const targetStep = Math.min(MAX_TUTORIAL_STEP, Math.max(1, step || 1));
      this.state.step = targetStep;
      this.state.subStep = 1;
      this.state.isActive = true;
      this.state.platform = this.detectPlatform();
      this.state.isRestarting = false;
      if (!options.isRetry) {
        this.state.retryCount = 0;
      }

      const config = window.TutorialConfig.getConfig(targetStep);
      const hasStormTrigger = (config.eventTriggers || []).some((t) => t.action === 'activate_storm');

      if (window.runtime) {
        window.runtime.tutorialMode = true;
        window.runtime.tutorialStep = targetStep;
        window.runtime.tutorialSubStep = this.state.subStep;
        window.runtime._tutorialHoldCycle = targetStep === 2;
        window.runtime._tutorialStormEnabled = config.stormEnabled !== false && !hasStormTrigger;
      }

      this.resetStepProgress(true);
      if (window.Navigation?.current !== 'tutorial') {
        window.Navigation?.go?.('tutorial');
      }
      window.TutorialUI?.setActive?.(true);
      window.TutorialUI?.updateUIVisibility(targetStep);
      window.TutorialUI?.showStep(targetStep, this.state.subStep);
      window.TutorialUI?.showHint(targetStep, this.state.subStep, this.state.platform);
    },

    checkStepCondition() {
      if (!this.state.isActive) return false;
      const config = window.TutorialConfig.getConfig(this.state.step);
      const condition = config.successCondition;

      if (this.state.step === 1) {
        if (this.state.subStep === 1) {
          return this.state.moveDetected;
        }
        if (this.state.subStep === 2) {
          return this.state.dashDetected;
        }
      }

      if (this.state.step === 2) {
        return this.state.safeJudgmentCount >= condition.safeJudgmentCount;
      }
      if (this.state.step === 3 || this.state.step === 4) {
        const traveled = this.getTraveledDistance();
        return traveled >= condition.distance;
      }
      return false;
    },

    checkEventTriggers() {
      if (!this.state.isActive) return;
      if (!this.state.activeTriggers.length) return;
      const traveled = this.getTraveledDistance();
      const playerDist = window.player?.dist ?? 0;

      this.state.activeTriggers.forEach((trigger) => {
        if (trigger.triggered) return;

        let conditionMet = false;
        if (trigger.type === 'distance' && traveled >= trigger.value) {
          conditionMet = true;
        } else if (trigger.type === 'fixed_position' && playerDist >= trigger.value) {
          conditionMet = true;
        }

        if (conditionMet) {
          this.handleEventTrigger(trigger.action);
          trigger.triggered = true;
        }
      });
    },

    handleEventTrigger(action) {
      const runtime = window.runtime;
      const player = window.player;

      switch (action) {
        case 'start_run_stop_cycle':
          if (runtime) {
            runtime._tutorialHoldCycle = false;
            runtime.isFirstWarning = true;
            runtime.cycleTimer = 0.01;
          }
          window.TutorialUI?.showMessage('Cycle starting now', 1600);
          break;
        case 'spawn_item_shield':
          if (runtime && player) {
            const rowIdx = Math.floor(player.y / (runtime.grid?.CELL_H || 100)) - 5;
            window.Game.LevelManager.generateRow(rowIdx, (type, col) => window.GameModules.Items.spawnItemAtCol(runtime, rowIdx, type, col));
            window.GameModules.Items.spawnItemAtCol(runtime, rowIdx, 'barrier', Math.floor((runtime.grid?.COLS ?? 5) / 2));
            window.TutorialUI?.showMessage('Shield item spawned', 1600);
          }
          break;
        case 'activate_storm':
          if (runtime && player) {
            runtime._tutorialStormEnabled = true;
            runtime.storm.y = player.y + 800;
            window.TutorialUI?.showMessage('Storm approaching', 1600);
          }
          break;
      }
    },

    onStepComplete() {
      if (this.state.step === 1 && this.state.subStep === 1) {
        this.state.subStep++;
        if (window.runtime) window.runtime.tutorialSubStep = this.state.subStep;
        this.resetStepProgress(false);
        window.TutorialUI?.showStep(this.state.step, this.state.subStep);
        window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform);
        return;
      }

      const completedStep = this.state.step;
      this.persistProgress(completedStep, completedStep >= MAX_TUTORIAL_STEP);

      if (completedStep >= MAX_TUTORIAL_STEP) {
        this.onTutorialComplete();
        return;
      }

      const nextStep = completedStep + 1;
      this.state.step = nextStep;
      this.state.subStep = 1;
      this.state.retryCount = 0;
      if (window.runtime) {
        window.runtime.tutorialStep = nextStep;
        window.runtime.tutorialSubStep = this.state.subStep;
      }
      window.TutorialUI?.showStepTransition(nextStep);
      window.Game.startGame?.(null, { isTutorial: true, tutorialStep: nextStep });
    },

    retryStep() {
      if (!this.state.isActive || this.state.isRestarting) return;
      this.state.retryCount++;
      this.state.isRestarting = true;
      this.resetStepProgress();

      if (this.state.retryCount >= 2) {
        window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform);
      }

      window.TutorialUI?.showRetryMessage();
      window.TutorialUI?.updateUIVisibility(this.state.step);
      window.Game.startGame?.(null, { isTutorial: true, tutorialStep: this.state.step, isRetry: true });
    },

    onTutorialComplete() {
      this.state.isActive = false;
      this.persistProgress(MAX_TUTORIAL_STEP, true);
      window.shouldStartTutorial = false;
      this.deactivateRuntime();
      if (window.runtime) {
        window.runtime.gameActive = false;
        window.runtime.gameState = window.GameModules.Runtime?.STATE?.PAUSE ?? window.runtime.gameState;
      }

      window.TutorialUI?.showCompletionAnimation(() => {
        window.TutorialUI?.setActive?.(false);
        window.Navigation.go('lobby');
      });
    },

    resetStepProgress(resetTriggers = true) {
      this.state.moveDetected = false;
      this.state.dashDetected = false;
      this.state.safeJudgmentCount = 0;
      this.state.startDistance = window.player?.y || 0;
      this.state.startDistValue = window.player?.dist ?? 0;

      const config = window.TutorialConfig.getConfig(this.state.step);
      const triggers = resetTriggers ? (config.eventTriggers || []) : (this.state.activeTriggers || []);
      this.state.activeTriggers = (triggers || []).map((t) => ({ ...t, triggered: false }));

      if (window.runtime) {
        const hasStormTrigger = (config.eventTriggers || []).some((t) => t.action === 'activate_storm');
        window.runtime._tutorialStormEnabled = config.stormEnabled !== false && !hasStormTrigger;
        window.runtime._tutorialHoldCycle = this.state.step === 2;
      }
    },

    getTraveledDistance() {
      const dist = window.player?.dist ?? 0;
      return Math.max(0, dist - (this.state.startDistValue || 0));
    },

    persistProgress(step, isCompleted = false) {
      const gameData = window.GameData || window.SaveManager.load();
      if (!gameData) return;
      gameData.tutorialProgress = Math.max(gameData.tutorialProgress ?? 0, step);
      if (isCompleted) {
        gameData.tutorialCompleted = true;
      }
      window.GameData = gameData;
      window.Game.data = gameData;
      window.SaveManager.persist(gameData);
    },

    onSafeJudgmentSuccess() {
      if (!this.state.isActive) return;
      this.state.safeJudgmentCount += 1;
    },

    onPlayerMove() {
      if (!this.state.isActive) return;
      if (this.state.step === 1 && this.state.subStep === 1) this.state.moveDetected = true;
    },

    onPlayerDash() {
      if (!this.state.isActive) return;
      if (this.state.step === 1 && this.state.subStep === 2) this.state.dashDetected = true;
    },

    deactivateRuntime() {
      if (!window.runtime) return;
      window.runtime.tutorialMode = false;
      window.runtime.tutorialStep = 0;
      window.runtime.tutorialSubStep = 0;
      window.runtime._tutorialHoldCycle = false;
      window.runtime._tutorialStormEnabled = true;
    },

    quitTutorial() {
      this.state.isActive = false;
      this.deactivateRuntime();
      window.TutorialUI?.removeHighlights();
      window.TutorialUI?.setActive?.(false);
      window.Navigation?.go('lobby');
    }
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();
