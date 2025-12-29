# StageConfig System Implementation Plan

---

## CRITICAL FIXES (Must Apply)

아래 3가지 수정 없이 구현 시 "QA에서 값이 안 먹힘/왜곡됨" 이슈 발생 확정:

### [FIX 1] get() 체인 통일
- **문제**: `stormSpeedMult`, `baseSpeedMult`, `scoreMult`, `warningTimeMult`가 get() 함수를 거치지 않음
- **결과**: QA Override 설정해도 무시됨
- **해결**: 모든 필드가 `getValue()` 함수를 통해 Override → StageConfig → qaConfig → default 순으로 조회

### [FIX 2] 캐시 무효화 강화
- **문제**: 캐시가 `stageId`, `loopCount`만 체크함
- **결과**: qaConfig 슬라이더 변경, localStorage override 변경 시 캐시된 구 값 반환
- **해결**: qaConfig와 override의 해시값 비교로 변경 감지

### [FIX 3] stageId 타입 통일 + weights sanitize
- **문제**: UI select는 string "1", 내부는 number 1 → 키 매칭 실패
- **결과**: override 저장은 되지만 읽을 때 못 찾음
- **해결**: `normalizeStageId()`로 모든 stageId를 String으로 정규화
- **추가**: `normalizeWeights()`에서 음수/NaN 방어, 합계 0일 때 기본값 반환

---

## Overview

**Goal:** Build a stage-based configuration system that allows per-stage tuning of game parameters with QA UI support.

**Approach:**
1. Add StageConfig schema to stages.js (with null defaults = fallback to qaConfig)
2. Create runtime reference to current stage config
3. Build effectiveConfig merger function
4. Apply to spawn logic (coinRate, itemRate, itemWeights)
5. Apply to speed/difficulty (stormSpeed, baseSpeed, cycle timing)
6. Add QA UI for per-stage tuning
7. Add presets and reset functionality

---

## Current Codebase Analysis

### Existing Structure
- `stages.js`: Basic config (id, themeIdx, length, name, isLoop)
- `levelManager.js`: getStageInfo() returns stage info based on distance
- `stage.js`: updateStageProgress() updates runtime on stage change
- Loop stages (11-13) repeat with loopDifficultyScale

### Identified Issues
1. `itemWeights` hardcoded in `levelManager.js:98-101` (booster 40%, magnet 40%, barrier 20%)
2. `minCoinRunLength` missing from `FALLBACK_QA_CONFIG` (default 5 hardcoded)
3. WARNING time calculation hardcoded in `loop.js:171`
4. RUN cycle timer (3.0s) hardcoded in `loop.js:201`
5. `stopPhaseDuration` exists in qaConfig but not stage-specific

### Current Default Values (from config.js)
```javascript
coinRate: 0.3,
itemRate: 0.03,
stormBaseSpeed: 150,
cycleSpeedMult: 1.0,
// Missing: minCoinRunLength, itemWeights, runPhaseDuration, warningTime*
```

---

## Step 1: StageConfig Schema + Missing qaConfig Defaults

### Add to config.js FALLBACK_QA_CONFIG
```javascript
minCoinRunLength: 5,
itemWeights: { barrier: 0.2, booster: 0.4, magnet: 0.4 },
runPhaseDuration: 3.0,
warningTimeBase: 7.0,
warningTimeMin: 3.0,
stopPhaseDuration: 1.5,
```

### StageConfig Fields (stages.js)
```javascript
{
  // Existing fields
  id: 1,
  themeIdx: 0,
  length: 2000,
  name: "BOOT SEQUENCE",
  isLoop: false,

  // === Tuning fields (null = use qaConfig fallback) ===

  // Spawn rates
  coinRate: null,           // Coin pattern start probability (0.0~1.0)
  minCoinRunLength: null,   // Minimum coin pattern length
  itemRate: null,           // Item spawn probability (0.0~1.0)
  itemWeights: null,        // { barrier, booster, magnet } - will be normalized

  // Speed multipliers (applied on top of base values)
  stormSpeedMult: 1.0,      // Storm speed multiplier
  baseSpeedMult: 1.0,       // Player/scroll speed multiplier

  // Score
  scoreMult: 1.0,           // Score multiplier

  // Cycle timing (optional)
  runPhaseDuration: null,   // RUN state duration (seconds)
  warningTimeMult: 1.0,     // WARNING time multiplier
  stopPhaseDuration: null,  // STOP state duration (seconds)
}
```

