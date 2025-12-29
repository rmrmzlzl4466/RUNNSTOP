window.GameModules = window.GameModules || {};

(function() {
  const { applyLoadoutStats, formatNumber, getSkins, getCameraOffsetPct } = window.GameModules.Config;
  const { resetRuntime, STATE, syncCanvasSize } = window.GameModules.Runtime;
  const { createGameLoop } = window.GameModules.Loop;
  const { spawnItemAtCol, pruneItemsBehindPlayer } = window.GameModules.Items;
  const { applyLoopDifficultyScaling, showStageNotification } = window.GameModules.Stage;

  function createLifecycle(canvas, player, qaConfig, gameData, saveGameData, runtime) {
    const loop = createGameLoop(runtime, player, qaConfig, {
      onDie: handleDeath,
      onGameOver: handleGameOver
    });

  function prepareLevel() {
    window.Game.LevelManager.reset();
    runtime.items = [];
    for (let i = -15; i < 10; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(runtime, i, type, col));
    }
    pruneItemsBehindPlayer(runtime, player);
  }

  function handleDeath(reason) {
    if (runtime.tutorialMode) {
      window.TutorialManager?.retryStep?.();
      return;
    }
    if (player.isDead || player.isDying) return;
    if (player.hasRevive) {
      player.hasRevive = false;
      player.hasBarrier = true;
      player.vy = -1000;
      player.invincibleTimer = 2.0;
      window.Sound?.sfx('item');
      return;
    }
    // Force off slow motion before death animation
    window.GameModules?.SlowMo?.forceOff?.(runtime);
    window.Sound?.bgmStop?.();
    player.die(qaConfig.deathDelay);
    window.Sound?.sfx('die');
  }

  function handleGameOver() {
    if (!runtime.gameActive) return;
    runtime.gameActive = false;
    // Force off slow motion
    window.GameModules?.SlowMo?.forceOff?.(runtime);

    gameData.coins += player.sessionCoins;
    gameData.gems += player.sessionGems;

    gameData.stats.totalGames += 1;
    gameData.stats.totalCoins += player.sessionCoins;
    if (player.dist > gameData.stats.maxDist) gameData.stats.maxDist = player.dist;
    gameData.stats.totalDeaths += 1;

    const distanceBonus = player.dist * (qaConfig.scorePerMeter ?? 0);
    const itemScore = player.sessionBits * (qaConfig.scorePerBit ?? 0) +
      player.sessionCoins * (qaConfig.scorePerCoin ?? 0) +
      player.sessionGems * (qaConfig.scorePerGem ?? 0);
    const totalScore = Math.floor(player.sessionScore + distanceBonus);
    const previousHigh = gameData.stats.highScore || 0;
    const isNewRecord = totalScore > previousHigh;
    if (isNewRecord) gameData.stats.highScore = totalScore;

    saveGameData(gameData);
    window.updateUpgradeUI?.();
    window.renderSkinList?.();

    // 보물 코인 보너스 적용 (runtime.treasureCoinBonus 사용)
    const coinBonus = runtime.treasureCoinBonus ?? 0;
    if (coinBonus > 0) {
      const bonus = Math.floor(player.sessionCoins * (coinBonus / 100));
      gameData.coins += bonus;
      saveGameData(gameData);
    }

    window.Game.UI.updateResult({
      dist: player.dist,
      bits: player.sessionBits,
      coins: player.sessionCoins,
      gems: player.sessionGems,
      totalScore,
      highScore: gameData.stats.highScore || 0,
      isNewRecord,
      itemScore,
      distanceBonus,
      formatNumber
    });

    window.Game.UI.setMobileControls(false);
    window.Sound?.bgmStop?.();
    window.Navigation?.go?.('result');
  }

  function startGame(e) {
    if (e) {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    }
    if (runtime.gameActive) {
      loop.stop();
    }
    window.Input?.setIgnoreInputUntil?.(performance.now() + 250);
    window.Sound?.bgmStart?.();
    window.Sound?.sfx?.('btn');

    syncCanvasSize(runtime, canvas);
    resetRuntime(runtime, qaConfig);
    runtime._lastPauseReason = null;
    qaConfig._effectiveStormSpeed = qaConfig.stormBaseSpeed ?? 150;

    player.reset(canvas.width / 2, 550);
    player.sessionScore = 0;
    player.sessionBits = 0;
    player.sessionCoins = 0;
    player.sessionGems = 0;

    // 아이템 업그레이드 로드 및 캐시 (런 시작 시 1회)
    const itemUpgradesData = window.ItemUpgrades?.load?.() ?? {};
    const effectiveUpgrades = window.ItemUpgrades?.getEffectiveValues?.(itemUpgradesData) ?? {
      boosterDistanceMult: 1.0,
      magnetDurationBonusSec: 0,
      magnetRangeMult: 1.0,
      shieldDropChanceBonus: 0
    };
    runtime.itemUpgrades = { ...effectiveUpgrades };

    // 스킨/보물 효과 적용 (runtime 전달로 보물 효과가 캐시에 추가됨)
    applyLoadoutStats(player, qaConfig, gameData, runtime);

    const skin = getSkins().find((s) => s.id === gameData.equippedSkin);
    if (skin?.useSprite === false) skin.useSprite = true;

    prepareLevel();

    const initialStageLength = window.STAGE_CONFIG?.[0]?.length ?? qaConfig.stageLength ?? 2000;
    runtime.currentLevelGoal = initialStageLength;

    runtime.storm.y = player.y + 800;
    runtime.gameState = STATE.RUN;
    runtime.cycleTimer = 3.0;
    runtime.isFirstWarning = true;

    window.Navigation?.hideAll?.();
    window.Game.UI.setPhase(STATE.RUN, 3.0, 3.0, STATE);
    window.Game.UI.setStateGlow(STATE.RUN, STATE);
    window.Game.UI.resetForGameStart();
    window.Game.UI.updateScore(0, formatNumber, true);

    loop.start();
  }

  function togglePause() {
    if (!runtime.gameActive) return;
    if (runtime.gameState === STATE.PAUSE) {
      resumeGame();
    } else {
      pauseGame({ showOverlay: true, reason: 'manual' });
    }
    window.Sound?.sfx?.('btn');
  }

  function restartFromPause() {
    window.Navigation?.hideOverlay?.('overlay-pause');
    loop.stop();
    startGame();
  }

  function quitGame() {
    window.Navigation?.hideOverlay?.('overlay-pause');
    loop.stop();
    runtime.gameActive = false;
    window.Sound?.bgmStop?.();
    window.Game.UI.setMobileControls(false);
    window.Navigation?.go?.('lobby');
    window.Sound?.sfx?.('btn');
  }

  function warpToDistance(targetDistance) {
    if (!runtime.gameActive) startGame();

    window.Game.LevelManager.reset();
    runtime.items = [];

    player.y = 550 - targetDistance * 10;
    player.x = runtime.canvasSize.width / 2;
    player.dist = targetDistance;
    player.vx = 0;
    player.vy = 0;

    runtime.storm.y = player.y + 600;

    const playerRow = Math.floor(player.y / runtime.grid.CELL_H);
    for (let i = playerRow - 15; i < playerRow + 5; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(runtime, i, type, col));
    }
    pruneItemsBehindPlayer(runtime, player);

    const camOffsetPct = getCameraOffsetPct(qaConfig);
    runtime.cameraY = player.y - runtime.canvasSize.height * camOffsetPct;

    const stageInfo = window.Game.LevelManager.getStageInfo(targetDistance);
    runtime.stage.currentStageId = stageInfo.stageConfig.id;
    runtime.stage.previousStageId = runtime.stage.currentStageId;
    runtime.currentThemeIdx = stageInfo.stageConfig.themeIdx;
    runtime.stage.loopCount = stageInfo.loopCount;
    runtime.currentLevelGoal = (window.STAGE_CUMULATIVE?.[stageInfo.stageIndex] ?? 0) + stageInfo.stageConfig.length;

    // Update currentConfig for StageConfig system
    window.GameModules?.StageConfig?.updateCurrentConfig?.(runtime, stageInfo.stageConfig.id);

    if (stageInfo.isLooping && stageInfo.loopCount > 0) {
      applyLoopDifficultyScaling(runtime, qaConfig, stageInfo.loopCount);
    } else {
      runtime.stage.loopDifficultyScale = 1.0;
      qaConfig._effectiveStormSpeed = qaConfig.stormBaseSpeed ?? 150;
    }

    showStageNotification(stageInfo);
    runtime.gameState = STATE.RUN;
    runtime.cycleTimer = 3.0;
    runtime.isFirstWarning = true;
  }

  function pauseGame({ showOverlay = false, reason = 'manual' } = {}) {
    runtime.previousState = runtime.gameState || STATE.RUN;
    runtime.gameState = STATE.PAUSE;
    window.Sound?.bgmStop?.();
    if (showOverlay) window.Navigation?.showOverlay?.('overlay-pause');
    loop.pause();
    runtime._lastPauseReason = reason;
  }

  function resumeGame() {
    const targetState = runtime.previousState || STATE.RUN;
    runtime.gameState = targetState;
    runtime.previousState = STATE.RUN;
    window.Navigation?.hideOverlay?.('overlay-pause');
    window.Sound?.bgmStart?.();
    loop.resume();
    runtime._lastPauseReason = null;
  }

  function pauseForVisibility() {
    if (!runtime.gameActive) return;
    if (runtime.gameState !== STATE.PAUSE) {
      pauseGame({ showOverlay: true, reason: 'visibility' });
    } else {
      runtime._lastPauseReason = 'visibility';
    }
  }

  function resumeIfPausedByVisibility() {
    if (runtime.gameState === STATE.PAUSE && runtime._lastPauseReason === 'visibility') {
      window.Navigation?.showOverlay?.('overlay-pause');
      runtime._lastPauseReason = null;
    }
  }

  return {
    startGame,
    togglePause,
    restartFromPause,
    quitGame,
    warpToDistance,
    pauseForVisibility,
    resumeIfPausedByVisibility
  };
  }

  window.GameModules.Lifecycle = { createLifecycle };
})();
