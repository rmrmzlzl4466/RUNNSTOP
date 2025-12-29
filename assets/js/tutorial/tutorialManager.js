(function () {
  const MAX_STEP = 4;
  const MIN_STEP = 1;
  const RESTORE_RETRY_LIMIT = 10;
  const RESTORE_RETRY_DELAY = 100;

  function getRuntime() {
    return window.Game?.runtime;
  }

  function getStartGameFn() {
    return window.Game?.startGame ?? window.startGame;
  }

  function normalizeStep(step) {
    const num = Number.parseInt(step, 10);
    if (!Number.isFinite(num)) return MIN_STEP;
    return Math.min(MAX_STEP, Math.max(MIN_STEP, num));
  }

  function ensureTutorialRuntime(runtime) {
    runtime.tutorial = runtime.tutorial || {};
    runtime.tutorial.active = Boolean(runtime.tutorial.active);
    runtime.tutorial.step = normalizeStep(runtime.tutorial.step ?? MIN_STEP);
    runtime.tutorial.from = runtime.tutorial.from ?? null;
    runtime.tutorial.firstRunLock = Boolean(runtime.tutorial.firstRunLock);
    runtime.tutorial.finishing = Boolean(runtime.tutorial.finishing);
    return runtime.tutorial;
  }

  function hideTutorialUI() {
    window.GameModules?.TutorialUI?.hide?.();
    window.Navigation?.hideOverlay?.('tutorial');
  }

  function startStep(step) {
    const runtime = getRuntime();
    if (!runtime) return;
    const tutorial = ensureTutorialRuntime(runtime);
    const normalized = normalizeStep(step ?? tutorial.step);
    tutorial.step = normalized;
    window.TutorialStorage?.setTutorialProgress?.(normalized);
    window.GameModules?.TutorialSteps?.start?.(normalized, runtime);
  }

  function startTutorial({ from } = {}) {
    const runtime = getRuntime();
    if (!runtime) return;
    const tutorial = ensureTutorialRuntime(runtime);
    if (tutorial.active) return;

    window.TutorialStorage?.ensureTutorialVersion?.();

    tutorial.active = true;
    tutorial.from = from ?? null;
    tutorial.firstRunLock = from === 'boot';
    tutorial.finishing = false;

    window.TutorialStorage?.setTutorialInProgress?.(true);
    tutorial.step = window.TutorialStorage?.getTutorialProgress?.() ?? tutorial.step;

    getStartGameFn()?.({ allowDuringTutorial: true });
    window.Navigation?.go?.('tutorial');

    startStep(tutorial.step);
  }

  function abortTutorial() {
    const runtime = getRuntime();
    if (!runtime) return;
    const tutorial = ensureTutorialRuntime(runtime);
    if (tutorial.firstRunLock) return;

    tutorial.active = false;
    tutorial.finishing = false;
    window.TutorialStorage?.setTutorialInProgress?.(false);

    window.Navigation?.go?.('lobby');
  }

  function finishTutorial() {
    const runtime = getRuntime();
    if (!runtime) return;
    const tutorial = ensureTutorialRuntime(runtime);
    if (tutorial.finishing) return;
    tutorial.finishing = true;

    window.TutorialStorage?.markTutorialCompleted?.();
    window.TutorialStorage?.setTutorialProgress?.(MAX_STEP);
    window.TutorialStorage?.setTutorialInProgress?.(false);

    hideTutorialUI();

    tutorial.active = false;
    tutorial.firstRunLock = false;
    getStartGameFn()?.({ allowDuringTutorial: true });
  }

  function onPlayerFail(reason) {
    const runtime = getRuntime();
    if (!runtime) return;
    const tutorial = ensureTutorialRuntime(runtime);
    if (!tutorial.active || tutorial.finishing) return;

    window.GameModules?.TutorialSteps?.handleFail?.(tutorial.step, reason, runtime);
    getStartGameFn()?.({ allowDuringTutorial: true });
    startStep(tutorial.step);
  }

  function restoreFromStorage(retryCount = 0) {
    const runtime = getRuntime();
    if (!runtime) {
      if (retryCount >= RESTORE_RETRY_LIMIT) return;
      setTimeout(() => restoreFromStorage(retryCount + 1), RESTORE_RETRY_DELAY);
      return;
    }
    const tutorial = ensureTutorialRuntime(runtime);
    window.TutorialStorage?.ensureTutorialVersion?.();
    const inProgress = window.TutorialStorage?.getTutorialInProgress?.();

    if (inProgress && !tutorial.active) {
      startTutorial({ from: 'lobby' });
      return;
    }

    tutorial.step = window.TutorialStorage?.getTutorialProgress?.() ?? tutorial.step;
    tutorial.active = false;
    tutorial.from = null;
    tutorial.firstRunLock = false;
    tutorial.finishing = false;
  }

  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = {
    startTutorial,
    abortTutorial,
    finishTutorial,
    onPlayerFail,
    restoreFromStorage,
    startStep,
    hideTutorialUI
  };

  window.addEventListener('load', () => {
    restoreFromStorage();
  });
})();
