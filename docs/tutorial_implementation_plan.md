# RUN N STOP 튜토리얼 시스템 구현 계획

## 1. 개요

docs/tutorial_system_full.md 문서를 기반으로 4단계 튜토리얼 시스템을 구현합니다.

## 2. 파일 구조

### 새로 생성할 파일
| 파일 경로 | 설명 |
|-----------|------|
| `assets/js/game/tutorial.js` | 튜토리얼 핵심 로직 (TutorialManager) |
| `assets/js/game/tutorialConfig.js` | 튜토리얼 전용 StageConfig 오버라이드 |
| `assets/js/ui/tutorialUI.js` | 튜토리얼 UI (힌트, 하이라이트, 메시지) |
| `assets/css/tutorial.css` | 튜토리얼 전용 스타일 |

### 수정할 파일
| 파일 경로 | 수정 내용 |
|-----------|-----------|
| `index.html` | 튜토리얼 화면 및 로비 버튼 추가 |
| `assets/js/main.js` | 튜토리얼 진입 로직 |
| `assets/js/ui/navigation.js` | 튜토리얼 화면 전환 |
| `assets/js/game/lifecycle.js` | 튜토리얼 모드 핸들러 연결 |
| `assets/js/game/loop.js` | 튜토리얼 모드 분기 처리 |
| `assets/js/core/storage.js` | tutorialCompleted 저장 |

---

## 3. 핵심 구현 사항

### 3.1 튜토리얼 상태 관리 (tutorial.js)

```javascript
const TutorialState = {
  step: 0,           // 현재 단계 (1-4)
  isActive: false,   // 튜토리얼 진행 중 여부
  retryCount: 0,     // 재시도 횟수
  stepProgress: {},  // 단계별 진행 상황
};

// 주요 함수
TutorialManager = {
  init(),                    // 초기화
  startTutorial(step),       // 튜토리얼 시작 (특정 단계부터 가능)
  getCurrentStep(),          // 현재 단계 반환
  checkStepCondition(),      // 성공 조건 체크
  onStepComplete(),          // 단계 완료 처리
  retryStep(),               // 재시도 처리
  onTutorialComplete(),      // 전체 완료 처리
};
```

### 3.2 단계별 설정 (tutorialConfig.js)

| Step | gameState | 스톰 | 장애물 | 아이템 | 성공조건 |
|------|-----------|------|--------|--------|----------|
| 1 | RUN 고정 | 없음 | 없음 | 없음 | 이동+대쉬 각 1회 |
| 2 | 사이클 동작 | 없음 | 없음 | 없음 | 2회 안전 판정 성공 |
| 3 | 사이클 동작 | 느림(50%) | 있음 | 있음 | 300m 도달 |
| 4 | 정상 동작 | 정상 | 있음 | 있음 | 500m 도달 |

```javascript
const TUTORIAL_STEP_CONFIG = {
  1: {
    name: '기본 조작',
    lockGameState: 'RUN',      // RUN 상태 고정
    stormEnabled: false,
    obstaclesEnabled: false,
    itemsEnabled: false,
    successCondition: { moveCount: 1, dashCount: 1 },
  },
  2: {
    name: '핵심 메커니즘',
    lockGameState: null,       // 정상 사이클
    stormEnabled: false,
    obstaclesEnabled: false,
    itemsEnabled: false,
    successCondition: { safeJudgmentCount: 2 },
  },
  3: {
    name: '위험 요소',
    lockGameState: null,
    stormEnabled: true,
    stormSpeedMult: 0.5,       // 50% 속도
    obstaclesEnabled: true,
    itemsEnabled: true,
    successCondition: { distance: 300 },
  },
  4: {
    name: '실전 시뮬레이션',
    lockGameState: null,
    stormEnabled: true,
    stormSpeedMult: 1.0,       // 정상 속도
    obstaclesEnabled: true,
    itemsEnabled: true,
    successCondition: { distance: 500 },
  },
};
```

### 3.3 기존 loop.js 통합

