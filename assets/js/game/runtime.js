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
      // 아이템 업그레이드 효과값 캐시 (런 시작 시 1회 계산)
      itemUpgrades: {
        boosterDistanceMult: 1.0,
        magnetDurationBonusSec: 0,
        magnetRangeMult: 1.0,
        shieldDropChanceBonus: 0
      },
      treasureCoinBonus: 0,  // 보물 코인 보너스 % (상한 50%)
      slowMo: {
        active: false,
        phase: 0,  // 0=INACTIVE, 1=EASE_IN, 2=HOLD, 3=EASE_OUT
        phaseTime: 0,
        easeInDuration: 0.12,
        holdDuration: 0.25,
        easeOutDuration: 0.20,
        targetScale: 0.15,
        currentScale: 1.0,
        totalRemaining: 0,
        blockUntil: 0,
        lastTriggerTime: 0,
        applyMask: qaConfig?.slowMo?.applyMask ?? 'world_only',
        visualIntensity: 0,  // 0~1 for visual effects
        reason: null
      },
      stage: {
        currentStageId: 1,
        previousStageId: 1,
        loopCount: 0,
        loopDifficultyScale: 1.0,
        currentConfig: null  // Current stage's StageConfig object
      },
      grid: {
        COLS: window.Game?.LevelManager?.COLS ?? 5,
        CELL_H: window.Game?.LevelManager?.CELL_H ?? 100,
        CELL_W: 0
      },
      canvasSize: {
        width: canvas?.width ?? 0,
        height: canvas?.height ?? 0
      },
      tutorial: {
        active: false,
        step: 1,
        from: null,
        firstRunLock: false,
        finishing: false
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
    // 아이템 업그레이드 캐시 초기화 (lifecycle에서 실제 값 설정)
    runtime.itemUpgrades = {
      boosterDistanceMult: 1.0,
      magnetDurationBonusSec: 0,
      magnetRangeMult: 1.0,
      shieldDropChanceBonus: 0
    };
    runtime.treasureCoinBonus = 0;
    runtime.slowMo = {
      active: false,
      phase: 0,
      phaseTime: 0,
      easeInDuration: 0.12,
      holdDuration: 0.25,
      easeOutDuration: 0.20,
      targetScale: 0.15,
      currentScale: 1.0,
      totalRemaining: 0,
      blockUntil: 0,
      lastTriggerTime: 0,
      applyMask: qaConfig?.slowMo?.applyMask ?? 'world_only',
      visualIntensity: 0,
      reason: null
    };
    runtime.stage = {
      currentStageId: 1,
      previousStageId: 1,
      loopCount: 0,
      loopDifficultyScale: 1.0,
      currentConfig: null
    };
    // Initialize Stage 1 config
    window.GameModules?.StageConfig?.updateCurrentConfig?.(runtime, 1);
  }

  window.GameModules.Runtime = {
    STATE,
    createRuntimeState,
    syncCanvasSize,
    resetRuntime
  };
})();
