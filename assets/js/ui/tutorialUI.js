(function() {
  'use strict';

  const TutorialUI = {
    elements: {},

    init() {
      this.elements = {
        overlay: document.getElementById('tutorial-overlay'),
        progress: document.getElementById('tutorial-progress'),
        hintContainer: document.getElementById('tutorial-hint-container'),
        message: document.getElementById('tutorial-message')
      };
      this.hideOverlay();
    },

    showOverlay() {
      if (this.elements.overlay) this.elements.overlay.style.display = 'block';
    },

    hideOverlay() {
      if (this.elements.overlay) this.elements.overlay.style.display = 'none';
    },

    showStep(step) {
      this.showOverlay();
      const config = window.TutorialConfig?.STEP_CONFIG?.[step];
      if (this.elements.progress) {
        this.elements.progress.textContent = `Step ${step}/4${config?.name ? ` · ${config.name}` : ''}`;
      }
      if (config?.description) {
        this.showMessage(config.description, 2500);
      }
    },

    showHint(step) {
      const config = window.TutorialConfig?.STEP_CONFIG?.[step];
      const hintText = config?.hints?.[0];
      if (!hintText || !this.elements.hintContainer) return;

      const hint = document.createElement('div');
      hint.className = 'tutorial-hint';
      hint.innerHTML = `<span class="hint-text">${hintText}</span>`;
      this.elements.hintContainer.appendChild(hint);
      setTimeout(() => hint.remove(), 4500);
    },

    clearHints() {
      if (!this.elements.hintContainer) return;
      this.elements.hintContainer.innerHTML = '';
    },

    showMessage(text, duration = 2000) {
      if (!this.elements.message) return;
      this.elements.message.textContent = text;
      this.elements.message.classList.add('visible');
      setTimeout(() => this.elements.message?.classList.remove('visible'), duration);
    },

    showRetryMessage() {
      this.showMessage('다시 시도하세요', 1500);
    },

    showStepTransition(nextStep) {
      this.clearHints();
      this.showStep(nextStep);
    },

    showCompletionAnimation(callback) {
      this.showMessage('튜토리얼 완료!', 2600);
      setTimeout(() => callback?.(), 2800);
    }
  };

  window.TutorialUI = TutorialUI;
})();
