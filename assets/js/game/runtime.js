window.GameModules = window.GameModules || {};

(function() {
  const STATE = Object.freeze({ RUN: 0, WARNING: 1, STOP: 2, PAUSE: 3 });

  function createRuntimeState(canvas, qaConfig) {
    const runtime = {
      gameState: STATE.RUN,
      gameActive: false,
      cycleTimer: 0,
      targetColorIndex: -1,
      currentThemeIdx: 0,
      currentLevelGoal: qaConfig?.stageLength ?? 2000,
      currentWarningMax: 6,
      isFirstWarning: true,
      bigGemSpawned: false,
      previousState: STATE.RUN,
      previousGameState: STATE.RUN,
      wasPlayerBoosting: false,
      cameraY: 0,
      cameraZoom: 1.0,
      targetZoom: 1.0,
      currentZoomLerp: 3.0,
      storm: { y: 0, currentSpeed: qaConfig?.stormBaseSpeed ?? 150 },
      items: [],
      slowMo: {
        active: false,
        remaining: 0,
        scaleBase: qaConfig?.slowMo?.scale ?? 1.0,
        blockUntil: 0,
        lastTriggerTime: 0,
        applyMask: qaConfig?.slowMo?.applyMask ?? 'world_only',
        reason: null
      },
      stage: {
        currentStageId: 1,
        previousStageId: 1,
        loopCount: 0,
        loopDifficultyScale: 1.0
      },
      grid: {
        COLS: window.Game?.LevelManager?.COLS ?? 5,
        CELL_H: window.Game?.LevelManager?.CELL_H ?? 100,
        CELL_W: 0
      },
      canvasSize: {
        width: canvas?.width ?? 0,
        height: canvas?.height ?? 0
      }
    };

    syncCanvasSize(runtime, canvas);
    return runtime;
  }

  function syncCanvasSize(runtime, canvas) {
    const size = window.CanvasSize ?? {};
    runtime.canvasSize.width = size.width ?? canvas?.width ?? 0;
    runtime.canvasSize.height = size.height ?? canvas?.height ?? 0;
    runtime.grid.CELL_W = runtime.canvasSize.width / runtime.grid.COLS;
    if (window.player?.setBounds) window.player.setBounds(runtime.canvasSize.width);
    window.Game?.Physics?.setCellWidth?.(runtime.grid.CELL_W);
  }

  function resetRuntime(runtime, qaConfig) {
    runtime.gameState = STATE.RUN;
    runtime.gameActive = true;
    runtime.cycleTimer = 3.0;
    runtime.targetColorIndex = -1;
    runtime.currentThemeIdx = 0;
    runtime.currentLevelGoal = qaConfig?.stageLength ?? 2000;
    runtime.currentWarningMax = 6;
    runtime.isFirstWarning = true;
    runtime.bigGemSpawned = false;
    runtime.previousState = STATE.RUN;
    runtime.previousGameState = STATE.RUN;
    runtime.wasPlayerBoosting = false;
    runtime.cameraY = 0;
    runtime.cameraZoom = 1.0;
    runtime.targetZoom = 1.0;
    runtime.currentZoomLerp = 3.0;
    runtime.storm = { y: 0, currentSpeed: qaConfig?.stormBaseSpeed ?? 150 };
    runtime.items = [];
    runtime.slowMo = {
      active: false,
      remaining: 0,
      scaleBase: qaConfig?.slowMo?.scale ?? 1.0,
      blockUntil: 0,
      lastTriggerTime: 0,
      applyMask: qaConfig?.slowMo?.applyMask ?? 'world_only',
      reason: null
    };
    runtime.stage = {
      currentStageId: 1,
      previousStageId: 1,
      loopCount: 0,
      loopDifficultyScale: 1.0
    };
  }

  window.GameModules.Runtime = {
    STATE,
    createRuntimeState,
    syncCanvasSize,
    resetRuntime
  };
})();
