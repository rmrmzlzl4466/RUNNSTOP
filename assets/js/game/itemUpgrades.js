/**
 * Item Upgrades System
 * 아이템 성능 강화 4종 관리 모듈
 * - boosterDistance: 부스터 이동 거리 배수
 * - magnetDuration: 자석 지속시간 추가 초
 * - magnetRange: 자석 범위 배수
 * - shieldDropChance: 실드 드랍 확률 추가
 */
(function() {
  'use strict';

  const ITEM_UPGRADES_KEY = 'itemUpgrades_v1';

  // 업그레이드 설정 테이블
  const UPGRADE_CONFIG = {
    boosterDistance: {
      name: 'Booster Distance',
      icon: '🚀',
      maxLevel: 5,
      values: [1.00, 1.10, 1.20, 1.30, 1.40, 1.50],
      costs: [80, 120, 180, 260, 360],
      formatValue: (v) => `${(v * 100).toFixed(0)}%`
    },
    magnetDuration: {
      name: 'Magnet Duration',
      icon: '⏱️',
      maxLevel: 6,
      values: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
      costs: [60, 90, 130, 190, 270, 380],
      formatValue: (v) => `+${v.toFixed(1)}s`
    },
    magnetRange: {
      name: 'Magnet Range',
      icon: '🧲',
      maxLevel: 5,
      values: [1.00, 1.15, 1.30, 1.45, 1.60, 1.75],
      costs: [70, 110, 160, 230, 330],
      formatValue: (v) => `${(v * 100).toFixed(0)}%`
    },
    shieldDropChance: {
      name: 'Shield Drop Rate',
      icon: '🛡️',
      maxLevel: 5,
      values: [0.00, 0.02, 0.04, 0.06, 0.08, 0.10],
      costs: [90, 140, 210, 300, 420],
      formatValue: (v) => `+${(v * 100).toFixed(0)}%`
    }
  };

  // 기본 저장 구조
  const defaultItemUpgrades = {
    boosterDistanceLv: 0,
    magnetDurationLv: 0,
    magnetRangeLv: 0,
    shieldDropChanceLv: 0
  };

  /**
   * 저장된 업그레이드 데이터 로드
   */
  function load() {
    try {
      const stored = localStorage.getItem(ITEM_UPGRADES_KEY);
      if (!stored) return Object.assign({}, defaultItemUpgrades);
      const parsed = JSON.parse(stored);
      // Ensure all default keys exist
      return Object.assign({}, defaultItemUpgrades, parsed);
    } catch (e) {
      console.warn('Failed to load item upgrades', e);
      return Object.assign({}, defaultItemUpgrades);
    }
  }

  /**
   * 업그레이드 데이터 저장
   */
  function save(data) {
    try {
      localStorage.setItem(ITEM_UPGRADES_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[ItemUpgrades] Save failed', e);
      return false;
    }
  }

  /**
   * 레벨 기반으로 실제 효과값 계산
   * @param {Object} upgrades - 업그레이드 레벨 객체
   * @returns {Object} 효과값 객체
   */
  function getEffectiveValues(upgrades) {
    return {
      boosterDistanceMult: UPGRADE_CONFIG.boosterDistance.values[upgrades.boosterDistanceLv] ?? 1.0,
      magnetDurationBonusSec: UPGRADE_CONFIG.magnetDuration.values[upgrades.magnetDurationLv] ?? 0,
      magnetRangeMult: UPGRADE_CONFIG.magnetRange.values[upgrades.magnetRangeLv] ?? 1.0,
      shieldDropChanceBonus: UPGRADE_CONFIG.shieldDropChance.values[upgrades.shieldDropChanceLv] ?? 0
    };
  }

  /**
   * 업그레이드 구매
   * @param {string} upgradeKey - 업그레이드 키 (boosterDistance, magnetDuration, magnetRange, shieldDropChance)
   * @param {Object} gameData - 게임 데이터 (coins 포함)
   * @returns {Object} { success, message, newLevel }
   */
  function purchase(upgradeKey, gameData) {
    const config = UPGRADE_CONFIG[upgradeKey];
    if (!config) {
      return { success: false, message: 'Invalid upgrade key' };
    }

    const upgrades = load();
    const levelKey = upgradeKey + 'Lv';
    const currentLevel = upgrades[levelKey];

    if (currentLevel >= config.maxLevel) {
      return { success: false, message: 'Already at max level' };
    }

    const cost = config.costs[currentLevel];
    if (gameData.coins < cost) {
      return { success: false, message: 'Not enough coins' };
    }

    // 구매 처리
    gameData.coins -= cost;
    upgrades[levelKey] = currentLevel + 1;

    if (!save(upgrades)) {
      // 저장 실패 시 롤백
      gameData.coins += cost;
      return { success: false, message: 'Save failed' };
    }

    // GameData 저장
    window.SaveManager?.persist?.(gameData);

    return {
      success: true,
      message: 'Upgrade purchased!',
      newLevel: currentLevel + 1
    };
  }

  /**
   * 특정 업그레이드의 UI 정보 조회
   */
  function getUpgradeInfo(upgradeKey) {
    const config = UPGRADE_CONFIG[upgradeKey];
    if (!config) return null;

    const upgrades = load();
    const levelKey = upgradeKey + 'Lv';
    const currentLevel = upgrades[levelKey];
    const isMaxed = currentLevel >= config.maxLevel;

    return {
      name: config.name,
      icon: config.icon,
      currentLevel,
      maxLevel: config.maxLevel,
      isMaxed,
      currentValue: config.values[currentLevel],
      nextValue: isMaxed ? null : config.values[currentLevel + 1],
      cost: isMaxed ? null : config.costs[currentLevel],
      formatValue: config.formatValue
    };
  }

  /**
   * 모든 업그레이드 정보 조회
   */
  function getAllUpgradeInfo() {
    return {
      boosterDistance: getUpgradeInfo('boosterDistance'),
      magnetDuration: getUpgradeInfo('magnetDuration'),
      magnetRange: getUpgradeInfo('magnetRange'),
      shieldDropChance: getUpgradeInfo('shieldDropChance')
    };
  }

  // Export
  window.ItemUpgrades = {
    UPGRADE_CONFIG,
    load,
    save,
    getEffectiveValues,
    purchase,
    getUpgradeInfo,
    getAllUpgradeInfo
  };
})();
