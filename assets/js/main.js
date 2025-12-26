(function() {
  const SKINS = window.SKINS ?? window.GameConfig?.SKINS ?? [];
  const THEMES = window.THEMES ?? window.GameConfig?.THEMES ?? [];
  let isFirstWarning = true;
  let qaConfig = { ...(window.GameConfig?.defaultQAConfig ?? { trailLength: 40, trailOpacity: 0.9, coinRate: 0.3, itemRate: 0.03, deathDelay: 1.0, morphTrigger: 3.0, morphDuration: 2.0, boostDist: 400, magnetRange: 170, stormBaseSpeed: 150, cycleSpeedMult: 1.0, dashForce: 1200, baseAccel: 1500, sfxVol: 1.0, bgmVol: 0.15, scorePerSecond: 50, scorePerMeter: 10, scorePerBit: 50, scorePerCoin: 200, scorePerGem: 1000, stageLength: 2000 }) };
  let gameActive, gameState;

  // [NEW] 전역 변수 네임스페이스 초기화
  window.Game = window.Game || {};
  window.qaConfig = qaConfig;
  window.Game.config = qaConfig; // 네임스페이스 참조

  const canvas = document.getElementById('gameCanvas');
  const ctx = (window.CanvasSize?.ctx) ?? canvas.getContext('2d', { alpha: false });
  let canvasWidth = window.CanvasSize?.width ?? canvas.width;
  let canvasHeight = window.CanvasSize?.height ?? canvas.height;

  const COLS = window.Game?.LevelManager?.COLS ?? 5;
  const CELL_H = window.Game?.LevelManager?.CELL_H ?? 100;
  let CELL_W = canvasWidth / COLS;

  window.syncCanvasSize = function() {
    const size = window.CanvasSize ?? {};
    canvasWidth = size.width ?? canvas.width;
    canvasHeight = size.height ?? canvas.height;
    // canvas.width and canvas.height are now set in canvas.js,
    // so we only need to update game-specific variables here.
    CELL_W = canvasWidth / COLS;
    if (window.player?.setBounds) window.player.setBounds(canvasWidth);
    // [NEW] Physics 모듈에 셀 너비 동기화
    window.Game.Physics?.setCellWidth?.(CELL_W);
  }
  syncCanvasSize();

  const getSkins = () => window.SKINS ?? window.GameConfig?.SKINS ?? SKINS;
  const getThemes = () => window.THEMES ?? window.GameConfig?.THEMES ?? THEMES;

  const formatNumber = (num) => Math.floor(num).toLocaleString('en-US');

  const defaultSaveData = window.SaveManager?.defaultSave ?? {
    coins: 0,
    gems: 1000,
    lvlSpeed: 1,
    lvlCool: 1,
    lvlMagnet: 1,
    lvlGreed: 1,
    unlockedSkins: [0],
    equippedSkin: 0,
    stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 }
  };

  window.GameData = { ...defaultSaveData };
  window.Game.data = window.GameData; // [NEW] 네임스페이스 참조

  function loadData() {
    if (window.SaveManager) {
      window.GameData = window.SaveManager.load();
      window.Game.data = window.GameData; // [NEW] 네임스페이스 동기화
      return;
    }

    const stored = localStorage.getItem('runStopFinalFix');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        window.GameData = { ...defaultSaveData, ...parsed, stats: { ...defaultSaveData.stats, ...(parsed.stats || {}) } };
      } catch (e) {
        window.GameData = { ...defaultSaveData };
      }
    }
    window.Game.data = window.GameData; // [NEW] 네임스페이스 동기화
  }

  function saveGame() {
    if (window.SaveManager) {
      window.SaveManager.persist(window.GameData);
      return;
    }
    localStorage.setItem('runStopFinalFix', JSON.stringify(window.GameData));
  }

  window.resetSaveData = function() {
    if (window.SaveManager) {
      window.SaveManager.reset();
      return;
    }
    if (confirm("Reset data")) { localStorage.removeItem('runStopFinalFix'); location.reload(); }
  };

  const player = new Player();
  window.player = player;
  window.Game.player = player; // [NEW] 네임스페이스 참조

  let storm = { y: 0, currentSpeed: 150 }; let cameraY = 0; let items = [];

  // === [Dynamic Camera System] ===
  let cameraZoom = 1.0;           // 현재 줌 레벨
  let targetZoom = 1.0;           // 목표 줌 레벨
  let currentZoomLerp = 3.0;      // 현재 lerp 속도
  let previousGameState = STATE.RUN;  // 이전 게임 상태 (전환 감지용)
  let wasPlayerBoosting = false;  // 이전 프레임의 부스터 상태

  // === [Stage System] ===
  let currentStageId = 1;           // 현재 스테이지 ID (1-13)
  let previousStageId = 1;          // 이전 스테이지 ID (전환 감지용)
  let currentLoopCount = 0;         // 현재 루프 횟수 (0 = 첫 회차)
  let loopDifficultyScale = 1.0;    // 루프별 난이도 배율

  // 지정된 컬럼에 아이템 스폰
  function spawnItemAtCol(rowIdx, type, col) {
    const x = col * CELL_W + CELL_W / 2;
    const baseY = rowIdx * CELL_H;

    if (type === 'coin' || type === 'bit') {
      // 코인/비트는 한 칸에 2개 (세로 배치: 상단 30%, 하단 70%)
      items.push({ x, y: baseY + CELL_H * 0.3, type, r: 12, active: false });
      items.push({ x, y: baseY + CELL_H * 0.7, type, r: 12, active: false });
    } else if (type === 'big_gem') {
      // [위험한 유혹] 왕보석은 정중앙에 1개, 큰 반경
      items.push({ x, y: baseY + CELL_H * 0.5, type, r: 24, active: false });
    } else {
      // 다른 아이템은 정중앙 1개
      items.push({ x, y: baseY + CELL_H * 0.5, type, r: 12, active: false });
    }
  }

  // 랜덤 컬럼에 아이템 스폰 (기존 호환용)
  function spawnItem(rowIdx, type) {
    const col = Math.floor(Math.random() * COLS);
    spawnItemAtCol(rowIdx, type, col);
  }

  function spawnWarningGem() {
    const playerRow = Math.floor(player.y / CELL_H);
    const targetRow = playerRow - Math.floor(Math.random() * 3 + 4);
    spawnItem(targetRow, 'gem');
  }

  // [위험한 유혹] STOP 직전에 위험 타일에 big_gem 스폰
  function spawnBigGem() {
    const playerRow = Math.floor(player.y / CELL_H);
    // 플레이어 앞 2~4행 범위에 배치 (시간이 촉박하므로 가까이)
    const targetRow = playerRow - Math.floor(Math.random() * 3 + 2);

    // 해당 행의 데이터 확인 (없으면 먼저 생성)
    if (!window.Game.LevelManager.getRow(targetRow)) {
      window.Game.LevelManager.generateRow(targetRow, (type, col) => spawnItemAtCol(targetRow, type, col));
    }

    const rowData = window.Game.LevelManager.getRow(targetRow);
    if (!rowData || !rowData.colors) return;

    // 안전 타일이 아닌 '위험한' 컬럼들 찾기
    const dangerousCols = [];
    for (let i = 0; i < COLS; i++) {
      if (rowData.colors[i] !== targetColorIndex) {
        dangerousCols.push(i);
      }
    }

    // 위험한 컬럼 중 랜덤 선택하여 big_gem 스폰
    if (dangerousCols.length > 0) {
      const bigGemCol = dangerousCols[Math.floor(Math.random() * dangerousCols.length)];
      spawnItemAtCol(targetRow, 'big_gem', bigGemCol);
    }
  }


  window.startGame = function(e) {
    if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} }
    window.Input?.setIgnoreInputUntil?.(performance.now() + 250);
    window.Sound?.bgmStart?.();
    window.Sound?.sfx?.('btn');
    syncCanvasSize();
    CELL_W = canvasWidth / COLS;

    player.reset(canvas.width / 2, 550);
    player.sessionScore = 0;
    player.sessionBits = 0;

    // GameConfig.Formulas를 사용하여 스탯 계산 (매직 넘버 제거)
    const F = window.GameConfig.Formulas;
    player.accel = qaConfig.baseAccel;
    player.maxSpeed = F.getSpeed(window.GameData.lvlSpeed, qaConfig.baseSpeed ?? 400);
    player.cooldownMax = F.getCool(window.GameData.lvlCool);
    player.baseMagnetRange = (qaConfig.baseMagnet ?? 100) + F.getMagnetBonus(window.GameData.lvlMagnet);
    player.coinMult = F.getGreed(window.GameData.lvlGreed);
    player.dashForce = qaConfig.dashForce;
    player.friction = qaConfig.friction ?? 0.90;

    const skin = getSkins().find(s => s.id === window.GameData.equippedSkin);
    if (skin) {
      if (skin.statType === 'speed') player.maxSpeed += skin.statVal;
      if (skin.statType === 'cool') player.cooldownMax = Math.max(0.2, player.cooldownMax - skin.statVal);
      if (skin.statType === 'greed') player.coinMult += skin.statVal;
      if (skin.statType === 'magnet') player.baseMagnetRange += skin.statVal;
      if (skin.statType === 'barrier' && skin.statVal > 0) player.hasBarrier = true;
    }

    // [NEW] 보물 효과 적용
    const equippedTreasures = window.GameData.equippedTreasures || [null, null];
    equippedTreasures.forEach(tid => {
      if (!tid) return;
      const treasure = window.getTreasureById?.(tid);
      if (!treasure) return;
      if (treasure.effect === 'speed') player.maxSpeed += treasure.val;
      if (treasure.effect === 'magnet') player.baseMagnetRange += treasure.val;
      if (treasure.effect === 'barrier_start') player.hasBarrier = true;
      if (treasure.effect === 'revive') player.hasRevive = true;
      if (treasure.effect === 'coin_bonus') player.treasureCoinBonus = treasure.val;
    });

    items = [];
    window.Game.LevelManager.reset();
    for (let i = -15; i < 10; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(i, type, col));
    }

    // remove items that spawn behind the player at game start
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].y >= player.y) items.splice(i, 1);
    }

    // [Stage System] 스테이지 초기화
    currentStageId = 1;
    previousStageId = 1;
    currentLoopCount = 0;
    loopDifficultyScale = 1.0;
    currentThemeIdx = 0;

    // Get initial stage goal from stage system
    const initialStageLength = window.STAGE_CONFIG?.[0]?.length ?? (qaConfig.stageLength ?? 2000);
    currentLevelGoal = initialStageLength;

    storm.y = player.y + 800; gameState = STATE.RUN; cycleTimer = 3.0;
    isFirstWarning = true;

    // [Dynamic Camera] 카메라 줌 초기화
    cameraZoom = 1.0;
    targetZoom = 1.0;
    currentZoomLerp = 3.0;
    previousGameState = STATE.RUN;
    wasPlayerBoosting = false;
    // [NEW] 모든 화면 숨기기
    window.Navigation?.hideAll?.();
    window.Game.UI.setPhase(STATE.RUN, 3.0, 3.0, STATE);
    window.Game.UI.setStateGlow(STATE.RUN, STATE);
    window.Game.UI.resetForGameStart();
    window.Game.UI.updateScore(0, formatNumber, true);
    gameActive = true; lastTime = performance.now(); requestAnimationFrame(gameLoop);
  };

  // === [Stage System Helper Functions] ===
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
    setTimeout(() => n.style.opacity = 0, 3000);

    // Play stage transition sound
    window.Sound?.sfx?.('alert');
  }

  function applyLoopDifficultyScaling(loopCount) {
    // Each loop increases difficulty by 10%
    loopDifficultyScale = 1 + (loopCount - 1) * 0.1;

    // Update effective storm speed (applied in physics)
    const baseStormSpeed = qaConfig.stormBaseSpeed ?? 150;
    qaConfig._effectiveStormSpeed = baseStormSpeed * loopDifficultyScale;

    console.log(`[LOOP] Loop ${loopCount}: Difficulty scale = ${loopDifficultyScale.toFixed(2)}`);
  }

  // === [Dynamic Camera Zoom Logic] ===
  function updateCameraZoom(dt) {
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

    // Phase 1: 부스터 상태 감지 (STOP → BOOST)
    if (player.isBoosting && !wasPlayerBoosting) {
      // 부스터 시작! 폭발적 해방
      targetZoom = zoomBoost;
      currentZoomLerp = lerpStopToBoost;
    }
    // Phase 4: 부스터 종료 (BOOST → RUN)
    else if (!player.isBoosting && wasPlayerBoosting) {
      // 부스터 끝, 부드럽게 기본으로 복귀
      targetZoom = zoomRun;
      currentZoomLerp = lerpBoostToRun;
    }
    // 상태 전환 감지
    else if (gameState !== previousGameState) {
      // Phase 1: RUN → WARNING (조여오는 공포)
      if (previousGameState === STATE.RUN && gameState === STATE.WARNING) {
        targetZoom = zoomWarning;
        currentZoomLerp = lerpRunToWarning;
      }
      // Phase 2: WARNING → STOP (승부의 순간)
      else if (previousGameState === STATE.WARNING && gameState === STATE.STOP) {
        targetZoom = zoomStop;
        currentZoomLerp = lerpWarningToStop;
      }
      // STOP → RUN (일반 전환, 부스터 없이 생존)
      else if (previousGameState === STATE.STOP && gameState === STATE.RUN) {
        // 부스터 없이 생존한 경우 기본 줌으로
        if (!player.isBoosting) {
          targetZoom = zoomRun;
          currentZoomLerp = lerpDefault;
        }
      }
    }

    // 이전 상태 업데이트
    previousGameState = gameState;
    wasPlayerBoosting = player.isBoosting;

    // 줌 보간 적용 (Lerp)
    const zoomDiff = targetZoom - cameraZoom;
    if (Math.abs(zoomDiff) > 0.001) {
      cameraZoom += zoomDiff * currentZoomLerp * dt;
    } else {
      cameraZoom = targetZoom;
    }
  }

  // === [In-game Feedback] ===
  function update(dt) {
    // syncCanvasSize(); // This is now called by canvas.js on resize events.
    window.Game.UI.updateFloatingTexts(dt);
    window.Game.UI.updateBuffs(player);
    window.Game.UI.updateDash(player);
    player.update(dt, { input: window.Input, qaConfig, canvasWidth });
    player.sessionScore += (qaConfig.scorePerSecond ?? 0) * dt;
    window.Game.UI.updateScore(player.sessionScore, formatNumber);
    if (player.isDying) return;
    let currentDist = Math.floor((550 - player.y)/10);
    if (currentDist > player.dist) {
      player.dist = currentDist;

      // [Stage System] Use new data-driven stage system
      const stageInfo = window.Game.LevelManager.getStageInfo(player.dist);

      // Update level goal based on current stage
      currentLevelGoal = (window.STAGE_CUMULATIVE?.[stageInfo.stageIndex] ?? 0) +
                         stageInfo.stageConfig.length;

      // Check for stage transition
      if (stageInfo.stageConfig.id !== currentStageId) {
        previousStageId = currentStageId;
        currentStageId = stageInfo.stageConfig.id;
        currentLoopCount = stageInfo.loopCount;

        // Update theme
        const newThemeIdx = stageInfo.stageConfig.themeIdx;
        if (newThemeIdx !== currentThemeIdx) {
          currentThemeIdx = newThemeIdx;
        }

        // Show stage notification
        showStageNotification(stageInfo);

        // Apply difficulty scaling for loop
        if (stageInfo.isLooping && stageInfo.loopCount > 0) {
          applyLoopDifficultyScaling(stageInfo.loopCount);
        }
      }
    }
    const diff = Math.min(player.dist / 5000, 1.0); // 난이도 계수 (WARNING 타이머에도 사용)
    const stormSpeed = window.Game.Physics.getStormSpeed(player.dist, qaConfig.stormBaseSpeed);
    storm.y -= stormSpeed * dt;
    if (window.Game.Physics.checkStormCollision(player, storm)) { die("STORM"); return; }
    const screenBottom = cameraY + canvasHeight;
    window.Game.UI.setStormWarning(storm.y < screenBottom + 300);
    window.Game.LevelManager.cleanupRows(storm.y);
    const camOffsetPct = qaConfig.cameraOffsetPct ?? 0.6;
    const targetCamY = player.y - canvasHeight * camOffsetPct; cameraY += (targetCamY - cameraY) * 5 * dt;

    // === [Dynamic Camera Zoom Update] ===
    updateCameraZoom(dt);
    const pRow = Math.floor(player.y / CELL_H);
    for (let i = pRow - 15; i < pRow + 5; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(i, type, col));
    }
    window.Game.Physics.filterItemsBehindStorm(items, storm);
    const activeRange = (player.magnetTimer > 0) ? qaConfig.magnetRange : player.baseMagnetRange;
    const collectedItems = window.Game.Physics.processItemCollisions(player, items, activeRange);
    collectedItems.forEach(it => applyItem(it));
    window.Game.Physics.removeCollectedItems(items, collectedItems);
    cycleTimer -= dt;
    window.Game.UI.updateChase(player.dist, storm.y, currentLevelGoal);
    if (gameState === STATE.RUN) { window.Game.UI.setPhase(gameState, cycleTimer, 3.0, STATE); }
    else if (gameState === STATE.WARNING) { window.Game.UI.setPhase(gameState, cycleTimer, (window.currentWarningMax || 6.0), STATE); }
    else if (gameState === STATE.STOP) { window.Game.UI.setPhase(gameState, cycleTimer, (qaConfig.stopPhaseDuration ?? 1.5), STATE); }
    window.Game.UI.setStateGlow(gameState, STATE);
    if (gameState === STATE.WARNING || gameState === STATE.STOP) {
      if (targetColorIndex !== -1) {
        const palette = getThemes()[currentThemeIdx]?.colors ?? [];
        const currentColor = palette[targetColorIndex];
        if (currentColor) window.Game.UI.setTargetColor(currentColor);
      }
    }
    const stormDist = Math.floor((550 - storm.y) / 10);
    if (gameState === STATE.RUN) {
      if (cycleTimer <= 0) {
        gameState = STATE.WARNING;
        if (isFirstWarning) {
            cycleTimer = 12.0;
            isFirstWarning = false;
        } else {
            cycleTimer = Math.max(7.0 - (diff * 4.0), 3.0);
        }
        currentWarningMax = cycleTimer;
        targetColorIndex = window.Game.LevelManager.pickSafeTargetColor(player.y, currentThemeIdx);
        const palette = getThemes()[currentThemeIdx]?.colors ?? [];
        window.Game.UI.onWarningStart(palette[targetColorIndex]);
        window.Sound?.sfx('alert');
        spawnWarningGem();
        bigGemSpawned = false;  // [위험한 유혹] WARNING마다 big_gem 스폰 플래그 리셋
      }
    } else if (gameState === STATE.WARNING) {
      window.Game.UI.onWarningUpdate(cycleTimer);
      // [위험한 유혹] WARNING 시간의 30% 남았을 때 big_gem 스폰 - 긴박한 선택 유도
      // 12초 WARNING → 3.6초 남았을 때, 3초 WARNING → 0.9초 남았을 때
      const bigGemTriggerTime = (currentWarningMax || 6.0) * 0.3;
      if (!bigGemSpawned && cycleTimer <= bigGemTriggerTime) {
        spawnBigGem();
        bigGemSpawned = true;
      }
      if (cycleTimer <= 0) {
        gameState = STATE.STOP;
        cycleTimer = qaConfig.stopPhaseDuration ?? 1.5;
        window.Game.UI.onStopStart();
        if(!player.isDashing) { player.vx *= 0.1; player.vy *= 0.1; }
        checkStopJudgment();
      }
    } else if (gameState === STATE.STOP) {
      if (!player.isBoosting) checkFallDie();
      if (cycleTimer <= 0) {
        gameState = STATE.RUN;
        cycleTimer = 3.0;
        window.Game.UI.onRunStart();
      }
    }
  }

  function applyItem(item) {
    if (item.type === 'bit') {
      player.sessionBits += 1;
      player.sessionScore += qaConfig.scorePerBit ?? 0;
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
      window.Sound?.sfx('bit');
      window.Game.UI.showToast(player, `+${qaConfig.scorePerBit ?? 0}`, '#79F566', 650);
    } else if (item.type === 'coin') {
      let val = 1 * player.coinMult;
      player.sessionCoins += Math.floor(val);
      player.sessionScore += (qaConfig.scorePerCoin ?? 0) * Math.floor(val);
      window.Game.UI.setCoinDisplay(player.sessionCoins);
      window.Sound?.sfx('coin');
      window.Game.UI.showToast(player, `+${Math.floor(val)}`, '#f1c40f', 650);
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
    } else if (item.type === 'gem') {
      player.sessionGems++;
      player.sessionScore += qaConfig.scorePerGem ?? 0;
      window.Game.UI.setGemDisplay(player.sessionGems);
      window.Sound?.sfx('gem');
      window.Game.UI.showToast(player, '+1', '#00d2d3', 650);
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
    } else if (item.type === 'big_gem') {
      // [위험한 유혹] 왕보석: 하이 리스크 - 하이 리턴
      const bigGemScore = 50000;  // 일반 보석의 50배
      const bigGemReward = 50;    // 보석 50개
      player.sessionGems += bigGemReward;
      player.sessionScore += bigGemScore;
      window.Game.UI.setGemDisplay(player.sessionGems);
      window.Sound?.sfx('alert');  // 경고음과 함께
      window.Sound?.sfx('coin');   // 코인 소리 동시 재생
      // 보상 내용을 명확하게 표시
      window.Game.UI.showToast(player, `+${bigGemReward} GEM`, '#00d2d3', 1200);
      setTimeout(() => {
        window.Game.UI.showToast(player, `+${formatNumber(bigGemScore)} SCORE`, '#ffd700', 1200);
      }, 200);
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
    } else if (item.type === 'barrier') {
      player.hasBarrier = true;
      window.Sound?.sfx('item');
    } else if (item.type === 'booster') {
      player.isBoosting = true;
      player.boostTargetY = player.y - qaConfig.boostDist;
      window.Sound?.sfx('item');
    } else if (item.type === 'magnet') {
      player.magnetTimer = 10.0;
      window.Sound?.sfx('item');
    }
  }
  function checkFallDie() {
    if (player.isBoosting) return;
    const result = window.Game.Physics.checkSafeZone(player, targetColorIndex);
    if (result.action === 'barrier_save') {
      window.Game.Physics.applyBarrierSave(player);
      window.Game.UI.showBarrierSaved();
      window.Sound?.sfx('jump');
    } else if (result.action === 'die') {
      die("FALL_DURING_STOP");
    }
  }

  function checkStopJudgment() {
    if (player.isBoosting) return;
    const result = window.Game.Physics.checkSafeZone(player, targetColorIndex);
    if (result.isSafe) {
      // [JFB v2] 실력으로 생존 시 저스트 프레임 부스터 권한 부여 (Reflex Mode)
      player.grantSurvivalBooster();
      window.Sound?.sfx('boost_ready');
      window.Game.UI.showToast(player, 'GET READY...', '#f1c40f', 600);
    } else if (result.action === 'barrier_save') {
      // 배리어로 부활한 경우 보상 없음 (오직 실력 생존만 인정)
      window.Game.Physics.applyBarrierSave(player);
      window.Game.UI.showBarrierSaved();
      window.Sound?.sfx('jump');
    } else if (result.action === 'die') {
      die("FALL");
    }
  }
  function die(reason) {
    if(player.isDead || player.isDying) return;
    // [NEW] 부활 보물 체크
    if (player.hasRevive) {
      player.hasRevive = false;
      player.hasBarrier = true;
      player.vy = -1000;
      player.invincibleTimer = 2.0;
      window.Sound?.sfx('item');

      return;
    }
    window.Sound?.bgmStop?.();
    player.die(qaConfig.deathDelay);
    window.Sound?.sfx('die');
  }
  // === [Game Over] ===
  function gameOver() {
    if (!gameActive) return;
    gameActive = false;

    window.GameData.coins += player.sessionCoins;
    window.GameData.gems  += player.sessionGems;

    window.GameData.stats.totalGames += 1;
    window.GameData.stats.totalCoins += player.sessionCoins;
    if (player.dist > window.GameData.stats.maxDist) window.GameData.stats.maxDist = player.dist;
    window.GameData.stats.totalDeaths += 1;

    const distanceBonus = player.dist * (qaConfig.scorePerMeter ?? 0);
    const itemScore = (player.sessionBits * (qaConfig.scorePerBit ?? 0)) +
      (player.sessionCoins * (qaConfig.scorePerCoin ?? 0)) +
      (player.sessionGems * (qaConfig.scorePerGem ?? 0));
    const totalScore = Math.floor(player.sessionScore + distanceBonus);
    const previousHigh = window.GameData.stats.highScore || 0;
    const isNewRecord = totalScore > previousHigh;
    if (isNewRecord) window.GameData.stats.highScore = totalScore;

    saveGame();
    window.updateUpgradeUI?.();
    window.renderSkinList?.();

    window.Game.UI.updateResult({
      dist: player.dist,
      coins: player.sessionCoins,
      gems: player.sessionGems,
      totalScore,
      highScore: window.GameData.stats.highScore || 0,
      isNewRecord,
      itemScore,
      distanceBonus,
      formatNumber
    });

    // [NEW] 코인 보너스 (보물 효과) 적용
    if (player.treasureCoinBonus > 0) {
      const bonus = Math.floor(player.sessionCoins * (player.treasureCoinBonus / 100));
      window.GameData.coins += bonus;
      saveGame();
    }

    window.Game.UI.setMobileControls(false);
    window.Sound?.bgmStop?.();
    window.Navigation?.go?.('result');
  }

  function render() {
    // 플레이어의 화면상 Y 위치 계산 (피벗 포인트)
    const camOffsetPct = qaConfig.cameraOffsetPct ?? 0.75;
    const playerScreenY = canvasHeight * camOffsetPct;

    // === [Horizontal Stabilization] X축 안정화 ===
    // panRatioX: 0.0 = 화면 중앙 고정, 1.0 = 플레이어 완전 추적
    const panRatioX = qaConfig.camera?.panRatioX ?? 0.35;
    const centerX = canvasWidth / 2;
    const playerScreenX = (centerX * (1 - panRatioX)) + (player.x * panRatioX);

    window.Game.Renderer.draw({
      cameraY,
      cameraZoom,          // 현재 줌 레벨
      pivotX: playerScreenX,  // 줌 피벗 X (안정화된 X)
      pivotY: playerScreenY,  // 줌 피벗 Y (화면의 75% 지점)
      canvasWidth,
      canvasHeight,
      storm,
      items,
      player,
      gameState,
      targetColorIndex,
      currentThemeIdx,
      cycleTimer,
      qaConfig,
      COLS,
      CELL_W,
      CELL_H,
      STATE
    });
  }

  // === [NEW] 일시정지 시스템 ===
  let previousState = STATE.RUN; // PAUSE 전 상태 저장

  window.togglePause = function() {
    if (!gameActive) return;

    if (gameState === STATE.PAUSE) {
      // Resume
      gameState = previousState;
      window.Navigation?.hideOverlay?.('overlay-pause');
      window.Sound?.bgmStart?.(); // BGM 다시 시작
      lastTime = performance.now(); // 시간 보정
      requestAnimationFrame(gameLoop);
    } else {
      // Pause
      window.Sound?.bgmStop?.(); // BGM 일시정지
      previousState = gameState;
      gameState = STATE.PAUSE;
      window.Navigation?.showOverlay?.('overlay-pause');
    }
    window.Sound?.sfx?.('btn');
  };

  window.restartFromPause = function() {
    window.Navigation?.hideOverlay?.('overlay-pause');
    gameActive = false;
    window.startGame();
  };

  window.quitGame = function() {
    window.Navigation?.hideOverlay?.('overlay-pause');
    gameActive = false;
    window.Sound?.bgmStop?.();
    window.Game.UI.setMobileControls(false);
    window.Navigation?.go?.('lobby');
    window.Sound?.sfx?.('btn');
  };

  function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.033);
    lastTime = ts;
    if (gameActive) {
      // [NEW] PAUSE 상태에서는 update 건너뛰기
      if (gameState !== STATE.PAUSE) {
        update(dt);
        render();
      }
      if (!player.isDead && gameState !== STATE.PAUSE) requestAnimationFrame(gameLoop);
      else if (player.isDead) gameOver();
      // PAUSE 상태면 루프 멈춤 (togglePause에서 재개)
    }
  }

  // === [Lobby Character AI] ===
  let lobbyInterval = null;

  window.startLobbyLoop = function() {
    if (lobbyInterval) clearInterval(lobbyInterval);

    const charEl = document.getElementById('lobby-char');
    if(charEl) {
      charEl.style.left = '50%';
      charEl.style.transform = 'translateX(-50%) scale(1)';
    }

    lobbyInterval = setInterval(() => {
      const lobby = document.getElementById('screen-lobby');
      if (!lobby || lobby.style.display === 'none') return;

      const charEl = document.getElementById('lobby-char');
      if (!charEl) return;

      const action = Math.random();

      if (action < 0.3) {
        performJump(charEl);
      } else if (action < 0.7) {
        performMove(charEl);
      }
    }, 2500);
  };

  window.stopLobbyLoop = function() {
    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = null;
  };

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

  window.interactLobbyChar = function() {
    const el = document.getElementById('lobby-char');
    if(el) {
      performJump(el);
      window.Sound?.sfx('jump');
    }
  };

  window.dashOnClick = function(e) { e.preventDefault(); window.Input?.attemptDash?.(); };
  
  // === [YouTube Playables 필수] 오디오 포커스 핸들링 ===
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // [수정] 오디오 엔진 전체를 정지시켜 확실하게 Mute 처리
      if (window.Sound && window.Sound.toggleMute) {
          window.Sound.toggleMute(true);
      } else {
          window.Sound?.bgmStop?.();
      }
      // 게임 일시정지
      if (gameActive && gameState !== STATE.PAUSE) {
         window.togglePause();
      }
    } else {
      // [수정] 오디오 엔진 재개
      if (window.Sound && window.Sound.toggleMute) {
          window.Sound.toggleMute(false);
      }
      if (gameActive && gameState !== STATE.PAUSE) {
         window.Sound.bgmStart();
      }
    }
  });

  loadData();
  window.Game.UI?.init?.(); // [NEW] UI 초기화
  window.Game.Renderer?.init?.(canvas, ctx); // [NEW] Renderer 초기화
  window.Game.Physics?.init?.(COLS, CELL_W, CELL_H); // [NEW] Physics 초기화
  window.Input?.initControls?.();
  window.initQASliders?.();
  window.updateUpgradeUI?.();
  window.renderSkinList?.();

  // === [QA Warp System] ===
  /**
   * Warp game to a specific distance (QA tool)
   * @param {number} targetDistance - Target cumulative distance
   */
  window.warpToDistance = function(targetDistance) {
    if (!gameActive) {
      // Start game first if not active
      window.startGame();
    }

    // Calculate Y position from distance
    // Formula: dist = (550 - player.y) / 10
    // Inverse: player.y = 550 - (dist * 10)
    const targetY = 550 - (targetDistance * 10);

    // Reset level manager to clear old rows
    window.Game.LevelManager.reset();

    // Clear existing items
    items = [];

    // Set player position
    player.y = targetY;
    player.x = canvasWidth / 2;
    player.dist = targetDistance;
    player.vx = 0;
    player.vy = 0;

    // Position storm safely behind player
    storm.y = player.y + 600;

    // Generate rows around new position
    const playerRow = Math.floor(player.y / CELL_H);
    for (let i = playerRow - 15; i < playerRow + 5; i++) {
      window.Game.LevelManager.generateRow(i, (type, col) => spawnItemAtCol(i, type, col));
    }

    // Remove items behind player
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].y >= player.y) items.splice(i, 1);
    }

    // Update camera
    const camOffsetPct = qaConfig.cameraOffsetPct ?? 0.6;
    cameraY = player.y - canvasHeight * camOffsetPct;

    // Get and apply stage info
    const stageInfo = window.Game.LevelManager.getStageInfo(targetDistance);
    currentStageId = stageInfo.stageConfig.id;
    previousStageId = currentStageId;
    currentThemeIdx = stageInfo.stageConfig.themeIdx;
    currentLoopCount = stageInfo.loopCount;
    currentLevelGoal = (window.STAGE_CUMULATIVE?.[stageInfo.stageIndex] ?? 0) +
                       stageInfo.stageConfig.length;

    // Apply loop difficulty if in loop
    if (stageInfo.isLooping && stageInfo.loopCount > 0) {
      applyLoopDifficultyScaling(stageInfo.loopCount);
    } else {
      loopDifficultyScale = 1.0;
      qaConfig._effectiveStormSpeed = qaConfig.stormBaseSpeed ?? 150;
    }

    // Show stage notification
    showStageNotification(stageInfo);

    // Reset game state to RUN
    gameState = STATE.RUN;
    cycleTimer = 3.0;
    isFirstWarning = true;

    console.log(`[WARP] Stage ${currentStageId}, Loop ${currentLoopCount}, Dist ${targetDistance}m`);
  };

  // [NEW] Game 네임스페이스에 유틸리티 함수 등록
  window.Game.startGame = window.startGame;
  window.Game.togglePause = window.togglePause;
  window.Game.restartFromPause = window.restartFromPause;
  window.Game.quitGame = window.quitGame;
  window.Game.resetSaveData = window.resetSaveData;
  window.Game.saveGame = saveGame;
  window.Game.loadData = loadData;
  window.Game.warpToDistance = window.warpToDistance;
  window.Game.getState = () => ({ gameState, gameActive, storm, cameraY, cameraZoom, targetZoom, currentStageId, currentLoopCount });
})();
