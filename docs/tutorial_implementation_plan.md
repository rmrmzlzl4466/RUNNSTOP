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
  if (runtime.tutorialMode) {
    window.TutorialManager.checkEventTriggers();
    if (window.TutorialManager.checkStepCondition()) {
      window.TutorialManager.onStepComplete();
    }
  }

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
  // ... (기존 데이터)
  // 튜토리얼 필드 추가
  tutorialCompleted: false,    // 튜토리얼 완료 여부
  tutorialProgress: 0,         // 마지막 완료 단계 (재진입용)
};
```

### 3.5 튜토리얼 단계별 UI 가시성

| UI Element ID | 설명 | Step 1 (이동/대시) | Step 2 (사이클) | Step 3 (위험요소) | Step 4 (실전) |
|---|---|:---:|:---:|:---:|:---:|
| `#mobile-controls` | 조작 UI (조이스틱, 대시) | Visible | Visible | Visible | Visible |
| `#hud-left` | 점수/코인/보석 | Hidden | Hidden | Visible | Visible |
| `#buff-container` | 버프 아이템 | Hidden | Hidden | Visible | Visible |
| `#target-display` | 색상 패널 | Hidden | Visible | Visible | Visible |
| `#status-bar-container` | 상태 바 | Hidden | Visible | Visible | Visible |
| `#btn-pause` | 일시정지 버튼 | Visible | Visible | Visible | Visible |
| `#chase-ui` | 스톰 게이지 | Hidden | Hidden | Visible | Visible |

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
      subStep: 0, // 각 Step 내부의 하위 단계 (예: Step 1-1: 이동, Step 1-2: 대쉬)
      isActive: false,
      retryCount: 0,
      moveDetected: false,
      dashDetected: false,
      safeJudgmentCount: 0,
      startDistance: 0,
      platform: 'unknown', // 'pc' or 'mobile'
    },

    init() {
      this.state = { step: 0, subStep: 0, isActive: false, retryCount: 0, platform: this.detectPlatform() };
    },

    detectPlatform() {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      return isMobile ? 'mobile' : 'pc';
    },

    startTutorial(step = 1) {
      this.state.step = step;
      this.state.subStep = 1; // 첫 번째 하위 단계부터 시작
      this.state.isActive = true;
      this.state.retryCount = 0;
      this.resetStepProgress();

      // runtime에 튜토리얼 모드 설정
      if (window.runtime) {
        window.runtime.tutorialMode = true;
        window.runtime.tutorialStep = step;
        window.runtime.tutorialSubStep = this.state.subStep;
      }

      // UI 업데이트
      window.TutorialUI?.showStep(step, this.state.subStep); // subStep 정보 추가 전달
      window.TutorialUI?.showHint(step, this.state.subStep, this.state.platform); // 플랫폼 정보 전달

      // 게임 시작
      this.startGameForStep(step);
    },

    checkStepCondition() {
      const config = window.TutorialConfig.getConfig(this.state.step); // getConfig 사용
      const condition = config.successCondition;

      if (this.state.step === 1) { // Step 1: 기본 조작
        if (this.state.subStep === 1) { // 이동 학습
          return this.state.moveDetected;
        }
        if (this.state.subStep === 2) { // 대쉬 학습
          return this.state.dashDetected;
        }
      }
      
      if (this.state.step === 2) { // Step 2: 핵심 메커니즘
        return this.state.safeJudgmentCount >= condition.safeJudgmentCount;
      }
      if (this.state.step === 3 || this.state.step === 4) { // Step 3, 4: 거리 기반
        const traveled = window.player?.y - this.state.startDistance;
        return traveled >= condition.distance;
      }
      return false;
    },

    checkEventTriggers() {
      const config = window.TutorialConfig.getConfig(this.state.step);
      if (!config.eventTriggers) return;

      const traveled = window.player?.y - this.state.startDistance;

      config.eventTriggers.forEach(trigger => {
        if (trigger.triggered) return;

        let conditionMet = false;
        if (trigger.type === 'distance' && traveled >= trigger.value) {
          conditionMet = true;
        } else if (trigger.type === 'fixed_position' && window.player?.y >= trigger.value) {
          conditionMet = true;
        }
        
        if (conditionMet) {
          this.handleEventTrigger(trigger.action);
          trigger.triggered = true; // 한 번만 실행되도록 플래그 설정
        }
      });
    },

    handleEventTrigger(action) {
      switch(action) {
        case 'start_run_stop_cycle':
          // GameModules.Loop 또는 runtime의 특정 함수를 호출하여 사이클 시작
          console.log("TUTORIAL: Run/Stop cycle starts now.");
          break;
        case 'spawn_item_shield':
          // GameModules.Items.spawnItemAt() 같은 함수 호출
          console.log("TUTORIAL: Spawning shield item.");
          break;
        case 'activate_storm':
          // runtime.storm.active = true; 와 같이 스톰 활성화
          console.log("TUTORIAL: Storm is now active.");
          break;
      }
    },

    onStepComplete() {
      if (this.state.step === 1) {
        if (this.state.subStep === 1) { // 이동 완료 -> 대쉬로 진행
          this.state.subStep++;
          window.runtime.tutorialSubStep = this.state.subStep;
          this.resetStepProgress(); // 대쉬 관련 상태 리셋
          window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform);
          return; // 아직 전체 Step 완료 아님
        }
      }

      // 현재 Step 완료 처리
      this.state.step++;
      this.state.subStep = 1; // 다음 Step의 첫 번째 subStep으로 시작
      window.runtime.tutorialStep = this.state.step;
      window.runtime.tutorialSubStep = this.state.subStep;

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
        window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform); // 플랫폼 정보 전달
      }

      window.TutorialUI?.showRetryMessage();
      this.startGameForStep(this.state.step);
    },

    resetStepProgress() {
      this.state.moveDetected = false;
      this.state.dashDetected = false;
      this.state.safeJudgmentCount = 0;
      this.state.startDistance = window.player?.y || 0; // 현재 플레이어 위치를 시작 지점으로 설정
    },

    startGameForStep(step) {
      // GameModules.Lifecycle.startGame() 호출 등 실제 게임 시작 로직
      // 튜토리얼 전용 StageConfig 오버라이드 적용
      const tutorialStageConfig = window.TutorialConfig.applyOverrides(
        { ...window.StageConfig.getGlobalConfig() }, // 전역 config 복사
        step
      );
      window.runtime.currentStage = tutorialStageConfig; // 튜토리얼 스펙 적용
      window.GameModules.Lifecycle.startGame(); // 게임 루프 시작
    },
