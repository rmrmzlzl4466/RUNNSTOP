window.GameModules = window.GameModules || {};

(function() {
  const { getThemes } = window.GameModules.Config;

  function showStageNotification(stageInfo) {
    const stage = stageInfo.stageConfig;
    const n = document.getElementById('theme-notify');
    if (!n) return;

    let displayText = `STAGE ${stage.id}`;
    if (stageInfo.isLooping && stageInfo.loopCount > 1) {
      displayText += ` (LOOP ${stageInfo.loopCount})`;
    }
    displayText += `<br>${stage.name}`;

    n.innerHTML = displayText;
    n.style.opacity = 1;
    setTimeout(() => (n.style.opacity = 0), 3000);
    window.Sound?.sfx?.('alert');
  }

  function applyLoopDifficultyScaling(runtime, qaConfig, loopCount) {
    runtime.stage.loopCount = loopCount;
    runtime.stage.loopDifficultyScale = 1 + (loopCount - 1) * 0.1;
    const baseStormSpeed = qaConfig.stormBaseSpeed ?? 150;
    qaConfig._effectiveStormSpeed = baseStormSpeed * runtime.stage.loopDifficultyScale;
  }

  function updateStageProgress(runtime, playerDist, qaConfig) {
    if (runtime.tutorialMode && runtime._tutorialStageGoal) {
      runtime.currentLevelGoal = runtime._tutorialStageGoal;
      if (runtime.stage.currentStageId !== 1) {
        runtime.stage.previousStageId = runtime.stage.currentStageId;
        runtime.stage.currentStageId = 1;
        runtime.stage.loopCount = 0;
      }
      return;
    }
    const stageInfo = window.Game.LevelManager.getStageInfo(playerDist);
    runtime.currentLevelGoal = (window.STAGE_CUMULATIVE?.[stageInfo.stageIndex] ?? 0) + stageInfo.stageConfig.length;

    if (stageInfo.stageConfig.id !== runtime.stage.currentStageId) {
      runtime.stage.previousStageId = runtime.stage.currentStageId;
      runtime.stage.currentStageId = stageInfo.stageConfig.id;
      runtime.stage.loopCount = stageInfo.loopCount;

      // Update currentConfig for StageConfig system
      window.GameModules?.StageConfig?.updateCurrentConfig?.(runtime, stageInfo.stageConfig.id);

      // Skip theme change in tutorial mode (tutorial uses dedicated TUTORIAL theme)
      if (!runtime.tutorialMode && stageInfo.stageConfig.themeIdx !== runtime.currentThemeIdx) {
        runtime.currentThemeIdx = stageInfo.stageConfig.themeIdx;
      }

      showStageNotification(stageInfo);
      if (!runtime.tutorialMode) {
        window.Sound?.bgmSetStage?.(stageInfo.stageConfig);
      }

      if (stageInfo.isLooping && stageInfo.loopCount > 0) {
        applyLoopDifficultyScaling(runtime, qaConfig, stageInfo.loopCount);
      } else {
        runtime.stage.loopDifficultyScale = 1.0;
        qaConfig._effectiveStormSpeed = qaConfig.stormBaseSpeed ?? 150;
      }
    }
  }

  function getTargetColor(runtime, targetColorIndex) {
    const palette = getThemes()[runtime.currentThemeIdx]?.colors ?? [];
    return palette[targetColorIndex];
  }

  window.GameModules.Stage = {
    showStageNotification,
    applyLoopDifficultyScaling,
    updateStageProgress,
    getTargetColor
  };
})();
