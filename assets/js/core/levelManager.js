/**
 * LevelManager - 레벨 생성 및 맵 데이터 관리 모듈
 * main.js에서 분리된 rows, coinPattern, generateRow, pickSafeTargetColor 로직
 */
(function() {
  'use strict';

  const COLS = 5;
  const CELL_H = 100;

  // 맵 행 데이터
  let rows = {};

  // 코인 패턴 시스템 - 연속적인 '길(Path)' 형성
  let coinPattern = {
    active: false,      // 현재 패턴 진행 중인지 여부
    remainingRows: 0,   // 남은 행 개수
    currentCol: -1,     // 현재 코인 생성 컬럼 (0~4), -1은 미지정
    pendingRewardItem: false, // 코인 라인 끝에 booster/magnet 생성 대기
    lastCoinCol: -1,    // 마지막 코인 라인 컬럼 (회피용)
  };

  /**
   * 행 데이터 생성
   * @param {number} rowIndex - 생성할 행 인덱스
   * @param {Function} spawnItemCallback - 아이템 생성 콜백 (type, col) => void
   */
  function generateRow(rowIndex, spawnItemCallback) {
    if (rows[rowIndex]) return;

    const qaConfig = window.qaConfig || {};
    const getThemes = () => window.THEMES ?? window.GameConfig?.THEMES ?? [];
    const tutorialPalette = (window.runtime?.tutorialMode && window.TutorialConfig?.getConfig)
      ? window.TutorialConfig.getConfig(window.runtime.tutorialStep)?.colorPalette
      : null;
    const tutorialColors = tutorialPalette
      ? (window.STAGE_PALETTES?.TUTORIAL?.colors ?? tutorialPalette)
      : null;

    // Get effective config (stage-specific values with QA overrides)
    const effective = window.GameModules?.StageConfig?.getEffective?.() ?? {
      coinRate: qaConfig.coinRate ?? 0.3,
      minCoinRunLength: qaConfig.minCoinRunLength ?? 5,
      barrierRate: qaConfig.barrierRate ?? 0.03,
      boosterRate: qaConfig.boosterRate ?? 0.5,
      magnetRate: qaConfig.magnetRate ?? 0.5
    };

    const dist = -rowIndex * 10;
    const isTutorialMode = window.runtime?.tutorialMode === true;

    // Use new stage system if available, fallback to legacy
    let themeIdx = 0;
    if (isTutorialMode) {
      // Tutorial mode: use runtime's currentThemeIdx (set by lifecycle.js)
      themeIdx = window.runtime?.currentThemeIdx ?? 0;
    } else if (window.STAGE_CONFIG && typeof getStageInfo === 'function') {
      const stageInfo = getStageInfo(dist);
      themeIdx = stageInfo.stageConfig.themeIdx;
    } else {
      // Legacy fallback
      const stageLength = qaConfig.stageLength ?? 2000;
      if (dist >= stageLength * 2) themeIdx = 2;
      else if (dist >= stageLength) themeIdx = 1;
    }

    const palette = tutorialColors || (getThemes()[themeIdx]?.colors ?? []);
    const rowColors = [];
    for (let i = 0; i < COLS; i++) {
      // Tutorial mode: use single color (index 0) for all tiles to avoid visual noise
      if (isTutorialMode) {
        rowColors.push(0);
      } else {
        rowColors.push(Math.floor(Math.random() * palette.length));
      }
    }
    rows[rowIndex] = { colors: rowColors, themeIdx };

    // === 코인 패턴 시스템 ===
    let coinCol = -1; // 이번 행에 코인이 생성될 컬럼 (-1이면 생성 안 함)

    // === [먼저] 보상 아이템 스폰 (이전 행에서 코인 라인 종료됨) ===
    // booster/magnet은 코인 라인이 끝난 "다음 행"에 생성
    let rewardSpawnedThisRow = false;
    if (coinPattern.pendingRewardItem) {
      coinPattern.pendingRewardItem = false;
      rewardSpawnedThisRow = true; // 이 행에서는 새 코인 라인 시작 안함

      // 개별 드랍률로 booster/magnet 생성 여부 결정
      const boosterRate = effective.boosterRate ?? 0.5;
      const magnetRate = effective.magnetRate ?? 0.5;
      const totalRate = boosterRate + magnetRate;

      if (totalRate > 0) {
        const rand = Math.random();
        // 마지막 코인 컬럼과 같은 위치에 생성 (코인 라인 바로 뒤)
        const rewardCol = coinPattern.lastCoinCol;

        if (rand < boosterRate) {
          // booster 생성
          if (spawnItemCallback) {
            spawnItemCallback('booster', rewardCol);
          }
        } else if (rand < boosterRate + magnetRate) {
          // magnet 생성
          if (spawnItemCallback) {
            spawnItemCallback('magnet', rewardCol);
          }
        }
        // else: 아무것도 생성 안함 (드랍률 합이 1 미만이면 가능)
      }
    }

    // [A] 패턴 시작 (새로운 직선 구간 시작)
    // 보상 아이템이 생성된 행에서는 새 코인 라인 시작 안함
    if (!coinPattern.active && !rewardSpawnedThisRow && Math.random() < effective.coinRate) {
      coinPattern.active = true;

      // 길이 결정 (effective config + 랜덤 다양성)
      const baseLen = effective.minCoinRunLength;
      coinPattern.remainingRows = baseLen + Math.floor(Math.random() * 5);

      // 차선 결정 (인접 이동 로직)
      if (coinPattern.currentCol === -1) {
        // 게임 첫 시작 시 랜덤
        coinPattern.currentCol = Math.floor(Math.random() * COLS);
      } else {
        // 기존 차선의 인접한 곳(왼쪽/오른쪽) 중 하나 선택
        const candidates = [];
        if (coinPattern.currentCol > 0) candidates.push(coinPattern.currentCol - 1);
        if (coinPattern.currentCol < COLS - 1) candidates.push(coinPattern.currentCol + 1);

        // 후보 중 랜덤 선택
        if (candidates.length > 0) {
          coinPattern.currentCol = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }

    // [B] 패턴 진행 (직선 생성)
    if (coinPattern.active) {
      coinCol = coinPattern.currentCol; // 아이템 스폰 회피 로직을 위해 coinCol 업데이트
      const itemType = Math.random() < 0.6 ? 'bit' : 'coin';
      if (spawnItemCallback) {
        spawnItemCallback(itemType, coinPattern.currentCol);
      }

      coinPattern.remainingRows--;
      if (coinPattern.remainingRows <= 0) {
        coinPattern.active = false;
        coinPattern.pendingRewardItem = true; // 다음 행에 booster/magnet 생성 예약
        coinPattern.lastCoinCol = coinPattern.currentCol; // 마지막 컬럼 기억
        // currentCol은 다음 결정을 위해 유지
      }
    }

    // === Barrier(실드) 스폰 (개별 드랍률, 모든 행에서 가능) ===
    // 실드 드랍 확률 업그레이드 적용 (상한 20%)
    const runtime = window.Game?.runtime;
    const baseRate = effective.barrierRate ?? 0.03;
    const bonus = runtime?.itemUpgrades?.shieldDropChanceBonus ?? 0;
    const barrierRate = Math.min(baseRate + bonus, 0.20);
    if (Math.random() < barrierRate) {
      // 코인 패턴 위치와 겹치지 않도록 다른 컬럼 선택
      let itemCol = Math.floor(Math.random() * COLS);
      if (coinCol >= 0 && itemCol === coinCol) {
        itemCol = (itemCol + 1 + Math.floor(Math.random() * (COLS - 1))) % COLS;
      }
      if (spawnItemCallback) {
        spawnItemCallback('barrier', itemCol);
      }
    }

  }

  /**
   * 안전 타일 색상 선택 (WARNING 상태에서 목표 색상 결정)
   * @param {number} playerY - 플레이어 Y 좌표
   * @param {number} currentThemeIdx - 현재 테마 인덱스
   * @returns {number} 목표 색상 인덱스
   */
  function pickSafeTargetColor(playerY, currentThemeIdx) {
    const getThemes = () => window.THEMES ?? window.GameConfig?.THEMES ?? [];
    const playerRow = Math.floor(playerY / CELL_H);
    const scanRows = [playerRow - 1, playerRow - 2, playerRow - 3];
    const counts = {};

    scanRows.forEach(r => {
      if (rows[r] && rows[r].colors) {
        rows[r].colors.forEach(c => {
          counts[c] = (counts[c] || 0) + 1;
        });
      }
    });

    let bestColor = -1, maxCount = -1;
    for (const c in counts) {
      if (counts[c] > maxCount) {
        maxCount = counts[c];
        bestColor = parseInt(c);
      }
    }

    if (bestColor === -1) {
      const palette = getThemes()[currentThemeIdx]?.colors ?? [];
      return Math.floor(Math.random() * palette.length);
    }
    return bestColor;
  }

  /**
   * 레벨 데이터 초기화 (게임 시작 시 호출)
   */
  function reset() {
    rows = {};
    coinPattern = {
      active: false,
      remainingRows: 0,
      currentCol: -1,
      pendingRewardItem: false,
      lastCoinCol: -1,
    };
  }

  /**
   * 특정 행 데이터 조회
   * @param {number} rowIndex - 조회할 행 인덱스
   * @returns {Object|undefined} 행 데이터 { colors: number[], themeIdx: number }
   */
  function getRow(rowIndex) {
    return rows[rowIndex];
  }

  /**
   * Get current stage information based on cumulative distance
   * @param {number} currentDistance - Player's cumulative distance (player.dist)
   * @returns {Object} Stage info object
   */
  function getStageInfo(currentDistance) {
    // Check if stage system is available
    if (!window.STAGE_CONFIG || !window.STAGE_CUMULATIVE) {
      // Fallback for when stages.js hasn't loaded
      return {
        stageConfig: { id: 1, themeIdx: 0, length: 2000, name: "BOOT SEQUENCE" },
        stageIndex: 0,
        loopCount: 0,
        isLooping: false,
        progressInStage: currentDistance,
        progressPercent: 0,
        distanceToNextStage: 2000 - currentDistance
      };
    }

    const stages = window.STAGE_CONFIG;
    const cumulative = window.STAGE_CUMULATIVE;
    const loopStartDist = window.LOOP_START_DISTANCE;
    const loopLength = window.LOOP_SECTION_LENGTH;
    const LOOP_START_IDX = window.LOOP_START_INDEX;

    // Before loop section (stages 1-10)
    if (currentDistance < loopStartDist) {
      for (let i = stages.length - 1; i >= 0; i--) {
        if (currentDistance >= cumulative[i]) {
          const stage = stages[i];
          return {
            stageConfig: stage,
            stageIndex: i,
            loopCount: 0,
            isLooping: false,
            progressInStage: currentDistance - cumulative[i],
            progressPercent: (currentDistance - cumulative[i]) / stage.length,
            distanceToNextStage: cumulative[i] + stage.length - currentDistance
          };
        }
      }
      // Fallback to stage 1
      return {
        stageConfig: stages[0],
        stageIndex: 0,
        loopCount: 0,
        isLooping: false,
        progressInStage: currentDistance,
        progressPercent: currentDistance / stages[0].length,
        distanceToNextStage: stages[0].length - currentDistance
      };
    }

    // Loop section (stages 11-13 repeating)
    const distIntoLoop = currentDistance - loopStartDist;
    const loopCount = Math.floor(distIntoLoop / loopLength);
    const distInCurrentLoop = distIntoLoop % loopLength;

    // Find which stage within the loop section
    let accumulatedInLoop = 0;

    for (let i = LOOP_START_IDX; i < stages.length; i++) {
      const stage = stages[i];
      if (distInCurrentLoop < accumulatedInLoop + stage.length) {
        return {
          stageConfig: stage,
          stageIndex: i,
          loopCount: loopCount + 1, // 1-indexed for display
          isLooping: true,
          progressInStage: distInCurrentLoop - accumulatedInLoop,
          progressPercent: (distInCurrentLoop - accumulatedInLoop) / stage.length,
          distanceToNextStage: accumulatedInLoop + stage.length - distInCurrentLoop
        };
      }
      accumulatedInLoop += stage.length;
    }

    // Edge case: exactly at loop boundary
    return {
      stageConfig: stages[LOOP_START_IDX],
      stageIndex: LOOP_START_IDX,
      loopCount: loopCount + 2,
      isLooping: true,
      progressInStage: 0,
      progressPercent: 0,
      distanceToNextStage: stages[LOOP_START_IDX].length
    };
  }

  /**
   * Calculate cumulative distance for a target stage/loop (for QA warp)
   * @param {number} stageId - Target stage (1-13)
   * @param {number} loopNum - Loop count (0 = first run, N = Nth loop)
   * @returns {number} Cumulative distance to start of that stage
   */
  function getDistanceForStage(stageId, loopNum = 0) {
    if (!window.STAGE_CONFIG || !window.STAGE_CUMULATIVE) {
      return 0;
    }

    const stageIndex = stageId - 1;
    const cumulative = window.STAGE_CUMULATIVE;
    const loopStartDist = window.LOOP_START_DISTANCE;
    const loopLength = window.LOOP_SECTION_LENGTH;
    const LOOP_START_IDX = window.LOOP_START_INDEX;

    // Main progression (stages 1-10, first run)
    if (stageId <= 10 && loopNum === 0) {
      return cumulative[stageIndex] || 0;
    }

    // Loop section or main with loop specified
    if (stageId >= 11) {
      // Calculate distance within one loop cycle
      let distInLoop = 0;
      for (let i = LOOP_START_IDX; i < stageIndex; i++) {
        distInLoop += window.STAGE_CONFIG[i].length;
      }
      return loopStartDist + (loopNum * loopLength) + distInLoop;
    }

    // Stages 1-10 with loop > 0 (warp to main stage in a specific loop)
    // This means complete all loops first, then go back (not typical use case)
    return cumulative[stageIndex] || 0;
  }

  /**
   * Clean up rows that are far behind the given y-position (e.g., storm)
   * @param {number} minY - Reference y position (rows below this + margin are removed)
   */
  function cleanupRows(minY) {
    const cutoff = minY + (CELL_H * 6); // keep small buffer behind storm
    for (const key in rows) {
      const rowIndex = parseInt(key, 10);
      if (Number.isNaN(rowIndex)) continue;
      const rowY = rowIndex * CELL_H;
      if (rowY > cutoff) {
        delete rows[key];
      }
    }
  }

  // LevelManager 객체 정의
  const LevelManager = {
    generateRow,
    pickSafeTargetColor,
    reset,
    getRow,
    cleanupRows,
    // Stage system functions
    getStageInfo,
    getDistanceForStage,
    // 상수 노출 (외부에서 필요할 경우)
    COLS,
    CELL_H
  };

  // 전역 등록
  window.Game = window.Game || {};
  window.Game.LevelManager = LevelManager;
})();
