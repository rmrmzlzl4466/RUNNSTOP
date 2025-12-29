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
   * 슬로우모션 설정 (GLOBAL) - Matrix-style "Neo dodging bullets"
   * 3-phase system: ease-in → hold → ease-out
   */
  const FALLBACK_SLOWMO = {
    enabled: true,
    scale: 0.12,              // How slow at peak (0.12 = 88% slower, very dramatic)
    easeInSec: 0.20,          // Time to ramp down to slow
    holdSec: 0.50,            // Time frozen at peak slowdown
    easeOutSec: 0.25,         // Time to return to normal
    cancelPolicy: 'on_boost_start',
    blockWhileBoosting: true,
    blockWindowAfterBoostSec: 0.15,
    applyMask: 'everything',
    minIntervalSec: 0.3
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
    // lvlSpeed, lvlCool, lvlMagnet, lvlGreed 제거됨 (캐릭터 업그레이드 폐지)
    unlockedSkins: [0],
    equippedSkin: 0,
    unlockedTreasures: [],
    equippedTreasures: [null, null],
    stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 },
    tutorialCompleted: false,
    tutorialProgress: 0
  };

  /**
   * applyLoadoutStats - 런 시작 시 플레이어/런타임에 스킨/보물 효과 적용
   * 캐릭터 스탯 업그레이드 폐지됨 - 이제 고정값 사용
   * 아이템 업그레이드는 runtime.itemUpgrades에서 별도 관리
   */
  function applyLoadoutStats(player, qaConfig, gameData, runtime) {
    const DEFAULTS = window.GameConfig?.STAGE_DEFAULTS ?? {};

    // 고정 기본값 적용 (업그레이드 보너스 없음)
    player.accel = qaConfig.baseAccel ?? DEFAULTS.baseAccel ?? 3000;
    player.maxSpeed = qaConfig.baseSpeed ?? DEFAULTS.baseSpeed ?? 960;
    player.cooldownMax = qaConfig.dashCooldown ?? DEFAULTS.dashCooldown ?? 0.7;
    player.baseMagnetRange = qaConfig.baseMagnet ?? DEFAULTS.baseMagnet ?? 50;
    player.coinMult = 1.0; // 고정값 (Greed 업그레이드 폐지)
    player.dashForce = qaConfig.dashForce ?? DEFAULTS.dashForce ?? 1000;
    player.friction = qaConfig.friction ?? DEFAULTS.friction ?? 0.93;

    // 스킨 효과 - barrier만 유지 (다른 스탯 보너스 폐지)
    const skin = getSkins().find((s) => s.id === gameData.equippedSkin);
    if (skin) {
      // speed, cool, greed, magnet 스탯 보너스 제거됨
      if (skin.statType === 'barrier' && skin.statVal > 0) player.hasBarrier = true;
    }

    // 보물 효과 적용
    const equippedTreasures = gameData.equippedTreasures || [null, null];
    let treasureCoinBonus = 0;

    equippedTreasures.forEach((tid) => {
      if (!tid) return;
      const treasure = window.getTreasureById?.(tid);
      if (!treasure) return;

      // speed, magnet 효과 제거됨 → 새 효과로 대체
      if (treasure.effect === 'barrier_start') player.hasBarrier = true;
      if (treasure.effect === 'revive') player.hasRevive = true;
      if (treasure.effect === 'coin_bonus') {
        treasureCoinBonus += treasure.val;
      }
      // 새 보물 효과: booster_enhance, magnet_enhance
      if (treasure.effect === 'booster_enhance' && runtime?.itemUpgrades) {
        runtime.itemUpgrades.boosterDistanceMult += 0.20;
      }
      if (treasure.effect === 'magnet_enhance' && runtime?.itemUpgrades) {
        runtime.itemUpgrades.magnetDurationBonusSec += 2.0;
      }
    });

    // coin_bonus 상한 50% 적용 (runtime에만 저장)
    if (runtime) {
      runtime.treasureCoinBonus = Math.min(treasureCoinBonus, 50);
    }
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