---

## Step 2: Runtime Stage Config Reference

### Modify runtime.js
```javascript
runtime.stage = {
  currentStageId: 1,
  previousStageId: 1,
  loopCount: 0,
  loopDifficultyScale: 1.0,
  currentConfig: null,      // Current stage's StageConfig object
  effectiveConfig: {},      // Computed final config (cached)
};
```

### Update Points (must update currentConfig)
1. Game start (`lifecycle.js:startGame`) - initialize to Stage 1
2. Stage transition (`stage.js:updateStageProgress`) - update on change
3. Warp (`lifecycle.js:warpToDistance`) - update after warp
4. Game reset (`runtime.js:resetRuntime`) - reset to null or Stage 1

---

## Step 3: getEffectiveConfig Function

### New file: assets/js/game/stageConfig.js

**[FIX 1] get() 체인 통일**: 모든 필드가 get() 함수를 통해 Override → StageConfig → qaConfig → default 순으로 조회
**[FIX 2] 캐시 무효화 강화**: qaConfig 변경, localStorage 변경 감지를 위한 해시 기반 캐시 검증
**[FIX 3] stageId 타입 통일**: 모든 stageId를 String으로 정규화

```javascript
window.GameModules = window.GameModules || {};

(function() {
  // ========== [FIX 2] Enhanced Cache System ==========
  // Cache with hash-based validation for qaConfig and overrides
  let cachedEffective = null;
  let cachedStageId = null;
  let cachedLoopCount = null;
  let cachedQaHash = null;        // Hash of relevant qaConfig values
  let cachedOverrideHash = null;  // Hash of localStorage overrides

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
      return String(Date.now()); // Force invalidation on error
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
      stopPhaseDuration: qaConfig.stopPhaseDuration,
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
   * - Ensures all three keys exist
   * - Clamps values to 0~1 range
   * - Normalizes sum to 1.0
   */
  function normalizeWeights(weights) {
    const DEFAULT = { barrier: 0.2, booster: 0.4, magnet: 0.4 };

    if (!weights || typeof weights !== 'object') {
      return { ...DEFAULT };
    }

    // Extract and clamp to valid range
    let barrier = Math.max(0, Number(weights.barrier) || 0);
    let booster = Math.max(0, Number(weights.booster) || 0);
    let magnet = Math.max(0, Number(weights.magnet) || 0);

    const total = barrier + booster + magnet;

    // If all zero, use defaults
    if (total === 0) {
      return { ...DEFAULT };
    }

    // Normalize to sum = 1.0
    return {
      barrier: barrier / total,
      booster: booster / total,
      magnet: magnet / total
    };
  }

  /**
   * [FIX 1] Unified get() function with proper fallback chain
   * Priority: QA Override -> StageConfig -> qaConfig -> default
   *
   * @param {string} key - Config key to retrieve
   * @param {Object} stageConfig - Current stage's base config
   * @param {Object} qaConfig - Global QA config
   * @param {Object} qaOverrides - localStorage overrides (already loaded)
   * @param {string} stageIdStr - Normalized stage ID string
   * @param {*} defaultVal - Final fallback value
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

    // Check qaConfig hash
    const currentQaHash = hashObject(getQaHashSource(qaConfig));
    if (cachedQaHash !== currentQaHash) return false;

    // Check overrides hash
    const currentOverrideHash = hashObject(qaOverrides);
    if (cachedOverrideHash !== currentOverrideHash) return false;

    return true;
  }

  /**
   * Calculate effective config for current stage
   * [FIX 1] All fields now use unified get() chain
   * [FIX 2] Enhanced cache validation
   * [FIX 3] Consistent stageId handling
   */
  function getEffectiveConfig(runtime, qaConfig, forceRecalc = false) {
    const stageId = runtime?.stage?.currentStageId ?? 1;
    const stageIdStr = normalizeStageId(stageId);  // [FIX 3]
    const loopCount = runtime?.stage?.loopCount ?? 0;
    const qaOverrides = getQAOverrides();

    // [FIX 2] Enhanced cache check
    if (!forceRecalc && isCacheValid(stageId, loopCount, qaConfig, qaOverrides)) {
      return cachedEffective;
    }

    const stageConfig = runtime?.stage?.currentConfig;
    const loopScale = runtime?.stage?.loopDifficultyScale ?? 1.0;

    // [FIX 1] Unified get() helper - all fields go through this
    const get = (key, def) => getValue(key, stageConfig, qaConfig, qaOverrides, stageIdStr, def);

    // [FIX 1] ALL fields now use get() for proper override support
    const stormSpeedMult = get('stormSpeedMult', 1.0);
    const baseSpeedMult = get('baseSpeedMult', 1.0);
    const scoreMult = get('scoreMult', 1.0);
    const warningTimeMult = get('warningTimeMult', 1.0);

    const effective = {
      // Spawn rates (via get)
      coinRate: get('coinRate', 0.3),
      minCoinRunLength: get('minCoinRunLength', 5),
      itemRate: get('itemRate', 0.03),
      itemWeights: normalizeWeights(get('itemWeights', null)),  // [FIX 3] sanitized

      // [FIX 1] Speed now uses get() chain for override support
      stormSpeedMult: stormSpeedMult,
      stormSpeed: (qaConfig?.stormBaseSpeed ?? 150) * stormSpeedMult * loopScale,
      baseSpeedMult: baseSpeedMult,

      // [FIX 1] Score now uses get() chain
      scoreMult: scoreMult * loopScale,

      // Cycle timing (via get)
      runPhaseDuration: get('runPhaseDuration', 3.0),
      warningTimeBase: get('warningTimeBase', 7.0),
      warningTimeMin: get('warningTimeMin', 3.0),
      warningTimeMult: warningTimeMult,  // [FIX 1] now via get()
      stopPhaseDuration: get('stopPhaseDuration', 1.5),

      // Meta info
      _stageId: stageId,
      _stageIdStr: stageIdStr,
      _loopCount: loopCount,
      _loopScale: loopScale,
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
   * Invalidate cache (call on stage change or explicit QA update)
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
   * Note: This always rechecks cache validity via hash comparison
   */
  function getEffective() {
    const runtime = window.runtime;
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
   * stageId is normalized to string for consistent localStorage keys
   */
  function setQAOverride(stageId, key, value) {
    try {
      const stageIdStr = normalizeStageId(stageId);  // [FIX 3]
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
      const stageIdStr = normalizeStageId(stageId);  // [FIX 3]
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

  window.GameModules.StageConfig = {
    getEffectiveConfig,
    getEffective,
    invalidateCache,
    updateCurrentConfig,
    setQAOverride,
    resetStageOverrides,
    resetAllOverrides,
    getQAOverrides,
    normalizeWeights,
    normalizeStageId  // [FIX 3] Export for external use
  };
})();
```

