(function() {
  const SAVE_KEY = 'runStopFinalFix';
  const defaultSave = {
    coins: 0,
    gems: 1000,
    unlockedSkins: [0],
    equippedSkin: 0,
    unlockedTreasures: [],
    equippedTreasures: [null, null],
    stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 },
    isTutorialCompleted: false
  };

  function normalizeSave(data) {
    const merged = { ...defaultSave, ...(data || {}) };
    merged.stats = { ...defaultSave.stats, ...(data?.stats || {}) };
    if (!Array.isArray(merged.unlockedTreasures)) merged.unlockedTreasures = [];
    if (!Array.isArray(merged.equippedTreasures) || merged.equippedTreasures.length !== 2) {
      merged.equippedTreasures = [null, null];
    }
    if (typeof merged.isTutorialCompleted !== 'boolean') {
        merged.isTutorialCompleted = false;
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
    reset,
    isTutorialCompleted: () => window.GameData.isTutorialCompleted,
    completeTutorial: () => {
        if (window.GameData) {
            window.GameData.isTutorialCompleted = true;
            persist(window.GameData);
        }
    }
  };
})();
