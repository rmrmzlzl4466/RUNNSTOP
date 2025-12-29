(function() {
  'use strict';

  const TutorialManager = {
    state: {
      step: 1,
      isActive: false,
      retryCount: 0,
      moveDetected: false,
      dashDetected: false,
      safeJudgmentCount: 0,
      startDistance: 0,
      startX: 0
    },

    init(gameData = {}) {
      const progress = Math.min(Math.max(Number(gameData.tutorialProgress) || 0, 0), 4);
      this.state.step = progress > 0 ? Math.min(progress + 1, 4) : 1;
      this.state.isActive = false;
      this.state.retryCount = 0;
      this.resetStepProgress();
    },

    shouldForceTutorial(gameData = {}) {
      return !gameData.tutorialCompleted;
    },

    startTutorial(step = 1) {
      const targetStep = Math.min(Math.max(step, 1), 4);
      this.state.step = targetStep;
      this.state.retryCount = 0;
      this.state.isActive = true;
      this.resetStepProgress();
      this._enableTutorialOnRuntime(targetStep);
      window.TutorialUI?.showStep(targetStep);
      window.startGame?.();
    },

    _enableTutorialOnRuntime(step) {
      if (window.runtime) {
        window.runtime.tutorialMode = true;
        window.runtime.tutorialStep = step;
      }
    },

    resetStepProgress() {
      this.state.moveDetected = false;
      this.state.dashDetected = false;
      this.state.safeJudgmentCount = 0;
      this.state.startDistance = 0;
      this.state.startX = window.player?.x ?? 0;
      window.TutorialUI?.clearHints();
    },

    trackPlayerProgress(player) {
      if (!this.state.isActive) return;
      const condition = window.TutorialConfig?.getConfig?.(this.state.step)?.successCondition;
      if (!condition) return;

      if (condition.moveCount && !this.state.moveDetected) {
        if (Math.abs(player.vx) > 10 || Math.abs(player.x - this.state.startX) > 5) {
          this.state.moveDetected = true;
        }
      }
      if (condition.dashCount && !this.state.dashDetected && player.isDashing) {
        this.state.dashDetected = true;
      }
    },

    onSafeSuccess() {
      if (!this.state.isActive) return;
      this.state.safeJudgmentCount += 1;
      this.checkStepCompletion();
    },

    onStopFailure() {
      if (!this.state.isActive) return;
      this.retryStep();
    },

    meetsCondition() {
      const config = window.TutorialConfig?.getConfig?.(this.state.step);
      const cond = config?.successCondition;
      if (!cond) return false;

      if (cond.moveCount && cond.dashCount) {
        return this.state.moveDetected && this.state.dashDetected;
      }
      if (cond.safeJudgmentCount) {
        return this.state.safeJudgmentCount >= cond.safeJudgmentCount;
      }
      if (cond.distance) {
        const traveled = (window.player?.dist ?? 0) - this.state.startDistance;
        return traveled >= cond.distance;
      }
      return false;
    },

    checkStepCompletion() {
      if (!this.state.isActive) return;
      if (this.meetsCondition()) {
        this.onStepComplete();
      }
    },

    onStepComplete() {
      const completedStep = this.state.step;
      this.state.retryCount = 0;
      this._saveProgress(completedStep);

      if (completedStep >= 4) {
        this.onTutorialComplete();
        return;
      }

      this.state.step += 1;
      this.resetStepProgress();
      this._enableTutorialOnRuntime(this.state.step);
      window.TutorialUI?.showStepTransition(this.state.step);
      window.startGame?.();
    },

    retryStep() {
      this.state.retryCount += 1;
      this.resetStepProgress();
      this._enableTutorialOnRuntime(this.state.step);
      if (this.state.retryCount >= 3) {
        window.TutorialUI?.showHint(this.state.step);
      }
      window.TutorialUI?.showRetryMessage();
      window.startGame?.();
    },

    onTutorialComplete() {
      this.state.isActive = false;
      this.state.step = 1;
      this._setTutorialFlags(false, 0);
      if (window.runtime) {
        window.runtime.gameActive = false;
      }
      this._saveCompletion();
      window.TutorialUI?.showCompletionAnimation(() => {
        window.Navigation?.go('lobby');
        window.TutorialUI?.hideOverlay();
      });
    },

    exitTutorial() {
      this.state.isActive = false;
      this.state.step = 1;
      this._setTutorialFlags(false, 0);
      window.TutorialUI?.hideOverlay();
    },

    _saveProgress(step) {
      const data = window.GameData || window.Game?.data || window.GameModules?.Storage?.loadGameData?.() || {};
      if (data) {
        data.tutorialProgress = Math.max(data.tutorialProgress || 0, step);
        window.GameData = data;
        window.GameModules?.Storage?.persistGameData?.(data);
      }
    },

    _saveCompletion() {
      const data = window.GameData || window.Game?.data || window.GameModules?.Storage?.loadGameData?.() || {};
      if (data) {
        data.tutorialCompleted = true;
        data.tutorialProgress = 4;
        window.GameData = data;
        window.GameModules?.Storage?.persistGameData?.(data);
      }
      window.shouldStartTutorial = false;
    },

    _setTutorialFlags(isActive, step) {
      if (window.runtime) {
        window.runtime.tutorialMode = isActive;
        window.runtime.tutorialStep = step;
      }
    }
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();
