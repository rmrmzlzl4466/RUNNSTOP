(function() {
  'use strict';

  const TutorialUI = {
    elements: {},
    messageTimeout: null,
    defaultDisplays: {},

    init() {
      this.elements = {
        container: document.getElementById('tutorial-overlay'),
        progress: document.getElementById('tutorial-progress'),
        message: document.getElementById('tutorial-message'),
      };
      const complete = document.getElementById('tutorial-complete');
      if (complete) {
        this.elements.complete = complete;
      } else if (this.elements.container) {
        const completeEl = document.createElement('div');
        completeEl.id = 'tutorial-complete';
        completeEl.innerHTML = `
          <div class="tutorial-complete-title">GOOD JOB</div>
          <div class="tutorial-complete-sub">Tutorial complete</div>
        `;
        this.elements.container.appendChild(completeEl);
        this.elements.complete = completeEl;
      }
      const fade = document.getElementById('tutorial-fade');
      if (fade) {
        this.elements.fade = fade;
      } else {
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-fade';
        const host = document.getElementById('game-surface') || document.getElementById('game-container') || document.body;
        host.appendChild(overlay);
        this.elements.fade = overlay;
      }
      this.setActive(false);
    },

    showStep(step, subStep) {
      const texts = window.TutorialConfig.getTexts?.(step) ?? window.TutorialConfig.TEXTS?.[step];
      if (this.elements.progress) {
        this.elements.progress.textContent = `Step ${step}-${subStep}/4`;
      }
      if (texts?.description) {
        this.showMessage(texts.description, 3000);
      }
    },

    showHint(step, subStep, platform) {
      const texts = window.TutorialConfig.getTexts?.(step) ?? window.TutorialConfig.TEXTS?.[step];
      if (!texts || !texts.hints) return;

      let hintText = '';
      let highlightSelector = null;

      if (step === 1) {
        if (subStep === 1 && texts.hints.move) {
          hintText = texts.hints.move[platform] || texts.hints.move.pc;
          highlightSelector = platform === 'mobile' ? '#joystick-zone' : null;
        } else if (subStep === 2 && texts.hints.dash) {
          hintText = texts.hints.dash[platform] || texts.hints.dash.pc;
          highlightSelector = '#dash-zone';
        }
      } else if (step === 2) {
        if (texts.hints.safeJudgment) {
          hintText = texts.hints.safeJudgment[platform] || texts.hints.safeJudgment.pc;
          highlightSelector = '#target-display';
        }
      } else if (step === 3) {
        if (texts.hints.avoidStorm) {
          hintText = texts.hints.avoidStorm[platform] || texts.hints.avoidStorm.pc;
          highlightSelector = '#chase-ui';
        }
      } else if (step === 4) {
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
      clearTimeout(this.messageTimeout);

      if (this.elements.message) {
        this.elements.message.innerHTML = iconHtml ? `<span class="message-icon">${iconHtml}</span> ${text}` : text;
        this.elements.message.classList.add('visible');
      }

      this.messageTimeout = setTimeout(() => {
        this.elements.message?.classList.remove('visible');
      }, duration);
    },

    showRetryMessage() {
      this.showMessage('Try again', 1500);
    },

    showStepTransition(nextStep) {
      const texts = window.TutorialConfig.getTexts?.(nextStep) ?? window.TutorialConfig.TEXTS?.[nextStep];
      const desc = texts?.description ? ` ${texts.description}` : '';
      this.showMessage(`Step ${nextStep} 시작!${desc}`, 2000);
    },

    showCompletionAnimation(callback) {
      this.showMessage('Tutorial complete!', 3000);
      setTimeout(callback, 3000);
    },

    showCompletionSequence({ isNewRecord = false, onDone } = {}) {
      const completeEl = this.elements.complete;
      if (!completeEl) {
        if (onDone) onDone();
        return;
      }

      const titleEl = completeEl.querySelector('.tutorial-complete-title');
      const subEl = completeEl.querySelector('.tutorial-complete-sub');
      if (titleEl) titleEl.textContent = 'GOOD JOB';
      if (subEl) subEl.textContent = isNewRecord ? 'NEW RECORD!' : 'Tutorial complete';

      this.removeHighlights();
      this.setActive(true);
      this.elements.message?.classList.remove('visible');
      completeEl.classList.add('show');

      window.Sound?.sfx?.('boost_ready');
      if (isNewRecord) {
        window.Sound?.sfx?.('boost_perfect');
        window.Game?.UI?.spawnConfetti?.();
      }

      const holdMs = 1600;
      const fadeOutMs = 400;
      const fadeHoldMs = 150;
      setTimeout(() => {
        this.fadeOutIn(fadeOutMs, fadeOutMs, fadeHoldMs, () => {
          completeEl.classList.remove('show');
          if (onDone) onDone();
        });
      }, holdMs);
    },

    fadeOutIn(outMs = 200, inMs = 200, holdMs = 80, callback) {
      if (!this.elements.fade) {
        if (callback) callback();
        return;
      }
      this.elements.fade.style.transitionDuration = `${outMs}ms`;
      this.elements.fade.classList.add('active');
      setTimeout(() => {
        if (callback) callback();
        this.elements.fade.style.transitionDuration = `${inMs}ms`;
        setTimeout(() => {
          this.elements.fade.classList.remove('active');
        }, holdMs);
      }, outMs);
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

    setActive(isActive) {
      if (this.elements.container) {
        this.elements.container.style.display = isActive ? 'flex' : 'none';
      }
    },

    updateUIVisibility(step) {
      const UI_VISIBILITY_CONFIG = {
        '#mobile-controls': { 1: true, 2: true, 3: true, 4: true },
        '#hud-left': { 1: false, 2: false, 3: true, 4: true },
        '#buff-container': { 1: false, 2: false, 3: true, 4: true },
        '#target-display': { 1: false, 2: true, 3: true, 4: true },
        '#status-bar-container': { 1: false, 2: true, 3: true, 4: true },
        '#phase-bar': { 1: false, 2: true, 3: true, 4: true },
        '#phase-bar-fill': { 1: false, 2: true, 3: true, 4: true },
        '#status-msg': { 1: false, 2: true, 3: true, 4: true },
        '#btn-pause': { 1: true, 2: true, 3: true, 4: true },
        '#chase-ui': { 1: false, 2: false, 3: true, 4: true },
        '#hud': { 1: true, 2: true, 3: true, 4: true }
      };

      for (const selector in UI_VISIBILITY_CONFIG) {
        const element = document.querySelector(selector);
        if (!element) continue;
        if (!this.defaultDisplays[selector]) {
          const computed = getComputedStyle(element).display;
          const fallback = (computed === 'none')
            ? (selector === '#mobile-controls' ? 'flex' : 'block')
            : computed;
          const explicit = element.style.display;
          this.defaultDisplays[selector] = (!explicit || explicit === 'none')
            ? (fallback || 'block')
            : explicit;
        }
        const shouldShow = UI_VISIBILITY_CONFIG[selector][step] !== false;
        element.style.display = shouldShow ? this.defaultDisplays[selector] : 'none';
      }

      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'block';
    },
  };

  window.TutorialUI = TutorialUI;
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialUI = window.TutorialUI;
})();
