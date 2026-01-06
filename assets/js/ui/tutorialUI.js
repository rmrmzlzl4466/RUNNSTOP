(function() {
  'use strict';

  const TutorialUI = {
    elements: {},
    messageTimeout: null,
    defaultDisplays: {},
    _uiHandler: null,
    _resizeHandler: null,
    _activeTargetSelector: null,
    _lastStep: 1,
    _lastSubStep: 1,

    init() {
      this.elements = {
        container: document.getElementById('tutorial-overlay'),
        dim: document.getElementById('tutorial-dim'),
        banner: document.getElementById('tutorial-banner'),
        progress: document.getElementById('tutorial-progress'),
        progressFill: document.getElementById('tutorial-progress-fill'),
        card: document.getElementById('tutorial-card'),
        cardKicker: document.getElementById('tutorial-card-kicker'),
        cardTitle: document.getElementById('tutorial-card-title'),
        cardBody: document.getElementById('tutorial-card-body'),
        cardStatus: document.getElementById('tutorial-card-status'),
        nextBtn: document.getElementById('tutorial-next'),
        skipBtn: document.getElementById('tutorial-skip'),
        entry: document.getElementById('tutorial-entry'),
        entryTitle: document.getElementById('tutorial-entry-title'),
        entryMeta: document.getElementById('tutorial-entry-meta'),
        entryGoals: document.getElementById('tutorial-entry-goals'),
        entryNote: document.getElementById('tutorial-entry-note'),
        entryStart: document.getElementById('tutorial-entry-start'),
        entryLater: document.getElementById('tutorial-entry-later'),
        joystickTarget: document.getElementById('tutorial-joystick-target'),
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

      this.bindButtons();

      const manager = window.GameModules?.Tutorial;
      if (manager?.on) {
        if (this._uiHandler) manager.off('ui', this._uiHandler);
        this._uiHandler = (evt) => this.handleEvent(evt);
        manager.on('ui', this._uiHandler);
      }

      if (!this._resizeHandler) {
        this._resizeHandler = () => this.reposition();
        window.addEventListener('resize', this._resizeHandler);
      }

      this.setActive(false);
    },

    bindButtons() {
      this.elements.nextBtn?.addEventListener('click', () => {
        window.GameModules?.Tutorial?.confirmAdvance?.();
      });
      const quit = () => {
        if (window.quitGame) {
          window.quitGame();
          return;
        }
        window.GameModules?.Tutorial?.quitTutorial?.();
      };
      this.elements.skipBtn?.addEventListener('click', () => {
        quit();
      });
      this.elements.entryStart?.addEventListener('click', () => {
        window.GameModules?.Tutorial?.confirmStart?.();
      });
      this.elements.entryLater?.addEventListener('click', () => {
        quit();
      });
    },

    handleEvent(evt) {
      if (!evt || !evt.action) return;
      switch (evt.action) {
        case 'setActive':
          this.setActive(!!evt.value);
          break;
        case 'updateUIVisibility':
          this.updateUIVisibility(evt.step);
          break;
        case 'showEntry':
          this.showEntry(evt);
          break;
        case 'hideEntry':
          this.hideEntry();
          break;
        case 'showStep':
          this.showStep(evt.step, evt.subStep);
          break;
        case 'showHint':
          this.showHint(evt.step, evt.subStep, evt.platform);
          break;
        case 'showMessage':
          this.showMessage(evt.text, evt.duration, evt.iconHtml || '');
          break;
        case 'showRetryMessage':
          this.showRetryMessage();
          break;
        case 'setAdvanceEnabled':
          this.setAdvanceEnabled(!!evt.enabled);
          break;
        case 'setCardStatus':
          this.setCardStatus(evt.text || '');
          break;
        case 'fadeOutIn':
          this.fadeOutIn(evt.outMs, evt.inMs, evt.holdMs, evt.callback);
          break;
        case 'showCompletionSequence':
          if (this.showCompletionSequence) {
            this.showCompletionSequence({ isNewRecord: !!evt.isNewRecord, onDone: evt.onDone });
          } else if (evt.onDone) {
            evt.onDone();
          }
          break;
        case 'showStepTransition':
          this.showStepTransition(evt.step);
          break;
        case 'removeHighlights':
          this.removeHighlights();
          break;
        default:
          break;
      }
    },

    showEntry(evt = {}) {
      const entryConfig = window.TutorialConfig?.ENTRY || {};
      if (this.elements.entryTitle) {
        this.elements.entryTitle.textContent = entryConfig.title || this.elements.entryTitle.textContent;
      }
      if (this.elements.entryMeta) {
        const totalSteps = evt.totalSteps || this.getTotalSteps();
        const meta = entryConfig.meta || `Approx. 2 min · ${totalSteps} steps`;
        this.elements.entryMeta.textContent = meta;
      }
      if (this.elements.entryNote && entryConfig.note) {
        this.elements.entryNote.textContent = entryConfig.note;
      }
      if (this.elements.entryGoals && Array.isArray(entryConfig.goals) && entryConfig.goals.length) {
        this.elements.entryGoals.innerHTML = entryConfig.goals.map((goal) => `<li>${goal}</li>`).join('');
      }
      this.removeHighlights();
      this.elements.entry?.classList.add('active');
      this.setCardVisible(false);
      this.setDimActive(true);
      this.setAdvanceEnabled(false);
      this.setCardStatus('');
    },

    hideEntry(showCard = true) {
      this.elements.entry?.classList.remove('active');
      if (showCard) {
        this.setCardVisible(true);
        this.setDimActive(true);
      }
    },

    showStep(step, subStep) {
      this._lastStep = step;
      this._lastSubStep = subStep;
      this.updateProgress(step, subStep);
      this.setCardStatus('');
      this.setAdvanceEnabled(false);
    },

    showHint(step, subStep, platform) {
      const texts = window.TutorialConfig.getTexts?.(step) ?? window.TutorialConfig.TEXTS?.[step];
      const hintData = this.getHintData(step, subStep, platform, texts);
      const title = hintData.title || texts?.name || `Step ${step}`;
      const body = hintData.body || texts?.description || '';
      const kicker = `Tutorial ${step}/${this.getTotalSteps()}`;
      this.showTutorialTarget(hintData.targetSelector === '#tutorial-joystick-target');
      const targetEl = this.resolveTarget(hintData.targetSelector);
      const targetSelector = targetEl ? hintData.targetSelector : null;
      this.resetCardOffset();

      this.setCardContent({ kicker, title, body });
      this.setCardStatus('');
      this.setAdvanceEnabled(false);

      this.removeHighlights();
      if (targetSelector) {
        this.highlightElement(targetSelector);
      } else {
        this.updateSpotlight(null);
      }

      this.setCardVisible(true);
      this.setDimActive(true);
      if (this.elements.card) {
        this.elements.card.style.visibility = 'hidden';
      }
      requestAnimationFrame(() => {
        this.positionCard(targetSelector);
      });
    },

    getHintData(step, subStep, platform, texts) {
      const stepInfo = texts?.steps?.[subStep];
      if (stepInfo) {
        const body = typeof stepInfo.body === 'string'
          ? stepInfo.body
          : (stepInfo.body?.[platform] || stepInfo.body?.pc || '');
        let target = stepInfo.target || null;
        if (target === '#tutorial-joystick-target' && platform !== 'mobile') {
          target = null;
        }
        return {
          title: stepInfo.title || texts?.name || '',
          body,
          targetSelector: target,
        };
      }

      let hintText = '';
      let highlightSelector = null;
      let title = texts?.name || `Step ${step}`;

      if (step === 1) {
        if (subStep === 1 && texts?.hints?.move) {
          hintText = texts.hints.move[platform] || texts.hints.move.pc;
          highlightSelector = platform === 'mobile' ? '#tutorial-joystick-target' : null;
          title = texts?.hintsTitle?.move || title;
        } else if (subStep === 2 && texts?.hints?.dash) {
          hintText = texts.hints.dash[platform] || texts.hints.dash.pc;
          highlightSelector = '#btn-dash-visual';
          title = texts?.hintsTitle?.dash || title;
        }
      } else if (step === 2) {
        if (texts?.hints?.safeJudgment) {
          hintText = texts.hints.safeJudgment[platform] || texts.hints.safeJudgment.pc;
          highlightSelector = '#target-display';
        }
      } else if (step === 3) {
        if (texts?.hints?.avoidStorm) {
          hintText = texts.hints.avoidStorm[platform] || texts.hints.avoidStorm.pc;
          highlightSelector = '#chase-ui';
        }
      } else if (step === 4) {
        if (texts?.hints?.completeRun) {
          hintText = texts.hints.completeRun[platform] || texts.hints.completeRun.pc;
        }
      }

      return { title, body: hintText, targetSelector: highlightSelector };
    },

    updateProgress(step, subStep) {
      const totalSteps = this.getTotalSteps();
      const texts = window.TutorialConfig.getTexts?.(step) ?? window.TutorialConfig.TEXTS?.[step];
      const label = texts?.name ? `Tutorial ${step}/${totalSteps} · ${texts.name}` : `Tutorial ${step}/${totalSteps}`;
      if (this.elements.progress) {
        this.elements.progress.textContent = label;
      }
      if (this.elements.progressFill) {
        const ratio = totalSteps ? Math.max(0, Math.min(1, step / totalSteps)) : 0;
        this.elements.progressFill.style.width = `${Math.round(ratio * 100)}%`;
      }
      if (this.elements.cardKicker) {
        this.elements.cardKicker.textContent = `Tutorial ${step}/${totalSteps}`;
      }
    },

    setCardContent({ kicker, title, body }) {
      if (this.elements.cardKicker && kicker) this.elements.cardKicker.textContent = kicker;
      if (this.elements.cardTitle) this.elements.cardTitle.textContent = title || '';
      if (this.elements.cardBody) this.elements.cardBody.textContent = body || '';
    },

    setCardStatus(text) {
      if (!this.elements.cardStatus) return;
      this.elements.cardStatus.textContent = text || '';
    },

    setAdvanceEnabled(enabled) {
      if (!this.elements.nextBtn) return;
      this.elements.nextBtn.disabled = !enabled;
    },

    setCardVisible(isVisible) {
      if (!this.elements.card) return;
      this.elements.card.classList.toggle('active', !!isVisible);
    },

    setDimActive(isActive) {
      if (!this.elements.dim) return;
      this.elements.dim.classList.toggle('active', !!isActive);
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
      this.showMessage(`Step ${nextStep} start!${desc}`, 1600);
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
      const el = selector ? document.querySelector(selector) : null;
      if (el) {
        el.classList.add('tutorial-highlight');
        this._activeTargetSelector = selector;
        this.updateSpotlight(el);
      }
    },

    updateSpotlight(targetEl) {
      if (!this.elements.dim) return;
      if (!targetEl) {
        this.elements.dim.style.setProperty('--spot-size', '0px');
        return;
      }
      const rect = targetEl.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        this.elements.dim.style.setProperty('--spot-size', '0px');
        return;
      }
      const overlayRect = this.getOverlayRect();
      const centerX = rect.left - overlayRect.left + rect.width / 2;
      const centerY = rect.top - overlayRect.top + rect.height / 2;
      const minDim = Math.min(rect.width, rect.height);
      const maxSpot = Math.min(overlayRect.width, overlayRect.height) * 0.45;
      let size = minDim * 0.6 + 60;
      size = Math.max(120, Math.min(size, maxSpot));
      this.elements.dim.style.setProperty('--spot-x', `${Math.round(centerX)}px`);
      this.elements.dim.style.setProperty('--spot-y', `${Math.round(centerY)}px`);
      this.elements.dim.style.setProperty('--spot-size', `${Math.round(size)}px`);
    },

    removeHighlights() {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
      this._activeTargetSelector = null;
      this.updateSpotlight(null);
      this.showTutorialTarget(false);
    },

    setActive(isActive) {
      if (this.elements.container) {
        this.elements.container.style.display = isActive ? 'block' : 'none';
        this.elements.container.classList.toggle('active', !!isActive);
      }
      if (!isActive) {
        clearTimeout(this.messageTimeout);
        this.messageTimeout = null;
        this.elements.message?.classList.remove('visible');
        this.setCardVisible(false);
        this.setDimActive(false);
        this.hideEntry(false);
        this.setAdvanceEnabled(false);
        this.setCardStatus('');
        this.removeHighlights();
        this.resetCardOffset();
      }
    },

    updateUIVisibility(step) {
      const UI_VISIBILITY_CONFIG = {
        '#mobile-controls': { 1: true, 2: true, 3: true, 4: true },
        '.hud-left': { 1: false, 2: false, 3: true, 4: true },
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

    positionCard(targetSelector) {
      if (!this.elements.card) return;
      const card = this.elements.card;
      if (card.classList.contains('tutorial-card-fixed')) {
        card.style.left = '';
        card.style.top = '';
        card.style.visibility = 'visible';
        return;
      }
      const targetEl = targetSelector ? document.querySelector(targetSelector) : null;
      const overlayRect = this.getOverlayRect();
      const viewport = { width: overlayRect.width, height: overlayRect.height };
      const edge = 16;
      const gap = 12;

      card.style.visibility = 'hidden';
      const cardRect = card.getBoundingClientRect();
      const cardW = cardRect.width || 280;
      const cardH = cardRect.height || 140;

      const candidates = [];
      if (targetEl) {
        const rect = this.toLocalRect(targetEl.getBoundingClientRect(), overlayRect);
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        candidates.push({
          name: 'bottom',
          x: this.clamp(centerX - cardW / 2, edge, viewport.width - cardW - edge),
          y: rect.bottom + gap
        });
        candidates.push({
          name: 'top',
          x: this.clamp(centerX - cardW / 2, edge, viewport.width - cardW - edge),
          y: rect.top - cardH - gap
        });
        candidates.push({
          name: 'right',
          x: rect.right + gap,
          y: this.clamp(centerY - cardH / 2, edge, viewport.height - cardH - edge)
        });
        candidates.push({
          name: 'left',
          x: rect.left - cardW - gap,
          y: this.clamp(centerY - cardH / 2, edge, viewport.height - cardH - edge)
        });
      } else {
        candidates.push({
          name: 'center',
          x: (viewport.width - cardW) / 2,
          y: (viewport.height - cardH) / 2
        });
        candidates.push({
          name: 'bottom',
          x: (viewport.width - cardW) / 2,
          y: viewport.height - cardH - edge
        });
        candidates.push({
          name: 'top',
          x: (viewport.width - cardW) / 2,
          y: edge + 80
        });
      }

      const avoidRects = this.getAvoidRects(targetEl);
      let chosen = candidates.find((cand) => {
        if (!this.isWithinViewport(cand, cardW, cardH, viewport, edge)) return false;
        const rect = { left: cand.x, top: cand.y, right: cand.x + cardW, bottom: cand.y + cardH };
        return !avoidRects.some((avoid) => this.rectsIntersect(rect, avoid));
      });
      if (!chosen) {
        const maxX = Math.max(edge, viewport.width - cardW - edge);
        const maxY = Math.max(edge, viewport.height - cardH - edge);
        chosen = {
          name: 'fallback',
          x: this.clamp((viewport.width - cardW) / 2, edge, maxX),
          y: this.clamp(viewport.height - cardH - edge, edge, maxY)
        };
      }

      card.style.left = `${Math.round(chosen.x)}px`;
      card.style.top = `${Math.round(chosen.y)}px`;
      card.style.visibility = 'visible';
    },

    reposition() {
      if (!this._activeTargetSelector) return;
      this.positionCard(this._activeTargetSelector);
      this.updateJoystickTargetPosition();
      const targetEl = document.querySelector(this._activeTargetSelector);
      if (targetEl) {
        this.updateSpotlight(targetEl);
      }
    },

    getAvoidRects(targetEl) {
      const overlayRect = this.getOverlayRect();
      const selectors = [
        '.hud-left',
        '#buff-container',
        '#target-display',
        '#status-bar-container',
        '#btn-pause',
        '#chase-ui',
        '#mobile-controls',
        '#joystick-zone',
        '#dash-zone',
        '#toast-msg',
        '#theme-notify',
        '#storm-warning',
        '#tutorial-banner'
      ];
      return selectors
        .map((selector) => document.querySelector(selector))
        .filter((el) => el && this.isVisible(el))
        .filter((el) => !targetEl || !el.contains(targetEl))
        .map((el) => this.expandRect(this.toLocalRect(el.getBoundingClientRect(), overlayRect), 6));
    },

    isVisible(el) {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    },

    resolveTarget(selector) {
      if (!selector) return null;
      const el = document.querySelector(selector);
      if (!el) return null;
      return this.isVisible(el) ? el : null;
    },

    showTutorialTarget(isVisible) {
      const el = this.elements.joystickTarget;
      if (!el) return;
      if (!isVisible) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      this.updateJoystickTargetPosition();
    },

    updateCardOffset(targetSelector) {
      const card = this.elements.card;
      if (!card || !card.classList.contains('tutorial-card-fixed')) return;
      if (!targetSelector) {
        this.resetCardOffset();
        return;
      }
      const bottomTargets = new Set(['#btn-dash-visual', '#tutorial-joystick-target']);
      if (!bottomTargets.has(targetSelector)) {
        this.resetCardOffset();
        return;
      }
      const targetEl = document.querySelector(targetSelector);
      if (!targetEl) {
        this.resetCardOffset();
        return;
      }
      const overlayRect = this.getOverlayRect();
      const targetRect = this.toLocalRect(targetEl.getBoundingClientRect(), overlayRect);
      const cardRect = card.getBoundingClientRect();
      const base = window.matchMedia('(hover: none) and (pointer: coarse)').matches ? 120 : 24;
      const margin = 16;
      const requiredBottom = overlayRect.height - (targetRect.top - margin);
      const maxBottom = Math.max(base, overlayRect.height - cardRect.height - margin);
      const offset = Math.min(Math.max(base, requiredBottom), maxBottom);
      card.style.setProperty('--tutorial-card-bottom', `calc(${Math.round(offset)}px + env(safe-area-inset-bottom, 0px))`);
    },

    resetCardOffset() {
      const card = this.elements.card;
      if (!card) return;
      card.style.removeProperty('--tutorial-card-bottom');
    },

    updateJoystickTargetPosition() {
      const target = this.elements.joystickTarget;
      if (!target) return;
      const zone = document.getElementById('joystick-zone');
      if (!zone || !this.isVisible(zone)) {
        target.style.display = 'none';
        return;
      }
      const overlayRect = this.getOverlayRect();
      const zoneRect = this.toLocalRect(zone.getBoundingClientRect(), overlayRect);
      const minDim = Math.min(zoneRect.width, zoneRect.height);
      const size = Math.max(96, Math.min(140, minDim * 0.35));
      const centerX = zoneRect.left + zoneRect.width * 0.35;
      const centerY = zoneRect.top + zoneRect.height * 0.75;
      target.style.width = `${Math.round(size)}px`;
      target.style.height = `${Math.round(size)}px`;
      target.style.left = `${Math.round(centerX - size / 2)}px`;
      target.style.top = `${Math.round(centerY - size / 2)}px`;
      this.updateSpotlight(target);
    },

    expandRect(rect, pad) {
      return {
        left: rect.left - pad,
        top: rect.top - pad,
        right: rect.right + pad,
        bottom: rect.bottom + pad
      };
    },

    rectsIntersect(a, b) {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    },

    isWithinViewport(cand, width, height, viewport, edge) {
      return (
        cand.x >= edge &&
        cand.y >= edge &&
        cand.x + width <= viewport.width - edge &&
        cand.y + height <= viewport.height - edge
      );
    },

    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    getOverlayRect() {
      const overlay = this.elements.container;
      if (!overlay) {
        return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      }
      const rect = overlay.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      }
      return rect;
    },

    toLocalRect(rect, overlayRect) {
      return {
        left: rect.left - overlayRect.left,
        top: rect.top - overlayRect.top,
        right: rect.right - overlayRect.left,
        bottom: rect.bottom - overlayRect.top,
        width: rect.width,
        height: rect.height
      };
    },

    getTotalSteps() {
      const steps = window.TutorialConfig?.STEP_CONFIG;
      if (steps && typeof steps === 'object') {
        return Object.keys(steps).length;
      }
      const texts = window.TutorialConfig?.TEXTS;
      if (texts && typeof texts === 'object') {
        return Object.keys(texts).length;
      }
      return 1;
    }
  };

  window.TutorialUI = TutorialUI;
  window.GameModules = window.GameModules || {};
  window.GameModules.TutorialUI = window.TutorialUI;
})();
