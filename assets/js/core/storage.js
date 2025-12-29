(function() {
  const SAVE_KEY = 'runStopFinalFix';
  const defaultSave = {
    coins: 0,
    gems: 1000,
    // lvlSpeed, lvlCool, lvlMagnet, lvlGreed 제거됨 (캐릭터 업그레이드 폐지)
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
    // 스킨 타입 보정 (문자열로 저장된 기존 세이브 호환)
    merged.unlockedSkins = (merged.unlockedSkins || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));
    merged.equippedSkin = Number(merged.equippedSkin ?? 0);
    if (!merged.unlockedSkins.includes(merged.equippedSkin)) {
      merged.unlockedSkins.unshift(merged.equippedSkin || 0);
    }
    return merged;
  }

  function load() {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (!stored) return normalizeSave();
      const parsed = JSON.parse(stored);
      return normalizeSave(parsed);
    } catch (err) {
      console.warn('[SaveManager] Failed to load save data, falling back to defaults', err);
      return normalizeSave();
    }
  }

  function persist(data = window.GameData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(data)));
    } catch (err) {
      console.error('[SaveManager] Failed to persist save data', err);
    }
  }

  function reset() {
    if (!confirm('Reset data?')) return;
    try {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    } catch (err) {
      console.error('[SaveManager] Failed to reset save data', err);
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
