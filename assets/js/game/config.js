window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  /**
   * 아이템 관련 설정 (GLOBAL)
   */
  const FALLBACK_ITEM = {
    magnetDurationSec: 10,
    bigGemScore: 50000,
    bigGemGems: 50
  };

  /**
   * 슬로우모션 설정 (GLOBAL)
   */
  const FALLBACK_SLOWMO = {
    enabled: true,
    scale: 0.7,
    durationSec: 0.22,
    easeOutSec: 0.08,
    cancelPolicy: 'on_boost_press',
    blockWhileBoosting: true,
    blockWindowAfterBoostSec: 0.22,
    applyMask: 'world_only',
    minIntervalSec: 0.4
  };

  /**
   * createQAConfig - core/config.js의 GLOBAL + STAGE_DEFAULTS 사용
   * FALLBACK_QA_CONFIG 제거됨
   */
  function createQAConfig() {
    // core/config.js에서 전체 설정 가져오기
    const baseConfig = window.GameConfig?.createFullConfig?.() ?? {};

    // camera, item, slowMo 병합
    const merged = { ...baseConfig };
    merged.camera = { ...baseConfig.camera };
    merged.item = { ...FALLBACK_ITEM };
    merged.slowMo = { ...FALLBACK_SLOWMO };

    // cameraOffsetPct 레거시 지원
    merged.cameraOffsetPct = merged.cameraOffsetPct ?? merged.camera?.cameraOffsetPct ?? 0.75;

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

    // STAGE_DEFAULTS에서 기본값 사용
    const DEFAULTS = window.GameConfig?.STAGE_DEFAULTS ?? {};

    player.accel = qaConfig.baseAccel ?? DEFAULTS.baseAccel ?? 3000;
    player.maxSpeed = F.getSpeed(gameData.lvlSpeed, qaConfig.baseSpeed ?? DEFAULTS.baseSpeed ?? 960);
    player.cooldownMax = F.getCool(gameData.lvlCool);
    player.baseMagnetRange = (qaConfig.baseMagnet ?? DEFAULTS.baseMagnet ?? 50) + F.getMagnetBonus(gameData.lvlMagnet);
    player.coinMult = F.getGreed(gameData.lvlGreed);
    player.dashForce = qaConfig.dashForce ?? DEFAULTS.dashForce ?? 1000;
    player.friction = qaConfig.friction ?? DEFAULTS.friction ?? 0.93;

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
    FALLBACK_ITEM,
    FALLBACK_SLOWMO,
    getCameraOffsetPct: (qaConfig = {}) => {
      const GLOBAL = window.GameConfig?.GLOBAL ?? {};
      return qaConfig.cameraOffsetPct ?? qaConfig.camera?.cameraOffsetPct ?? GLOBAL.cameraOffsetPct ?? 0.75;
    }
  };
})();
