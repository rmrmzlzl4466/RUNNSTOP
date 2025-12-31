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

    listeners: {},

    on(event, handler) {
      if (!event || typeof handler != 'function') return;
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(handler);
    },

    off(event, handler) {
      const list = this.listeners[event];
      if (!list || !list.length) return;
      this.listeners[event] = list.filter((fn) => fn != handler);
    },

    emit(event, payload) {
      const list = this.listeners[event];
      if (!list || !list.length) return;
      list.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error('[Tutorial] Event handler error', err);
        }
      });
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

      if (window.runtime) {
        window.runtime.tutorialMode = true;
        this.setRuntimeStep(targetStep, this.state.subStep);
        this.applyRuntimeFlags(config);
        const baseStageLength = window.STAGE_CONFIG?.[0]?.length ?? window.qaConfig?.stageLength ?? 2000;
        window.runtime._tutorialStageGoal = baseStageLength + 200;
        window.runtime.currentLevelGoal = window.runtime._tutorialStageGoal;
      }

      this.resetStepProgress(true);
      if (window.Navigation?.current !== 'tutorial') {
        window.Navigation?.go?.('tutorial');
      }
      this.emit('ui', { action: 'setActive', value: true });
      this.emit('ui', { action: 'updateUIVisibility', step: targetStep });
      this.emit('ui', { action: 'showStep', step: targetStep, subStep: this.state.subStep });
      this.emit('ui', { action: 'showHint', step: targetStep, subStep: this.state.subStep, platform: this.state.platform });
    },

    checkStepCondition() {
      if (!this.state.isActive) return false;
      const config = window.TutorialConfig.getConfig(this.state.step);
      const condition = this.getSuccessCondition(config);
      const handler = this.getStepHandler(this.state.step);
      return handler?.checkSuccess ? handler.checkSuccess(this, condition) : false;
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
          this.emit('ui', { action: 'showMessage', text: 'Cycle starting now', duration: 1600 });
          break;
        case 'spawn_item_shield':
          if (runtime && player) {
            const cellH = runtime.grid?.CELL_H || 100;
            const baseY = 550;
            const targetDist = Math.max(0, Number(trigger.value) || 0);
            const rowIdx = Math.floor((baseY - targetDist * 10) / cellH);
            window.Game.LevelManager.generateRow(rowIdx);
            window.GameModules.Items.spawnItemAtCol(runtime, rowIdx, 'barrier', Math.floor((runtime.grid?.COLS ?? 5) / 2));
            this.emit('ui', { action: 'showMessage', text: 'Shield item spawned', duration: 1600 });
          }
          break;
        case 'activate_storm':
          if (runtime && player) {
            runtime._tutorialStormEnabled = true;
            runtime.storm.y = player.y + 800;
            this.emit('ui', { action: 'showMessage', text: 'Storm approaching', duration: 1600 });
          }
          break;
      }
    },

    onStepComplete() {
      const nextSubStep = this.getNextSubStep(this.state.step, this.state.subStep);
      if (nextSubStep) {
        this.enterSubStep(nextSubStep);
        return;
      }

      const completedStep = this.state.step;
      this.persistProgress(completedStep, completedStep >= MAX_TUTORIAL_STEP);

      if (completedStep >= MAX_TUTORIAL_STEP) {
        this.onTutorialComplete();
        return;
      }

      const nextStep = completedStep + 1;
      const transition = this.getStepTransition(completedStep, nextStep);
      this.onExitStep(completedStep, nextStep, transition);
      this.enterStep(nextStep, transition);
    },

    retryStep() {
      if (!this.state.isActive || this.state.isRestarting) return false;
      this.state.retryCount++;
      this.state.isRestarting = true;
      this.resetStepProgress();

      if (this.state.retryCount >= 2) {
        this.emit('ui', { action: 'showHint', step: this.state.step, subStep: this.state.subStep, platform: this.state.platform });
      }

      const restart = () => {
        this.emit('ui', { action: 'updateUIVisibility', step: this.state.step });
        window.Game.startGame?.(null, { isTutorial: true, tutorialStep: this.state.step, isRetry: true });
      };

      const behavior = this.getRetryBehavior(this.state.step);
      if (behavior.type === 'fade') {
        if (behavior.message) {
          this.emit('ui', { action: 'showMessage', text: behavior.message, duration: behavior.messageMs ?? 1500 });
        } else {
          this.emit('ui', { action: 'showRetryMessage' });
        }
        this.emit('ui', { action: 'fadeOutIn', outMs: behavior.outMs ?? 400, inMs: behavior.inMs ?? 400, holdMs: behavior.holdMs ?? 120, callback: restart });
      } else {
        this.emit('ui', { action: 'showRetryMessage' });
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
        this.emit('ui', { action: 'setActive', value: false });
        window.Navigation.go('lobby');
      };
      this.emit('ui', { action: 'showCompletionSequence', isNewRecord, onDone: finish });
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
      const condition = this.getSuccessCondition(config);
      if (this.state.step === 3 || this.state.step === 4) {
        if (condition.type === 'distance_absolute') {
          this.state.stepTargetDist = Number(condition.value ?? 0);
        } else if (condition.type === 'distance_relative') {
          const goal = Number(condition.value ?? 0);
          this.state.stepTargetDist = goal > 0 ? startDist + goal : 0;
        } else if (condition.type === 'stage_end') {
          this.state.stepTargetDist = window.runtime?._tutorialStageGoal ?? window.runtime?.currentLevelGoal ?? 0;
        } else {
          this.state.stepTargetDist = 0;
        }
      } else {
        this.state.stepTargetDist = 0;
      }
      const triggers = resetTriggers ? (config.eventTriggers || []) : (this.state.activeTriggers || []);
      this.state.activeTriggers = (triggers || []).map((t) => ({ ...t, triggered: false }));

      if (window.runtime) {
        this.applyRuntimeFlags(config);
      }
    },

    getTraveledDistance() {
      const dist = window.player?.dist ?? 0;
      return Math.max(0, dist - (this.state.startDistValue || 0));
    },

    tick() {
      if (!this.state.isActive) return false;
      this.checkEventTriggers();
      if (this.checkStepCondition()) {
        this.onStepComplete();
        return true;
      }
      return false;
    },

    dispatchEvent(type, payload) {
      return this.handleEvent(type, payload);
    },

    handleEvent(type) {
      if (!this.state.isActive) return false;
      const handler = this.getStepHandler(this.state.step);
      return handler?.onEvent ? handler.onEvent(this, type) : false;
    },

    enterSubStep(subStep) {
      this.state.subStep = subStep;
      this.setRuntimeStep(this.state.step, this.state.subStep);
      this.resetStepProgress(false);
      this.emit('ui', { action: 'showStep', step: this.state.step, subStep: this.state.subStep });
      this.emit('ui', { action: 'showHint', step: this.state.step, subStep: this.state.subStep, platform: this.state.platform });
    },

    enterStep(step, options = {}) {
      const { showTransition = true } = options;
      this.state.step = step;
      this.state.subStep = 1;
      this.state.retryCount = 0;
      this.setRuntimeStep(step, this.state.subStep);
      this.applyRuntimeFlags(window.TutorialConfig.getConfig(step));
      this.resetStepProgress(true);
      this.emit('ui', { action: 'updateUIVisibility', step });
      if (showTransition) this.emit('ui', { action: 'showStepTransition', step });
      this.emit('ui', { action: 'showStep', step, subStep: this.state.subStep });
      this.emit('ui', { action: 'showHint', step, subStep: this.state.subStep, platform: this.state.platform });
      this.onEnterStep(step, options);
    },

    resetRunState() {
      const runtime = window.runtime;
      if (!runtime) return;
      const STATE = window.GameModules.Runtime?.STATE;
      if (!STATE) return;
      runtime.gameState = STATE.RUN;
      runtime.cycleTimer = 3.0;
      runtime.isFirstWarning = true;
      runtime.targetColorIndex = -1;
      runtime.currentWarningMax = 6.0;
    },

    resetPlayerMomentum() {
      if (!window.player) return;
      window.player.isBoosting = false;
      window.player.vx = 0;
      window.player.vy = 0;
    },

    getStepTransition(fromStep, toStep) {
      return this.stepTransitions?.[fromStep]?.[toStep] || { showTransition: true };
    },

    getNextSubStep(step, subStep) {
      return this.subStepTransitions?.[step]?.[subStep] || 0;
    },

    onEnterStep(step, transition) {
      if (transition?.applyRunReset) {
        this.resetRunState();
      }
      if (transition?.resetMomentum) {
        this.resetPlayerMomentum();
      }
      const hooks = this.stepHooks?.[step];
      hooks?.onEnter?.(this, transition);
    },

    onExitStep(step, nextStep, transition) {
      const hooks = this.stepHooks?.[step];
      hooks?.onExit?.(this, nextStep, transition);
    },

    getRetryBehavior(step) {
      return this.retryBehaviors?.[step] || { type: 'instant' };
    },

    getStepHandler(step) {
      return this.stepHandlers[step] || this.stepHandlers.default;
    },

    checkDistanceSuccess(condition, enforceHold = false) {
      const dist = window.player?.dist ?? 0;
      const traveled = this.getTraveledDistance();
      if (enforceHold) {
        const minHoldMs = 2000;
        const elapsed = performance.now() - (this.state.stepStartedAt || 0);
        if (elapsed < minHoldMs) return false;
      }
      if (this.state.stepTargetDist > 0) {
        return dist >= this.state.stepTargetDist;
      }
      if (condition.type === 'distance_absolute') {
        return dist >= Number(condition.value ?? 0);
      }
      if (condition.type === 'distance_relative') {
        return traveled >= Number(condition.value ?? 0);
      }
      return traveled >= Number(condition.distance ?? 0);
    },

    stepHandlers: {
      1: {
        onEvent(manager, type) {
          if (type === 'move' && manager.state.subStep === 1) manager.state.moveDetected = true;
          if (type === 'dash' && manager.state.subStep === 2) manager.state.dashDetected = true;
          return true;
        },
        checkSuccess(manager) {
          if (manager.state.subStep === 1) return manager.state.moveDetected;
          if (manager.state.subStep === 2) return manager.state.dashDetected;
          return false;
        }
      },
      2: {
        onEvent(manager, type) {
          if (type === 'safe_judgment') manager.state.safeJudgmentCount += 1;
          return true;
        },
        checkSuccess(manager, condition) {
          const target = Number(condition.value ?? condition.safeJudgmentCount ?? 0);
          return manager.state.safeJudgmentCount >= target;
        }
      },
      3: {
        onEvent() {
          return false;
        },
        checkSuccess(manager, condition) {
          return manager.checkDistanceSuccess(condition, false);
        }
      },
      4: {
        onEvent() {
          return false;
        },
        checkSuccess(manager, condition) {
          return manager.checkDistanceSuccess(condition, true);
        }
      },
      default: {
        onEvent() {
          return false;
        },
        checkSuccess() {
          return false;
        }
      }
    },

    stepTransitions: {
      1: { 2: { showTransition: true } },
      2: { 3: { showTransition: true, applyRunReset: true } },
      3: { 4: { showTransition: true, applyRunReset: true, resetMomentum: true } }
    },

    subStepTransitions: {
      1: { 1: 2 }
    },

    stepHooks: {
      4: {
        onEnter(manager) {
          if (window.runtime) {
            window.runtime._tutorialHoldCycle = false;
            window.runtime._tutorialStormEnabled = true;
          }
        }
      }
    },

    retryBehaviors: {
      2: {
        type: 'fade',
        message: 'OUT! Stand on the safe color.',
        messageMs: 1500,
        outMs: 400,
        inMs: 400,
        holdMs: 120
      }
    },

    setRuntimeStep(step, subStep) {
      if (!window.runtime) return;
      window.runtime.tutorialStep = step;
      window.runtime.tutorialSubStep = subStep;
    },

    applyRuntimeFlags(config) {
      if (!window.runtime) return;
      const hasStormTrigger = (config.eventTriggers || []).some((t) => t.action === 'activate_storm');
      window.runtime._tutorialHoldCycle = this.state.step === 2;
      window.runtime._tutorialStormEnabled = config.stormEnabled !== false && !hasStormTrigger;
    },

    getSuccessCondition(config) {
      const condition = config?.successCondition || {};
      if (condition.type) return condition;
      if (this.state.step === 2 && condition.safeJudgmentCount !== undefined) {
        return { type: 'safe_judgments', value: condition.safeJudgmentCount };
      }
      if ((this.state.step === 3 || this.state.step === 4) && condition.distance !== undefined) {
        return { type: 'distance_relative', value: condition.distance };
      }
      return condition;
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
      this.emit('ui', { action: 'removeHighlights' });
      this.emit('ui', { action: 'setActive', value: false });
      window.Navigation?.hideOverlay?.('overlay-pause');
      window.Navigation?.go('lobby');
    }
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();
