/**
 * StageConfig Module
 *
 * Priority chain for stage-tunable values:
 * 1. QA Override (localStorage) - highest (per-stage tuning only)
 * 2. Stage Tuning (stage.tuning)
 * 3. qaConfig (global QA sliders)
 * 4. STAGE_DEFAULTS (core/config.js)
 *
 * GLOBAL-ONLY values (run/warn/stop cycle, stormBaseSpeed) skip Stage Tuning and come directly from qaConfig/defaults.
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  // === Priority Rules ===
  // GLOBAL_ONLY_KEYS: Always come from qaConfig (or STAGE_DEFAULTS fallback). Stage tuning/overrides are ignored.
  // STAGE_TUNABLE_KEYS: Per-stage knobs. Priority: QA Override → Stage Tuning → qaConfig → STAGE_DEFAULTS.
  const GLOBAL_ONLY_KEYS = new Set([
    'runPhaseDuration',
    'warningTimeBase',
    'warningTimeMin',
    'warningTimeMult',
    'firstWarningTimeBase',
    'stopPhaseDuration',
    'stormBaseSpeed'
  ]);

  const STAGE_TUNABLE_KEYS = new Set([
    'baseSpeed', 'friction', 'stopFriction', 'baseAccel', 'turnAccelMult',
    'dashForce', 'minDashForce', 'maxDashForce', 'maxChargeTime', 'dashCooldown', 'chargeSlowdown',
    'baseMagnet', 'magnetRange',
    'coinRate', 'minCoinRunLength', 'itemRate', 'itemWeights',
    'stormSpeedMult', 'baseSpeedMult',
    'scoreMult',
    'morphTrigger', 'morphDuration'
  ]);

  // qaConfig fields that affect effective config (used for cache invalidation)
  const QA_HASH_KEYS = [
    ...STAGE_TUNABLE_KEYS,
    ...GLOBAL_ONLY_KEYS
  ];

  // ========== Cache System ==========
  let cachedEffective = null;
  let cachedStageId = null;
  let cachedLoopCount = null;
  let cachedQaHash = null;
  let cachedOverrideHash = null;

  function normalizeStageId(stageId) {
    return String(stageId);
  }

  function hashObject(obj) {
    if (!obj) return 'null';
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return String(Date.now());
    }
  }

  /**
   * Get qaConfig subset relevant to effective config
   */
  function getQaHashSource(qaConfig) {
    if (!qaConfig) return null;
    const source = {};
    QA_HASH_KEYS.forEach((key) => {
      source[key] = qaConfig[key];
    });
    return source;
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
   * Normalize itemWeights
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
   * Get value with priority chain:
   * QA Override → Stage Tuning → qaConfig → STAGE_DEFAULTS
   * GLOBAL_ONLY_KEYS ignore Stage Tuning / overrides and always use qaConfig/defaults.
   */
  function getValue(key, stageTuning, qaOverride, qaConfig, defaults) {
    const isGlobalOnly = GLOBAL_ONLY_KEYS.has(key);

    // Stage-specific path
    if (!isGlobalOnly && STAGE_TUNABLE_KEYS.has(key)) {
      if (qaOverride && qaOverride[key] !== undefined && qaOverride[key] !== null) {
        return qaOverride[key];
      }
      if (stageTuning && stageTuning[key] !== undefined && stageTuning[key] !== null) {
        return stageTuning[key];
      }
    }

    // Global (or shared) values come from qaConfig first
    if (qaConfig && qaConfig[key] !== undefined && qaConfig[key] !== null) {
      return qaConfig[key];
    }

    if (defaults && defaults[key] !== undefined) {
      return defaults[key];
    }

    return null;
  }

  /**
   * Check cache validity
   */
  function isCacheValid(stageId, loopCount, qaHash, overrideHash) {
    if (!cachedEffective) return false;
    if (cachedStageId !== stageId) return false;
    if (cachedLoopCount !== loopCount) return false;

    if (cachedQaHash !== qaHash) return false;
    if (cachedOverrideHash !== overrideHash) return false;

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
    const qaHash = hashObject(getQaHashSource(qaConfig));
    const overrideHash = hashObject(qaOverrides);

    if (!forceRecalc && isCacheValid(stageId, loopCount, qaHash, overrideHash)) {
      return cachedEffective;
    }

    // Get stage config and tuning
    const stageConfig = runtime?.stage?.currentConfig;
    const stageTuningDefaults = window.STAGE_TUNING_DEFAULTS ?? {};
    const stageTuning = { ...stageTuningDefaults, ...(stageConfig?.tuning ?? {}) };
    const stageOverride = qaOverrides[stageIdStr] ?? {};

    // Get defaults from core/config.js
    const DEFAULTS = window.GameConfig?.STAGE_DEFAULTS ?? {};
    const GLOBAL = window.GameConfig?.GLOBAL ?? {};

    // Loop difficulty scaling
    const loopScale = runtime?.stage?.loopDifficultyScale ?? 1.0;

    // Helper function
    const get = (key) => getValue(key, stageTuning, stageOverride, qaConfig, DEFAULTS);

    // Build effective config
    const stormBaseSpeed = get('stormBaseSpeed') ?? 150;
    const stormSpeedMult = get('stormSpeedMult') ?? 1.0;
    const baseSpeedMult = get('baseSpeedMult') ?? 1.0;
    const scoreMult = get('scoreMult') ?? 1.0;
    const warningTimeMult = get('warningTimeMult') ?? 1.0;

    const effective = {
      // === 물리 (Per-Stage) ===
      baseSpeed: get('baseSpeed') ?? 960,
      friction: get('friction') ?? 0.93,
      stopFriction: get('stopFriction') ?? 0.81,
      baseAccel: get('baseAccel') ?? 3000,
      turnAccelMult: get('turnAccelMult') ?? 4.5,

      // === 대쉬 (Per-Stage) ===
      dashForce: get('dashForce') ?? 1000,
      minDashForce: get('minDashForce') ?? 600,
      maxDashForce: get('maxDashForce') ?? 4000,
      maxChargeTime: get('maxChargeTime') ?? 1.2,
      dashCooldown: get('dashCooldown') ?? 0.7,
      chargeSlowdown: get('chargeSlowdown') ?? 1.0,

      // === 마그넷 (Per-Stage) ===
      baseMagnet: get('baseMagnet') ?? 50,
      magnetRange: get('magnetRange') ?? 160,

      // === 스폰 (Per-Stage) ===
      coinRate: get('coinRate') ?? 0.3,
      minCoinRunLength: get('minCoinRunLength') ?? 13,
      itemRate: get('itemRate') ?? 0.03,
      itemWeights: normalizeWeights(get('itemWeights')),

      // === 속도 (Per-Stage with multipliers) ===
      stormSpeedMult: stormSpeedMult,
      stormSpeed: stormBaseSpeed * stormSpeedMult * loopScale,
      baseSpeedMult: baseSpeedMult,

      // === 타이밍 (Global-only; qaConfig-driven) ===
      firstWarningTimeBase: get('firstWarningTimeBase') ?? 12.0,
      runPhaseDuration: get('runPhaseDuration') ?? 3.0,
      warningTimeBase: get('warningTimeBase') ?? 7.0,
      warningTimeMin: get('warningTimeMin') ?? 3.0,
      warningTimeMult: warningTimeMult,
      stopPhaseDuration: get('stopPhaseDuration') ?? 0.5,

      // === 점수 (Per-Stage with loop scaling) ===
      scoreMult: scoreMult * loopScale,

      // === 모프 (Per-Stage) ===
      morphTrigger: get('morphTrigger') ?? 3.5,
      morphDuration: get('morphDuration') ?? 0.5,

      // === Meta ===
      _stageId: stageId,
      _stageIdStr: stageIdStr,
      _loopCount: loopCount,
      _loopScale: loopScale
    };

    // Update cache
    cachedEffective = effective;
    cachedStageId = stageId;
    cachedLoopCount = loopCount;
    cachedQaHash = qaHash;
    cachedOverrideHash = overrideHash;

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
   * Get current effective config (convenience)
   */
  function getEffective() {
    const runtime = window.runtime ?? window.Game?.runtime;
    const qaConfig = window.qaConfig;
    return getEffectiveConfig(runtime, qaConfig);
  }

  /**
   * Update stage config when stage changes
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
   * Save QA override for a specific stage
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
   * Get QA override for a single stage
   */
  function getQAOverride(stageId) {
    const stageIdStr = normalizeStageId(stageId);
    const overrides = getQAOverrides();
    return overrides[stageIdStr] || null;
  }

  /**
   * Reset QA overrides for a specific stage
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

  // Export
  window.GameModules.StageConfig = {
    getEffectiveConfig,
    getEffective,
    invalidateCache,
    updateCurrentConfig,
    setQAOverride,
    getQAOverride,
    resetStageOverrides,
    resetAllOverrides,
    clearQAOverride: resetStageOverrides,
    clearAllQAOverrides: resetAllOverrides,
    getQAOverrides,
    normalizeWeights,
    normalizeStageId
  };
})();
