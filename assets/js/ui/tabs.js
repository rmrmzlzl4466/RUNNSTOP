// UI tab switching + QA sync (extracted from game.js)

// QA 재화 지급 함수
window.addQAData = function(type, amount) {
  if (type === 'gold') {
    window.GameData.coins += amount;
  } else if (type === 'gems') {
    window.GameData.gems += amount;
  }
  window.SaveManager.persist(window.GameData);
  if (typeof window.updateUpgradeUI === 'function') window.updateUpgradeUI();
  if (typeof window.showToast === 'function') {
    window.showToast(`+${amount.toLocaleString()} ${type === 'gold' ? 'GOLD' : 'GEMS'}`, 'info', 800);
  }
  window.Sound?.sfx('coin');
};

window.switchTab = function(t) {
  window.Sound?.sfx('btn');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.shop-content').forEach(c => c.style.display = 'none');

  const tabEl = document.getElementById(`tab-${t}`);
  const contentEl = document.getElementById(`shop-${t}`);
  if (tabEl) tabEl.classList.add('active');
  if (contentEl) contentEl.style.display = 'block';

  if (t === 'upgrade') window.updateUpgradeUI?.();
  if (t === 'treasure') window.renderTreasureList?.();
  if (t === 'skin') window.renderSkinList?.();
  if (t === 'qa' && typeof window.updateQA === 'function') window.updateQA();
};


window.initQASliders = function() {
  const defaults = window.GameConfig.defaultQAConfig;
  if (!defaults && !window.qaConfig) return;

  // 현재 적용 중인 설정을 우선 사용하고, 없을 경우 기본값으로 채운다
  const activeConfig = {
    ...(defaults || {}),
    ...(window.qaConfig || {}),
  };

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined) el.value = value;
  };

  // Economy (Coin Rate / Item Rate moved to Stage Tuning)
  setValue('qa-coinlen', activeConfig.minCoinRunLength);

  // Physics
  setValue('qa-basespeed', activeConfig.baseSpeed);
  setValue('qa-friction', activeConfig.friction * 100);
  setValue('qa-stopfriction', activeConfig.stopFriction * 100);
  setValue('qa-accel', activeConfig.baseAccel);
  setValue('qa-turnaccel', activeConfig.turnAccelMult * 10);
  setValue('qa-mindash', activeConfig.minDashForce);
  setValue('qa-maxdash', activeConfig.maxDashForce);
  setValue('qa-chargetime', activeConfig.maxChargeTime);
  setValue('qa-dashcool', activeConfig.dashCooldown);
  setValue('qa-chargeslow', activeConfig.chargeSlowdown * 100);
  setValue('qa-joy', activeConfig.joystickSens * 10);
  setValue('qa-scale', activeConfig.playerScale);
  setValue('qa-wallpadding', activeConfig.wallPaddingCap);

  // Rules
  setValue('qa-basemagnet', activeConfig.baseMagnet);
  setValue('qa-magnet', activeConfig.magnetRange);
  setValue('qa-storm', activeConfig.stormBaseSpeed);
  setValue('qa-boost', activeConfig.boostDist);
  setValue('qa-boostinvinc', (activeConfig.boostInvincibleDuration ?? 1.0) * 10);
  setValue('qa-stagelen', activeConfig.stageLength);
  setValue('qa-safety', (activeConfig.safetyThreshold ?? 0.5) * 100);
  setValue('qa-trigger', activeConfig.morphTrigger);
  setValue('qa-morph', activeConfig.morphDuration);
  setValue('qa-stopphase', activeConfig.stopPhaseDuration);
  setValue('qa-death', activeConfig.deathDelay);

  // [JFB v2] Just Frame Booster
  setValue('qa-jfb-delay-min', (activeConfig.jfbDelayMin ?? 0) * 100);
  setValue('qa-jfb-delay-max', (activeConfig.jfbDelayMax ?? 0.5) * 100);
  setValue('qa-jfb-window', (activeConfig.jfbWindow ?? 0.2) * 100);

  // Sound
  setValue('qa-bgm', (activeConfig.bgmVol / 0.25) * 100);
  setValue('qa-sfx', activeConfig.sfxVol * 100);
  setValue('qa-score-sfx', activeConfig.scoreSfxVol * 100);
  setValue('qa-coin-sfx', activeConfig.coinSfxVol * 100);
  setValue('qa-item-sfx', activeConfig.itemSfxVol * 100);
  setValue('qa-dash-sfx', activeConfig.dashSfxVol * 100);

  // Visuals
  setValue('qa-traillength', activeConfig.trailLength);
  setValue('qa-trailopacity', activeConfig.trailOpacity * 100);
  setValue('qa-camoffset', (activeConfig.cameraOffsetPct ?? 0.6) * 100);
  document.getElementById('qa-visualmode').value = activeConfig.visualMode || 'B';
  setValue('qa-resultspeed', (activeConfig.resultAnimSpeed ?? 1.0) * 100);

  // Dynamic Camera
  const camConfig = activeConfig.camera ?? {};
  setValue('qa-zoom-run', (camConfig.zoomRun ?? 1.0) * 100);
  setValue('qa-zoom-warning', (camConfig.zoomWarning ?? 1.15) * 100);
  setValue('qa-zoom-stop', (camConfig.zoomStop ?? 1.35) * 100);
  setValue('qa-zoom-boost', (camConfig.zoomBoost ?? 0.85) * 100);
  setValue('qa-zoom-lerp', (camConfig.lerpRunToWarning ?? 0.15) * 100);
  setValue('qa-pan-ratio', (camConfig.panRatioX ?? 0.35) * 100);

  // Slow Motion
  const slowMoConfig = activeConfig.slowMo ?? {};
  document.getElementById('qa-slowmo-enabled').value = (slowMoConfig.enabled !== false) ? 'true' : 'false';
  setValue('qa-slowmo-duration', (slowMoConfig.durationSec ?? 0.22) * 100);
  setValue('qa-slowmo-scale', (slowMoConfig.scale ?? 0.7) * 100);
  setValue('qa-slowmo-easeout', (slowMoConfig.easeOutSec ?? 0.08) * 100);
  setValue('qa-slowmo-interval', (slowMoConfig.minIntervalSec ?? 0.4) * 100);
  document.getElementById('qa-slowmo-cancel').value = slowMoConfig.cancelPolicy ?? 'on_boost_press';
  document.getElementById('qa-slowmo-mask').value = slowMoConfig.applyMask ?? 'world_only';

  // After setting slider values, call updateQA to sync labels
  window.updateQA();
};

