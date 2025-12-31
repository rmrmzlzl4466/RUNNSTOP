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
      stepTargetDist: 0,
      stepStartedAt: 0,
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
        stepTargetDist: 0,
        stepStartedAt: 0,
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
        const baseStageLength = window.STAGE_CONFIG?.[0]?.length ?? window.qaConfig?.stageLength ?? 2000;
        window.runtime._tutorialStageGoal = baseStageLength + 200;
        window.runtime.currentLevelGoal = window.runtime._tutorialStageGoal;
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
        const dist = window.player?.dist ?? 0;
        const traveled = this.getTraveledDistance();
        if (this.state.step === 4) {
          const minHoldMs = 2000;
          const elapsed = performance.now() - (this.state.stepStartedAt || 0);
          if (elapsed < minHoldMs) return false;
        }
        if (this.state.stepTargetDist > 0) {
          return dist >= this.state.stepTargetDist;
        }
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
          this.handleEventTrigger(trigger);
          trigger.triggered = true;
        }
      });
    },

    handleEventTrigger(trigger) {
      const runtime = window.runtime;
      const player = window.player;

      switch (trigger.action) {
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
            const cellH = runtime.grid?.CELL_H || 100;
            const baseY = 550;
            const targetDist = Math.max(0, Number(trigger.value) || 0);
            const rowIdx = Math.floor((baseY - targetDist * 10) / cellH);
            window.Game.LevelManager.generateRow(rowIdx);
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
      const runtime = window.runtime;
      if (runtime) {
        runtime.tutorialStep = nextStep;
        runtime.tutorialSubStep = this.state.subStep;
      }
      if (completedStep === 1 && nextStep === 2) {
        this.resetStepProgress(true);
        window.TutorialUI?.updateUIVisibility(nextStep);
        window.TutorialUI?.showStepTransition(nextStep);
        window.TutorialUI?.showStep(nextStep, this.state.subStep);
        window.TutorialUI?.showHint(nextStep, this.state.subStep, this.state.platform);
        return;
      }
      if (completedStep === 2 && nextStep === 3) {
        this.resetStepProgress(true);
        window.TutorialUI?.updateUIVisibility(nextStep);
        window.TutorialUI?.showStepTransition(nextStep);
        window.TutorialUI?.showStep(nextStep, this.state.subStep);
        window.TutorialUI?.showHint(nextStep, this.state.subStep, this.state.platform);
        if (runtime) {
          const STATE = window.GameModules.Runtime?.STATE;
          if (STATE) {
            runtime.gameState = STATE.RUN;
            runtime.cycleTimer = 3.0;
            runtime.isFirstWarning = true;
            runtime.targetColorIndex = -1;
            runtime.currentWarningMax = 6.0;
          }
        }
        return;
      }
      if (completedStep === 3 && nextStep === 4) {
        this.resetStepProgress(true);
        this.state.stepStartedAt = performance.now();
        window.TutorialUI?.updateUIVisibility(nextStep);
        window.TutorialUI?.showStepTransition(nextStep);
        window.TutorialUI?.showStep(nextStep, this.state.subStep);
        window.TutorialUI?.showHint(nextStep, this.state.subStep, this.state.platform);
        if (runtime) {
          const STATE = window.GameModules.Runtime?.STATE;
          if (STATE) {
            runtime.gameState = STATE.RUN;
            runtime.cycleTimer = 3.0;
            runtime.isFirstWarning = true;
            runtime.targetColorIndex = -1;
            runtime.currentWarningMax = 6.0;
          }
          runtime._tutorialHoldCycle = false;
          runtime._tutorialStormEnabled = true;
        }
        if (window.player) {
          window.player.isBoosting = false;
          window.player.vx = 0;
          window.player.vy = 0;
        }
        return;
      }
      window.TutorialUI?.showStepTransition(nextStep);
      window.Game.startGame?.(null, { isTutorial: true, tutorialStep: nextStep });
    },

    retryStep() {
      if (!this.state.isActive || this.state.isRestarting) return false;
      this.state.retryCount++;
      this.state.isRestarting = true;
      this.resetStepProgress();

      if (this.state.retryCount >= 2) {
        window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform);
      }

      const restart = () => {
        window.TutorialUI?.updateUIVisibility(this.state.step);
        window.Game.startGame?.(null, { isTutorial: true, tutorialStep: this.state.step, isRetry: true });
      };

      if (this.state.step === 2) {
        window.TutorialUI?.showMessage('OUT! Stand on the safe color.', 1500);
        window.TutorialUI?.fadeOutIn(400, 400, 120, restart);
      } else {
        window.TutorialUI?.showRetryMessage();
        restart();
      }
      return true;
    },

    onTutorialComplete() {
      this.state.isActive = false;
      this.persistProgress(MAX_TUTORIAL_STEP, true);
      window.shouldStartTutorial = false;
      const runtime = window.runtime;
      if (runtime) {
        runtime.gameActive = false;
        runtime.gameState = window.GameModules.Runtime?.STATE?.PAUSE ?? runtime.gameState;
      }

      const player = window.player;
      const qaConfig = window.qaConfig || {};
      const dist = player?.dist ?? 0;
      const distanceBonus = dist * (qaConfig.scorePerMeter ?? 0);
      const totalScore = Math.floor((player?.sessionScore ?? 0) + distanceBonus);
      const gameData = window.GameData || window.SaveManager?.load?.();
      let isNewRecord = false;
      if (gameData?.stats) {
        const previousHigh = gameData.stats.highScore || 0;
        isNewRecord = totalScore > previousHigh;
        if (isNewRecord) {
          gameData.stats.highScore = totalScore;
          window.GameData = gameData;
          window.Game.data = gameData;
          window.SaveManager?.persist?.(gameData);
        }
      }

      const finish = () => {
        this.deactivateRuntime();
        window.TutorialUI?.setActive?.(false);
        window.Navigation.go('lobby');
      };

      if (window.TutorialUI?.showCompletionSequence) {
        window.TutorialUI.showCompletionSequence({ isNewRecord, onDone: finish });
      } else {
        finish();
      }
    },

    resetStepProgress(resetTriggers = true) {
      this.state.moveDetected = false;
      this.state.dashDetected = false;
      this.state.safeJudgmentCount = 0;
      const startDist = window.player?.dist ?? 0;
      this.state.startDistance = startDist;
      this.state.startDistValue = startDist;
      this.state.stepStartedAt = performance.now();
      const config = window.TutorialConfig.getConfig(this.state.step);
      if (this.state.step === 3 || this.state.step === 4) {
        if (this.state.step === 4 && window.runtime?._tutorialStageGoal) {
          this.state.stepTargetDist = window.runtime._tutorialStageGoal;
        } else {
          const goal = Number(config.successCondition?.distance ?? 0);
          this.state.stepTargetDist = goal > 0 ? startDist + goal : 0;
        }
      } else {
        this.state.stepTargetDist = 0;
      }
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
      window.runtime._tutorialStageGoal = null;
    },

    quitTutorial() {
      this.state.isActive = false;
      this.deactivateRuntime();
      window.TutorialUI?.removeHighlights();
      window.TutorialUI?.setActive?.(false);
      window.Navigation?.hideOverlay?.('overlay-pause');
      window.Navigation?.go('lobby');
    }
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();