---

## Step 4: Apply to Spawn Logic (levelManager.js)

### Modify generateRow function
```javascript
function generateRow(rowIndex, spawnItemCallback) {
  if (rows[rowIndex]) return;

  // Get effective config (uses cached value)
  const effective = window.GameModules?.StageConfig?.getEffective?.() ?? {};
  const coinRate = effective.coinRate ?? 0.3;
  const minCoinRunLength = effective.minCoinRunLength ?? 5;
  const itemRate = effective.itemRate ?? 0.03;
  const weights = effective.itemWeights ?? { barrier: 0.2, booster: 0.4, magnet: 0.4 };

  // ... existing theme/color logic ...

  // [A] Coin pattern start
  if (!coinPattern.active && Math.random() < coinRate) {
    coinPattern.active = true;
    coinPattern.remainingRows = minCoinRunLength + Math.floor(Math.random() * 5);
    // ... lane selection logic ...
  }

  // ... existing coin pattern progression ...

  // [B] Item spawn with weights
  if (Math.random() < itemRate) {
    const { barrier, booster, magnet } = weights;
    const rand = Math.random();

    let itemType;
    if (rand < booster) {
      itemType = 'booster';
    } else if (rand < booster + magnet) {
      itemType = 'magnet';
    } else {
      itemType = 'barrier';
    }

    // ... existing column selection and spawn ...
  }
}
```

---

## Step 5: Apply to Speed/Difficulty (loop.js)

### Storm Speed (line ~122)
```javascript
// Before
const stormSpeed = window.Game.Physics.getStormSpeed(player.dist, qaConfig.stormBaseSpeed);

// After
const effective = window.GameModules.StageConfig.getEffective();
const stormSpeed = window.Game.Physics.getStormSpeed(player.dist, effective.stormSpeed);
```

