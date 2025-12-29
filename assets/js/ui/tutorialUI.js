(function() {
  'use strict';

  const TutorialUI = {
    elements: {},
    messageTimeout: null, // messageTimeout을 여기에 정의

    init() {
      this.elements = {
        container: document.getElementById('tutorial-overlay'), // 컨테이너를 오버레이 전체로 변경
        progress: document.getElementById('tutorial-progress'),
        message: document.getElementById('tutorial-message'),
        // hintArrow: document.getElementById('tutorial-hint-arrow'), // 화살표 엘리먼트 (필요 시 추가)
      };
      // 초기에는 모든 HUD를 숨김 (게임 시작 시 TutorialUI.updateUIVisibility로 제어)
      document.getElementById('hud').style.display = 'none';
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
      let highlightSelector = null; // 강조할 DOM 요소를 위한 선택자

      if (step === 1) { // Step 1: 기본 조작
        if (subStep === 1 && texts.hints.move) {
          hintText = texts.hints.move[platform] || texts.hints.move.pc;
          highlightSelector = platform === 'mobile' ? '#joystick-zone' : null; // PC는 전체 화면에 대한 조작이므로 특정 요소 강조 없음
        } else if (subStep === 2 && texts.hints.dash) {
          hintText = texts.hints.dash[platform] || texts.hints.dash.pc;
          highlightSelector = '#dash-zone'; // 대쉬 버튼 강조
        }
      } else if (step === 2) { // Step 2: 핵심 메커니즘
        if (texts.hints.safeJudgment) {
          hintText = texts.hints.safeJudgment[platform] || texts.hints.safeJudgment.pc;
          highlightSelector = '#target-display'; // 색상 패널 강조
        }
      } else if (step === 3) { // Step 3: 위험 요소
        if (texts.hints.avoidStorm) {
          hintText = texts.hints.avoidStorm[platform] || texts.hints.avoidStorm.pc;
          highlightSelector = '#chase-ui'; // 스톰 게이지 강조
        }
        // 아이템 획득 힌트 (필요시 subStep 추가 또는 조건부 표시)
      } else if (step === 4) { // Step 4: 실전 시뮬레이션
        if (texts.hints.completeRun) {
          hintText = texts.hints.completeRun[platform] || texts.hints.completeRun.pc;
        }
      }
      
      this.removeHighlights(); // 기존 하이라이트 제거
      if (highlightSelector) {
        this.highlightElement(highlightSelector);
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
      const texts = window.TutorialConfig.TEXTS[nextStep];
      this.showMessage(`Step ${nextStep} 시작! ${texts.description}`, 2000);
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

    removeHighlights() {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    },

    // 튜토리얼 단계별 UI 가시성 관리
    updateUIVisibility(step) {
      const UI_VISIBILITY_CONFIG = {
        '#mobile-controls': { 1: 'visible', 2: 'visible', 3: 'visible', 4: 'visible' },
        '#hud-left': { 1: 'hidden', 2: 'hidden', 3: 'visible', 4: 'visible' },
        '#buff-container': { 1: 'hidden', 2: 'hidden', 3: 'visible', 4: 'visible' },
        '#target-display': { 1: 'hidden', 2: 'visible', 3: 'visible', 4: 'visible' },
        '#status-bar-container': { 1: 'hidden', 2: 'visible', 3: 'visible', 4: 'visible' },
        '#btn-pause': { 1: 'visible', 2: 'visible', 3: 'visible', 4: 'visible' },
        '#chase-ui': { 1: 'hidden', 2: 'hidden', 3: 'visible', 4: 'visible' },
        '#hud': { 1: 'visible', 2: 'visible', 3: 'visible', 4: 'visible'}, // HUD 전체는 항상 visible, 내부 요소만 제어
      };
      
      for (const selector in UI_VISIBILITY_CONFIG) {
        const element = document.querySelector(selector);
        if (element) {
          element.style.display = UI_VISIBILITY_CONFIG[selector][step];
        }
      }
      // HUD 본체는 항상 visible
      document.getElementById('hud').style.display = 'block';
    },
  };

  window.TutorialUI = TutorialUI;
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialUI = window.TutorialUI;
})();
