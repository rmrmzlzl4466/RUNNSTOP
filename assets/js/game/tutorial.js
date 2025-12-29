(function() {
  'use strict';

  const state = {
    step: 1,
    isActive: false,
    retryCount: 0,
    moveDetected: false,
    dashDetected: false,
    safeJudgmentCount: 0,
    startDistance: null,
    lastKnownDistance: null
  };

  function init() {
    state.step = 1;
    state.isActive = false;
    state.retryCount = 0;
    resetStepProgress();
    console.debug('[TutorialManager] Initialized');
  }

  function resetStepProgress() {
    state.moveDetected = false;
    state.dashDetected = false;
    state.safeJudgmentCount = 0;
    state.startDistance = null;
    state.lastKnownDistance = null;
  }

  function getCurrentStep() {
    return state.step;
  }

  function getStepConfig(step = state.step) {
    if (!window.TutorialConfig?.STEP_CONFIG) return null;
    return window.TutorialConfig.STEP_CONFIG[step] || null;
  }

  function checkDistanceCondition(targetDistance) {
    if (typeof targetDistance !== 'number') return true;

    const playerDist = state.lastKnownDistance;
    const startDist = state.startDistance;
    if (playerDist == null || startDist == null) return false;

    return playerDist - startDist >= targetDistance;
  }

  function checkStepCondition() {
    const config = getStepConfig();
    if (!config) return false;

    const success = config.success;
    if (!success) return false;

    const moveOk = success.moveCount ? state.moveDetected : true;
    const dashOk = success.dashCount ? state.dashDetected : true;
    const safeOk = success.safeJudgmentCount ? state.safeJudgmentCount >= success.safeJudgmentCount : true;
    const distanceOk = success.distance ? checkDistanceCondition(success.distance) : true;

    return moveOk && dashOk && safeOk && distanceOk;
  }

  function startTutorial(step = 1, runtime = null) {
    state.step = step;
    state.isActive = true;
    state.retryCount = 0;
    resetStepProgress();

    if (runtime) {
      runtime.tutorialMode = true;
      runtime.tutorialStep = step;
    }

    if (window.TutorialUI?.showStep) {
      window.TutorialUI.showStep(step);
    }

    console.debug(`[TutorialManager] Tutorial started at step ${step}`);
  }

  function onStepComplete(runtime = null) {
    const nextStep = state.step + 1;
    if (nextStep > 4) {
      onTutorialComplete(runtime);
      return;
    }

    state.step = nextStep;
    state.retryCount = 0;
    resetStepProgress();

    if (runtime) {
      runtime.tutorialStep = nextStep;
    }

    if (window.TutorialUI?.showStepTransition) {
      window.TutorialUI.showStepTransition(nextStep);
    }

    console.debug(`[TutorialManager] Moved to tutorial step ${nextStep}`);
  }

  function retryStep() {
    state.retryCount += 1;
    resetStepProgress();

    if (state.retryCount >= 3 && window.TutorialUI?.showRetryMessage) {
      window.TutorialUI.showRetryMessage();
    }

    if (window.TutorialUI?.showStep) {
      window.TutorialUI.showStep(state.step);
    }

    console.debug(`[TutorialManager] Retry step ${state.step}, count=${state.retryCount}`);
  }

  function onTutorialComplete(runtime = null) {
    state.isActive = false;
    state.step = 4;

    try {
      const data = window.GameModules?.Storage?.loadGameData?.();
      if (data) {
        data.tutorialCompleted = true;
        data.tutorialProgress = 4;
        window.GameModules?.Storage?.persistGameData?.(data);
      }
    } catch (err) {
      console.debug('[TutorialManager] Persist skipped or failed', err);
    }

    if (runtime) {
      runtime.tutorialMode = false;
      runtime.tutorialStep = 0;
      runtime.gameActive = false;
      window.GameModules?.SlowMo?.forceOff?.(runtime);
    }

    const goToLobby = () => {
      const nav = window.Navigation;
      if (nav?.go) {
        nav.go('lobby');
      } else if (window.GameNavigation?.goToLobby) {
        window.GameNavigation.goToLobby();
      }
      window.onTutorialFlowComplete?.();
    };

    if (window.TutorialUI?.showCompletionAnimation) {
      window.TutorialUI.showCompletionAnimation(() => {
        goToLobby();
      });
    } else {
      goToLobby();
    }

    console.debug('[TutorialManager] Tutorial completed');
  }

  function markMoved() {
    state.moveDetected = true;
  }

  function markDashed() {
    state.dashDetected = true;
  }

  function incrementSafeJudgment() {
    state.safeJudgmentCount += 1;
  }

  function setStartDistance(value) {
    if (typeof value !== 'number') return;
    state.startDistance = value;
    state.lastKnownDistance = value;
  }

  function setCurrentDistance(value) {
    if (typeof value !== 'number') return;
    state.lastKnownDistance = value;
  }

  const TutorialManager = {
    state,
    init,
    resetStepProgress,
    getCurrentStep,
    checkStepCondition,
    startTutorial,
    onStepComplete,
    retryStep,
    onTutorialComplete,
    markMoved,
    markDashed,
    incrementSafeJudgment,
    setStartDistance,
    setCurrentDistance
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();