### RUN Phase Duration (line ~201)
```javascript
// Before
runtime.cycleTimer = 3.0;

// After
const effective = window.GameModules.StageConfig.getEffective();
runtime.cycleTimer = effective.runPhaseDuration;
```

### WARNING Time (line ~171)
```javascript
// Before
runtime.cycleTimer = runtime.isFirstWarning
  ? 12.0
  : Math.max(7.0 - Math.min(player.dist / 5000, 1.0) * 4.0, 3.0);

// After
const effective = window.GameModules.StageConfig.getEffective();
const warningBase = effective.warningTimeBase;
const warningMin = effective.warningTimeMin;
const warningMult = effective.warningTimeMult;

runtime.cycleTimer = runtime.isFirstWarning
  ? 12.0 * warningMult
  : Math.max(warningBase - Math.min(player.dist / 5000, 1.0) * 4.0, warningMin) * warningMult;
```

### STOP Phase Duration (line ~189)
```javascript
// Before
runtime.cycleTimer = qaConfig.stopPhaseDuration ?? 1.5;

// After
const effective = window.GameModules.StageConfig.getEffective();
runtime.cycleTimer = effective.stopPhaseDuration;
```

---

## Step 6: Update stage.js for Config Sync

### Modify updateStageProgress
```javascript
function updateStageProgress(runtime, playerDist, qaConfig) {
  const stageInfo = window.Game.LevelManager.getStageInfo(playerDist);
  runtime.currentLevelGoal = (window.STAGE_CUMULATIVE?.[stageInfo.stageIndex] ?? 0) + stageInfo.stageConfig.length;

  if (stageInfo.stageConfig.id !== runtime.stage.currentStageId) {
    runtime.stage.previousStageId = runtime.stage.currentStageId;
    runtime.stage.currentStageId = stageInfo.stageConfig.id;
    runtime.stage.loopCount = stageInfo.loopCount;

    // UPDATE: Sync currentConfig
    window.GameModules?.StageConfig?.updateCurrentConfig?.(runtime, stageInfo.stageConfig.id);

    if (stageInfo.stageConfig.themeIdx !== runtime.currentThemeIdx) {
      runtime.currentThemeIdx = stageInfo.stageConfig.themeIdx;
    }

    showStageNotification(stageInfo);

    if (stageInfo.isLooping && stageInfo.loopCount > 0) {
      applyLoopDifficultyScaling(runtime, qaConfig, stageInfo.loopCount);
    } else {
      runtime.stage.loopDifficultyScale = 1.0;
      qaConfig._effectiveStormSpeed = qaConfig.stormBaseSpeed ?? 150;
    }
  }
}
```

---

## Step 7: QA UI Design (tabs.js + index.html)

