(function() {
  try {
  const modules = window.GameModules || {};
  const { attachQAConfig, createQAConfig } = modules.Config || {};
  const { createLifecycle } = modules.Lifecycle || {};
  const { STATE, createRuntimeState, syncCanvasSize } = modules.Runtime || {};
  const { loadGameData, persistGameData, resetGameData } = modules.Storage || {};
  if (!attachQAConfig || !createLifecycle || !createRuntimeState) {
    console.error('[BOOT] Missing GameModules dependencies', modules);
    return;
  }

  const qaConfig = createQAConfig();
  attachQAConfig(qaConfig);
  window.qaConfig = qaConfig;

  const gameData = loadGameData();
  window.GameData = gameData;
  window.Game = window.Game || {};
  window.Game.data = gameData;

  const player = new Player();
  window.player = player;
  window.Game.player = player;

  window.shouldStartTutorial = !gameData.tutorialCompleted;
  let canvas = null;
  let ctx = null;
  let runtime = null;
  let lifecycle = null;
  let resizeHandler = null;

  function updateLifecycleBindings() {
    window.startGame = safeStartGame;
    window.togglePause = lifecycle?.togglePause;
    window.restartFromPause = lifecycle?.restartFromPause;
    window.quitGame = lifecycle?.quitGame;
    window.resetSaveData = handleResetSave;
    if (lifecycle) {
      window.Game.startGame = lifecycle.startGame;
      window.Game.togglePause = lifecycle.togglePause;
      window.Game.restartFromPause = lifecycle.restartFromPause;
      window.Game.quitGame = lifecycle.quitGame;
      window.Game.warpToDistance = lifecycle.warpToDistance;
    } else {
      window.Game.startGame = undefined;
      window.Game.togglePause = undefined;
      window.Game.restartFromPause = undefined;
      window.Game.quitGame = undefined;
      window.Game.warpToDistance = undefined;
    }
    window.Game.saveGame = saveGame;
    window.Game.resetSaveData = handleResetSave;
  }

  function rebuildRuntime(isTutorialMode) {
    const targetCanvas = document.getElementById(isTutorialMode ? 'game-canvas-tutorial' : 'gameCanvas');
    if (!targetCanvas) {
      console.warn('[BOOT] Target canvas missing for mode', isTutorialMode ? 'tutorial' : 'normal');
      return false;
    }
    canvas = targetCanvas;
    ctx = (window.CanvasSize?.ctx) ?? canvas.getContext('2d', { alpha: false });
    runtime = createRuntimeState(canvas, qaConfig);
    window.runtime = runtime;  // For StageConfig module
    window.Game.runtime = runtime;
    window.Game.Renderer?.init?.(canvas, ctx);
    window.Game.Physics?.init?.(runtime.grid.COLS, runtime.grid.CELL_W, runtime.grid.CELL_H);

    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = () => syncCanvasSize(runtime, canvas);
    window.syncCanvasSize = resizeHandler;
    window.addEventListener('resize', resizeHandler);

    lifecycle = createLifecycle(canvas, player, qaConfig, gameData, saveGame, runtime);
    updateLifecycleBindings();
    return true;
  }

  // Initialize subsystems (UI/input once)
  window.Game.UI?.init?.();
  window.Input?.initControls?.();
  window.initQASliders?.();
  window.updateUpgradeUI?.();
  window.renderSkinList?.();

  let runtimeReady = rebuildRuntime(window.shouldStartTutorial);
  if (!runtimeReady) {
    window.shouldStartTutorial = false;
    runtimeReady = rebuildRuntime(false);
  }

  function saveGame() {
    persistGameData(gameData);
  }

  function handleResetSave() {
    resetGameData();
  }

  function safeStartGame(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!lifecycle || typeof lifecycle.startGame !== 'function') {
      console.error('[BOOT] lifecycle.startGame missing', lifecycle);
      return;
    }
    try {
      lifecycle.startGame();
    } catch (err) {
      console.error('[BOOT] startGame failed', err);
    }
  }

  function bindStartButtons() {
    const btnStart = document.getElementById('btn-start');
    const btnResultRestart = document.getElementById('btn-result-restart');

    // Start button with glitch effect
    btnStart?.addEventListener('click', () => {
      // Add glitch effect class
      btnStart.classList.add('glitch-click');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([20, 30, 40]);
      }

      // Play glitch sound if available
      window.Sound?.sfx?.('bit');

      // Start game after glitch animation
      setTimeout(() => {
        btnStart.classList.remove('glitch-click');
        safeStartGame();
      }, 400);
    });

    btnResultRestart?.addEventListener('click', safeStartGame);
    console.log('[BOOT] window.startGame type=', typeof safeStartGame);
    console.log('[BOOT] lifecycle.startGame type=', typeof lifecycle?.startGame);
  }

  function startTutorialFlow() {
    if (!document.getElementById('screen-tutorial')) {
      console.warn('[BOOT] Tutorial screen not found, skipping tutorial start');
      return;
    }
    const ready = rebuildRuntime(true);
    window.TutorialUI?.init?.();
    window.TutorialManager?.init?.();
    if (ready) {
      window.TutorialManager?.startTutorial?.(1, runtime);
      if (window.Navigation?.go) window.Navigation.go('tutorial');
      window.shouldStartTutorial = false;
      document.body.classList.add('tutorial-lock');
    }
  }

  // Lobby character helpers
  let lobbyInterval = null;
  function performJump(el) {
    if (el.classList.contains('anim-jump')) return;
    el.classList.add('anim-jump');
    setTimeout(() => el.classList.remove('anim-jump'), 500);
  }

  function performMove(el) {
    const randomX = 20 + Math.random() * 60;
    el.style.left = `${randomX}%`;
    el.classList.add('anim-walk');
    setTimeout(() => el.classList.remove('anim-walk'), 1000);
  }

  function startLobbyLoop() {
    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = null;

    // 캐릭터 위치 초기화 - flexbox 중앙정렬 사용
    const charEl = document.getElementById('lobby-char');
    if (charEl) {
      charEl.style.left = '';
      charEl.style.transform = '';
    }
  }

  function stopLobbyLoop() {
    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = null;
  }

  function interactLobbyChar() {
    const el = document.getElementById('lobby-char');
    if (el) {
      performJump(el);
      window.Sound?.sfx('jump');
    }
  }

  // Expose limited API for UI bindings
  window.Game.loadData = () => {
    const fresh = loadGameData();
    Object.assign(gameData, fresh);
    window.GameData = gameData;
    return gameData;
  };
  window.Game.getState = () => ({
    gameState: runtime.gameState,
    gameActive: runtime.gameActive,
    storm: runtime.storm,
    cameraY: runtime.cameraY,
    cameraZoom: runtime.cameraZoom,
    targetZoom: runtime.targetZoom,
    currentStageId: runtime.stage.currentStageId,
    currentLoopCount: runtime.stage.loopCount
  });

  window.startLobbyLoop = startLobbyLoop;
  window.stopLobbyLoop = stopLobbyLoop;
  window.interactLobbyChar = interactLobbyChar;
  bindStartButtons();

  document.addEventListener('DOMContentLoaded', () => {
    window.TutorialManager?.init?.();
    window.TutorialUI?.init?.();

    const btnTutorial = document.getElementById('btn-tutorial');
    btnTutorial?.addEventListener('click', () => {
      startTutorialFlow();
    });

    if (window.shouldStartTutorial) {
      startTutorialFlow();
    }
  });

  window.onTutorialFlowComplete = () => {
    runtime?.gameActive && (runtime.gameActive = false);
    rebuildRuntime(false);
    if (window.Navigation?.go) window.Navigation.go('lobby');
    document.body.classList.remove('tutorial-lock');
  };

  // Audio focus handling
  let mutedByVisibility = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (window.Sound?.toggleMute) {
        window.Sound.toggleMute(true);
        mutedByVisibility = true;
      } else {
        window.Sound?.bgmStop?.();
      }
      if (runtime.gameActive) {
        lifecycle.pauseForVisibility();
      }
    } else {
      if (mutedByVisibility && window.Sound?.toggleMute) {
        window.Sound.toggleMute(false);
      }
      mutedByVisibility = false;
      lifecycle.resumeIfPausedByVisibility();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (window.TutorialManager?.state?.isRunning) {
      sessionStorage.setItem('tutorialInterrupted', '1');
    }
  });

  if (sessionStorage.getItem('tutorialInterrupted')) {
    sessionStorage.removeItem('tutorialInterrupted');
    window.Navigation?.go?.('lobby');
  }

  window.dashOnClick = function(e) { e.preventDefault(); window.Input?.attemptDash?.(); };
  } catch (err) {
    console.error('[BOOT] init failed', err);
  }
})();