window.updateQA = function() {
  // 1) Read slider values -> qaConfig (used by gameplay logic)

  // Economy (Coin Rate / Item Rate moved to Stage Tuning)
  const coinLen = parseInt(document.getElementById('qa-coinlen')?.value ?? 5, 10);

  // Physics (신규 추가: baseSpeed, friction)
  const baseSpeed = parseInt(document.getElementById('qa-basespeed')?.value ?? 400, 10);
  const frictionRaw = parseInt(document.getElementById('qa-friction')?.value ?? 90, 10);
  const friction = frictionRaw / 100; // 80~99 -> 0.80~0.99
  const stopFrictionRaw = parseInt(document.getElementById('qa-stopfriction')?.value ?? 92, 10);
  const stopFriction = stopFrictionRaw / 100; 
  
  // [추가] Turn Agility 값 읽기 (10 -> 1.0, 50 -> 5.0)
  const turnAccelRaw = parseInt(document.getElementById('qa-turnaccel')?.value ?? 20, 10);
  const turnAccelMult = turnAccelRaw / 10;

  const baseAccel = parseInt(document.getElementById('qa-accel').value, 10);
  // [CHARGING SYSTEM] 차징 대쉬 설정
  const minDashForce = parseInt(document.getElementById('qa-mindash')?.value ?? 800, 10);
  const maxDashForce = parseInt(document.getElementById('qa-maxdash')?.value ?? 1600, 10);
  const maxChargeTime = parseFloat(document.getElementById('qa-chargetime')?.value ?? 0.8);
  const dashCooldown = parseFloat(document.getElementById('qa-dashcool')?.value ?? 1.0);
  const chargeSlowdownPct = parseInt(document.getElementById('qa-chargeslow')?.value ?? 30, 10);
  const chargeSlowdown = chargeSlowdownPct / 100; // 0~100 -> 0.0~1.0
  const joySensRaw = parseInt(document.getElementById('qa-joy')?.value ?? 20, 10);
  const joystickSens = joySensRaw / 10; // 10~30 -> 1.0~3.0
  const scale = parseFloat(document.getElementById('qa-scale')?.value ?? 1.5);
  const wallPaddingCap = parseInt(document.getElementById('qa-wallpadding')?.value ?? 25, 10);

  // Rules
  const baseMagnet = parseInt(document.getElementById('qa-basemagnet')?.value ?? 100, 10);
  const magnetRange = parseInt(document.getElementById('qa-magnet').value, 10);
  const stormBaseSpeed = parseInt(document.getElementById('qa-storm').value, 10);
  const boostDist = parseInt(document.getElementById('qa-boost').value, 10);
  const boostInvincRaw = parseInt(document.getElementById('qa-boostinvinc')?.value ?? 10, 10);
  const stageLength = parseInt(document.getElementById('qa-stagelen')?.value ?? 2000, 10);
  const safetyPct = parseInt(document.getElementById('qa-safety').value, 10);
  const morphTrigger = parseFloat(document.getElementById('qa-trigger').value);
  const morphDuration = parseFloat(document.getElementById('qa-morph').value);
  const stopPhaseDuration = parseFloat(document.getElementById('qa-stopphase').value);
  const deathDelay = parseFloat(document.getElementById('qa-death').value);

  // [JFB v2] Just Frame Booster
  const jfbDelayMinRaw = parseInt(document.getElementById('qa-jfb-delay-min')?.value ?? 0, 10);
  const jfbDelayMaxRaw = parseInt(document.getElementById('qa-jfb-delay-max')?.value ?? 50, 10);
  const jfbWindowRaw = parseInt(document.getElementById('qa-jfb-window')?.value ?? 20, 10);

  // Sound
  const bgmPct = parseInt(document.getElementById('qa-bgm')?.value ?? 60, 10);
  const sfxPct = parseInt(document.getElementById('qa-sfx')?.value ?? 100, 10);
  const scoreSfxPct = parseInt(document.getElementById('qa-score-sfx')?.value ?? 100, 10);
  const coinSfxPct = parseInt(document.getElementById('qa-coin-sfx')?.value ?? 100, 10);
  const itemSfxPct = parseInt(document.getElementById('qa-item-sfx')?.value ?? 100, 10);
  const dashSfxPct = parseInt(document.getElementById('qa-dash-sfx')?.value ?? 100, 10);

  // Visuals
  const trailLength = parseInt(document.getElementById('qa-traillength').value, 10);
  const trailOpacityPct = parseInt(document.getElementById('qa-trailopacity').value, 10);
  const camOffsetPctRaw = parseInt(document.getElementById('qa-camoffset').value, 10);
  const visualMode = document.getElementById('qa-visualmode').value;
  const resultSpeedRaw = parseInt(document.getElementById('qa-resultspeed')?.value ?? 100, 10);

  // Dynamic Camera
  const zoomRunRaw = parseInt(document.getElementById('qa-zoom-run')?.value ?? 100, 10);
  const zoomWarningRaw = parseInt(document.getElementById('qa-zoom-warning')?.value ?? 115, 10);
  const zoomStopRaw = parseInt(document.getElementById('qa-zoom-stop')?.value ?? 135, 10);
  const zoomBoostRaw = parseInt(document.getElementById('qa-zoom-boost')?.value ?? 85, 10);
  const zoomLerpRaw = parseInt(document.getElementById('qa-zoom-lerp')?.value ?? 15, 10);
  const panRatioRaw = parseInt(document.getElementById('qa-pan-ratio')?.value ?? 35, 10);

  // qaConfig에 저장 (coinRate / itemRate moved to Stage Tuning)
  window.qaConfig.minCoinRunLength = coinLen;
  window.qaConfig.baseSpeed = baseSpeed;
  window.qaConfig.friction = friction;
  window.qaConfig.stopFriction = stopFriction;
  window.qaConfig.turnAccelMult = turnAccelMult; // [추가]
  window.qaConfig.baseAccel = baseAccel;
  // [CHARGING SYSTEM] 차징 대쉬 설정
  window.qaConfig.minDashForce = minDashForce;
  window.qaConfig.maxDashForce = maxDashForce;
  window.qaConfig.maxChargeTime = maxChargeTime;
  window.qaConfig.dashCooldown = dashCooldown;
  window.qaConfig.chargeSlowdown = chargeSlowdown;
  window.qaConfig.joystickSens = joystickSens;
  window.qaConfig.playerScale = scale;
  window.qaConfig.wallPaddingCap = wallPaddingCap;
  window.qaConfig.baseMagnet = baseMagnet;
  window.qaConfig.magnetRange = magnetRange;
  window.qaConfig.stormBaseSpeed = stormBaseSpeed;
  window.qaConfig.boostDist = boostDist;
  window.qaConfig.boostInvincibleDuration = boostInvincRaw / 10;  // 0~3.0 초
  window.qaConfig.stageLength = stageLength;
  window.qaConfig.safetyThreshold = safetyPct / 100;
  window.qaConfig.morphTrigger = morphTrigger;
  window.qaConfig.morphDuration = morphDuration;
  window.qaConfig.stopPhaseDuration = stopPhaseDuration;
  window.qaConfig.deathDelay = deathDelay;

  // [JFB v2] Just Frame Booster
  window.qaConfig.jfbDelayMin = jfbDelayMinRaw / 100;
  window.qaConfig.jfbDelayMax = jfbDelayMaxRaw / 100;
  window.qaConfig.jfbWindow = jfbWindowRaw / 100;

  window.qaConfig.bgmVol = (bgmPct/100) * 0.25;
  window.qaConfig.sfxVol = (sfxPct/100);
  window.qaConfig.scoreSfxVol = (scoreSfxPct/100);
  window.qaConfig.coinSfxVol = (coinSfxPct/100);
  window.qaConfig.itemSfxVol = (itemSfxPct/100);
  window.qaConfig.dashSfxVol = (dashSfxPct/100);
  if (typeof window.Sound?.bgmSetVolume === 'function') window.Sound.bgmSetVolume(window.qaConfig.bgmVol);

  window.qaConfig.trailLength = trailLength;
  window.qaConfig.trailOpacity = trailOpacityPct / 100;
  window.qaConfig.cameraOffsetPct = camOffsetPctRaw / 100;
  window.qaConfig.visualMode = visualMode;
  window.qaConfig.resultAnimSpeed = resultSpeedRaw / 100;

  // Dynamic Camera 저장
  window.qaConfig.camera = window.qaConfig.camera ?? {};
  window.qaConfig.camera.zoomRun = zoomRunRaw / 100;
  window.qaConfig.camera.zoomWarning = zoomWarningRaw / 100;
  window.qaConfig.camera.zoomStop = zoomStopRaw / 100;
  window.qaConfig.camera.zoomBoost = zoomBoostRaw / 100;
  window.qaConfig.camera.lerpRunToWarning = zoomLerpRaw / 100;
  window.qaConfig.camera.panRatioX = panRatioRaw / 100;

  // Slow Motion 저장
  const slowMoEnabled = document.getElementById('qa-slowmo-enabled')?.value === 'true';
  const slowMoDurationRaw = parseInt(document.getElementById('qa-slowmo-duration')?.value ?? 22, 10);
  const slowMoScaleRaw = parseInt(document.getElementById('qa-slowmo-scale')?.value ?? 70, 10);
  const slowMoEaseOutRaw = parseInt(document.getElementById('qa-slowmo-easeout')?.value ?? 8, 10);
  const slowMoIntervalRaw = parseInt(document.getElementById('qa-slowmo-interval')?.value ?? 40, 10);
  const slowMoCancelPolicy = document.getElementById('qa-slowmo-cancel')?.value ?? 'on_boost_press';
  const slowMoApplyMask = document.getElementById('qa-slowmo-mask')?.value ?? 'world_only';

  window.qaConfig.slowMo = window.qaConfig.slowMo ?? {};
  window.qaConfig.slowMo.enabled = slowMoEnabled;
  window.qaConfig.slowMo.durationSec = slowMoDurationRaw / 100;
  window.qaConfig.slowMo.scale = slowMoScaleRaw / 100;
  window.qaConfig.slowMo.easeOutSec = slowMoEaseOutRaw / 100;
  window.qaConfig.slowMo.minIntervalSec = slowMoIntervalRaw / 100;
  window.qaConfig.slowMo.cancelPolicy = slowMoCancelPolicy;
  window.qaConfig.slowMo.applyMask = slowMoApplyMask;

  // 플레이어에게 즉시 반영 (게임 중이 아닐 때도 적용)
  if (window.player) {
    const baseRadius = window.player._baseRadius ?? window.player.originalRadius ?? 15;
    window.player._baseRadius = baseRadius;
    const scaledRadius = baseRadius * scale;
    window.player.originalRadius = scaledRadius;
    window.player.radius = scaledRadius;
    window.player.baseMagnetRange = baseMagnet;
    window.player.friction = friction;
    window.player.stopFriction = stopFriction;
    window.player.turnAccelMult = turnAccelMult; // [추가]
    // maxSpeed는 업그레이드 레벨과 결합되므로 게임 시작 시 적용
  }

  // 2) Update UI value labels
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  // Economy (Coin Rate / Item Rate moved to Stage Tuning)
  setText('qa-val-coinlen', `${coinLen}`);

  // Physics
  setText('qa-val-basespeed', `${baseSpeed}`);
  setText('qa-val-friction', friction.toFixed(2));
  setText('qa-val-stopfriction', stopFriction.toFixed(2));
  setText('qa-val-accel', `${baseAccel}`);
  setText('qa-val-turnaccel', `${turnAccelMult.toFixed(1)}x`); // [추가]
  // [CHARGING SYSTEM] 차징 대쉬 설정 UI 표시
  setText('qa-val-mindash', `${minDashForce}`);
  setText('qa-val-maxdash', `${maxDashForce}`);
  setText('qa-val-chargetime', `${maxChargeTime.toFixed(1)}s`);
  setText('qa-val-dashcool', `${dashCooldown.toFixed(1)}s`);
  setText('qa-val-chargeslow', `${chargeSlowdownPct}%`);
  setText('qa-val-joy', joystickSens.toFixed(1));
  setText('qa-val-scale', `${scale.toFixed(1)}x`);
  setText('qa-val-wallpadding', `${wallPaddingCap}`);

  // Rules
  setText('qa-val-basemagnet', `${baseMagnet}`);
  setText('qa-val-magnet', `${magnetRange}`);
  setText('qa-val-storm', `${stormBaseSpeed}`);
  setText('qa-val-boost', `${boostDist}`);
  setText('qa-val-boostinvinc', `${(boostInvincRaw / 10).toFixed(1)}s`);
  setText('qa-val-stagelen', `${stageLength}m`);
  setText('qa-val-safety', `${safetyPct}%`);
  setText('qa-val-trigger', `${morphTrigger.toFixed(1)}s`);
  setText('qa-val-morph', `${morphDuration.toFixed(1)}s`);
  setText('qa-val-stopphase', `${stopPhaseDuration.toFixed(1)}s`);
  setText('qa-val-death', `${deathDelay.toFixed(1)}s`);

  // [JFB v2] Just Frame Booster
  setText('qa-val-jfb-delay-min', `${(jfbDelayMinRaw / 100).toFixed(2)}s`);
  setText('qa-val-jfb-delay-max', `${(jfbDelayMaxRaw / 100).toFixed(2)}s`);
  setText('qa-val-jfb-window', `${(jfbWindowRaw / 100).toFixed(2)}s`);

  // Sound
  setText('qa-val-bgm', `${bgmPct}%`);
  setText('qa-val-sfx', `${sfxPct}%`);
  setText('qa-val-score-sfx', `${scoreSfxPct}%`);
  setText('qa-val-coin-sfx', `${coinSfxPct}%`);
  setText('qa-val-item-sfx', `${itemSfxPct}%`);
  setText('qa-val-dash-sfx', `${dashSfxPct}%`);

  // Visuals
  setText('qa-val-traillength', `${trailLength}`);
  setText('qa-val-trailopacity', `${trailOpacityPct}%`);
  setText('qa-val-camoffset', `${camOffsetPctRaw}%`);
  setText('qa-val-resultspeed', `${(resultSpeedRaw / 100).toFixed(1)}x`);

  // Dynamic Camera
  setText('qa-val-zoom-run', `${(zoomRunRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-warning', `${(zoomWarningRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-stop', `${(zoomStopRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-boost', `${(zoomBoostRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-lerp', `${(zoomLerpRaw / 100).toFixed(2)}`);
  setText('qa-val-pan-ratio', `${(panRatioRaw / 100).toFixed(2)}`);

  // Slow Motion
  setText('qa-val-slowmo-duration', `${(slowMoDurationRaw / 100).toFixed(2)}s`);
  setText('qa-val-slowmo-scale', `${(slowMoScaleRaw / 100).toFixed(2)}x`);
  setText('qa-val-slowmo-easeout', `${(slowMoEaseOutRaw / 100).toFixed(2)}s`);
  setText('qa-val-slowmo-interval', `${(slowMoIntervalRaw / 100).toFixed(2)}s`);

  // Invalidate StageConfig cache so global sliders immediately affect gameplay
  window.GameModules?.StageConfig?.invalidateCache?.();
};

// === [Stage Warp System] ===

/**
 * Update warp distance preview based on selected stage/loop
 */
window.updateWarpPreview = function() {
  const stageSelect = document.getElementById('qa-warp-stage');
  const loopInput = document.getElementById('qa-loopcount');
  const preview = document.getElementById('qa-warp-preview');

  if (!stageSelect || !loopInput || !preview) return;

  const stageId = parseInt(stageSelect.value, 10);
  const loopCount = parseInt(loopInput.value, 10);

  // Calculate target distance using LevelManager
  const dist = window.Game?.LevelManager?.getDistanceForStage?.(stageId, loopCount) ?? 0;
  preview.innerText = `Distance: ${dist.toLocaleString()}m`;
};

/**
 * Warp player to selected stage
 */
window.warpToStage = function() {
  const stageSelect = document.getElementById('qa-warp-stage');
  const loopInput = document.getElementById('qa-loopcount');

  if (!stageSelect || !loopInput) return;

  const targetStageId = parseInt(stageSelect.value, 10);
  const loopCount = parseInt(loopInput.value, 10);

  // Calculate target distance
  const targetDistance = window.Game?.LevelManager?.getDistanceForStage?.(targetStageId, loopCount) ?? 0;

  // Perform warp using main.js function
  if (window.warpToDistance) {
    window.warpToDistance(targetDistance);
  } else if (window.Game?.warpToDistance) {
    window.Game.warpToDistance(targetDistance);
  } else {
    console.error('[WARP] warpToDistance function not found');
    return;
  }

  // Show confirmation toast
  if (typeof window.showToast === 'function') {
    const stage = window.STAGE_CONFIG?.[targetStageId - 1];
    const stageName = stage?.name ?? `Stage ${targetStageId}`;
    window.showToast(`Warped to ${stageName}`, 'info', 1500);
  }

  // Play sound
  window.Sound?.sfx?.('btn');
};

// === [Stage Tuning System] ===

/**
 * Current stage being edited in QA panel
 */
let _currentEditStageId = '1';

/**
 * Called when stage selector changes
 */
window.onStageSelectChange = function() {
  const select = document.getElementById('qa-stage-select');
  if (!select) return;
  _currentEditStageId = select.value;
  window.refreshStageTuningUI?.();
};

/**
 * Refresh Stage Tuning UI with current stage's values
 */
window.refreshStageTuningUI = function() {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  const stageId = _currentEditStageId;
  const override = StageConfig.getQAOverride?.(stageId) ?? {};
  const stageData = window.STAGE_CONFIG?.[parseInt(stageId, 10) - 1] ?? {};
  const stageTuning = stageData.tuning ?? {};  // 새 구조: stage.tuning
  const defaults = {
    ...(window.GameConfig?.STAGE_DEFAULTS ?? {}),  // core/config.js 기본값
    ...(window.qaConfig ?? {})                     // qaConfig overrides (global)
  };

  // Helper: get value with fallback chain
  // QA Override → Stage Tuning → qaConfig/global defaults
  const getValue = (key, defaultVal) => {
    if (override[key] !== undefined && override[key] !== null) return override[key];
    if (stageTuning[key] !== undefined && stageTuning[key] !== null) return stageTuning[key];
    return defaults[key] ?? defaultVal;
  };

  // Update sliders and labels
  const coinRate = getValue('coinRate', 0.3);
  const barrierRate = getValue('barrierRate', 0.03);
  const boosterRate = getValue('boosterRate', 0.5);
  const magnetRate = getValue('magnetRate', 0.5);
  const stormSpeedMult = getValue('stormSpeedMult', 1.0);
  const baseSpeedMult = getValue('baseSpeedMult', 1.0);
  const scoreMult = getValue('scoreMult', 1.0);

  // Set slider values
  const setSlider = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  setSlider('qa-stage-coinrate', coinRate * 100);
  setText('qa-val-stage-coinrate', coinRate.toFixed(2));

  // 개별 아이템 드랍률
  setSlider('qa-stage-barrierrate', barrierRate * 100);
  setText('qa-val-stage-barrierrate', (barrierRate * 100).toFixed(0) + '%');

  setSlider('qa-stage-boosterrate', boosterRate * 100);
  setText('qa-val-stage-boosterrate', (boosterRate * 100).toFixed(0) + '%');

  setSlider('qa-stage-magnetrate', magnetRate * 100);
  setText('qa-val-stage-magnetrate', (magnetRate * 100).toFixed(0) + '%');

  setSlider('qa-stage-stormmult', stormSpeedMult * 100);
  setText('qa-val-stage-stormmult', stormSpeedMult.toFixed(2) + 'x');

  setSlider('qa-stage-speedmult', baseSpeedMult * 100);
  setText('qa-val-stage-speedmult', baseSpeedMult.toFixed(2) + 'x');

  setSlider('qa-stage-scoremult', scoreMult * 100);
  setText('qa-val-stage-scoremult', scoreMult.toFixed(1) + 'x');
};

/**
 * Update a stage parameter
 */
window.updateStageParam = function(key, value) {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  StageConfig.setQAOverride?.(_currentEditStageId, key, value);

  // Update UI label
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  if (key === 'coinRate') setText('qa-val-stage-coinrate', value.toFixed(2));
  if (key === 'barrierRate') setText('qa-val-stage-barrierrate', (value * 100).toFixed(0) + '%');
  if (key === 'boosterRate') setText('qa-val-stage-boosterrate', (value * 100).toFixed(0) + '%');
  if (key === 'magnetRate') setText('qa-val-stage-magnetrate', (value * 100).toFixed(0) + '%');
  if (key === 'stormSpeedMult') setText('qa-val-stage-stormmult', value.toFixed(2) + 'x');
  if (key === 'baseSpeedMult') setText('qa-val-stage-speedmult', value.toFixed(2) + 'x');
  if (key === 'scoreMult') setText('qa-val-stage-scoremult', value.toFixed(1) + 'x');
};

/**
 * Reset current stage's QA overrides
 */
window.resetStageOverride = function() {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  StageConfig.clearQAOverride?.(_currentEditStageId);
  window.refreshStageTuningUI?.();
  window.showToast?.(`Stage ${_currentEditStageId} reset`, 'info', 800);
  window.Sound?.sfx?.('btn');
};

/**
 * Reset all stages' QA overrides
 */
window.resetAllStageOverrides = function() {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  StageConfig.clearAllQAOverrides?.();
  window.refreshStageTuningUI?.();
  window.showToast?.('All stages reset', 'info', 800);
  window.Sound?.sfx?.('btn');
};

/**
 * Apply preset to current stage
 */
window.applyStagePreset = function(presetName) {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  const presets = {
    easy: {
      coinRate: 0.5,
      barrierRate: 0.05,
      boosterRate: 0.6,
      magnetRate: 0.4,
      stormSpeedMult: 0.7,
      baseSpeedMult: 1.0
    },
    normal: {
      coinRate: 0.3,
      barrierRate: 0.03,
      boosterRate: 0.5,
      magnetRate: 0.5,
      stormSpeedMult: 1.0,
      baseSpeedMult: 1.0
    },
    hard: {
      coinRate: 0.15,
      barrierRate: 0.02,
      boosterRate: 0.4,
      magnetRate: 0.3,
      stormSpeedMult: 1.5,
      baseSpeedMult: 1.2
    }
  };

  const preset = presets[presetName];
  if (!preset) return;

  // Apply all preset values
  for (const [key, value] of Object.entries(preset)) {
    StageConfig.setQAOverride?.(_currentEditStageId, key, value);
  }

  window.refreshStageTuningUI?.();
  window.showToast?.(`Applied ${presetName} preset to Stage ${_currentEditStageId}`, 'info', 1000);
  window.Sound?.sfx?.('btn');
};

// === [PRESET CURVES FOR ALL STAGES] ===

/**
 * Clamp ranges matching UI slider real value ranges
 */
const PRESET_CLAMP_RANGES = {
  stormSpeedMult: { min: 0.10, max: 4.00 },
  baseSpeedMult:  { min: 0.10, max: 4.00 },
  scoreMult:      { min: 0.05, max: 10.00 },
  coinRate:       { min: 0.00, max: 1.00 },
  barrierRate:    { min: 0.00, max: 0.20 },
  boosterRate:    { min: 0.00, max: 1.00 },
  magnetRate:     { min: 0.00, max: 1.00 }
};
const PRESET_ALLOWED_KEYS = ['stormSpeedMult', 'baseSpeedMult', 'scoreMult', 'coinRate', 'barrierRate', 'boosterRate', 'magnetRate'];

/**
 * Round value based on key type
 * - multipliers/rates: 2 decimals
 */
function roundPresetValue(key, value) {
  const decimalKeys = ['stormSpeedMult', 'baseSpeedMult', 'scoreMult', 'coinRate', 'barrierRate', 'boosterRate', 'magnetRate'];
  if (decimalKeys.includes(key)) {
    return Math.round(value * 100) / 100;
  }
  return value;
}

/**
 * Clamp value to defined range
 */
function clampPresetValue(key, value) {
  const range = PRESET_CLAMP_RANGES[key];
  if (!range) return value;
  return Math.max(range.min, Math.min(range.max, value));
}

/**
 * Presets containing curves for all 13 stages (REAL VALUES)
 * Index i=0 → Stage 1, i=12 → Stage 13
 *
 * Balanced: 기획 기준 베이스라인
 * Casual: Balanced에서 완화 (storm↓, score↓)
 * Aggressive: Balanced에서 압박 (storm↑, score↑)
 */
const STAGE_PRESETS = {
  // ===== BALANCED: 기획 기준 베이스라인 =====
  balanced: {
    stormSpeedMult: [0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.50],
    baseSpeedMult:  Array(13).fill(1.0),
    coinRate:       Array(13).fill(0.3),
    barrierRate:    Array(13).fill(0.03),
    boosterRate:    Array(13).fill(0.5),
    magnetRate:     Array(13).fill(0.5),
    scoreMult:      [1.00, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.50, 1.60, 1.70]
  },

  // ===== CASUAL: Balanced * 완화계수 =====
  // stormSpeedMult = Balanced * 0.85
  // scoreMult = Balanced * 0.90
  casual: {
    stormSpeedMult: [0.72, 0.77, 0.81, 0.85, 0.89, 0.94, 0.98, 1.02, 1.06, 1.11, 1.15, 1.19, 1.28],
    baseSpeedMult:  Array(13).fill(1.0),
    coinRate:       Array(13).fill(0.35),
    barrierRate:    Array(13).fill(0.04),
    boosterRate:    Array(13).fill(0.6),
    magnetRate:     Array(13).fill(0.5),
    scoreMult:      [0.90, 0.90, 0.95, 0.99, 1.04, 1.08, 1.13, 1.17, 1.22, 1.26, 1.35, 1.44, 1.53]
  },

  // ===== AGGRESSIVE: Balanced * 압박계수 =====
  // stormSpeedMult = Balanced * 1.15
  // scoreMult = Balanced * 1.25
  aggressive: {
    stormSpeedMult: [0.98, 1.04, 1.09, 1.15, 1.21, 1.27, 1.32, 1.38, 1.44, 1.50, 1.55, 1.61, 1.73],
    baseSpeedMult:  Array(13).fill(1.05),
    coinRate:       Array(13).fill(0.25),
    barrierRate:    Array(13).fill(0.02),
    boosterRate:    Array(13).fill(0.4),
    magnetRate:     Array(13).fill(0.4),
    scoreMult:      [1.25, 1.25, 1.31, 1.38, 1.44, 1.50, 1.56, 1.63, 1.69, 1.75, 1.88, 2.00, 2.13]
  }
};

/**
 * Whether to skip loop stages (11-13) when applying presets
 */
let _skipLoopStages = false;

/**
 * Validate preset structure before applying
 * Returns { valid: boolean, error?: string }
 */
function validatePreset(preset, presetName) {
  const targetKeys = Object.keys(preset || {}).filter((k) => PRESET_ALLOWED_KEYS.includes(k));
  if (targetKeys.length === 0) {
    return { valid: false, error: 'No stage-tunable keys provided' };
  }

  for (const key of targetKeys) {
    const curve = preset[key];
    if (!Array.isArray(curve)) {
      return { valid: false, error: `${key} is not an array` };
    }
    if (curve.length !== 13) {
      return { valid: false, error: `${key} length is ${curve.length}, expected 13` };
    }

    // Check for NaN/Infinity
    for (let i = 0; i < curve.length; i++) {
      const val = curve[i];
      if (typeof val !== 'number' || !isFinite(val)) {
        return { valid: false, error: `${key}[${i}] is invalid: ${val}` };
      }
    }
  }

  return { valid: true, keys: targetKeys };
}

/**
 * Apply preset to all stages (1-13) with validation and safety checks
 */
window.applyPresetToAllStages = function(presetName, overwriteKeysOnly = true) {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) {
    console.error('[Preset] StageConfig module not found');
    return;
  }

  const preset = STAGE_PRESETS[presetName];
  if (!preset) {
    console.error(`[Preset] Unknown preset: ${presetName}`);
    window.showToast?.(`Unknown preset: ${presetName}`, 'error', 1000);
    return;
  }

  // STEP 4: Validate preset structure
  const validation = validatePreset(preset, presetName);
  if (!validation.valid) {
    console.error(`[Preset] Validation failed for "${presetName}": ${validation.error}`);
    window.showToast?.(`Preset error: ${validation.error}`, 'error', 2000);
    return;
  }
  const presetKeys = validation.keys ?? [];

  // Confirm with user
  const skipLoopText = _skipLoopStages ? ' (excluding loop stages 11-13)' : '';
  const confirmed = confirm(`Apply "${presetName}" preset to all stages${skipLoopText}?\n\nThis will overwrite existing stage configurations.`);
  if (!confirmed) return;

  const stageCount = window.STAGE_CONFIG?.length ?? 13;
  let appliedCount = 0;

  for (let i = 0; i < stageCount; i++) {
    const stageId = i + 1;
    const stageData = window.STAGE_CONFIG?.[i];

    // Skip loop stages if toggle is enabled
    if (_skipLoopStages && stageData?.isLoop) {
      continue;
    }

    // Build override object from preset curves with clamping and rounding
    const override = {};
    for (const key of presetKeys) {
      const curve = preset[key];
      if (Array.isArray(curve) && curve.length > i) {
        let value = curve[i];

        // Round value based on key type
        value = roundPresetValue(key, value);

        // Clamp value to valid range
        value = clampPresetValue(key, value);

        override[key] = value;
      }
    }

    // Apply overrides with try/catch for localStorage safety
    try {
      if (Object.keys(override).length > 0) {
        for (const [key, value] of Object.entries(override)) {
          StageConfig.setQAOverride?.(String(stageId), key, value);
        }
        appliedCount++;
      }
    } catch (e) {
      console.error(`[Preset] Failed to save override for stage ${stageId}:`, e);
    }
  }

  // Invalidate cache and refresh UI
  StageConfig.invalidateCache?.();
  window.refreshStageTuningUI?.();

  // Show result
  const message = `Applied "${presetName}" to ${appliedCount} stages`;
  window.showToast?.(message, 'info', 1500);
  window.Sound?.sfx?.('btn');

  console.log(`[Preset] Applied "${presetName}" to ${appliedCount} stages`);
};

/**
 * Toggle skip loop stages setting
 */
window.toggleSkipLoopStages = function(checked) {
  _skipLoopStages = checked;
};

/**
 * Get current skip loop stages setting
 */
window.getSkipLoopStages = function() {
  return _skipLoopStages;
};
