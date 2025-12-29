(function() {
  'use strict';

  const elements = {
    container: null,
    progress: null,
    message: null
  };

  let messageTimer = null;

  function init() {
    elements.container = document.getElementById('tutorial-hint-container') || null;
    elements.progress = document.getElementById('tutorial-progress') || null;
    elements.message = document.getElementById('tutorial-message') || null;
    console.debug('[TutorialUI] Initialized');
  }

  function fadeIn(duration = 300) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('tutorial-overlay');
      if (!overlay) {
        resolve();
        return;
      }
      overlay.classList.remove('fade-out');
      overlay.classList.add('fade-in');
      setTimeout(resolve, duration);
    });
  }

  function fadeOut(duration = 300) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('tutorial-overlay');
      if (!overlay) {
        resolve();
        return;
      }
      overlay.classList.remove('fade-in');
      overlay.classList.add('fade-out');
      setTimeout(resolve, duration);
    });
  }

  function clearMessageTimer() {
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
  }

  function showMessage(text, duration = 3000) {
    if (!elements.message) return;

    clearMessageTimer();
    elements.message.textContent = text;
    elements.message.classList.add('visible');

    messageTimer = setTimeout(() => {
      elements.message.classList.remove('visible');
    }, duration);
  }

  function showStep(step) {
    if (elements.progress) {
      elements.progress.textContent = `Step ${step}/4`;
    }

    const config = window.TutorialConfig?.STEP_CONFIG?.[step];
    if (config?.description) {
      showMessage(config.description, 3000);
    }
    fadeIn();
  }

  function showRetryMessage() {
    showMessage('한 번 더 시도해보세요!', 2500);
  }

  function showStepTransition(nextStep) {
    showMessage(`다음 단계로 이동: ${nextStep}`, 2500);
    if (elements.progress) {
      elements.progress.textContent = `Step ${nextStep}/4`;
    }
  }

  function showCompletionAnimation(cb) {
    showMessage('튜토리얼 완료!', 3000);
    fadeOut(300).then(() => {
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

  function showHint(step) {
    const hint = window.TutorialConfig?.STEP_CONFIG?.[step]?.hints?.[0];
    if (!hint) return;
    showArrowHint(hint);
  }

  function showArrowHint(text) {
    if (!elements.container) return;
    const hintEl = document.createElement('div');
    hintEl.className = 'tutorial-hint';
    hintEl.textContent = text;
    elements.container.appendChild(hintEl);

    setTimeout(() => {
      if (hintEl.parentNode) {
        hintEl.parentNode.removeChild(hintEl);
      }
    }, 5000);
  }

  function highlightElement(selector) {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (el) el.classList.add('tutorial-highlight');
  }

  function removeHighlight(selector) {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (el) el.classList.remove('tutorial-highlight');
  }

  window.TutorialUI = {
    init,
    showStep,
    showMessage,
    showRetryMessage,
    showStepTransition,
    showCompletionAnimation,
    showHint,
    showArrowHint,
    highlightElement,
    removeHighlight,
    fadeIn,
    fadeOut
  };
})();
