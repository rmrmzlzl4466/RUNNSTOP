(async function() {
  // [STEP 8] Guarded functions for Playables SDK readiness signals.
  // These are global so they can be called from any module.
  let firstFrameSent = false;
  window.markFirstFrameReady = () => {
    if (firstFrameSent) return;
    firstFrameSent = true;
    if (window.ytgame?.IN_PLAYABLES_ENV) {
      console.log('[Playables] Marking first frame ready.');
      window.ytgame.game.firstFrameReady();
    }
  };

  let gameReadySent = false;
  window.markGameReady = () => {
    if (gameReadySent) return;
    // [STEP 8] Ensure firstFrameReady is called before gameReady.
    window.markFirstFrameReady();
    gameReadySent = true;
    if (window.ytgame?.IN_PLAYABLES_ENV) {
      console.log('[Playables] Marking game ready.');
      window.ytgame.game.gameReady();
    }
  };
  
  // [STEP 2] Asynchronous bootstrap to prevent race conditions
  async function bootstrap() {
    try {
      // 1. Dependencies
      const modules = window.GameModules || {};
      const { attachQAConfig, createQAConfig } = modules.Config || {};
      const { createLifecycle } = modules.Lifecycle || {};
      const { STATE, createRuntimeState, syncCanvasSize } = modules.Runtime || {};
      const { loadGameDataAsync, persistGameDataAsync, resetGameData } = modules.Storage || {};
      if (!attachQAConfig || !createLifecycle || !createRuntimeState || !loadGameDataAsync) {
        console.error('[BOOT] Missing GameModules dependencies', modules);
        return;
      }

      // 2. Data Loading
      // Guarantees that data from Playables API (or localStorage) is loaded before game init.
      const gameData = await loadGameDataAsync();
      window.GameData = gameData;
      window.Game = window.Game || {};
      window.Game.data = gameData;

      // 3. Core Initializations
      const canvas = document.getElementById('gameCanvas');
      const ctx = (window.CanvasSize?.ctx) ?? canvas.getContext('2d', { alpha: false });

      const qaConfig = createQAConfig();
      attachQAConfig(qaConfig);
      window.qaConfig = qaConfig;

      const player = new Player();
      window.player = player;
      window.Game.player = player;

      const runtime = createRuntimeState(canvas, qaConfig);
      window.runtime = runtime;
      window.Game.runtime = runtime;
      
      // 튜토리얼 완료 여부 확인 (최초 실행 시 튜토리얼로 자동 진입 위함)
      window.shouldStartTutorial = !gameData.tutorialCompleted;

      // 4. Subsystem Initializations (after data is ready)
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

      // 5. Game Logic and Lifecycle
      async function saveGame() {
        await persistGameDataAsync(gameData);
      }

      async function handleResetSave() {
        await resetGameData();
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

        btnStart?.addEventListener('click', () => {
          btnStart.classList.add('glitch-click');
          if (navigator.vibrate) navigator.vibrate([20, 30, 40]);
          window.Sound?.sfx?.('bit');
          setTimeout(() => {
            btnStart.classList.remove('glitch-click');
            safeStartGame();
          }, 400);
        });

        btnResultRestart?.addEventListener('click', safeStartGame);
        btnTutorial?.addEventListener('click', () => startTutorialFlow(1));
      }

      // Lobby character helpers
      let lobbyInterval = null;
      function performJump(el) {
        if (el.classList.contains('anim-jump')) return;
        el.classList.add('anim-jump');
        setTimeout(() => el.classList.remove('anim-jump'), 500);
      }

      function startLobbyLoop() {
        if (lobbyInterval) clearInterval(lobbyInterval);
        lobbyInterval = null;
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
        }, 600);
      }

      // 6. Expose APIs and Bind Events
      window.startGame = safeStartGame;
      window.togglePause = lifecycle.togglePause;
      window.restartFromPause = lifecycle.restartFromPause;
      window.quitGame = lifecycle.quitGame;
      window.resetSaveData = handleResetSave;
      window.handleTitleTouch = handleTitleTouch;
      window.resumeGame = lifecycle.resume;
      
      window.Game.startGame = lifecycle.startGame;
      window.Game.togglePause = lifecycle.togglePause;
      window.Game.restartFromPause = lifecycle.restartFromPause;
      window.Game.quitGame = lifecycle.quitGame;
      window.Game.saveGame = saveGame;
      window.Game.resetSaveData = handleResetSave;
      window.Game.loadData = async () => {
        const fresh = await loadGameDataAsync();
        Object.assign(gameData, fresh);
        window.GameData = gameData;
        return gameData;
      };
      window.Game.warpToDistance = lifecycle.warpToDistance;
      window.Game.getState = () => ({
        gameState: runtime.gameState, gameActive: runtime.gameActive,
        storm: runtime.storm, cameraY: runtime.cameraY,
        cameraZoom: runtime.cameraZoom, targetZoom: runtime.targetZoom,
        currentStageId: runtime.stage.currentStageId,
        currentLoopCount: runtime.stage.loopCount
      });

      window.syncCanvasSize = () => syncCanvasSize(runtime, canvas);
      window.addEventListener('resize', window.syncCanvasSize);
      window.startLobbyLoop = startLobbyLoop;
      window.stopLobbyLoop = stopLobbyLoop;
      window.interactLobbyChar = interactLobbyChar;
      
      bindStartButtons();

      document.addEventListener('visibilitychange', () => {
        if (window.ytgame?.IN_PLAYABLES_ENV) return;
        if (document.hidden) {
          if (runtime.gameActive) lifecycle.pauseForVisibility();
          window.Sound?.suspendAudio?.();
        } else {
          lifecycle.resumeIfPausedByVisibility();
          window.Sound?.resumeAudio?.();
        }
      });

      if (window.ytgame?.IN_PLAYABLES_ENV) {
        // [STEP 9] Add verification logs
        console.log('[Playables] Initializing Playables SDK event handlers.');
        
        window.Sound?.setAudioEnabled?.(window.ytgame.system.isAudioEnabled());
        window.ytgame.system.onAudioEnabledChange((enabled) => {
          console.log('[Playables] Audio enabled changed:', enabled);
          window.Sound?.setAudioEnabled?.(enabled);
        });
        
        window.ytgame.system.onPause(() => {
          console.log('[Playables] onPause event received.');
          if (runtime.gameActive && runtime.gameState !== STATE.PAUSE) {
            lifecycle.pause({ showOverlay: false, reason: 'yt_pause' });
          }
          window.Sound?.suspendAudio?.();
          window.SaveManager?.persistAsync?.(window.GameData);
        });

        window.ytgame.system.onResume(() => {
          console.log('[Playables] onResume event received.');
          window.Sound?.resumeAudio?.();
          if (runtime.gameActive && runtime.gameState === STATE.PAUSE && runtime._lastPauseReason === 'yt_pause') {
            lifecycle.resume();
          }
        });
      }

      window.dashOnClick = function(e) { e.preventDefault(); window.Input?.attemptDash?.(); };

    } catch (err) {
      console.error('[BOOT] Bootstrap failed', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
