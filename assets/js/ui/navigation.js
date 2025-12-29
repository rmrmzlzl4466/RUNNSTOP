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
    if (screenId === 'tutorial') {
      // 튜토리얼 화면은 Navigation.go 호출 시점에 활성화되지 않음
      // 튜토리얼 매니저에서 직접 `screen-tutorial`을 활성화할 예정
      // window.GameModules.Tutorial.startTutorial() 호출 시점에 활성화
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

// 앱 시작 시 타이틀 화면 보이기
window.addEventListener('load', () => {
  const titleScreen = document.getElementById('screen-title');
  if (titleScreen) {
    const onTitleTouch = () => {
      // 이 로직은 이제 main.js의 triggerTitleGlitchOut에서 처리됩니다.
      // 이 이벤트 리스너는 여전히 필요하지만, 실제 로직은 main.js에 있습니다.
      window.handleTitleTouch?.(); 
    };
    titleScreen.addEventListener('click', onTitleTouch);
    titleScreen.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onTitleTouch();
    }, { passive: false });
  }
  window.Navigation.go('title');
});
