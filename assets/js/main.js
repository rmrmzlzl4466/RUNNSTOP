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

  const canvas = document.getElementById('gameCanvas');
  const ctx = (window.CanvasSize?.ctx) ?? canvas.getContext('2d', { alpha: false });

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

  const runtime = createRuntimeState(canvas, qaConfig);
  window.runtime = runtime;  // For StageConfig module
  window.Game.runtime = runtime;

  // 튜토리얼 완료 여부 확인 (최초 실행 시 튜토리얼로 자동 진입 위함)
  window.shouldStartTutorial = !gameData.tutorialCompleted;

  // Initialize subsystems
  window.Game.UI?.init?.();
  window.Game.Renderer?.init?.(canvas, ctx);
  window.Game.Physics?.init?.(runtime.grid.COLS, runtime.grid.CELL_W, runtime.grid.CELL_H);
  window.Input?.initControls?.();
  window.initQASliders?.();
  window.updateUpgradeUI?.();
  window.renderSkinList?.();

  // 튜토리얼 모듈 초기화
  window.GameModules.Tutorial?.init();
  window.GameModules.TutorialUI?.init();
  const tutorialResumeStep = window.GameModules.Tutorial?.getResumeStep?.() ?? 1;

  function saveGame() {
    persistGameData(gameData);
  }

  function handleResetSave() {
    resetGameData();
  }

  const lifecycle = createLifecycle(canvas, player, qaConfig, gameData, saveGame, runtime);

  function startTutorialFlow(step, options = {}) {
    const targetStep = step ?? (window.GameModules.Tutorial?.getResumeStep?.() ?? tutorialResumeStep);
    window.Navigation.go('tutorial');
    lifecycle.startGame(null, { isTutorial: true, tutorialStep: targetStep, isRetry: options.isRetry });
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
    const btnTutorial = document.getElementById('btn-tutorial');

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
    
    // 튜토리얼 버튼 핸들러
    btnTutorial?.addEventListener('click', () => {
      startTutorialFlow(1);
    });
  }

  let titleTransitioning = false;
  function handleTitleTouch() {
    if (titleTransitioning) return;
    titleTransitioning = true;
  
    const titleScreen = document.getElementById('screen-title');
    if (!titleScreen) return;
  
    window.Sound?.sfx?.('bit');
    titleScreen.classList.add('glitch-out');
    if (navigator.vibrate) navigator.vibrate([30, 20, 50, 20, 30]);
  
    setTimeout(() => {
      if (window.shouldStartTutorial) {
        startTutorialFlow(tutorialResumeStep);
      } else {
        window.Navigation.go('lobby');
      }
      titleTransitioning = false;
    }, 600); // Glitch-out 애니메이션 시간과 맞춤
  }

  // Expose limited API for UI bindings
  window.startGame = safeStartGame;
  window.togglePause = lifecycle.togglePause;
  window.restartFromPause = lifecycle.restartFromPause;
  window.quitGame = lifecycle.quitGame;
  window.resetSaveData = handleResetSave;
  window.handleTitleTouch = handleTitleTouch; // Expose to global scope for navigation.js
  window.resumeGame = lifecycle.resumeGame; // Expose for tutorial pause menu
  
  window.Game.startGame = lifecycle.startGame;
  window.Game.togglePause = lifecycle.togglePause;
  window.Game.restartFromPause = lifecycle.restartFromPause;
  window.Game.quitGame = lifecycle.quitGame;
  window.Game.saveGame = saveGame;
  window.Game.resetSaveData = handleResetSave;
  window.Game.loadData = () => {
    const fresh = loadGameData();
    Object.assign(gameData, fresh);
    window.GameData = gameData;
    return gameData;
  };
  window.Game.warpToDistance = lifecycle.warpToDistance;
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

  window.syncCanvasSize = () => syncCanvasSize(runtime, canvas);
  window.addEventListener('resize', window.syncCanvasSize);
  window.startLobbyLoop = startLobbyLoop;
  window.stopLobbyLoop = stopLobbyLoop;
  window.interactLobbyChar = interactLobbyChar;
  
  bindStartButtons();

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

  window.dashOnClick = function(e) { e.preventDefault(); window.Input?.attemptDash?.(); };
  } catch (err) {
    console.error('[BOOT] init failed', err);
  }
})();
