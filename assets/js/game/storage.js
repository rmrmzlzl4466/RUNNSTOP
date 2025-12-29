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

  function resetGameData() {
    if (window.SaveManager?.reset) {
      try {
        window.SaveManager.reset();
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

  window.GameModules.Storage = { loadGameData, persistGameData, resetGameData };
})();
