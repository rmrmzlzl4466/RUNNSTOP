window.GameModules = window.GameModules || {};

(function() {
  const FALLBACK_CAMERA = {
    zoomRun: 1.0,
    zoomWarning: 1.15,
    zoomStop: 1.35,
    zoomBoost: 0.85,
    lerpRunToWarning: 0.15,
    lerpWarningToStop: 8.0,
    lerpStopToBoost: 15.0,
    lerpBoostToRun: 1.5,
    lerpDefault: 3.0,
    panRatioX: 0.35,
    cameraOffsetPct: 0.75
  };

  const FALLBACK_ITEM = {
    magnetDurationSec: 10,
    bigGemScore: 50000,
    bigGemGems: 50
  };

  const FALLBACK_SLOWMO = {
    enabled: true,
    scale: 0.7,                  // Time scale during slow motion (0.1~1.0)
    durationSec: 0.22,           // Duration in seconds (short for emphasis)
    easeOutSec: 0.08,            // Final segment eased back to normal (seconds)
    cancelPolicy: 'on_boost_press', // 'on_boost_press' | 'on_boost_start' | 'never'
    blockWhileBoosting: true,    // Never apply slowmo during boosting
    blockWindowAfterBoostSec: 0.22, // Block window after boost ends
    applyMask: 'world_only',     // 'world_only' | 'everything'
    minIntervalSec: 0.4          // Minimum interval between slowmo triggers
  };

  const FALLBACK_QA_CONFIG = {
    trailLength: 40,
    trailOpacity: 0.9,
    coinRate: 0.3,
    minCoinRunLength: 5,
    itemRate: 0.03,
    itemWeights: { barrier: 0.2, booster: 0.4, magnet: 0.4 },
    deathDelay: 1.0,
    morphTrigger: 3.0,
    morphDuration: 2.0,
    boostDist: 400,
    magnetRange: 170,
    stormBaseSpeed: 150,
    cycleSpeedMult: 1.0,
    dashForce: 1200,
    baseAccel: 1500,
    sfxVol: 1.0,
    bgmVol: 0.15,
    scorePerSecond: 50,
    scorePerMeter: 10,
    scorePerBit: 50,
    scorePerCoin: 200,
    scorePerGem: 1000,
    stageLength: 2000,
    // Cycle timing defaults
    runPhaseDuration: 3.0,
    warningTimeBase: 7.0,
    warningTimeMin: 3.0,
    stopPhaseDuration: 1.5
  };

  function createQAConfig() {
    const merged = { ...FALLBACK_QA_CONFIG, ...(window.GameConfig?.defaultQAConfig ?? {}) };
    merged.camera = { ...FALLBACK_CAMERA, ...(merged.camera || {}) };
    merged.item = { ...FALLBACK_ITEM, ...(merged.item || {}) };
    merged.slowMo = { ...FALLBACK_SLOWMO, ...(merged.slowMo || {}) };
    // expose camera offset both inside camera.* and top-level for legacy reads
    merged.cameraOffsetPct = merged.cameraOffsetPct ?? merged.camera.cameraOffsetPct ?? FALLBACK_CAMERA.cameraOffsetPct;
    return merged;
  }

  function attachQAConfig(config) {
    window.Game = window.Game || {};
    window.qaConfig = config;
    window.Game.config = config;
  }

  const formatNumber = (num) => Math.floor(num).toLocaleString('en-US');

  const getSkins = () => window.SKINS ?? window.GameConfig?.SKINS ?? [];
  const getThemes = () => window.THEMES ?? window.GameConfig?.THEMES ?? [];

  const defaultSaveData = window.SaveManager?.defaultSave ?? {
  coins: 0,
  gems: 1000,
  lvlSpeed: 1,
  lvlCool: 1,
  lvlMagnet: 1,
  lvlGreed: 1,
  unlockedSkins: [0],
  equippedSkin: 0,
  unlockedTreasures: [],
  equippedTreasures: [null, null],
  stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 }
  };

  function applyLoadoutStats(player, qaConfig, gameData) {
    const F = window.GameConfig?.Formulas;
    if (!F) return;

    player.accel = qaConfig.baseAccel;
    player.maxSpeed = F.getSpeed(gameData.lvlSpeed, qaConfig.baseSpeed ?? 400);
    player.cooldownMax = F.getCool(gameData.lvlCool);
    player.baseMagnetRange = (qaConfig.baseMagnet ?? 100) + F.getMagnetBonus(gameData.lvlMagnet);
    player.coinMult = F.getGreed(gameData.lvlGreed);
    player.dashForce = qaConfig.dashForce;
    player.friction = qaConfig.friction ?? 0.9;

    const skin = getSkins().find((s) => s.id === gameData.equippedSkin);
    if (skin) {
      if (skin.statType === 'speed') player.maxSpeed += skin.statVal;
      if (skin.statType === 'cool') player.cooldownMax = Math.max(0.2, player.cooldownMax - skin.statVal);
      if (skin.statType === 'greed') player.coinMult += skin.statVal;
      if (skin.statType === 'magnet') player.baseMagnetRange += skin.statVal;
      if (skin.statType === 'barrier' && skin.statVal > 0) player.hasBarrier = true;
    }

    const equippedTreasures = gameData.equippedTreasures || [null, null];
    equippedTreasures.forEach((tid) => {
      if (!tid) return;
      const treasure = window.getTreasureById?.(tid);
      if (!treasure) return;
      if (treasure.effect === 'speed') player.maxSpeed += treasure.val;
      if (treasure.effect === 'magnet') player.baseMagnetRange += treasure.val;
      if (treasure.effect === 'barrier_start') player.hasBarrier = true;
      if (treasure.effect === 'revive') player.hasRevive = true;
      if (treasure.effect === 'coin_bonus') player.treasureCoinBonus = treasure.val;
    });
  }

  window.GameModules.Config = {
    createQAConfig,
    attachQAConfig,
    formatNumber,
    getSkins,
    getThemes,
    defaultSaveData,
    applyLoadoutStats,
    FALLBACK_CAMERA,
    FALLBACK_ITEM,
    FALLBACK_SLOWMO,
    getCameraOffsetPct: (qaConfig = {}) => qaConfig.cameraOffsetPct ?? qaConfig.camera?.cameraOffsetPct ?? FALLBACK_CAMERA.cameraOffsetPct
  };
})();