### HTML Structure
```html
<fieldset id="qa-stage-fieldset">
  <legend>Stage Tuning</legend>

  <!-- Stage Selector -->
  <div class="vol-row">
    <span>Select Stage</span>
    <select id="qa-stage-select" onchange="window.onStageSelectChange?.()">
      <option value="global">Global (affects all)</option>
      <option value="1">1: BOOT SEQUENCE</option>
      <option value="2">2: DIGITAL CIRCUIT</option>
      <option value="3">3: NEON ALLEY</option>
      <option value="4">4: GLITCH CITY</option>
      <option value="5">5: DATA HIGHWAY</option>
      <option value="6">6: VOID ENTRANCE</option>
      <option value="7">7: CYBER STORM</option>
      <option value="8">8: THE VOID</option>
      <option value="9">9: SYSTEM REBOOT</option>
      <option value="10">10: INFINITE HORIZON</option>
      <option value="11">11: LOOP ALPHA</option>
      <option value="12">12: LOOP BETA</option>
      <option value="13">13: LOOP OMEGA</option>
    </select>
  </div>

  <!-- Spawn Rates -->
  <div class="vol-row">
    <span>Coin Rate</span>
    <span class="val-display" id="qa-val-stage-coin">30%</span>
  </div>
  <input type="range" id="qa-stage-coin" min="0" max="100" step="5" value="30" oninput="window.updateStageQA?.()">

  <div class="vol-row">
    <span>Item Rate</span>
    <span class="val-display" id="qa-val-stage-item">3%</span>
  </div>
  <input type="range" id="qa-stage-item" min="0" max="20" step="1" value="3" oninput="window.updateStageQA?.()">

  <!-- Speed Multipliers -->
  <div class="vol-row">
    <span>Storm Speed Mult</span>
    <span class="val-display" id="qa-val-stage-storm">1.0x</span>
  </div>
  <input type="range" id="qa-stage-storm" min="50" max="200" step="5" value="100" oninput="window.updateStageQA?.()">

  <div class="vol-row">
    <span>Base Speed Mult</span>
    <span class="val-display" id="qa-val-stage-speed">1.0x</span>
  </div>
  <input type="range" id="qa-stage-speed" min="50" max="200" step="5" value="100" oninput="window.updateStageQA?.()">

  <!-- Item Weights -->
  <div class="qa-subsection">
    <span class="qa-sublabel">Item Weights</span>
    <div class="weight-row">
      <span>Barrier</span>
      <input type="range" id="qa-stage-w-barrier" min="0" max="100" value="20" oninput="window.updateStageQA?.()">
      <span id="qa-val-w-barrier">20</span>
    </div>
    <div class="weight-row">
      <span>Booster</span>
      <input type="range" id="qa-stage-w-booster" min="0" max="100" value="40" oninput="window.updateStageQA?.()">
      <span id="qa-val-w-booster">40</span>
    </div>
    <div class="weight-row">
      <span>Magnet</span>
      <input type="range" id="qa-stage-w-magnet" min="0" max="100" value="40" oninput="window.updateStageQA?.()">
      <span id="qa-val-w-magnet">40</span>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="qa-btn-row">
    <button class="btn-common" onclick="window.resetCurrentStage?.()">Reset Stage</button>
    <button class="btn-common" onclick="window.resetAllStages?.()">Reset All</button>
  </div>

  <!-- Presets -->
  <div class="qa-btn-row">
    <button class="btn-common" onclick="window.applyPreset?.('easy')">Easy Curve</button>
    <button class="btn-common" onclick="window.applyPreset?.('normal')">Normal</button>
    <button class="btn-common" onclick="window.applyPreset?.('hard')">Hard</button>
  </div>
</fieldset>
```

### JavaScript Functions (tabs.js additions)

**[FIX 3] 적용**: stageId는 항상 normalizeStageId()를 통해 String으로 정규화

