/**
 * StageConfig Module
 *
 * Provides stage-specific configuration with QA override support.
 * Priority: QA Override -> StageConfig -> qaConfig -> default
 *
 * [FIX 1] All fields use unified get() chain for proper override support
 * [FIX 2] Hash-based cache validation for qaConfig and localStorage changes
 * [FIX 3] Normalized stageId (always String) for consistent key access
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  // ========== Cache System ==========
  let cachedEffective = null;
  let cachedStageId = null;
  let cachedLoopCount = null;
  let cachedQaHash = null;
  let cachedOverrideHash = null;

  /**
   * [FIX 3] Normalize stageId to string for consistent key access
   */
  function normalizeStageId(stageId) {
    return String(stageId);
  }

  /**
   * Generate simple hash for cache validation
   */
  function hashObject(obj) {
    if (!obj) return 'null';
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return String(Date.now());
    }
  }

  /**
   * Get relevant qaConfig fields for cache hash
   */
  function getQaHashSource(qaConfig) {
    if (!qaConfig) return null;
    return {
      coinRate: qaConfig.coinRate,
      itemRate: qaConfig.itemRate,
      minCoinRunLength: qaConfig.minCoinRunLength,
      stormBaseSpeed: qaConfig.stormBaseSpeed,
      itemWeights: qaConfig.itemWeights,
      runPhaseDuration: qaConfig.runPhaseDuration,
      warningTimeBase: qaConfig.warningTimeBase,
      warningTimeMin: qaConfig.warningTimeMin,
      stopPhaseDuration: qaConfig.stopPhaseDuration
    };
  }

  /**
   * Get QA overrides from localStorage
   */
  function getQAOverrides() {
    try {
      const saved = localStorage.getItem('stageConfigOverrides');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('[StageConfig] Failed to load QA overrides:', e);
      return {};
    }
  }

  /**
   * [FIX 3] Normalize and sanitize itemWeights
   */
  function normalizeWeights(weights) {
    const DEFAULT = { barrier: 0.2, booster: 0.4, magnet: 0.4 };

    if (!weights || typeof weights !== 'object') {
      return { ...DEFAULT };
    }

    let barrier = Math.max(0, Number(weights.barrier) || 0);
    let booster = Math.max(0, Number(weights.booster) || 0);
    let magnet = Math.max(0, Number(weights.magnet) || 0);

    const total = barrier + booster + magnet;

    if (total === 0) {
      return { ...DEFAULT };
    }

    return {
      barrier: barrier / total,
      booster: booster / total,
      magnet: magnet / total
    };
  }

  /**
   * [FIX 1] Unified get() function with proper fallback chain
   * Priority: QA Override -> StageConfig -> qaConfig -> default
   */
  function getValue(key, stageConfig, qaConfig, qaOverrides, stageIdStr, defaultVal) {
    // 1. Check QA overrides for this stage (highest priority)
    const stageOverride = qaOverrides[stageIdStr];
    if (stageOverride && stageOverride[key] !== undefined && stageOverride[key] !== null) {
      return stageOverride[key];
    }

    // 2. Check stage config (null means "use default", so skip null)
    if (stageConfig && stageConfig[key] !== undefined && stageConfig[key] !== null) {
      return stageConfig[key];
    }

    // 3. Check global qaConfig
    if (qaConfig && qaConfig[key] !== undefined && qaConfig[key] !== null) {
      return qaConfig[key];
    }

    // 4. Return default
    return defaultVal;
  }

  /**
   * [FIX 2] Check if cache is still valid
   */
  function isCacheValid(stageId, loopCount, qaConfig, qaOverrides) {
    if (!cachedEffective) return false;
    if (cachedStageId !== stageId) return false;
    if (cachedLoopCount !== loopCount) return false;

    const currentQaHash = hashObject(getQaHashSource(qaConfig));
    if (cachedQaHash !== currentQaHash) return false;

    const currentOverrideHash = hashObject(qaOverrides);
    if (cachedOverrideHash !== currentOverrideHash) return false;

    return true;
  }

  /**
   * Calculate effective config for current stage
   */
  function getEffectiveConfig(runtime, qaConfig, forceRecalc = false) {
    const stageId = runtime?.stage?.currentStageId ?? 1;
    const stageIdStr = normalizeStageId(stageId);
    const loopCount = runtime?.stage?.loopCount ?? 0;
    const qaOverrides = getQAOverrides();

    // [FIX 2] Enhanced cache check
    if (!forceRecalc && isCacheValid(stageId, loopCount, qaConfig, qaOverrides)) {
      return cachedEffective;
    }

    const stageConfig = runtime?.stage?.currentConfig;
    const loopScale = runtime?.stage?.loopDifficultyScale ?? 1.0;

    // [FIX 1] Unified get() helper
    const get = (key, def) => getValue(key, stageConfig, qaConfig, qaOverrides, stageIdStr, def);

    // [FIX 1] ALL fields now use get() for proper override support
    const stormSpeedMult = get('stormSpeedMult', 1.0);
    const baseSpeedMult = get('baseSpeedMult', 1.0);
    const scoreMult = get('scoreMult', 1.0);
    const warningTimeMult = get('warningTimeMult', 1.0);

    const effective = {
      // Spawn rates
      coinRate: get('coinRate', 0.3),
      minCoinRunLength: get('minCoinRunLength', 5),
      itemRate: get('itemRate', 0.03),
      itemWeights: normalizeWeights(get('itemWeights', null)),

      // Speed (with multipliers)
      stormSpeedMult: stormSpeedMult,
      stormSpeed: (qaConfig?.stormBaseSpeed ?? 150) * stormSpeedMult * loopScale,
      baseSpeedMult: baseSpeedMult,

      // Score
      scoreMult: scoreMult * loopScale,

      // Cycle timing
      runPhaseDuration: get('runPhaseDuration', 3.0),
      warningTimeBase: get('warningTimeBase', 7.0),
      warningTimeMin: get('warningTimeMin', 3.0),
      warningTimeMult: warningTimeMult,
      stopPhaseDuration: get('stopPhaseDuration', 1.5),

      // Meta info
      _stageId: stageId,
      _stageIdStr: stageIdStr,
      _loopCount: loopCount,
      _loopScale: loopScale
    };

    // [FIX 2] Update cache with hashes
    cachedEffective = effective;
    cachedStageId = stageId;
    cachedLoopCount = loopCount;
    cachedQaHash = hashObject(getQaHashSource(qaConfig));
    cachedOverrideHash = hashObject(qaOverrides);

    return effective;
  }

  /**
   * Invalidate cache
   */
  function invalidateCache() {
    cachedEffective = null;
    cachedStageId = null;
    cachedLoopCount = null;
    cachedQaHash = null;
    cachedOverrideHash = null;
  }

  /**
   * Get current effective config (convenience method)
   */
  function getEffective() {
    const runtime = window.runtime ?? window.Game?.runtime;
    const qaConfig = window.qaConfig;
    return getEffectiveConfig(runtime, qaConfig);
  }

  /**
   * Update stage config in runtime when stage changes
   */
  function updateCurrentConfig(runtime, stageId) {
    const stageIdNum = parseInt(stageId, 10);
    const stageConfig = window.STAGE_CONFIG?.find(s => s.id === stageIdNum);
    if (runtime?.stage) {
      runtime.stage.currentConfig = stageConfig || null;
    }
    invalidateCache();
  }

  /**
   * [FIX 3] Save QA override for a specific stage
   */
  function setQAOverride(stageId, key, value) {
    try {
      const stageIdStr = normalizeStageId(stageId);
      const overrides = getQAOverrides();

      if (!overrides[stageIdStr]) overrides[stageIdStr] = {};

      if (value === null || value === undefined) {
        delete overrides[stageIdStr][key];
        if (Object.keys(overrides[stageIdStr]).length === 0) {
          delete overrides[stageIdStr];
        }
      } else {
        overrides[stageIdStr][key] = value;
      }

      localStorage.setItem('stageConfigOverrides', JSON.stringify(overrides));
      invalidateCache();
    } catch (e) {
      console.error('[StageConfig] Failed to save QA override:', e);
    }
  }

  /**
   * [FIX 3] Reset QA overrides for a specific stage
   */
  function resetStageOverrides(stageId) {
    try {
      const stageIdStr = normalizeStageId(stageId);
      const overrides = getQAOverrides();
      delete overrides[stageIdStr];
      localStorage.setItem('stageConfigOverrides', JSON.stringify(overrides));
      invalidateCache();
    } catch (e) {
      console.error('[StageConfig] Failed to reset stage overrides:', e);
    }
  }

  /**
   * Reset all QA overrides
   */
  function resetAllOverrides() {
    try {
      localStorage.removeItem('stageConfigOverrides');
      invalidateCache();
    } catch (e) {
      console.error('[StageConfig] Failed to reset all overrides:', e);
    }
  }

  /**
   * Get QA override for a single stage
   */
  function getQAOverride(stageId) {
    const stageIdStr = normalizeStageId(stageId);
    const overrides = getQAOverrides();
    return overrides[stageIdStr] || null;
  }

  // Aliases for UI consistency
  const clearQAOverride = resetStageOverrides;
  const clearAllQAOverrides = resetAllOverrides;

  // Export module
  window.GameModules.StageConfig = {
    getEffectiveConfig,
    getEffective,
    invalidateCache,
    updateCurrentConfig,
    setQAOverride,
    getQAOverride,
    resetStageOverrides,
    resetAllOverrides,
    clearQAOverride,       // alias
    clearAllQAOverrides,   // alias
    getQAOverrides,
    normalizeWeights,
    normalizeStageId
  };
})();