```javascript
// loop.js의 handlers에 튜토리얼 분기 추가
const handlers = {
  onDie: (reason) => {
    if (runtime.tutorialMode) {
      // 튜토리얼 모드: 재시도 처리
      window.TutorialManager.retryStep();
    } else {
      // 일반 모드: 기존 사망 처리
      handleDeath(reason);
    }
  }
};

// update() 함수 내 튜토리얼 분기
function update(dt, nowSec) {
  // Step 1: RUN 상태 고정
  if (runtime.tutorialMode && runtime.tutorialStep === 1) {
    runtime.gameState = STATE.RUN;
    // 상태 전환 로직 스킵
  }

  // Step 2: 스톰 비활성화
  if (runtime.tutorialMode && runtime.tutorialStep <= 2) {
    // 스톰 업데이트 스킵
  }

  // ... 기존 로직
}
```

### 3.4 Storage 확장

```javascript
// storage.js - DEFAULT_DATA에 추가
const DEFAULT_DATA = {
  coins: 0,
  gems: 1000,
  unlockedSkins: [0],
  equippedSkin: 0,
  unlockedTreasures: [],
  equippedTreasures: [null, null],
  stats: { maxDist: 0, totalCoins: 0, totalGames: 0, totalDeaths: 0, highScore: 0 },
  // 튜토리얼 필드 추가
  tutorialCompleted: false,    // 튜토리얼 완료 여부
  tutorialProgress: 0,         // 마지막 완료 단계 (재진입용)
};
```

---

## 4. 세부 구현 계획

### Phase 1: 기반 구조

#### tutorial.js
```javascript
(function() {
  'use strict';

  const TutorialManager = {
    state: {
      step: 0,
      isActive: false,
      retryCount: 0,
      moveDetected: false,
      dashDetected: false,
      safeJudgmentCount: 0,
      startDistance: 0,
    },

    init() {
      this.state = { step: 0, isActive: false, retryCount: 0 };
    },

    startTutorial(step = 1) {
      this.state.step = step;
      this.state.isActive = true;
      this.state.retryCount = 0;
      this.resetStepProgress();

      // runtime에 튜토리얼 모드 설정
      if (window.runtime) {
        window.runtime.tutorialMode = true;
        window.runtime.tutorialStep = step;
      }

      // UI 업데이트
      window.TutorialUI?.showStep(step);

      // 게임 시작
      this.startGameForStep(step);
    },

    checkStepCondition() {
      const config = TUTORIAL_STEP_CONFIG[this.state.step];
      const condition = config.successCondition;

      if (condition.moveCount && condition.dashCount) {
        return this.state.moveDetected && this.state.dashDetected;
      }
      if (condition.safeJudgmentCount) {
        return this.state.safeJudgmentCount >= condition.safeJudgmentCount;
      }
      if (condition.distance) {
        const traveled = window.player?.y - this.state.startDistance;
        return traveled >= condition.distance;
      }
      return false;
    },

    onStepComplete() {
      this.state.step++;

      if (this.state.step > 4) {
        this.onTutorialComplete();
      } else {
        this.resetStepProgress();
        window.TutorialUI?.showStepTransition(this.state.step);
        this.startGameForStep(this.state.step);
      }
    },

    retryStep() {
      this.state.retryCount++;
      this.resetStepProgress();

      // 힌트 UI 활성화 (3회 실패 시)
      if (this.state.retryCount >= 3) {
        window.TutorialUI?.showHint(this.state.step);
      }

      window.TutorialUI?.showRetryMessage();
      this.startGameForStep(this.state.step);
    },

    onTutorialComplete() {
      this.state.isActive = false;

      // 저장
      const gameData = window.loadGameData();
      gameData.tutorialCompleted = true;
      gameData.tutorialProgress = 4;
      window.persistGameData(gameData);

      // 완료 연출 후 로비로
      window.TutorialUI?.showCompletionAnimation(() => {
        window.Navigation.go('lobby');
      });
    },

    // ... 헬퍼 함수들
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();
```

