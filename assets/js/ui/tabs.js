// UI tab switching + QA sync (extracted from game.js)

// QA 재화 지급 함수
window.addQAData = function(type, amount) {
  if (type === 'gold') {
    window.GameData.coins += amount;
  } else if (type === 'gems') {
    window.GameData.gems += amount;
  }
  window.SaveManager.persist(window.GameData);
  if (typeof updateUpgradeUI === 'function') updateUpgradeUI();
  if (typeof window.showToast === 'function') {
    window.showToast(`+${amount.toLocaleString()} ${type === 'gold' ? 'GOLD' : 'GEMS'}`, 'info', 800);
  }
  Sound.sfx('coin');
};

window.switchTab = function(t) {
  Sound.sfx('btn');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.shop-content').forEach(c => c.style.display = 'none');

  const tabEl = document.getElementById(`tab-${t}`);
  const contentEl = document.getElementById(`shop-${t}`);
  if (tabEl) tabEl.classList.add('active');
  if (contentEl) contentEl.style.display = 'block';

  if (t === 'upgrade') updateUpgradeUI();
  if (t === 'treasure') window.renderTreasureList?.();
  if (t === 'skin') renderSkinList();
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

  // Economy
  setValue('qa-coin', activeConfig.coinRate * 100);
  setValue('qa-item', activeConfig.itemRate * 100);
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

  // Dynamic Camera
  const camConfig = activeConfig.camera ?? {};
  setValue('qa-zoom-run', (camConfig.zoomRun ?? 1.0) * 100);
  setValue('qa-zoom-warning', (camConfig.zoomWarning ?? 1.15) * 100);
  setValue('qa-zoom-stop', (camConfig.zoomStop ?? 1.35) * 100);
  setValue('qa-zoom-boost', (camConfig.zoomBoost ?? 0.85) * 100);
  setValue('qa-zoom-lerp', (camConfig.lerpRunToWarning ?? 0.15) * 100);
  setValue('qa-pan-ratio', (camConfig.panRatioX ?? 0.35) * 100);

  // After setting slider values, call updateQA to sync labels
  window.updateQA();
};

window.updateQA = function() {
  // 1) Read slider values -> qaConfig (used by gameplay logic)

  // Economy
  const coinPct = parseInt(document.getElementById('qa-coin').value, 10);
  const itemPct = parseInt(document.getElementById('qa-item').value, 10);
  const coinLen = parseInt(document.getElementById('qa-coinlen').value, 10);

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

  // Dynamic Camera
  const zoomRunRaw = parseInt(document.getElementById('qa-zoom-run')?.value ?? 100, 10);
  const zoomWarningRaw = parseInt(document.getElementById('qa-zoom-warning')?.value ?? 115, 10);
  const zoomStopRaw = parseInt(document.getElementById('qa-zoom-stop')?.value ?? 135, 10);
  const zoomBoostRaw = parseInt(document.getElementById('qa-zoom-boost')?.value ?? 85, 10);
  const zoomLerpRaw = parseInt(document.getElementById('qa-zoom-lerp')?.value ?? 15, 10);
  const panRatioRaw = parseInt(document.getElementById('qa-pan-ratio')?.value ?? 35, 10);

  // qaConfig에 저장
  qaConfig.coinRate = coinPct / 100;
  qaConfig.itemRate = itemPct / 100;
  qaConfig.minCoinRunLength = coinLen;
  qaConfig.baseSpeed = baseSpeed;
  qaConfig.friction = friction;
  qaConfig.stopFriction = stopFriction;
  qaConfig.turnAccelMult = turnAccelMult; // [추가]
  qaConfig.baseAccel = baseAccel;
  qaConfig.dashForce = dashForce;
  // [CHARGING SYSTEM] 차징 대쉬 설정
  qaConfig.minDashForce = minDashForce;
  qaConfig.maxDashForce = maxDashForce;
  qaConfig.maxChargeTime = maxChargeTime;
  qaConfig.dashCooldown = dashCooldown;
  qaConfig.chargeSlowdown = chargeSlowdown;
  qaConfig.joystickSens = joystickSens;
  qaConfig.playerScale = scale;
  qaConfig.wallPaddingCap = wallPaddingCap;
  qaConfig.baseMagnet = baseMagnet;
  qaConfig.magnetRange = magnetRange;
  qaConfig.stormBaseSpeed = stormBaseSpeed;
  qaConfig.boostDist = boostDist;
  qaConfig.stageLength = stageLength;
  qaConfig.safetyThreshold = safetyPct / 100;
  qaConfig.morphTrigger = morphTrigger;
  qaConfig.morphDuration = morphDuration;
  qaConfig.stopPhaseDuration = stopPhaseDuration;
  qaConfig.deathDelay = deathDelay;

  // [JFB v2] Just Frame Booster
  qaConfig.jfbDelayMin = jfbDelayMinRaw / 100;
  qaConfig.jfbDelayMax = jfbDelayMaxRaw / 100;
  qaConfig.jfbWindow = jfbWindowRaw / 100;

  qaConfig.bgmVol = (bgmPct/100) * 0.25;
  qaConfig.sfxVol = (sfxPct/100);
  qaConfig.scoreSfxVol = (scoreSfxPct/100);
  qaConfig.coinSfxVol = (coinSfxPct/100);
  qaConfig.itemSfxVol = (itemSfxPct/100);
  qaConfig.dashSfxVol = (dashSfxPct/100);
  if (typeof Sound?.bgmSetVolume === 'function') Sound.bgmSetVolume(qaConfig.bgmVol);

  qaConfig.trailLength = trailLength;
  qaConfig.trailOpacity = trailOpacityPct / 100;
  qaConfig.cameraOffsetPct = camOffsetPctRaw / 100;
  qaConfig.visualMode = visualMode;

  // Dynamic Camera 저장
  qaConfig.camera = qaConfig.camera ?? {};
  qaConfig.camera.zoomRun = zoomRunRaw / 100;
  qaConfig.camera.zoomWarning = zoomWarningRaw / 100;
  qaConfig.camera.zoomStop = zoomStopRaw / 100;
  qaConfig.camera.zoomBoost = zoomBoostRaw / 100;
  qaConfig.camera.lerpRunToWarning = zoomLerpRaw / 100;
  qaConfig.camera.panRatioX = panRatioRaw / 100;

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

  // Economy
  setText('qa-val-coin', `${coinPct}%`);
  setText('qa-val-item', `${itemPct}%`);
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

  // Dynamic Camera
  setText('qa-val-zoom-run', `${(zoomRunRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-warning', `${(zoomWarningRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-stop', `${(zoomStopRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-boost', `${(zoomBoostRaw / 100).toFixed(2)}x`);
  setText('qa-val-zoom-lerp', `${(zoomLerpRaw / 100).toFixed(2)}`);
  setText('qa-val-pan-ratio', `${(panRatioRaw / 100).toFixed(2)}`);
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
