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
    stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 },
    // 튜토리얼 필드 추가
    tutorialCompleted: false,    // 튜토리얼 완료 여부
    tutorialProgress: 0,         // 마지막 완료 단계 (재진입용)
  };

  // Internal state to prevent saving before loading is complete.
  let isLoaded = false;

  function normalizeSave(data) {
    const merged = Object.assign({}, defaultSave, (data || {}));
    merged.stats = Object.assign({}, defaultSave.stats, (data?.stats || {}));
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

  // Legacy synchronous load from localStorage
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

  // Legacy synchronous persist to localStorage
  function persist(data = window.GameData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(data)));
    } catch (err) {
      console.error('[SaveManager] Failed to persist save data', err);
    }
  }
  
  // [STEP 3] Asynchronous loading with Playables support
  async function loadAsync() {
    let saveData = defaultSave;
    try {
      if (window.ytgame?.IN_PLAYABLES_ENV) {
        console.log('[SaveManager] Loading from YT Playables...');
        const dataStr = await window.ytgame.game.loadData();
        saveData = normalizeSave(dataStr ? JSON.parse(dataStr) : {});
      } else {
        console.log('[SaveManager] Loading from localStorage...');
        saveData = load();
      }
    } catch (err) {
      console.error('[SaveManager] loadAsync failed. Falling back to default.', err);
      saveData = normalizeSave();
    } finally {
      isLoaded = true;
    }
    return saveData;
  }

  // [STEP 3] Asynchronous persisting with Playables support
  async function persistAsync(data = window.GameData) {
    if (!isLoaded) {
      console.warn('[SaveManager] Attempted to save before data was loaded. Aborting.');
      return;
    }
    // [STEP 9] Add verification log
    console.log('[SaveManager] Persisting data...', { isPlayables: window.ytgame?.IN_PLAYABLES_ENV ?? false });
    try {
      const normalizedData = normalizeSave(data);
      if (window.ytgame?.IN_PLAYABLES_ENV) {
        await window.ytgame.game.saveData(JSON.stringify(normalizedData));
      } else {
        persist(normalizedData);
      }
    } catch (err) {
      console.error('[SaveManager] persistAsync failed.', err);
    }
  }


  async function reset() {
    if (!confirm('Reset data?')) return;
    try {
      localStorage.removeItem(SAVE_KEY);
      // YT Env doesn't have a reset, so we just overwrite with default
      if (window.ytgame?.IN_PLAYABLES_ENV) {
         await persistAsync(defaultSave);
      }
      location.reload();
    } catch (err) {
      console.error('[SaveManager] Failed to reset save data', err);
    }
  }

  window.SaveManager = {
    key: SAVE_KEY,
    defaultSave,
    // New async methods
    loadAsync,
    persistAsync,
    // Legacy sync methods
    load,
    persist,
    reset
  };
})();