#### tutorialConfig.js
```javascript
(function() {
  'use strict';

  const TUTORIAL_STEP_CONFIG = {
    1: {
      name: '기본 조작',
      description: '이동과 대쉬를 배웁니다',
      lockGameState: 'RUN',
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      successCondition: { moveCount: 1, dashCount: 1 },
      hints: ['좌우로 이동하세요', '대쉬 버튼을 누르세요'],
    },
    2: {
      name: '핵심 메커니즘',
      description: 'RUN/WARNING/STOP 사이클을 배웁니다',
      lockGameState: null,
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      // 타이밍을 더 느리게
      warningTimeBase: 10.0,
      stopPhaseDuration: 2.0,
      successCondition: { safeJudgmentCount: 2 },
      hints: ['경고 시 안전 색상을 확인하세요', '색상 타일 위에 서세요'],
    },
    3: {
      name: '위험 요소',
      description: '스톰과 장애물을 피하세요',
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 0.5,
      obstaclesEnabled: true,
      itemsEnabled: true,
      successCondition: { distance: 300 },
      hints: ['스톰을 피하세요', '아이템을 획득하세요'],
    },
    4: {
      name: '실전 시뮬레이션',
      description: '500m를 완주하세요',
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 1.0,
      obstaclesEnabled: true,
      itemsEnabled: true,
      successCondition: { distance: 500 },
      hints: [],
    },
  };

  // StageConfig 오버라이드 함수
  function getTutorialConfig(step) {
    return TUTORIAL_STEP_CONFIG[step] || TUTORIAL_STEP_CONFIG[1];
  }

  function applyTutorialOverrides(effectiveConfig, step) {
    const tutorialConfig = getTutorialConfig(step);

    if (tutorialConfig.stormSpeedMult !== undefined) {
      effectiveConfig.stormSpeed *= tutorialConfig.stormSpeedMult;
    }
    if (tutorialConfig.warningTimeBase !== undefined) {
      effectiveConfig.warningTimeBase = tutorialConfig.warningTimeBase;
    }
    if (tutorialConfig.stopPhaseDuration !== undefined) {
      effectiveConfig.stopPhaseDuration = tutorialConfig.stopPhaseDuration;
    }

    return effectiveConfig;
  }

  window.TutorialConfig = {
    STEP_CONFIG: TUTORIAL_STEP_CONFIG,
    getConfig: getTutorialConfig,
    applyOverrides: applyTutorialOverrides,
  };
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialConfig = window.TutorialConfig;
})();
```

### Phase 2: UI 구현

#### tutorialUI.js
```javascript
(function() {
  'use strict';

  const TutorialUI = {
    elements: {},

    init() {
      this.elements = {
        container: document.getElementById('tutorial-hint-container'),
        progress: document.getElementById('tutorial-progress'),
        message: document.getElementById('tutorial-message'),
      };
    },

    showStep(step) {
      const config = window.TutorialConfig.STEP_CONFIG[step];
      this.elements.progress.textContent = `Step ${step}/4`;
      this.showMessage(config.description, 3000);
    },

    showHint(step) {
      const config = window.TutorialConfig.STEP_CONFIG[step];
      const hints = config.hints || [];

      if (hints.length > 0) {
        this.showArrowHint(hints[0]);
      }
    },

    showArrowHint(text) {
      const hint = document.createElement('div');
      hint.className = 'tutorial-hint';
      hint.innerHTML = `<span class="hint-text">${text}</span>`;
      this.elements.container.appendChild(hint);

      // 애니메이션 후 제거
      setTimeout(() => hint.remove(), 5000);
    },

    showMessage(text, duration = 2000) {
      this.elements.message.textContent = text;
      this.elements.message.classList.add('visible');

      setTimeout(() => {
        this.elements.message.classList.remove('visible');
      }, duration);
    },

    showRetryMessage() {
      this.showMessage('다시 시도하세요', 1500);
    },

    showStepTransition(nextStep) {
      this.showMessage(`Step ${nextStep} 시작!`, 2000);
    },

    showCompletionAnimation(callback) {
      this.showMessage('튜토리얼 완료!', 3000);
      setTimeout(callback, 3000);
    },

    highlightElement(selector) {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.add('tutorial-highlight');
      }
    },

    removeHighlight(selector) {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.remove('tutorial-highlight');
      }
    },
  };

  window.TutorialUI = TutorialUI;
})();
```

### Phase 3: HTML/CSS 추가

