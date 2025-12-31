// Navigation System - Screen transitions
window.Navigation = {
  current: 'title',

  // ?붾㈃ ?대룞 ?⑥닔
  go(screenId) {
    // 1. 紐⑤뱺 .full-screen ?④린湲?
    document.querySelectorAll('.full-screen').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active-screen');
    });

    // 2. ????붾㈃ 蹂댁씠湲?
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active-screen');
    }
    this.current = screenId;

    // 3. ?붾㈃蹂?珥덇린??濡쒖쭅
    if (screenId === 'lobby') {
      window.updateLobbyUI?.();
      window.startLobbyLoop?.();
    } else {
      window.stopLobbyLoop?.();
    }
    if (screenId === 'shop') {
      window.openShop?.('upgrade');
    }
    if (screenId === 'qa') {
      window.initQASliders?.();
    }
    window.GameModules?.TutorialUI?.setActive?.(screenId === 'tutorial');

    window.Sound?.sfx('btn');
  },

  // ?앹뾽 ?닿린/?リ린
  showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },
  hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  // 紐⑤뱺 ?붾㈃ ?④린湲?(寃뚯엫 ?쒖옉 ??
  hideAll() {
    document.querySelectorAll('.full-screen').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active-screen');
    });
    this.hideOverlay('overlay-pause');
  }
};

// ???쒖옉 ????댄? ?붾㈃ 蹂댁씠湲?
window.addEventListener('load', () => {
  const titleScreen = document.getElementById('screen-title');
  if (titleScreen) {
    const onTitleTouch = () => {
      // ??濡쒖쭅? ?댁젣 main.js??triggerTitleGlitchOut?먯꽌 泥섎━?⑸땲??
      // ???대깽??由ъ뒪?덈뒗 ?ъ쟾???꾩슂?섏?留? ?ㅼ젣 濡쒖쭅? main.js???덉뒿?덈떎.
      window.handleTitleTouch?.(); 
    };
    titleScreen.addEventListener('click', onTitleTouch);
    titleScreen.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onTitleTouch();
    }, { passive: false });
  }
  window.Navigation.go('title');
  
  // [STEP 8] Mark game as ready for interaction after title screen is set up.
  window.markGameReady?.();
});

