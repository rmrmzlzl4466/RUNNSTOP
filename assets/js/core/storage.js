(function() {
  const SAVE_KEY = 'runStopFinalFix';
  const defaultSave = {
    coins: 0,
    gems: 1000,
    lvlSpeed: 1,
    lvlCool: 1,
    lvlMagnet: 1,
    lvlGreed: 1,
    unlockedSkins: [0],
    equippedSkin: 0,
    unlockedTreasures: [],      // 보유한 보물 ID 리스트
    equippedTreasures: [null, null], // 장착 슬롯 (최대 2개)
    stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 }
  };

  function normalizeSave(data) {
    const merged = { ...defaultSave, ...(data || {}) };
    merged.stats = { ...defaultSave.stats, ...(data?.stats || {}) };
    // 보물 필드 보정 (기존 세이브에 없을 경우 기본값)
    if (!Array.isArray(merged.unlockedTreasures)) merged.unlockedTreasures = [];
    if (!Array.isArray(merged.equippedTreasures) || merged.equippedTreasures.length !== 2) {
      merged.equippedTreasures = [null, null];
    }
    return merged;
  }

  function load() {
    const stored = localStorage.getItem(SAVE_KEY);
    if (!stored) return normalizeSave();
    try {
      const parsed = JSON.parse(stored);
      return normalizeSave(parsed);
    } catch (_) {
      return normalizeSave();
    }
  }

  function persist(data = window.GameData) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(data)));
  }

  function reset() {
    if (confirm('Reset data?')) {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    }
  }

  window.SaveManager = {
    key: SAVE_KEY,
    defaultSave,
    load,
    persist,
    reset
  };
})();