```javascript
// Stage QA functions
window.onStageSelectChange = function() {
  const select = document.getElementById('qa-stage-select');
  const stageId = select.value;  // Already string from <option value="1">
  loadStageValues(stageId);
};

/**
 * [FIX 3] Load stage values with normalized stageId
 */
function loadStageValues(stageId) {
  const StageConfig = window.GameModules?.StageConfig;
  const normalizeId = StageConfig?.normalizeStageId ?? String;  // [FIX 3]
  const stageIdStr = normalizeId(stageId);

  const overrides = StageConfig?.getQAOverrides?.() ?? {};
  const stageOverride = overrides[stageIdStr] ?? {};  // [FIX 3] Use normalized key
  const baseConfig = window.STAGE_CONFIG?.find(s => s.id === parseInt(stageId)) ?? {};
  const qaConfig = window.qaConfig ?? {};

  // Helper to get value with fallback (same priority as getEffectiveConfig)
  const get = (key, def) => {
    if (stageOverride[key] !== undefined && stageOverride[key] !== null) return stageOverride[key];
    if (baseConfig[key] !== undefined && baseConfig[key] !== null) return baseConfig[key];
    if (qaConfig[key] !== undefined && qaConfig[key] !== null) return qaConfig[key];
    return def;
  };

  // Update sliders
  setValue('qa-stage-coin', (get('coinRate', 0.3) * 100));
  setValue('qa-stage-item', (get('itemRate', 0.03) * 100));
  setValue('qa-stage-storm', (get('stormSpeedMult', 1.0) * 100));
  setValue('qa-stage-speed', (get('baseSpeedMult', 1.0) * 100));

  // [FIX 3] Sanitize weights before display
  const rawWeights = get('itemWeights', null);
  const weights = StageConfig?.normalizeWeights?.(rawWeights)
                  ?? { barrier: 0.2, booster: 0.4, magnet: 0.4 };
  setValue('qa-stage-w-barrier', Math.round(weights.barrier * 100));
  setValue('qa-stage-w-booster', Math.round(weights.booster * 100));
  setValue('qa-stage-w-magnet', Math.round(weights.magnet * 100));

  updateStageValueDisplays();
}

/**
 * [FIX 3] Update stage QA with proper stageId handling
 */
window.updateStageQA = function() {
  const select = document.getElementById('qa-stage-select');
  const stageId = select.value;  // String from select

  if (stageId === 'global') {
    // Update global qaConfig instead
    updateGlobalQA();
    return;
  }

  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  // Note: setQAOverride internally normalizes stageId, so we can pass as-is
  const coinRate = parseInt(document.getElementById('qa-stage-coin').value) / 100;
  const itemRate = parseInt(document.getElementById('qa-stage-item').value) / 100;
  const stormSpeedMult = parseInt(document.getElementById('qa-stage-storm').value) / 100;
  const baseSpeedMult = parseInt(document.getElementById('qa-stage-speed').value) / 100;

  const barrier = parseInt(document.getElementById('qa-stage-w-barrier').value);
  const booster = parseInt(document.getElementById('qa-stage-w-booster').value);
  const magnet = parseInt(document.getElementById('qa-stage-w-magnet').value);

  // [FIX 3] Let normalizeWeights handle edge cases (sum=0, negatives)
  const rawWeights = { barrier, booster, magnet };
  const normalizedWeights = StageConfig.normalizeWeights(rawWeights);

  StageConfig.setQAOverride(stageId, 'coinRate', coinRate);
  StageConfig.setQAOverride(stageId, 'itemRate', itemRate);
  StageConfig.setQAOverride(stageId, 'stormSpeedMult', stormSpeedMult);
  StageConfig.setQAOverride(stageId, 'baseSpeedMult', baseSpeedMult);
  StageConfig.setQAOverride(stageId, 'itemWeights', normalizedWeights);  // [FIX 3]

  updateStageValueDisplays();
};

function updateStageValueDisplays() {
  setText('qa-val-stage-coin', `${document.getElementById('qa-stage-coin').value}%`);
  setText('qa-val-stage-item', `${document.getElementById('qa-stage-item').value}%`);
  setText('qa-val-stage-storm', `${(parseInt(document.getElementById('qa-stage-storm').value) / 100).toFixed(2)}x`);
  setText('qa-val-stage-speed', `${(parseInt(document.getElementById('qa-stage-speed').value) / 100).toFixed(2)}x`);
  setText('qa-val-w-barrier', document.getElementById('qa-stage-w-barrier').value);
  setText('qa-val-w-booster', document.getElementById('qa-stage-w-booster').value);
  setText('qa-val-w-magnet', document.getElementById('qa-stage-w-magnet').value);
}

window.resetCurrentStage = function() {
  const select = document.getElementById('qa-stage-select');
  const stageId = select.value;
  if (stageId === 'global') return;

  window.GameModules?.StageConfig?.resetStageOverrides?.(stageId);
  loadStageValues(stageId);
};

window.resetAllStages = function() {
  window.GameModules?.StageConfig?.resetAllOverrides?.();
  const select = document.getElementById('qa-stage-select');
  loadStageValues(select.value);
};
```

---

## Step 8: Preset System

