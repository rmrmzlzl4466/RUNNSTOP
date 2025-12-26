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

    window.Sound?.sfx('btn');
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
function initTitleScreen() {
  const titleScreen = document.getElementById('screen-title');
  if (titleScreen) {
    titleScreen.addEventListener('click', () => {
      window.Navigation.go('lobby');
    });
    titleScreen.addEventListener('touchstart', (e) => {
      e.preventDefault();
      window.Navigation.go('lobby');
    }, { passive: false });
  }
}

// 앱 시작 시 타이틀 화면 보이기
window.addEventListener('load', () => {
  initTitleScreen();
  window.Navigation.go('title');
});
