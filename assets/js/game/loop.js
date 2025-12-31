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

  // SlowMo? Gimmick? ?숈쟻?쇰줈 李몄“ (紐⑤컮?쇱뿉??濡쒕뵫 ?쒖꽌 臾몄젣 諛⑹?)
  const getSlowMo = () => window.GameModules.SlowMo;
  const getGimmick = () => window.GameModules.Gimmick;

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

  function checkStopJudgment(nowSec) {
    // [DEBUG] ?붾쾭洹??뺣낫 ???
    runtime._stopJudgmentDebug = `isBoosting: ${player.isBoosting}`;

    if (player.isBoosting) {
      runtime._stopJudgmentDebug = 'SKIPPED: Player is boosting';
      return false;
    }
    const result = window.Game.Physics.checkSafeZone(player, runtime.targetColorIndex);
    runtime._stopJudgmentDebug = `Safe: ${result.isSafe}, Genuine: ${result.genuineSafe}, Action: ${result.action}`;

    // genuineSafe: ?ㅼ젣濡??덉쟾 吏? ?꾩뿉???앹〈??寃쎌슦留?JFB 蹂댁긽
    if (result.genuineSafe) {
      window.GameModules.Tutorial?.dispatchEvent?.('safe_judgment');
      player.grantSurvivalBooster();
      // Trigger slow motion on survival success
      const slowMoModule = getSlowMo();
      runtime._stopJudgmentDebug = `JFB granted! SlowMo: ${slowMoModule ? 'OK' : 'NULL'}`;
      const started = slowMoModule?.start?.(runtime, qaConfig, nowSec, 'stop_survival');
      console.log('[Loop] JFB granted, SlowMo:', started);

      window.Sound?.sfx('boost_ready');
      window.Game.UI.showToast(player, 'GET READY...', '#f1c40f', 600);
    } else if (result.action === 'invincible_save') {
      // 臾댁쟻?쇰줈 ?앹〈 - JFB 蹂댁긽 ?놁쓬, 二쎌????딆쓬
      runtime._stopJudgmentDebug = 'Invincible save - No JFB reward';
    } else if (result.action === 'barrier_save') {
      window.Game.Physics.applyBarrierSave(player);
      window.Game.UI.showBarrierSaved();
      window.Sound?.sfx('jump');
    } else if (result.action === 'die') {
      const handled = handlers.onDie?.('FALL');
      return !!handled;
    }
    return false;
  }

  function checkFallDie() {
    if (player.isBoosting) return false;
    const result = window.Game.Physics.checkSafeZone(player, runtime.targetColorIndex);
    if (result.action === 'barrier_save') {
      window.Game.Physics.applyBarrierSave(player);
      window.Game.UI.showBarrierSaved();
      window.Sound?.sfx('jump');
    } else if (result.action === 'die') {
      const handled = handlers.onDie?.('FALL_DURING_STOP');
      return !!handled;
    }
    return false;
  }

  function handleItems() {
    // 留덇렇??踰붿쐞 ?낃렇?덉씠???곸슜
    const rangeMult = runtime.itemUpgrades?.magnetRangeMult ?? 1.0;
    const baseRange = player.magnetTimer > 0 ? qaConfig.magnetRange : player.baseMagnetRange;
    const activeRange = baseRange * rangeMult;
    const collectedItems = window.Game.Physics.processItemCollisions(player, runtime.items, activeRange);
    collectedItems.forEach((it) => applyItem(runtime, player, qaConfig, it));
    window.Game.Physics.removeCollectedItems(runtime.items, collectedItems);
  }

  function ensureRowsAroundPlayer() {
    const pRow = Math.floor(player.y / runtime.grid.CELL_H);
    // Calculate rows needed ahead based on boost distance (boostDist / CELL_H + buffer)
    const boostDist = qaConfig.boostDist ?? 700;
    const survivalBoostDist = player.survivalBoostDistPerfect ?? 2000;
    const maxBoostRows = Math.ceil(Math.max(boostDist, survivalBoostDist) / runtime.grid.CELL_H) + 5;
    const rowsAhead = Math.max(25, maxBoostRows); // At least 25 rows ahead (2500 units)

    for (let i = pRow - rowsAhead; i < pRow + 5; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(runtime, i, type, col));
    }
  }

  function update(dt, nowSec) {
    // Get world scale from SlowMo module
    const worldScale = getSlowMo()?.getWorldScale?.(runtime, qaConfig, nowSec, player.isBoosting) ?? 1.0;
    const worldDt = dt * worldScale;

    // 튜토리얼 모드 분기 처리
    if (window.GameModules.Tutorial?.tick?.()) {
      return;
    }

    // Get effective config (stage-specific values with QA overrides)
    let effective = window.GameModules?.StageConfig?.getEffective?.() ?? {
      stormSpeed: qaConfig.stormBaseSpeed ?? 150,
      runPhaseDuration: qaConfig.runPhaseDuration ?? 3.0,
      warningTimeBase: qaConfig.warningTimeBase ?? 7.0,
      warningTimeMin: qaConfig.warningTimeMin ?? 3.0,
      warningTimeMult: 1.0,
      stopPhaseDuration: qaConfig.stopPhaseDuration ?? 1.5
    };

    // ?쒗넗由ъ뼹 ?ㅻ쾭?쇱씠???곸슜
    
    const tutorialRules = effective._tutorialRules || {};

    // ?쒗넗由ъ뼹 Step 1: RUN ?곹깭 怨좎젙
    if (runtime.tutorialMode && tutorialRules.lockGameState === 'RUN') {
      runtime.gameState = STATE.RUN;
      runtime.cycleTimer = Number.isFinite(runtime.cycleTimer) ? Math.max(runtime.cycleTimer, 999) : 999;
    }

    // ?쒗넗由ъ뼹 Step 2: ?ъ씠??吏??(?몃━嫄?諛쒖깮 ?쒓퉴吏)
    if (runtime.tutorialMode && runtime._tutorialHoldCycle) {
      runtime.gameState = STATE.RUN;
      runtime.cycleTimer = Infinity;
    }

    // ?쒗넗由ъ뼹 Step 1-2: ?ㅽ넱 鍮꾪솢?깊솕
    const stormEnabled = !runtime.tutorialMode || runtime._tutorialStormEnabled;
    if (!stormEnabled) {
      runtime.storm.y = player.y + 2000;
    }

    // UI uses real time (not slowed)
    const applyMask = runtime.slowMo?.applyMask ?? 'world_only';
    const uiDt = (applyMask === 'everything') ? worldDt : dt;

    // Update SlowMo timer with real dt
    getSlowMo()?.update?.(runtime, dt);

    window.Game.UI.updateFloatingTexts(uiDt);
    window.Game.UI.updateBuffs(player);
    window.Game.UI.updateDash(player);
    // Pass effective config for per-stage physics (friction, baseSpeed, etc.)
    player.update(worldDt, { input: window.Input, qaConfig, effective, canvasWidth: runtime.canvasSize.width });
    // Apply scoreMult from effective config (includes loopScale)
    player.sessionScore += (qaConfig.scorePerSecond ?? 0) * worldDt * effective.scoreMult;
    window.Game.UI.updateScore(player.sessionScore, formatNumber);
    if (player.isDying) return;

    const currentDist = Math.floor((550 - player.y) / 10);
    if (currentDist > player.dist) {
      player.dist = currentDist;
      updateStageProgress(runtime, player.dist, qaConfig);
    }

    // Update gimmicks (?숈쟻 李몄“濡?紐⑤컮???명솚???뺣낫)
    getGimmick()?.updateGlitchSwap?.(runtime.gameState, nowSec, { player, grid: runtime.grid });
    const stormPulseMult = getGimmick()?.updateStormPulse?.(worldDt, runtime.gameState) ?? 1.0;

    // Use effective stormSpeed (includes stage multiplier, loop scaling, and gimmick pulse)
    if (stormEnabled) {
      const baseStormSpeed = window.Game.Physics.getStormSpeed(player.dist, effective.stormSpeed);
      const stormSpeed = baseStormSpeed * stormPulseMult;
      runtime.storm.y -= stormSpeed * worldDt;
      if (window.Game.Physics.checkStormCollision(player, runtime.storm)) {
        const handled = handlers.onDie?.('STORM');
        if (handled) return;
        return;
      }
    }

    const screenBottom = runtime.cameraY + runtime.canvasSize.height;
    window.Game.UI.setStormWarning(stormEnabled && runtime.storm.y < screenBottom + 300);
    window.Game.LevelManager.cleanupRows(runtime.storm.y);
    const camOffsetPct = getCameraOffsetPct(qaConfig);
    const targetCamY = player.y - (runtime.canvasSize.height / Math.max(0.001, runtime.cameraZoom)) * camOffsetPct;
    const followRate = 5 * Math.min(Math.max(runtime.cameraZoom, 1), 1.4);
    runtime.cameraY += (targetCamY - runtime.cameraY) * followRate * worldDt;

    updateCameraZoom(runtime, player, qaConfig, worldDt);
    ensureRowsAroundPlayer();
    window.Game.Physics.filterItemsBehindStorm(runtime.items, runtime.storm);
    if (!runtime.tutorialMode || tutorialRules.itemsEnabled !== false) {
      handleItems();
    } else {
      runtime.items.length = 0;
    }

    runtime.cycleTimer -= worldDt;
    window.Game.UI.updateChase(player.dist, runtime.storm.y, runtime.currentLevelGoal);

    if (runtime.gameState === STATE.RUN) {
      window.Game.UI.setPhase(runtime.gameState, runtime.cycleTimer, effective.runPhaseDuration, STATE);
    } else if (runtime.gameState === STATE.WARNING) {
      window.Game.UI.setPhase(runtime.gameState, runtime.cycleTimer, runtime.currentWarningMax || 6.0, STATE);
    } else if (runtime.gameState === STATE.STOP) {
      window.Game.UI.setPhase(runtime.gameState, runtime.cycleTimer, effective.stopPhaseDuration, STATE);
    }
    window.Game.UI.setStateGlow(runtime.gameState, STATE);

    if (runtime.gameState === STATE.WARNING || runtime.gameState === STATE.STOP) {
      if (runtime.targetColorIndex !== -1) {
        const currentColor = getTargetColor(runtime, runtime.targetColorIndex);
        if (currentColor) window.Game.UI.setTargetColor(currentColor);
      }
    }

    // Check if boost started - cancel slowmo based on policy
    const boostStarted = player.isBoosting && !runtime._prevBoosting;
    runtime._prevBoosting = player.isBoosting;
    if (boostStarted) {
      getSlowMo()?.checkCancelPolicy?.(runtime, qaConfig, 'on_boost_start', nowSec);
    }

    if (runtime.gameState === STATE.RUN) {
      if (runtime.cycleTimer <= 0) {
        runtime.gameState = STATE.WARNING;
        // Use effective warning time values (firstWarningTimeBase for first warning, warningTimeBase with distance scaling for subsequent)
        const baseWarning = runtime.isFirstWarning
          ? effective.firstWarningTimeBase * effective.warningTimeMult
          : Math.max(effective.warningTimeBase - Math.min(player.dist / 5000, 1.0) * 4.0, effective.warningTimeMin) * effective.warningTimeMult;
        runtime.cycleTimer = baseWarning;
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
      if (runtime.targetColorIndex === -1) {
        runtime.targetColorIndex = window.Game.LevelManager.pickSafeTargetColor(player.y, runtime.currentThemeIdx);
        window.Game.UI.onWarningStart(getTargetColor(runtime, runtime.targetColorIndex));
      }
      const bigGemTriggerTime = (runtime.currentWarningMax || 6.0) * 0.3;
      if (!runtime.bigGemSpawned && runtime.cycleTimer <= bigGemTriggerTime) {
        spawnBigGem(runtime, player, runtime.targetColorIndex);
        runtime.bigGemSpawned = true;
      }
      if (runtime.cycleTimer <= 0) {
        runtime.gameState = STATE.STOP;
        runtime.cycleTimer = effective.stopPhaseDuration;
        window.Game.UI.onStopStart();
        if (!player.isDashing) {
          player.vx *= 0.1;
          player.vy *= 0.1;
        }
        if (checkStopJudgment(nowSec)) return;
      }
    } else if (runtime.gameState === STATE.STOP) {
      if (!player.isBoosting && checkFallDie()) return;
      if (runtime.cycleTimer <= 0) {
        runtime.gameState = STATE.RUN;
        runtime.cycleTimer = effective.runPhaseDuration;
        window.Game.UI.onRunStart();
      }
    }
  }

  function tick(ts) {
    try {
      const dt = Math.min((ts - lastTime) / 1000, 0.033);
      const nowSec = ts / 1000;
      lastTime = ts;
      if (!runtime.gameActive) return;

      if (runtime.gameState !== STATE.PAUSE) {
        update(dt, nowSec);
        render();
      }

      if (!player.isDead && runtime.gameState !== STATE.PAUSE) {
        rafId = requestAnimationFrame(tick);
      } else if (player.isDead) {
        handlers.onGameOver?.();
      }
    } catch (e) {
      console.error('[LOOP] fatal', e);
      runtime.gameActive = false;
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