### Preset Definitions
```javascript
const STAGE_PRESETS = {
  easy: {
    // Values for stages 1-13
    stormSpeedMult: [0.8, 0.85, 0.9, 0.92, 0.95, 0.97, 1.0, 1.02, 1.05, 1.08, 0.95, 1.0, 1.05],
    coinRate:       [0.40, 0.38, 0.36, 0.34, 0.32, 0.30, 0.28, 0.26, 0.24, 0.22, 0.30, 0.28, 0.26],
    itemRate:       [0.05, 0.05, 0.04, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03, 0.02, 0.04, 0.03, 0.03],
  },
  normal: {
    stormSpeedMult: [1.0, 1.0, 1.02, 1.05, 1.08, 1.12, 1.16, 1.20, 1.25, 1.30, 1.10, 1.18, 1.26],
    coinRate:       [0.30, 0.28, 0.26, 0.24, 0.22, 0.20, 0.18, 0.16, 0.15, 0.14, 0.20, 0.18, 0.16],
    itemRate:       [0.03, 0.03, 0.03, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.02, 0.02],
  },
  hard: {
    stormSpeedMult: [1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50, 1.55, 1.60, 1.35, 1.45, 1.55],
    coinRate:       [0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.09, 0.08, 0.07, 0.06, 0.12, 0.10, 0.08],
    itemRate:       [0.02, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.01, 0.01],
  }
};

window.applyPreset = function(presetName) {
  const preset = STAGE_PRESETS[presetName];
  if (!preset) return;

  const StageConfig = window.GameModules?.StageConfig;
  if (!StageConfig) return;

  // Apply to all 13 stages
  // [FIX 3] stageId is number here, but setQAOverride internally normalizes to string
  for (let i = 0; i < 13; i++) {
    const stageId = i + 1;  // number, auto-converted by setQAOverride
    StageConfig.setQAOverride(stageId, 'stormSpeedMult', preset.stormSpeedMult[i]);
    StageConfig.setQAOverride(stageId, 'coinRate', preset.coinRate[i]);
    StageConfig.setQAOverride(stageId, 'itemRate', preset.itemRate[i]);
  }

  // Reload current stage display
  const select = document.getElementById('qa-stage-select');
  loadStageValues(select.value);

  console.log(`[StageConfig] Applied preset: ${presetName}`);
};
```

---

## Exception Handling Checklist

| Scenario | Handling |
|----------|----------|
| STAGE_CONFIG not loaded | Fallback: Stage 1 defaults |
| currentConfig is null | Full qaConfig fallback |
| itemWeights sum != 1.0 | Auto-normalize |
| Loop section entered | Apply loopDifficultyScale |
| QA modified during play | Recalc on next getEffective() |
| localStorage corrupted | try-catch with defaults |
| Stage 11-13 modified | Affects all loops (show warning) |
| Warp without config update | Explicit updateCurrentConfig call |
| First frame before stage init | Safe defaults in getEffective |

---

## File Change Summary

| File | Changes |
|------|---------|
| `assets/js/data/stages.js` | Add tuning fields to each stage |
| `assets/js/game/config.js` | Add missing defaults to FALLBACK_QA_CONFIG |
| `assets/js/game/stageConfig.js` | NEW - getEffectiveConfig, QA overrides |
| `assets/js/game/runtime.js` | Add stage.currentConfig, stage.effectiveConfig |
| `assets/js/game/stage.js` | Call updateCurrentConfig on stage change |
| `assets/js/game/lifecycle.js` | Init currentConfig on start/warp |
| `assets/js/game/loop.js` | Use effectiveConfig for timing/speed |
| `assets/js/core/levelManager.js` | Use effectiveConfig for spawn rates |
| `assets/js/ui/tabs.js` | Add stage tuning UI handlers |
| `index.html` | Add Stage Tuning fieldset in QA section |
| `assets/css/style.css` | Styles for stage tuning UI |

---

## Execution Order

1. Add missing defaults to `config.js` FALLBACK_QA_CONFIG
2. Add tuning fields to `stages.js` (all null = fallback)
3. Create `stageConfig.js` module
4. Update `runtime.js` stage object
5. Update `stage.js` updateStageProgress
6. Update `lifecycle.js` startGame/warpToDistance
7. Update `levelManager.js` generateRow
8. Update `loop.js` for timing/speed
9. Add QA UI to `index.html`
10. Add handlers to `tabs.js`
11. Add CSS styles
12. Test all stages + loop + warp

---

## Debug Features (Optional)

### Show Current Effective Config
```javascript
// Add to UI or console command
window.debugStageConfig = function() {
  const effective = window.GameModules?.StageConfig?.getEffective?.();
  console.table(effective);
  return effective;
};
```

### Stage Config Visualization
```javascript
// Show all stage configs in a table
window.showAllStageConfigs = function() {
  const configs = window.STAGE_CONFIG.map((stage, i) => {
    const overrides = window.GameModules?.StageConfig?.getQAOverrides?.()?.[stage.id] ?? {};
    return {
      id: stage.id,
      name: stage.name,
      coinRate: overrides.coinRate ?? stage.coinRate ?? 'default',
      itemRate: overrides.itemRate ?? stage.itemRate ?? 'default',
      stormMult: overrides.stormSpeedMult ?? stage.stormSpeedMult ?? 1.0,
      hasOverrides: Object.keys(overrides).length > 0
    };
  });
  console.table(configs);
};
```
