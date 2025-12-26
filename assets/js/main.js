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

  const gameData = loadGameData();
  window.GameData = gameData;
  window.Game = window.Game || {};
  window.Game.data = gameData;

  const player = new Player();
  window.player = player;
  window.Game.player = player;

  const runtime = createRuntimeState(canvas, qaConfig);

  // Initialize subsystems
  window.Game.UI?.init?.();
  window.Game.Renderer?.init?.(canvas, ctx);
  window.Game.Physics?.init?.(runtime.grid.COLS, runtime.grid.CELL_W, runtime.grid.CELL_H);
  window.Input?.initControls?.();
  window.initQASliders?.();
  window.updateUpgradeUI?.();
  window.renderSkinList?.();

  function saveGame() {
    persistGameData(gameData);
  }

  function handleResetSave() {
    resetGameData();
  }

  const lifecycle = createLifecycle(canvas, player, qaConfig, gameData, saveGame, runtime);

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
    btnStart?.addEventListener('click', safeStartGame);
    btnResultRestart?.addEventListener('click', safeStartGame);
    console.log('[BOOT] window.startGame type=', typeof safeStartGame);
    console.log('[BOOT] lifecycle.startGame type=', typeof lifecycle?.startGame);
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

    const charEl = document.getElementById('lobby-char');
    if (charEl) {
      charEl.style.left = '50%';
      charEl.style.transform = 'translateX(-50%) scale(1)';
    }

    lobbyInterval = setInterval(() => {
      const lobby = document.getElementById('screen-lobby');
      if (!lobby || lobby.style.display === 'none') return;

      const el = document.getElementById('lobby-char');
      if (!el) return;

      const action = Math.random();
      if (action < 0.3) performJump(el);
      else if (action < 0.7) performMove(el);
    }, 2500);
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
  window.startGame = safeStartGame;
  window.togglePause = lifecycle.togglePause;
  window.restartFromPause = lifecycle.restartFromPause;
  window.quitGame = lifecycle.quitGame;
  window.resetSaveData = handleResetSave;
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
