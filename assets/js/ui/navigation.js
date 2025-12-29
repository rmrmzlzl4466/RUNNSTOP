// Navigation System - Screen transitions
window.Navigation = {
  current: 'title',

  // 화면 이동 함수
  go(screenId) {
    // 1. 모든 .full-screen 숨기기
    document.querySelectorAll('.full-screen').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active-screen');
    });

    // 2. 대상 화면 보이기
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active-screen');
    }
    this.current = screenId;

    // 3. 화면별 초기화 로직
    if (screenId === 'lobby') {
      window.updateLobbyUI?.();
      window.startLobbyLoop?.();
    } else {
      window.stopLobbyLoop?.();
    }
    if (screenId === 'shop') {
      window.updateShopUI?.();
      window.switchTab?.('skin'); // 기본 탭
    }
    if (screenId === 'qa') {
      window.initQASliders?.();
    }

    try {
      const unlocked = typeof window.Sound?.isUnlocked === 'function'
        ? window.Sound.isUnlocked()
        : !!window.Sound?.isUnlocked;
      if (unlocked) {
        window.Sound?.sfx('btn');
      }
    } catch (err) {
      console.warn('[Navigation] sfx skipped', err);
    }
  },

  // 팝업 열기/닫기
  showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },
  hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  // 모든 화면 숨기기 (게임 시작 시)
  hideAll() {
    document.querySelectorAll('.full-screen').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active-screen');
    });
    this.hideOverlay('overlay-pause');
  }
};

// 타이틀 화면 터치 이벤트
let titleTransitioning = false;

function triggerTitleGlitchOut() {
  if (titleTransitioning) return;
  titleTransitioning = true;

  const titleScreen = document.getElementById('screen-title');
  const lobbyScreen = document.getElementById('screen-lobby');
  if (!titleScreen) return;

  // Play glitch sound if available
  window.Sound?.sfx?.('bit');

  // Prepare lobby screen behind title (hidden but ready)
  if (lobbyScreen) {
    lobbyScreen.style.display = 'flex';
    lobbyScreen.style.opacity = '0';
    window.updateLobbyUI?.();
  }

  // Add glitch-out class to trigger animation
  titleScreen.classList.add('glitch-out');

  // Haptic feedback on mobile
  if (navigator.vibrate) {
    navigator.vibrate([30, 20, 50, 20, 30]);
  }

  // Fade in lobby during glitch
  setTimeout(() => {
    if (lobbyScreen) {
      lobbyScreen.style.transition = 'opacity 0.3s ease-out';
      lobbyScreen.style.opacity = '1';
    }
  }, 300);

  // Complete transition after animation
  setTimeout(() => {
    // Hide title screen
    titleScreen.style.display = 'none';
    titleScreen.classList.remove('active-screen', 'glitch-out');

    // Finalize lobby
    if (lobbyScreen) {
      lobbyScreen.classList.add('active-screen');
      lobbyScreen.style.transition = '';
      lobbyScreen.style.opacity = '';
      window.startLobbyLoop?.();
    }

    window.Navigation.current = 'lobby';
    titleTransitioning = false;
  }, 600);
}

function initTitleScreen() {
  const titleScreen = document.getElementById('screen-title');
  if (titleScreen) {
    titleScreen.addEventListener('click', triggerTitleGlitchOut);
    titleScreen.addEventListener('touchstart', (e) => {
      e.preventDefault();
      triggerTitleGlitchOut();
    }, { passive: false });
  }
}

// 앱 시작 시 타이틀 화면 보이기
window.addEventListener('load', () => {
  initTitleScreen();
  window.Navigation.go('title');
});