```

#### tutorialConfig.js
```javascript
(function() {
  'use strict';

  const TUTORIAL_STEP_CONFIG = {
    1: {
      lockGameState: 'RUN',
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      successCondition: { moveCount: 1, dashCount: 1 },
      eventTriggers: [], // 1단계는 즉시 시작
    },
    2: {
      lockGameState: null,
      stormEnabled: false,
      obstaclesEnabled: false,
      itemsEnabled: false,
      stormSpeedMult: 0,
      warningTimeBase: 10.0,
      stopPhaseDuration: 2.0,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'], // 튜토리얼 전용 색상
      successCondition: { safeJudgmentCount: 2 },
      eventTriggers: [
        { type: 'distance', value: 50, action: 'start_run_stop_cycle', triggered: false }
      ],
    },
    3: {
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 0.5,
      obstaclesEnabled: true,
      itemsEnabled: true,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'], // 튜토리얼 전용 색상
      successCondition: { distance: 300 },
      eventTriggers: [
        { type: 'fixed_position', value: 100, action: 'spawn_item_shield', triggered: false },
        { type: 'distance', value: 150, action: 'activate_storm', triggered: false }
      ],
    },
    4: {
      lockGameState: null,
      stormEnabled: true,
      stormSpeedMult: 1.0,
      obstaclesEnabled: true,
      itemsEnabled: true,
      colorPalette: ['NEON_GREEN', 'NEON_PINK'], // 튜토리얼 전용 색상
      successCondition: { distance: 500 },
      eventTriggers: [], // 4단계는 즉시 모든 요소 활성화
    },
  };

  const TUTORIAL_TEXTS = {
    1: {
      name: '기본 조작',
      description: '이동과 대쉬를 배웁니다',
      hints: {
        move: {
          pc: 'WASD 키를 눌러 이동하세요',
          mobile: '조이스틱을 움직여 이동하세요',
        },
        dash: {
          pc: '스페이스바를 눌러 대쉬하세요',
          mobile: '대쉬 버튼을 누르세요',
        }
      },
    },
    2: {
      name: '핵심 메커니즘',
      description: 'RUN/WARNING/STOP 사이클을 배웁니다',
      hints: {
        safeJudgment: {
          pc: '경고 시 안전 색상을 확인하고 타일 위에 서세요',
          mobile: '경고 시 안전 색상을 확인하고 타일 위에 서세요',
        },
      },
    },
    3: {
      name: '위험 요소',
      description: '스톰과 장애물을 피하세요',
      hints: {
        avoidStorm: {
          pc: '스톰을 피하세요',
          mobile: '스톰을 피하세요',
        },
        collectItem: {
          pc: '아이템을 획득하세요',
          mobile: '아이템을 획득하세요',
        }
      },
    },
    4: {
      name: '실전 시뮬레이션',
      description: '500m를 완주하세요',
      hints: {
        completeRun: {
          pc: '최종 튜토리얼을 완료하세요!',
          mobile: '최종 튜토리얼을 완료하세요!',
        }
      },
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
        container: document.getElementById('tutorial-overlay'), // 컨테이너를 오버레이 전체로 변경
        progress: document.getElementById('tutorial-progress'),
        message: document.getElementById('tutorial-message'),
        // hintArrow: document.getElementById('tutorial-hint-arrow'), // 화살표 엘리먼트 (필요 시 추가)
      };
      this.messageTimeout = null;
    },

    showStep(step, subStep) {
      const texts = window.TutorialConfig.TEXTS[step];
      this.elements.progress.textContent = `Step ${step}-${subStep}/4`; // subStep 정보도 표시
      this.showMessage(texts.description, 3000);
    },

    showHint(step, subStep, platform) {
      const texts = window.TutorialConfig.TEXTS[step];
      if (!texts || !texts.hints) return;

      let hintText = '';
      if (step === 1) { // Step 1: 기본 조작
        if (subStep === 1 && texts.hints.move) {
          hintText = texts.hints.move[platform] || texts.hints.move.pc;
          this.highlightElement(platform === 'mobile' ? '#joystick-zone' : 'body'); // 조이스틱 또는 전체 화면 강조
        } else if (subStep === 2 && texts.hints.dash) {
          hintText = texts.hints.dash[platform] || texts.hints.dash.pc;
          this.highlightElement('#dash-zone'); // 대쉬 버튼 강조
        }
      } else if (step === 2) { // Step 2: 핵심 메커니즘
        if (texts.hints.safeJudgment) {
          hintText = texts.hints.safeJudgment[platform] || texts.hints.safeJudgment.pc;
          this.highlightElement('#target-display'); // 색상 패널 강조
        }
      } else if (step === 3) { // Step 3: 위험 요소
        if (texts.hints.avoidStorm) {
          hintText = texts.hints.avoidStorm[platform] || texts.hints.avoidStorm.pc;
          // 스톰 UI 강조 (HUD의 스톰 관련 요소가 있다면)
        }
        // 아이템 획득 힌트 (필요시 subStep 추가 또는 조건부 표시)
      } else if (step === 4) { // Step 4: 실전 시뮬레이션
        if (texts.hints.completeRun) {
          hintText = texts.hints.completeRun[platform] || texts.hints.completeRun.pc;
        }
      }
      
      if (hintText) {
        this.showMessage(hintText, 3000);
      }
    },

    showMessage(text, duration = 2000, iconHtml = '') {
      clearTimeout(this.messageTimeout); // 이전 메시지 타이머 초기화

      this.elements.message.innerHTML = iconHtml ? `<span class="message-icon">${iconHtml}</span> ${text}` : text;
      this.elements.message.classList.add('visible');

      this.messageTimeout = setTimeout(() => {
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
  <!-- 튜토리얼 오버레이 -->
  <div id="tutorial-overlay">
    <div id="tutorial-progress">Step 1-1/4</div>
    <div id="tutorial-message" class="message-banner"></div>
  </div>
</div>

<!-- 로비에 튜토리얼 버튼 추가 (footer 내부) -->
<div class="lobby-footer">
  <button id="btn-start">GAME START</button>
  <button id="btn-shop">SHOP</button>
  <button id="btn-qa">QA</button>
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
  width: 100%;
  height: 100%;
  pointer-events: none; /* 하위 요소에만 이벤트 전달 */
  z-index: 120; /* 게임 UI보다 높게 */
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 메시지를 하단에 배치하기 위함 */
  align-items: center;
  padding: 20px;
}

#tutorial-progress {
  position: relative; /* overlay 내에서 top으로 */
  top: 0;
  left: auto;
  transform: none;
  padding: 8px 16px;
  background: rgba(0,0,0,0.7);
  border-radius: 20px;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  box-shadow: 0 0 10px rgba(0,255,65,0.3);
}

#tutorial-message {
  position: relative; /* overlay 내에서 bottom으로 */
  bottom: 0;
  left: auto;
  transform: none;
  padding: 12px 24px;
  background: rgba(0,0,0,0.8);
  border-radius: 8px;
  color: #fff;
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none; /* 메시지는 클릭 방해하지 않음 */
  max-width: 80%; /* 너무 길어지지 않게 */
  text-align: center;
  display: flex;
  align-items: center;
  gap: 10px;
}

#tutorial-message.visible {
  opacity: 1;
}

.message-icon {
  font-size: 24px;
  line-height: 1;
}

/* 기존 tutorial-hint (화살표) 스타일은 제거 */

.tutorial-highlight {
  animation: highlight-glow 1.5s infinite alternate;
  box-shadow: 0 0 15px 5px rgba(0,255,65,0.7), inset 0 0 10px rgba(0,255,65,0.5);
  border-radius: 12px; /* 강조할 요소에 따라 유연하게 적용 */
  z-index: 100; /* 강조되는 요소가 맨 위로 오도록 */
  position: relative; /* z-index 적용을 위해 */
}

@keyframes highlight-glow {
  0% { box-shadow: 0 0 15px 5px rgba(0,255,65,0.7), inset 0 0 10px rgba(0,255,65,0.5); }
  100% { box-shadow: 0 0 25px 8px rgba(0,255,65,1), inset 0 0 15px rgba(0,255,65,0.8); }
}

/* 로비 튜토리얼 버튼 */
#btn-tutorial {
  position: relative; /* lobby-footer 안에서 상대 위치 */
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #4a4a4a;
  border: 2px solid #fff;
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0; /* 공간이 부족해도 줄어들지 않게 */
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
