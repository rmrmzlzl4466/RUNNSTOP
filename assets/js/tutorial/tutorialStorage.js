(function () {
  const TUTORIAL_COMPLETED = 'tutorialCompleted';
  const TUTORIAL_PROGRESS = 'tutorialProgress';
  const TUTORIAL_IN_PROGRESS = 'tutorialInProgress';
  const TUTORIAL_VERSION = 'tutorialVersion';
  const CURRENT_TUTORIAL_VERSION = 'v1';

  const memoryStore = new Map();
  let useMemoryStore = false;

  function setMemoryItem(key, value) {
    memoryStore.set(key, value);
  }

  function getMemoryItem(key) {
    const value = memoryStore.get(key);
    return typeof value === 'string' ? value : null;
  }

  function removeMemoryItem(key) {
    memoryStore.delete(key);
  }

  function getItem(key) {
    if (!useMemoryStore && typeof localStorage !== 'undefined') {
      try {
        const value = localStorage.getItem(key);
        if (typeof value === 'string') {
          setMemoryItem(key, value);
        } else if (value === null && memoryStore.has(key)) {
          return getMemoryItem(key);
        }
        return value;
      } catch (err) {
        console.warn('[TutorialStorage] Falling back to memory store for getItem', err);
        useMemoryStore = true;
      }
    }
    return getMemoryItem(key);
  }

  function setItem(key, value) {
    if (!useMemoryStore && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        setMemoryItem(key, value);
        return;
      } catch (err) {
        console.warn('[TutorialStorage] Falling back to memory store for setItem', err);
        useMemoryStore = true;
      }
    }
    setMemoryItem(key, value);
  }

  function removeItem(key) {
    if (!useMemoryStore && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
        removeMemoryItem(key);
        return;
      } catch (err) {
        console.warn('[TutorialStorage] Falling back to memory store for removeItem', err);
        useMemoryStore = true;
      }
    }
    removeMemoryItem(key);
  }

  function clampProgress(value) {
    const num = Number.parseInt(value, 10);
    if (!Number.isFinite(num)) return 1;
    return Math.min(4, Math.max(1, num));
  }

  function persistNormalizedProgress(value) {
    setItem(TUTORIAL_PROGRESS, String(value));
    return value;
  }

  function persistNormalizedInProgress(value) {
    setItem(TUTORIAL_IN_PROGRESS, value ? 'true' : 'false');
    return value;
  }

  function persistNormalizedCompleted(value) {
    setItem(TUTORIAL_COMPLETED, value ? 'true' : 'false');
    return value;
  }

  function resetTutorialState() {
    removeItem(TUTORIAL_COMPLETED);
    removeItem(TUTORIAL_PROGRESS);
    removeItem(TUTORIAL_IN_PROGRESS);
    setItem(TUTORIAL_VERSION, CURRENT_TUTORIAL_VERSION);
    persistNormalizedProgress(1);
    persistNormalizedInProgress(false);
    persistNormalizedCompleted(false);
  }

  function ensureTutorialVersion() {
    const storedVersion = getItem(TUTORIAL_VERSION);
    if (storedVersion !== CURRENT_TUTORIAL_VERSION) {
      resetTutorialState();
    }
  }

  function isTutorialCompleted() {
    ensureTutorialVersion();
    const stored = getItem(TUTORIAL_COMPLETED);
    return stored === 'true';
  }

  function markTutorialCompleted() {
    ensureTutorialVersion();
    persistNormalizedCompleted(true);
    persistNormalizedInProgress(false);
  }

  function setTutorialProgress(step) {
    ensureTutorialVersion();
    const clamped = clampProgress(step);
    persistNormalizedProgress(clamped);
  }

  function getTutorialProgress() {
    ensureTutorialVersion();
    const stored = getItem(TUTORIAL_PROGRESS);
    const clamped = clampProgress(stored ?? 1);
    if (String(clamped) !== stored) {
      persistNormalizedProgress(clamped);
    }
    return clamped;
  }

  function setTutorialInProgress(flag) {
    ensureTutorialVersion();
    persistNormalizedInProgress(Boolean(flag));
  }

  function getTutorialInProgress() {
    ensureTutorialVersion();
    const stored = getItem(TUTORIAL_IN_PROGRESS);
    const normalized = stored === 'true';
    if (stored !== undefined && stored !== null && String(normalized) !== stored) {
      persistNormalizedInProgress(normalized);
    }
    return normalized;
  }

  window.TutorialStorage = {
    TUTORIAL_COMPLETED,
    TUTORIAL_PROGRESS,
    TUTORIAL_IN_PROGRESS,
    TUTORIAL_VERSION,
    CURRENT_TUTORIAL_VERSION,
    ensureTutorialVersion,
    isTutorialCompleted,
    markTutorialCompleted,
    setTutorialProgress,
    getTutorialProgress,
    setTutorialInProgress,
    getTutorialInProgress,
    resetTutorialState
  };
})();
