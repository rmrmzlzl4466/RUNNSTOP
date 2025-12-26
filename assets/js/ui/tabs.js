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
  setValue('qa-dash', activeConfig.dashForce);
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
  const dashForce = parseInt(document.getElementById('qa-dash').value, 10);
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
  window.qaConfig.dashForce = dashForce;
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
  setText('qa-val-dash', `${dashForce}`);
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
  const defaults = window.qaConfig ?? {};

  // Helper: get value with fallback chain
  const getValue = (key, defaultVal) => {
    if (override[key] !== undefined && override[key] !== null) return override[key];
    if (stageData[key] !== undefined && stageData[key] !== null) return stageData[key];
    return defaults[key] ?? defaultVal;
  };

  // Update sliders and labels
  const coinRate = getValue('coinRate', 0.3);
  const itemRate = getValue('itemRate', 0.03);
  const stormSpeedMult = getValue('stormSpeedMult', 1.0);
  const baseSpeedMult = getValue('baseSpeedMult', 1.0);
  const weights = override.itemWeights ?? stageData.itemWeights ?? defaults.itemWeights ?? { barrier: 0.2, booster: 0.4, magnet: 0.4 };

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

  setSlider('qa-stage-itemrate', itemRate * 100);
  setText('qa-val-stage-itemrate', itemRate.toFixed(2));

  setSlider('qa-stage-stormmult', stormSpeedMult * 100);
  setText('qa-val-stage-stormmult', stormSpeedMult.toFixed(2) + 'x');

  setSlider('qa-stage-speedmult', baseSpeedMult * 100);
  setText('qa-val-stage-speedmult', baseSpeedMult.toFixed(2) + 'x');

  setSlider('qa-stage-wbarrier', (weights.barrier ?? 0.2) * 100);
  setText('qa-val-stage-wbarrier', (weights.barrier ?? 0.2).toFixed(2));

  setSlider('qa-stage-wbooster', (weights.booster ?? 0.4) * 100);
  setText('qa-val-stage-wbooster', (weights.booster ?? 0.4).toFixed(2));

  setSlider('qa-stage-wmagnet', (weights.magnet ?? 0.4) * 100);
  setText('qa-val-stage-wmagnet', (weights.magnet ?? 0.4).toFixed(2));
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
  if (key === 'itemRate') setText('qa-val-stage-itemrate', value.toFixed(2));
  if (key === 'stormSpeedMult') setText('qa-val-stage-stormmult', value.toFixed(2) + 'x');
  if (key === 'baseSpeedMult') setText('qa-val-stage-speedmult', value.toFixed(2) + 'x');
};

/**
 * Update item weight for current stage
 */
window.updateStageWeight = function(type, value) {
  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  // Get current weights
  const override = StageConfig.getQAOverride?.(_currentEditStageId) ?? {};
  const stageData = window.STAGE_CONFIG?.[parseInt(_currentEditStageId, 10) - 1] ?? {};
  const defaults = window.qaConfig?.itemWeights ?? { barrier: 0.2, booster: 0.4, magnet: 0.4 };

  const currentWeights = { ...(override.itemWeights ?? stageData.itemWeights ?? defaults) };
  currentWeights[type] = value;

  // Normalize weights
  const normalized = StageConfig.normalizeWeights?.(currentWeights) ?? currentWeights;
  StageConfig.setQAOverride?.(_currentEditStageId, 'itemWeights', normalized);

  // Refresh UI to show normalized values
  window.refreshStageTuningUI?.();
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
      itemRate: 0.08,
      stormSpeedMult: 0.7,
      baseSpeedMult: 1.0,
      itemWeights: { barrier: 0.4, booster: 0.4, magnet: 0.2 }
    },
    normal: {
      coinRate: 0.3,
      itemRate: 0.03,
      stormSpeedMult: 1.0,
      baseSpeedMult: 1.0,
      itemWeights: { barrier: 0.2, booster: 0.4, magnet: 0.4 }
    },
    hard: {
      coinRate: 0.15,
      itemRate: 0.02,
      stormSpeedMult: 1.5,
      baseSpeedMult: 1.2,
      itemWeights: { barrier: 0.1, booster: 0.5, magnet: 0.4 }
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
