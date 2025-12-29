window.GameModules = window.GameModules || {};

(function() {
  const { STATE } = window.GameModules.Runtime;

  function resetCamera(runtime) {
    runtime.cameraZoom = 1.0;
    runtime.targetZoom = 1.0;
    runtime.currentZoomLerp = 3.0;
    runtime.previousGameState = STATE.RUN;
    runtime.wasPlayerBoosting = false;
  }

  function updateCameraZoom(runtime, player, qaConfig, dt) {
    const camConfig = qaConfig.camera ?? {};
    const zoomRun = camConfig.zoomRun ?? 1.0;
    const zoomWarning = camConfig.zoomWarning ?? 1.15;
    const zoomStop = camConfig.zoomStop ?? 1.35;
    const zoomBoost = camConfig.zoomBoost ?? 0.85;

    const lerpRunToWarning = camConfig.lerpRunToWarning ?? 0.15;
    const lerpWarningToStop = camConfig.lerpWarningToStop ?? 8.0;
    const lerpStopToBoost = camConfig.lerpStopToBoost ?? 15.0;
    const lerpBoostToRun = camConfig.lerpBoostToRun ?? 1.5;
    const lerpDefault = camConfig.lerpDefault ?? 3.0;

    if (player.isBoosting && !runtime.wasPlayerBoosting) {
      runtime.targetZoom = zoomBoost;
      runtime.currentZoomLerp = lerpStopToBoost;
    } else if (!player.isBoosting && runtime.wasPlayerBoosting) {
      runtime.targetZoom = zoomRun;
      runtime.currentZoomLerp = lerpBoostToRun;
    } else if (runtime.gameState !== runtime.previousGameState) {
      if (runtime.previousGameState === STATE.RUN && runtime.gameState === STATE.WARNING) {
        runtime.targetZoom = zoomWarning;
        runtime.currentZoomLerp = lerpRunToWarning;
      } else if (runtime.previousGameState === STATE.WARNING && runtime.gameState === STATE.STOP) {
        runtime.targetZoom = zoomStop;
        runtime.currentZoomLerp = lerpWarningToStop;
      } else if (runtime.previousGameState === STATE.STOP && runtime.gameState === STATE.RUN) {
        if (!player.isBoosting) {
          runtime.targetZoom = zoomRun;
          runtime.currentZoomLerp = lerpDefault;
        }
      }
    }

    runtime.previousGameState = runtime.gameState;
    runtime.wasPlayerBoosting = player.isBoosting;

    const zoomDiff = runtime.targetZoom - runtime.cameraZoom;
    if (Math.abs(zoomDiff) > 0.001) {
      runtime.cameraZoom += zoomDiff * runtime.currentZoomLerp * dt;
    } else {
      runtime.cameraZoom = runtime.targetZoom;
    }
  }

  window.GameModules.Camera = { resetCamera, updateCameraZoom };
})();
