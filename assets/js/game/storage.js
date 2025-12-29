window.GameModules = window.GameModules || {};

(function() {
  const { defaultSaveData } = window.GameModules.Config;
  const FALLBACK_KEY = 'runStopFinalFix';

  function normalizeSave(data) {
    const merged = { ...defaultSaveData, ...(data || {}) };
    merged.stats = { ...defaultSaveData.stats, ...(data?.stats || {}) };
    if (!Array.isArray(merged.unlockedTreasures)) merged.unlockedTreasures = [];
    if (!Array.isArray(merged.equippedTreasures) || merged.equippedTreasures.length !== 2) {
      merged.equippedTreasures = [null, null];
    }
    // 스킨 ID를 숫자로 정규화해 문자열 세이브를 호환
    merged.unlockedSkins = (merged.unlockedSkins || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));
    merged.equippedSkin = Number(merged.equippedSkin ?? 0);
    if (!merged.unlockedSkins.includes(merged.equippedSkin)) {
      merged.unlockedSkins.unshift(merged.equippedSkin || 0);
    }
    return merged;
  }

  function loadGameData() {
    if (window.SaveManager?.load) {
      try {
        return normalizeSave(window.SaveManager.load());
      } catch (err) {
        console.warn('[Storage] Failed to load via SaveManager, falling back to localStorage', err);
      }
    }

    try {
      const stored = localStorage.getItem(window.SaveManager?.key ?? FALLBACK_KEY);
      if (!stored) return normalizeSave();
      return normalizeSave(JSON.parse(stored));
    } catch (err) {
      console.warn('[Storage] Failed to parse save data, using defaults', err);
      return normalizeSave();
    }
  }

  function persistGameData(data) {
    const normalized = normalizeSave(data);

    if (window.SaveManager?.persist) {
      try {
        window.SaveManager.persist(normalized);
        return;
      } catch (err) {
        console.warn('[Storage] SaveManager.persist failed, attempting localStorage fallback', err);
      }
    }

    try {
      localStorage.setItem(window.SaveManager?.key ?? FALLBACK_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.error('[Storage] Failed to persist save data', err);
    }
  }

  async function resetGameData() {
    if (window.SaveManager?.reset) {
      try {
        await window.SaveManager.reset();
        return;
      } catch (err) {
        console.warn('[Storage] SaveManager.reset failed, attempting localStorage fallback', err);
      }
    }

    try {
      localStorage.removeItem(window.SaveManager?.key ?? FALLBACK_KEY);
      location.reload();
    } catch (err) {
      console.error('[Storage] Failed to reset save data', err);
    }
  }

  window.GameModules.Storage = {
    loadGameData,
    persistGameData,
    resetGameData,
    // Async versions for modern bootstrap flow
    async loadGameDataAsync() {
      if (window.SaveManager?.loadAsync) {
        try {
          return await window.SaveManager.loadAsync();
        } catch (err) {
          console.error('[Storage] loadGameDataAsync failed, falling back to sync.', err);
          return loadGameData();
        }
      }
      return loadGameData();
    },
    async persistGameDataAsync(data) {
      if (window.SaveManager?.persistAsync) {
        try {
          await window.SaveManager.persistAsync(data);
          return;
        } catch (err) {
          console.error('[Storage] persistGameDataAsync failed, falling back to sync.', err);
        }
      }
      persistGameData(data);
    }
  };
})();
