/**
 * StageConfig Module
 *
 * ====================================
 * FIELD CLASSIFICATION (POLICY-B)
 * ====================================
 *
 * GLOBAL_ONLY_KEYS: QA 탭에서만 조절, Stage는 절대 덮어쓰지 못함
 * - 게임 룰/조작감 관련 필드
 * - Priority: qaConfig → STAGE_DEFAULTS
 *
 * STAGE_ONLY_KEYS: Stage Tuning에서만 조절, Global QA는 관여하지 않음
 * - 레벨 디자인 관련 필드
 * - Priority: stageOverride → stageTuning → STAGE_DEFAULTS
 *
 * ====================================
 * SOURCE TRACKING (REQ-A3)
 * ====================================
 *
 * Each value tracks its source:
 * - 'override': QA Override (localStorage stageOverrides)
 * - 'stage': Stage Tuning (stage.tuning from stages.js)
 * - 'qa': qaConfig (global QA sliders)
 * - 'fallback': STAGE_DEFAULTS (core/config.js)
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  // ====================================
  // FIELD CLASSIFICATION (POLICY-B)
  // ====================================

  /**
   * GLOBAL_ONLY_KEYS: QA 탭에서만 조절
   * Stage tuning/overrides는 무시됨
   * 게임 룰/조작감 - 스테이지별로 바꾸면 QA 신뢰성이 깨짐
   */
  const GLOBAL_ONLY_KEYS = new Set([
    // 타이밍
    'runPhaseDuration',
    'stopPhaseDuration',
    'firstWarningTimeBase',
    'warningTimeBase',
    'warningTimeMin',
    'warningTimeMult',
    // 물리/조작감
    'friction',
    'stopFriction',
    'baseAccel',
    'turnAccelMult',
    // 대쉬 시스템
    'minDashForce',
    'maxDashForce',
    'maxChargeTime',
    'dashCooldown',
    'chargeSlowdown',
    // 기타 글로벌
    'baseMagnet',
    'magnetRange',
    'morphTrigger',
    'morphDuration'
  ]);

  /**
   * STAGE_ONLY_KEYS: Stage Tuning에서만 조절
   * qaConfig는 개입하지 않음 (혼동 방지)
   * 레벨 디자인 핵심 파라미터
   */
  const STAGE_ONLY_KEYS = new Set([
    // 경제
    'coinRate',
    'minCoinRunLength',
    'itemRate',
    'itemWeights',
    // 속도 곡선
    'stormSpeedMult',
    'baseSpeedMult',
    // 점수 곡선
    'scoreMult',
    // 테마/기믹 (C 섹션)
    'theme',
    'gimmick'
  ]);

  // stormBaseSpeed는 GLOBAL_ONLY이지만 별도 처리
  const STORM_BASE_SPEED_KEY = 'stormBaseSpeed';

  // ====================================
  // SOURCE TRACKING
  // ====================================

  // 마지막 계산된 effective config의 source 정보
  let lastEffectiveDebugSources = {};

  // ====================================
  // CACHE SYSTEM
  // ====================================

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

  // ====================================
  // STORAGE HELPERS
  // ====================================

  /**
   * Get stage overrides from localStorage (Stage-only values per stage)
   */
  function getStageOverrides() {
    try {
      const saved = localStorage.getItem('stageOverrides');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('[StageConfig] Failed to load stage overrides:', e);
      return {};
    }
  }

  /**
   * Legacy: migrate old stageConfigOverrides to new structure
   */
  function migrateOldOverrides() {
    try {
      const old = localStorage.getItem('stageConfigOverrides');
      if (!old) return;

      const oldData = JSON.parse(old);
      const newStageOverrides = getStageOverrides();
      let migrated = false;

      // Move Stage-only keys to stageOverrides, discard Global-only keys
      Object.keys(oldData).forEach(stageId => {
        const stageData = oldData[stageId];
        if (!stageData || typeof stageData !== 'object') return;

        Object.keys(stageData).forEach(key => {
          if (STAGE_ONLY_KEYS.has(key)) {
            if (!newStageOverrides[stageId]) newStageOverrides[stageId] = {};
            newStageOverrides[stageId][key] = stageData[key];
            migrated = true;
          }
          // Global-only keys are discarded (will use qaConfig)
        });
      });

      if (migrated) {
        localStorage.setItem('stageOverrides', JSON.stringify(newStageOverrides));
        console.log('[StageConfig] Migrated old overrides to new structure');
      }

      // Remove old key
      localStorage.removeItem('stageConfigOverrides');
    } catch (e) {
      console.warn('[StageConfig] Migration failed:', e);
    }
  }

  // Run migration on load
  migrateOldOverrides();

  // ====================================
  // NORMALIZE HELPERS
  // ====================================

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

  // ====================================
  // VALUE GETTERS WITH SOURCE
  // ====================================

  /**
   * Get GLOBAL-ONLY value (qaConfig → defaults)
   * Stage tuning is IGNORED
   */
  function getGlobalValue(key, qaConfig, defaults) {
    if (qaConfig && qaConfig[key] !== undefined && qaConfig[key] !== null) {
      return { value: qaConfig[key], source: 'qa' };
    }
    if (defaults && defaults[key] !== undefined) {
      return { value: defaults[key], source: 'fallback' };
    }
    return { value: null, source: 'fallback' };
  }

  /**
   * Get STAGE-ONLY value (stageOverride → stageTuning → defaults)
   * qaConfig is NOT consulted (to avoid confusion)
   */
  function getStageValue(key, stageTuning, stageOverride, defaults) {
    if (stageOverride && stageOverride[key] !== undefined && stageOverride[key] !== null) {
      return { value: stageOverride[key], source: 'override' };
    }
    if (stageTuning && stageTuning[key] !== undefined && stageTuning[key] !== null) {
      return { value: stageTuning[key], source: 'stage' };
    }
    if (defaults && defaults[key] !== undefined) {
      return { value: defaults[key], source: 'fallback' };
    }
    return { value: null, source: 'fallback' };
  }

  // ====================================
  // CACHE VALIDATION
  // ====================================

  function getQaHashSource(qaConfig) {
    if (!qaConfig) return null;
    const source = {};
    GLOBAL_ONLY_KEYS.forEach((key) => {
      source[key] = qaConfig[key];
    });
    source[STORM_BASE_SPEED_KEY] = qaConfig[STORM_BASE_SPEED_KEY];
    return source;
  }

  function isCacheValid(stageId, loopCount, qaHash, overrideHash) {
    if (!cachedEffective) return false;
    if (cachedStageId !== stageId) return false;
    if (cachedLoopCount !== loopCount) return false;
    if (cachedQaHash !== qaHash) return false;
    if (cachedOverrideHash !== overrideHash) return false;
    return true;
  }

  // ====================================
  // MAIN: getEffectiveConfig
  // ====================================

  function getEffectiveConfig(runtime, qaConfig, forceRecalc = false) {
    const stageId = runtime?.stage?.currentStageId ?? 1;
    const stageIdStr = normalizeStageId(stageId);
    const loopCount = runtime?.stage?.loopCount ?? 0;
    const stageOverrides = getStageOverrides();
    const qaHash = hashObject(getQaHashSource(qaConfig));
    const overrideHash = hashObject(stageOverrides);

    if (!forceRecalc && isCacheValid(stageId, loopCount, qaHash, overrideHash)) {
      return cachedEffective;
    }

    // Get stage config and tuning
    const stageConfig = runtime?.stage?.currentConfig;
    const stageTuningDefaults = window.STAGE_TUNING_DEFAULTS ?? {};
    const stageTuning = { ...stageTuningDefaults, ...(stageConfig?.tuning ?? {}) };
    const stageOverride = stageOverrides[stageIdStr] ?? {};

    // Get defaults from core/config.js
    const DEFAULTS = window.GameConfig?.STAGE_DEFAULTS ?? {};

    // Loop difficulty scaling
    const loopScale = runtime?.stage?.loopDifficultyScale ?? 1.0;

    // Source tracking
    const sources = {};

    // Helper functions
    const getGlobal = (key) => {
      const result = getGlobalValue(key, qaConfig, DEFAULTS);
      sources[key] = result.source;
      return result.value;
    };

    const getStage = (key, defaultValue = null) => {
      const result = getStageValue(key, stageTuning, stageOverride, DEFAULTS);
      sources[key] = result.source;
      return result.value ?? defaultValue;
    };

    // === Build effective config ===

    // GLOBAL-ONLY values (from qaConfig only)
    const friction = getGlobal('friction') ?? 0.93;
    const stopFriction = getGlobal('stopFriction') ?? 0.81;
    const baseAccel = getGlobal('baseAccel') ?? 3000;
    const turnAccelMult = getGlobal('turnAccelMult') ?? 4.5;
    const minDashForce = getGlobal('minDashForce') ?? 600;
    const maxDashForce = getGlobal('maxDashForce') ?? 4000;
    const maxChargeTime = getGlobal('maxChargeTime') ?? 1.2;
    const dashCooldown = getGlobal('dashCooldown') ?? 0.7;
    const chargeSlowdown = getGlobal('chargeSlowdown') ?? 1.0;
    const baseMagnet = getGlobal('baseMagnet') ?? 50;
    const magnetRange = getGlobal('magnetRange') ?? 160;
    const morphTrigger = getGlobal('morphTrigger') ?? 3.5;
    const morphDuration = getGlobal('morphDuration') ?? 0.5;

    // Timing (GLOBAL-ONLY)
    const runPhaseDuration = getGlobal('runPhaseDuration') ?? 3.0;
    const stopPhaseDuration = getGlobal('stopPhaseDuration') ?? 0.5;
    const firstWarningTimeBase = getGlobal('firstWarningTimeBase') ?? 12.0;
    const warningTimeBase = getGlobal('warningTimeBase') ?? 7.0;
    const warningTimeMin = getGlobal('warningTimeMin') ?? 3.0;
    const warningTimeMult = getGlobal('warningTimeMult') ?? 1.0;

    // stormBaseSpeed is GLOBAL-ONLY
    const stormBaseSpeedResult = getGlobalValue(STORM_BASE_SPEED_KEY, qaConfig, DEFAULTS);
    sources[STORM_BASE_SPEED_KEY] = stormBaseSpeedResult.source;
    const stormBaseSpeed = stormBaseSpeedResult.value ?? 150;

    // STAGE-ONLY values (from stage tuning only)
    const coinRate = getStage('coinRate', 0.3);
    const minCoinRunLength = getStage('minCoinRunLength', 13);
    const itemRate = getStage('itemRate', 0.03);
    const itemWeightsRaw = getStage('itemWeights', null);
    const itemWeights = normalizeWeights(itemWeightsRaw);
    const stormSpeedMult = getStage('stormSpeedMult', 1.0);
    const baseSpeedMult = getStage('baseSpeedMult', 1.0);
    const scoreMult = getStage('scoreMult', 1.0);

    // Theme/Gimmick (STAGE-ONLY, C section)
    const theme = getStage('theme', null) ?? stageConfig?.theme ?? null;
    const gimmick = getStage('gimmick', null) ?? stageConfig?.gimmick ?? null;
    sources['theme'] = theme ? (stageOverride?.theme ? 'override' : 'stage') : 'fallback';
    sources['gimmick'] = gimmick ? (stageOverride?.gimmick ? 'override' : 'stage') : 'fallback';

    // baseSpeed for reference (stage tuning can affect it)
    const baseSpeedResult = getStageValue('baseSpeed', stageTuning, stageOverride, DEFAULTS);
    sources['baseSpeed'] = baseSpeedResult.source;
    const baseSpeed = baseSpeedResult.value ?? 960;

    const effective = {
      // === 물리 (GLOBAL-ONLY) ===
      friction,
      stopFriction,
      baseAccel,
      turnAccelMult,

      // === 대쉬 (GLOBAL-ONLY) ===
      minDashForce,
      maxDashForce,
      maxChargeTime,
      dashCooldown,
      chargeSlowdown,

      // === 마그넷 (GLOBAL-ONLY) ===
      baseMagnet,
      magnetRange,

      // === 모프 (GLOBAL-ONLY) ===
      morphTrigger,
      morphDuration,

      // === 타이밍 (GLOBAL-ONLY) ===
      runPhaseDuration,
      stopPhaseDuration,
      firstWarningTimeBase,
      warningTimeBase,
      warningTimeMin,
      warningTimeMult,

      // === 스폰 (STAGE-ONLY) ===
      coinRate,
      minCoinRunLength,
      itemRate,
      itemWeights,

      // === 속도 곡선 (STAGE-ONLY with multipliers) ===
      stormSpeedMult,
      stormSpeed: stormBaseSpeed * stormSpeedMult * loopScale,
      baseSpeedMult,
      baseSpeed,

      // === 점수 (STAGE-ONLY with loop scaling) ===
      scoreMult: scoreMult * loopScale,

      // === 테마/기믹 (STAGE-ONLY, C section) ===
      theme,
      gimmick,

      // === Meta ===
      _stageId: stageId,
      _stageIdStr: stageIdStr,
      _stageName: stageConfig?.name ?? `Stage ${stageId}`,
      _isLoop: stageConfig?.isLoop ?? false,
      _loopCount: loopCount,
      _loopScale: loopScale
    };

    // Update cache
    cachedEffective = effective;
    cachedStageId = stageId;
    cachedLoopCount = loopCount;
    cachedQaHash = qaHash;
    cachedOverrideHash = overrideHash;

    // Store sources for debug overlay
    lastEffectiveDebugSources = { ...sources };

    return effective;
  }

  // ====================================
  // CACHE INVALIDATION
  // ====================================

  function invalidateCache() {
    cachedEffective = null;
    cachedStageId = null;
    cachedLoopCount = null;
    cachedQaHash = null;
    cachedOverrideHash = null;
  }

  // ====================================
  // CONVENIENCE GETTERS
  // ====================================

  function getEffective() {
    const runtime = window.runtime ?? window.Game?.runtime;
    const qaConfig = window.qaConfig;
    return getEffectiveConfig(runtime, qaConfig);
  }

  function getEffectiveSources() {
    return { ...lastEffectiveDebugSources };
  }

  // ====================================
  // STAGE CONFIG MANAGEMENT
  // ====================================

  function updateCurrentConfig(runtime, stageId) {
    const stageIdNum = parseInt(stageId, 10);
    const stageConfig = window.STAGE_CONFIG?.find(s => s.id === stageIdNum);
    if (runtime?.stage) {
      runtime.stage.currentConfig = stageConfig || null;
    }
    invalidateCache();
  }

  // ====================================
  // OVERRIDE MANAGEMENT (Stage-only)
  // ====================================

  function setStageOverride(stageId, key, value) {
    // Only allow Stage-only keys
    if (!STAGE_ONLY_KEYS.has(key) && key !== 'baseSpeed') {
      console.warn(`[StageConfig] Cannot set stage override for Global-only key: ${key}`);
      return false;
    }

    try {
      const stageIdStr = normalizeStageId(stageId);
      const overrides = getStageOverrides();

      if (!overrides[stageIdStr]) overrides[stageIdStr] = {};

      if (value === null || value === undefined) {
        delete overrides[stageIdStr][key];
        if (Object.keys(overrides[stageIdStr]).length === 0) {
          delete overrides[stageIdStr];
        }
      } else {
        overrides[stageIdStr][key] = value;
      }

      localStorage.setItem('stageOverrides', JSON.stringify(overrides));
      invalidateCache();
      return true;
    } catch (e) {
      console.error('[StageConfig] Failed to save stage override:', e);
      return false;
    }
  }

  function getStageOverride(stageId) {
    const stageIdStr = normalizeStageId(stageId);
    const overrides = getStageOverrides();
    return overrides[stageIdStr] || null;
  }

  function resetStageOverrides(stageId) {
    try {
      const stageIdStr = normalizeStageId(stageId);
      const overrides = getStageOverrides();
      delete overrides[stageIdStr];
      localStorage.setItem('stageOverrides', JSON.stringify(overrides));
      invalidateCache();
    } catch (e) {
      console.error('[StageConfig] Failed to reset stage overrides:', e);
    }
  }

  function resetAllStageOverrides() {
    try {
      localStorage.removeItem('stageOverrides');
      invalidateCache();
    } catch (e) {
      console.error('[StageConfig] Failed to reset all stage overrides:', e);
    }
  }

  // ====================================
  // DEBUG HELPERS (REQ-A)
  // ====================================

  /**
   * Console helper: window.debugEffectiveConfig()
   * Outputs current effective config + sources as console.table
   */
  function debugEffectiveConfig() {
    const effective = getEffective();
    const sources = getEffectiveSources();

    const tableData = {};

    // Build table with value and source
    Object.keys(effective).forEach(key => {
      if (key.startsWith('_')) {
        // Meta fields
        tableData[key] = { value: effective[key], source: 'meta' };
      } else {
        const source = sources[key] || 'unknown';
        tableData[key] = { value: effective[key], source };
      }
    });

    console.log('=== Effective Config Debug ===');
    console.log(`Stage: ${effective._stageId} (${effective._stageName})`);
    console.log(`Loop: ${effective._loopCount}, Scale: ${effective._loopScale}`);
    console.table(tableData);

    return { effective, sources };
  }

  // Attach to window for console access
  window.debugEffectiveConfig = debugEffectiveConfig;

  // ====================================
  // FIELD CLASSIFICATION GETTERS
  // ====================================

  function isGlobalOnlyKey(key) {
    return GLOBAL_ONLY_KEYS.has(key) || key === STORM_BASE_SPEED_KEY;
  }

  function isStageOnlyKey(key) {
    return STAGE_ONLY_KEYS.has(key);
  }

  function getGlobalOnlyKeys() {
    return [...GLOBAL_ONLY_KEYS, STORM_BASE_SPEED_KEY];
  }

  function getStageOnlyKeys() {
    return [...STAGE_ONLY_KEYS];
  }

  // ====================================
  // EXPORT
  // ====================================

  window.GameModules.StageConfig = {
    // Main functions
    getEffectiveConfig,
    getEffective,
    getEffectiveSources,
    invalidateCache,
    updateCurrentConfig,

    // Override management (Stage-only)
    setStageOverride,
    getStageOverride,
    resetStageOverrides,
    resetAllStageOverrides,
    getStageOverrides,

    // Legacy compatibility
    setQAOverride: setStageOverride,
    getQAOverride: getStageOverride,
    clearQAOverride: resetStageOverrides,
    clearAllQAOverrides: resetAllStageOverrides,
    getQAOverrides: getStageOverrides,

    // Field classification
    isGlobalOnlyKey,
    isStageOnlyKey,
    getGlobalOnlyKeys,
    getStageOnlyKeys,
    GLOBAL_ONLY_KEYS,
    STAGE_ONLY_KEYS,

    // Helpers
    normalizeWeights,
    normalizeStageId,
    debugEffectiveConfig
  };
})();