#### index.html 수정
```html
<!-- 튜토리얼 화면 (screen-lobby 앞에 추가) -->
<div id="screen-tutorial" class="full-screen">
  <canvas id="game-canvas-tutorial"></canvas>

  <!-- 튜토리얼 오버레이 -->
  <div id="tutorial-overlay">
    <div id="tutorial-progress">Step 1/4</div>
    <div id="tutorial-hint-container"></div>
    <div id="tutorial-message"></div>
  </div>
</div>

<!-- 로비에 튜토리얼 버튼 추가 (footer 내부) -->
<div class="lobby-footer">
  <button id="btn-start">GAME START</button>
  <button id="btn-shop">SHOP</button>
  <button id="btn-tutorial" class="lobby-btn-circle" title="Tutorial">
    <span>?</span>
  </button>
</div>
```

#### tutorial.css
```css
/* 튜토리얼 오버레이 */
#tutorial-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
}

#tutorial-progress {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

#tutorial-message {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0,0,0,0.8);
  border-radius: 8px;
  color: #fff;
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.3s;
}

#tutorial-message.visible {
  opacity: 1;
}

.tutorial-hint {
  position: absolute;
  bottom: 200px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(255,255,0,0.9);
  border-radius: 4px;
  color: #000;
  font-weight: bold;
  animation: hint-pulse 1s infinite;
}

@keyframes hint-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.05); }
}

.tutorial-highlight {
  animation: highlight-glow 1s infinite;
}

@keyframes highlight-glow {
  0%, 100% { box-shadow: 0 0 10px 5px rgba(255,255,0,0.5); }
  50% { box-shadow: 0 0 20px 10px rgba(255,255,0,0.8); }
}

/* 로비 튜토리얼 버튼 */
#btn-tutorial {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #4a4a4a;
  border: 2px solid #fff;
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
}

#btn-tutorial:hover {
  background: #6a6a6a;
}
```

### Phase 4: 기존 파일 수정

#### main.js 수정
```javascript
// DOMContentLoaded 핸들러에 추가
window.addEventListener('DOMContentLoaded', () => {
  // ... 기존 초기화 코드

  // 튜토리얼 완료 여부 확인
  const gameData = loadGameData();
  window.shouldStartTutorial = !gameData.tutorialCompleted;

  // 튜토리얼 매니저 초기화
  if (window.TutorialManager) {
    window.TutorialManager.init();
  }
  if (window.TutorialUI) {
    window.TutorialUI.init();
  }
});

// triggerTitleGlitchOut 또는 타이틀 터치 핸들러 수정
function onTitleTouch() {
  if (window.shouldStartTutorial) {
    // 튜토리얼로 진입
    window.TutorialManager.startTutorial(1);
    Navigation.go('tutorial');
  } else {
    // 기존 로비로 진입
    Navigation.go('lobby');
  }
}

// 로비 튜토리얼 버튼 핸들러
document.getElementById('btn-tutorial')?.addEventListener('click', () => {
  window.TutorialManager.startTutorial(1);
  Navigation.go('tutorial');
});
```

#### loop.js 수정
```javascript
// createGameLoop 함수 내 update() 수정
function update(dt, nowSec) {
  // 튜토리얼 Step 1: RUN 상태 고정
  if (runtime.tutorialMode && runtime.tutorialStep === 1) {
    runtime.gameState = STATE.RUN;
    runtime.cycleTimer = 999; // 타이머 리셋 방지
  }

  // 튜토리얼 Step 1-2: 스톰 비활성화
  if (runtime.tutorialMode && runtime.tutorialStep <= 2) {
    runtime.storm.y = -99999; // 스톰을 화면 밖으로
  }

  // 튜토리얼 성공 조건 체크
  if (runtime.tutorialMode) {
    checkTutorialProgress();
  }

  // ... 기존 update 로직
}

// 튜토리얼 진행 체크 함수
function checkTutorialProgress() {
  if (window.TutorialManager?.checkStepCondition()) {
    window.TutorialManager.onStepComplete();
  }
}

// checkStopJudgment 수정 - 튜토리얼 성공 카운트
function checkStopJudgment(nowSec) {
  // ... 기존 로직

  if (result.genuineSafe && runtime.tutorialMode) {
    window.TutorialManager.state.safeJudgmentCount++;
  }

  // 튜토리얼 모드에서 실패 시
  if (!result.isSafe && runtime.tutorialMode) {
    window.TutorialManager.retryStep();
    return; // handlers.onDie 호출 방지
  }

  // ... 기존 로직
}
```

