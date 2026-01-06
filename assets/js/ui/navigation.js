// Navigation System - Screen transitions
window.Navigation = {
  current: 'title',
  hooks: {},

  register(screenId, { onEnter, onExit } = {}) {
    if (!screenId) return;
    this.hooks[screenId] = { onEnter, onExit };
  },

  // Screen transition
  go(screenId) {
    const previous = this.current;

    // Hide all screens
    document.querySelectorAll('.full-screen').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active-screen');
    });

    // Show target screen
    const target = document.getElementById('screen-' + screenId);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active-screen');
    }
    this.current = screenId;

    if (previous && previous != screenId) {
      this.hooks[previous]?.onExit?.(screenId);
    }
    this.hooks[screenId]?.onEnter?.(previous);

    window.Sound?.sfx('btn');
  },

  // Overlay open/close
  showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },
  hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  // Hide all screens (game start)
  hideAll() {
    document.querySelectorAll('.full-screen').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active-screen');
    });
    this.hideOverlay('overlay-pause');
  }
};
// ???�작 ???�?��? ?�면 보이�?
window.addEventListener('load', () => {
  const titleScreen = document.getElementById('screen-title');
  if (titleScreen) {
    const onTitleTouch = (e) => {
      if (window.Navigation?.current !== 'title') return;
      if (e?.preventDefault) e.preventDefault();
      // ??ë¡œì§?€ ?´ì œ main.js??triggerTitleGlitchOut?ì„œ ì²˜ë¦¬?©ë‹ˆ??
      // ???´ë²¤??ë¦¬ìŠ¤?ˆëŠ” ?¬ì „???„ìš©?˜ì?ë§? ?¤ì œ ë¡œì§?€ main.js???ˆìŠµ?ˆë‹¤.
      window.handleTitleTouch?.();
    };
    titleScreen.addEventListener('click', onTitleTouch);
    titleScreen.addEventListener('touchstart', onTitleTouch, { passive: false });
    titleScreen.addEventListener('pointerdown', onTitleTouch);
    document.addEventListener('pointerdown', onTitleTouch, { passive: false, capture: true });
}
  window.Navigation.go('title');
  
  // [STEP 8] Mark game as ready for interaction after title screen is set up.
  window.markGameReady?.();
});

