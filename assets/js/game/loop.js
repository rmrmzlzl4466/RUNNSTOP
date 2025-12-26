window.GameModules = window.GameModules || {};

(function() {
  const { STATE, syncCanvasSize } = window.GameModules.Runtime;
  const { resetCamera, updateCameraZoom } = window.GameModules.Camera;
  const { getTargetColor, updateStageProgress } = window.GameModules.Stage;
  const { formatNumber, getCameraOffsetPct } = window.GameModules.Config;
  const {
    applyItem,
    pruneItemsBehindPlayer,
    spawnBigGem,
    spawnItemAtCol,
    spawnWarningGem
  } = window.GameModules.Items;

  function createGameLoop(runtime, player, qaConfig, handlers) {
  let rafId = null;
  let lastTime = 0;

  function render() {
    const camOffsetPct = getCameraOffsetPct(qaConfig);
    const pivotY = runtime.canvasSize.height * camOffsetPct;
    const panRatioX = qaConfig.camera?.panRatioX ?? 0.35;
    const centerX = runtime.canvasSize.width / 2;
    const pivotX = centerX * (1 - panRatioX) + player.x * panRatioX;

    window.Game.Renderer.draw({
      cameraY: runtime.cameraY,
      cameraZoom: runtime.cameraZoom,
      pivotX,
      pivotY,
      canvasWidth: runtime.canvasSize.width,
      canvasHeight: runtime.canvasSize.height,
      storm: runtime.storm,
      items: runtime.items,
      player,
      gameState: runtime.gameState,
      targetColorIndex: runtime.targetColorIndex,
      currentThemeIdx: runtime.currentThemeIdx,
      cycleTimer: runtime.cycleTimer,
      qaConfig,
      COLS: runtime.grid.COLS,
      CELL_W: runtime.grid.CELL_W,
      CELL_H: runtime.grid.CELL_H,
      STATE
    });
  }

  function checkStopJudgment() {
    if (player.isBoosting) return;
    const result = window.Game.Physics.checkSafeZone(player, runtime.targetColorIndex);
    if (result.isSafe) {
      player.grantSurvivalBooster();
      window.Sound?.sfx('boost_ready');
      window.Game.UI.showToast(player, 'GET READY...', '#f1c40f', 600);
    } else if (result.action === 'barrier_save') {
      window.Game.Physics.applyBarrierSave(player);
      window.Game.UI.showBarrierSaved();
      window.Sound?.sfx('jump');
    } else if (result.action === 'die') {
      handlers.onDie?.('FALL');
    }
  }

  function checkFallDie() {
    if (player.isBoosting) return;
    const result = window.Game.Physics.checkSafeZone(player, runtime.targetColorIndex);
    if (result.action === 'barrier_save') {
      window.Game.Physics.applyBarrierSave(player);
      window.Game.UI.showBarrierSaved();
      window.Sound?.sfx('jump');
    } else if (result.action === 'die') {
      handlers.onDie?.('FALL_DURING_STOP');
    }
  }

  function handleItems() {
    const activeRange = player.magnetTimer > 0 ? qaConfig.magnetRange : player.baseMagnetRange;
    const collectedItems = window.Game.Physics.processItemCollisions(player, runtime.items, activeRange);
    collectedItems.forEach((it) => applyItem(runtime, player, qaConfig, it));
    window.Game.Physics.removeCollectedItems(runtime.items, collectedItems);
  }

  function ensureRowsAroundPlayer() {
    const pRow = Math.floor(player.y / runtime.grid.CELL_H);
    for (let i = pRow - 15; i < pRow + 5; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(runtime, i, type, col));
    }
  }

  function update(dt) {
    window.Game.UI.updateFloatingTexts(dt);
    window.Game.UI.updateBuffs(player);
    window.Game.UI.updateDash(player);
    player.update(dt, { input: window.Input, qaConfig, canvasWidth: runtime.canvasSize.width });
    player.sessionScore += (qaConfig.scorePerSecond ?? 0) * dt;
    window.Game.UI.updateScore(player.sessionScore, formatNumber);
    if (player.isDying) return;

    const currentDist = Math.floor((550 - player.y) / 10);
    if (currentDist > player.dist) {
      player.dist = currentDist;
      updateStageProgress(runtime, player.dist, qaConfig);
    }

    const stormSpeed = window.Game.Physics.getStormSpeed(player.dist, qaConfig.stormBaseSpeed);
    runtime.storm.y -= stormSpeed * dt;
    if (window.Game.Physics.checkStormCollision(player, runtime.storm)) {
      handlers.onDie?.('STORM');
      return;
    }

    const screenBottom = runtime.cameraY + runtime.canvasSize.height;
    window.Game.UI.setStormWarning(runtime.storm.y < screenBottom + 300);
    window.Game.LevelManager.cleanupRows(runtime.storm.y);
    const camOffsetPct = getCameraOffsetPct(qaConfig);
    const targetCamY = player.y - (runtime.canvasSize.height / Math.max(0.001, runtime.cameraZoom)) * camOffsetPct;
    const followRate = 5 * Math.min(Math.max(runtime.cameraZoom, 1), 1.4);
    runtime.cameraY += (targetCamY - runtime.cameraY) * followRate * dt;

    updateCameraZoom(runtime, player, qaConfig, dt);
    ensureRowsAroundPlayer();
    window.Game.Physics.filterItemsBehindStorm(runtime.items, runtime.storm);
    handleItems();

    runtime.cycleTimer -= dt;
    window.Game.UI.updateChase(player.dist, runtime.storm.y, runtime.currentLevelGoal);
    if (runtime.gameState === STATE.RUN) {
      window.Game.UI.setPhase(runtime.gameState, runtime.cycleTimer, 3.0, STATE);
    } else if (runtime.gameState === STATE.WARNING) {
      window.Game.UI.setPhase(runtime.gameState, runtime.cycleTimer, runtime.currentWarningMax || 6.0, STATE);
    } else if (runtime.gameState === STATE.STOP) {
      window.Game.UI.setPhase(runtime.gameState, runtime.cycleTimer, qaConfig.stopPhaseDuration ?? 1.5, STATE);
    }
    window.Game.UI.setStateGlow(runtime.gameState, STATE);

    if (runtime.gameState === STATE.WARNING || runtime.gameState === STATE.STOP) {
      if (runtime.targetColorIndex !== -1) {
        const currentColor = getTargetColor(runtime, runtime.targetColorIndex);
        if (currentColor) window.Game.UI.setTargetColor(currentColor);
      }
    }

    if (runtime.gameState === STATE.RUN) {
      if (runtime.cycleTimer <= 0) {
        runtime.gameState = STATE.WARNING;
        runtime.cycleTimer = runtime.isFirstWarning ? 12.0 : Math.max(7.0 - Math.min(player.dist / 5000, 1.0) * 4.0, 3.0);
        runtime.isFirstWarning = false;
        runtime.currentWarningMax = runtime.cycleTimer;
        runtime.targetColorIndex = window.Game.LevelManager.pickSafeTargetColor(player.y, runtime.currentThemeIdx);
        window.Game.UI.onWarningStart(getTargetColor(runtime, runtime.targetColorIndex));
        window.Sound?.sfx('alert');
        spawnWarningGem(runtime, player);
        runtime.bigGemSpawned = false;
      }
    } else if (runtime.gameState === STATE.WARNING) {
      window.Game.UI.onWarningUpdate(runtime.cycleTimer);
      const bigGemTriggerTime = (runtime.currentWarningMax || 6.0) * 0.3;
      if (!runtime.bigGemSpawned && runtime.cycleTimer <= bigGemTriggerTime) {
        spawnBigGem(runtime, player, runtime.targetColorIndex);
        runtime.bigGemSpawned = true;
      }
      if (runtime.cycleTimer <= 0) {
        runtime.gameState = STATE.STOP;
        runtime.cycleTimer = qaConfig.stopPhaseDuration ?? 1.5;
        window.Game.UI.onStopStart();
        if (!player.isDashing) {
          player.vx *= 0.1;
          player.vy *= 0.1;
        }
        checkStopJudgment();
      }
    } else if (runtime.gameState === STATE.STOP) {
      if (!player.isBoosting) checkFallDie();
      if (runtime.cycleTimer <= 0) {
        runtime.gameState = STATE.RUN;
        runtime.cycleTimer = 3.0;
        window.Game.UI.onRunStart();
      }
    }
  }

  function tick(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.033);
    lastTime = ts;
    if (!runtime.gameActive) return;

    if (runtime.gameState !== STATE.PAUSE) {
      update(dt);
      render();
    }

    if (!player.isDead && runtime.gameState !== STATE.PAUSE) {
      rafId = requestAnimationFrame(tick);
    } else if (player.isDead) {
      handlers.onGameOver?.();
    }
  }

  return {
    start() {
      runtime.gameActive = true;
      resetCamera(runtime);
      syncCanvasSize(runtime, document.getElementById('gameCanvas'));
      lastTime = performance.now();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    },
    pause() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    },
    resume() {
      if (rafId) cancelAnimationFrame(rafId);
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      runtime.gameActive = false;
    },
    isRunning: () => !!rafId
  };
  }

  window.GameModules.Loop = { createGameLoop };
})();