#### lifecycle.js 수정
```javascript
// handleDeath 함수 수정
function handleDeath(reason) {
  // 튜토리얼 모드 체크
  if (runtime.tutorialMode) {
    window.TutorialManager?.retryStep();
    return;
  }

  // ... 기존 사망 처리 로직
}
```

#### navigation.js 수정
```javascript
// Navigation.go 함수에 tutorial 케이스 추가
go(screenId) {
  // ... 기존 로직

  if (screenId === 'tutorial') {
    // 튜토리얼 화면 표시
    document.getElementById('screen-tutorial').classList.add('active-screen');
  }
}
```

#### storage.js 수정
```javascript
// DEFAULT_DATA 수정
const DEFAULT_DATA = {
  coins: 0,
  gems: 1000,
  unlockedSkins: [0],
  equippedSkin: 0,
  unlockedTreasures: [],
  equippedTreasures: [null, null],
  stats: {
    maxDist: 0,
    totalCoins: 0,
    totalGames: 0,
    totalDeaths: 0,
    highScore: 0
  },
  // 튜토리얼 필드 추가
  tutorialCompleted: false,
  tutorialProgress: 0
};
```

---

## 5. 구현 순서

| 순서 | 파일 | 작업 내용 |
|------|------|-----------|
| 1 | storage.js | tutorialCompleted, tutorialProgress 필드 추가 |
| 2 | tutorialConfig.js | 새 파일 생성 - 단계별 설정값 정의 |
| 3 | tutorial.js | 새 파일 생성 - TutorialManager 핵심 로직 |
| 4 | tutorialUI.js | 새 파일 생성 - UI 컴포넌트 |
| 5 | tutorial.css | 새 파일 생성 - 스타일 |
| 6 | index.html | 튜토리얼 화면 및 로비 버튼 추가 |
| 7 | loop.js | 튜토리얼 모드 분기 처리 |
| 8 | lifecycle.js | 핸들러 연결 |
| 9 | navigation.js | 화면 전환 추가 |
| 10 | main.js | 진입 로직 및 초기화 |

---

## 6. 테스트 체크리스트

### 기본 동작
- [ ] 최초 실행 시 튜토리얼 자동 진입
- [ ] Step 1: 이동 감지 동작
- [ ] Step 1: 대쉬 감지 동작
- [ ] Step 1: 완료 후 Step 2 전환
- [ ] Step 2: RUN/WARNING/STOP 사이클 동작
- [ ] Step 2: 안전 판정 성공 카운트
- [ ] Step 2: 안전 판정 실패 시 재시도
- [ ] Step 2: 2회 성공 시 Step 3 전환
- [ ] Step 3: 느린 스톰 동작
- [ ] Step 3: 장애물/아이템 출현
- [ ] Step 3: 300m 도달 시 Step 4 전환
- [ ] Step 4: 정상 게임플레이
- [ ] Step 4: 500m 도달 시 완료

### 저장/진입
- [ ] tutorialCompleted 저장 확인
- [ ] 재접속 시 로비로 직행
- [ ] 로비 튜토리얼 버튼 동작
- [ ] 재진입 시 Step 1부터 시작

### UI
- [ ] Step 진행 표시 (1/4, 2/4...)
- [ ] 힌트 메시지 표시
- [ ] 재시도 메시지 표시
- [ ] 완료 애니메이션
- [ ] 하이라이트 효과

---

## 7. 참고 사항

### 기존 코드 재사용
- `createGameLoop()` - 게임 루프 그대로 사용
- `checkStopJudgment()` - 안전 판정 로직 재사용
- `checkFallDie()` - 낙사 판정 재사용
- `getEffectiveConfig()` - StageConfig 시스템 활용
- `Navigation.go()` - 화면 전환 시스템 활용

### 튜토리얼 전용 오버라이드
- `runtime.tutorialMode` - 튜토리얼 모드 플래그
- `runtime.tutorialStep` - 현재 단계 (1-4)
- `TutorialConfig.applyOverrides()` - 설정값 오버라이드
