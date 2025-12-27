const keys = { w: false, a: false, s: false, d: false };

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let joystick = { active: false, id: null, startX: 0, startY: 0, curX: 0, curY: 0, vectorX: 0, vectorY: 0 };
const JOYSTICK_BASE_RADIUS = 60;
const JOYSTICK_STICK_MAX_DIST = 50;
const JOYSTICK_HOME_PADDING = 40;
let joystickHome = { x: null, y: null };
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
const joystickZone = document.getElementById('joystick-zone');
const dashZone = document.getElementById('dash-zone');
const dashVisual = document.getElementById('btn-dash-visual');

let ignoreInputUntil = 0;
// [FIX] 이벤트 리스너 중복 등록 방지 플래그
let controlsInitialized = false;

function setIgnoreInputUntil(ts) {
  ignoreInputUntil = ts;
}

// [FIX] 이벤트 핸들러를 named function으로 변경하여 제거 가능하게 함
function onJoyTouchStart(e) {
  e.preventDefault();
  handleJoyStart(e.changedTouches[0]);
}

// [FIX] touchmove는 window에서 처리 - 조이스틱 존을 벗어나도 조작 유지
function onWindowTouchMove(e) {
  if (!joystick.active || joystick.id === 'mouse') return;
  // 현재 활성화된 터치 ID와 일치하는 터치 찾기
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joystick.id) {
      e.preventDefault();
      handleJoyMove(e.changedTouches[i]);
      break;
    }
  }
}

// [FIX] touchend도 window에서 처리
function onWindowTouchEnd(e) {
  if (!joystick.active || joystick.id === 'mouse') return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joystick.id) {
      e.preventDefault();
      handleJoyEnd();
      break;
    }
  }
}

function onJoyMouseDown(e) {
  e.preventDefault();
  handleJoyStart(e);
}

function onWindowMouseMove(e) {
  if (joystick.active && joystick.id === 'mouse') handleJoyMove(e);
}

function onWindowMouseUp(e) {
  if (joystick.active && joystick.id === 'mouse') handleJoyEnd();
}

// [CHARGING SYSTEM] 대쉬 터치 시작 - 차징 시작
function onDashTouchStart(e) {
  e.preventDefault();
  dashZone.classList.add('active');
  startCharging();
}

// [CHARGING SYSTEM] 대쉬 터치 종료 - 대쉬 발동
function onDashTouchEnd(e) {
  e.preventDefault();
  dashZone.classList.remove('active');
  releaseDash();
}

// [CHARGING SYSTEM] 대쉬 마우스 누름 - 차징 시작
function onDashMouseDown(e) {
  e.preventDefault();
  dashZone.classList.add('active');
  startCharging();
}

// [CHARGING SYSTEM] 대쉬 마우스 뗌 - 대쉬 발동
function onDashMouseUp(e) {
  e.preventDefault();
  dashZone.classList.remove('active');
  releaseDash();
}

// [CHARGING SYSTEM] 키보드 스페이스 차징 상태 추적
let spaceCharging = false;

function onKeyDown(e) {
  // [CHARGING SYSTEM] Space 키로 차징 시작 (반복 입력 무시)
  if (e.code === 'Space' && !e.repeat) {
    spaceCharging = true;
    startCharging();
  }
  if (e.code === 'KeyW') keys.w = true;
  if (e.code === 'KeyA') keys.a = true;
  if (e.code === 'KeyS') keys.s = true;
  if (e.code === 'KeyD') keys.d = true;
}

function onKeyUp(e) {
  // [CHARGING SYSTEM] Space 키 뗌 - 대쉬 발동
  if (e.code === 'Space' && spaceCharging) {
    spaceCharging = false;
    releaseDash();
  }
  if (e.code === 'KeyW') keys.w = false;
  if (e.code === 'KeyA') keys.a = false;
  if (e.code === 'KeyS') keys.s = false;
  if (e.code === 'KeyD') keys.d = false;
}

function initControls() {
  // [FIX] 이미 초기화되었으면 중복 등록 방지
  if (controlsInitialized) {
    console.warn('[Controls] Already initialized, skipping duplicate registration');
    return;
  }

  // 조이스틱 터치 - 시작은 존 내부에서만
  joystickZone.addEventListener('touchstart', onJoyTouchStart, { passive: false });
  // [FIX] touchmove/touchend는 window에서 처리하여 존 밖에서도 조작 가능
  window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
  window.addEventListener('touchend', onWindowTouchEnd, { passive: false });
  window.addEventListener('touchcancel', onWindowTouchEnd, { passive: false }); // 터치 취소 시에도 처리

  // 조이스틱 마우스 (기존 로직 유지)
  joystickZone.addEventListener('mousedown', onJoyMouseDown, { passive: false });
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);

  // 대시 버튼
  dashZone.addEventListener('touchstart', onDashTouchStart, { passive: false });
  dashZone.addEventListener('touchend', onDashTouchEnd, { passive: false });
  dashZone.addEventListener('mousedown', onDashMouseDown);
  dashZone.addEventListener('mouseup', onDashMouseUp);

  // 키보드
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  window.addEventListener('resize', setJoystickHomePosition);
  setJoystickHomePosition();

  controlsInitialized = true;
}

// [NEW] 리스너 해제 함수 (필요 시 사용)
function destroyControls() {
  if (!controlsInitialized) return;

  joystickZone.removeEventListener('touchstart', onJoyTouchStart);
  window.removeEventListener('touchmove', onWindowTouchMove);
  window.removeEventListener('touchend', onWindowTouchEnd);
  window.removeEventListener('touchcancel', onWindowTouchEnd);

  joystickZone.removeEventListener('mousedown', onJoyMouseDown);
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);

  dashZone.removeEventListener('touchstart', onDashTouchStart);
  dashZone.removeEventListener('touchend', onDashTouchEnd);
  dashZone.removeEventListener('mousedown', onDashMouseDown);
  dashZone.removeEventListener('mouseup', onDashMouseUp);

  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('resize', setJoystickHomePosition);

  controlsInitialized = false;
}

function setJoystickHomePosition() {
  if (!joystickZone || !joystickBase) return;
  const rect = joystickZone.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  joystickHome.x = JOYSTICK_HOME_PADDING + JOYSTICK_BASE_RADIUS;
  joystickHome.y = rect.height - JOYSTICK_HOME_PADDING - JOYSTICK_BASE_RADIUS;
  if (isTouchDevice) {
    applyJoystickHome();
  } else {
    joystickBase.style.display = 'none';
  }
}

function applyJoystickHome() {
  if (joystickHome.x === null || joystickHome.y === null) return;
  joystickBase.style.left = `${joystickHome.x - JOYSTICK_BASE_RADIUS}px`;
  joystickBase.style.top = `${joystickHome.y - JOYSTICK_BASE_RADIUS}px`;
  joystickBase.style.display = 'block';
  joystickBase.classList.remove('active');
  joystickStick.classList.remove('active');
  joystickStick.style.transform = 'translate(-50%, -50%)';
}

function handleJoyStart(input) {
  if (performance.now() < ignoreInputUntil) return;
  joystick.active = true;
  joystick.id = input.identifier !== undefined ? input.identifier : 'mouse';
  const rect = joystickZone.getBoundingClientRect();
  const localX = input.clientX - rect.left;
  const localY = input.clientY - rect.top;
  joystick.startX = input.clientX;
  joystick.startY = input.clientY;
  joystickBase.classList.add('active');
  joystickStick.classList.add('active');
  joystickBase.style.display = 'block';
  joystickBase.style.left = (localX - JOYSTICK_BASE_RADIUS) + 'px';
  joystickBase.style.top = (localY - JOYSTICK_BASE_RADIUS) + 'px';
  joystickStick.style.transform = `translate(-50%, -50%)`;
}

function handleJoyMove(input) {
  // [FIX] identifier 체크는 이미 상위 핸들러에서 처리됨
  const dx = input.clientX - joystick.startX;
  const dy = input.clientY - joystick.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const clampDist = Math.min(dist, JOYSTICK_STICK_MAX_DIST);
  const stickX = Math.cos(angle) * clampDist;
  const stickY = Math.sin(angle) * clampDist;
  joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
  const sens = window.qaConfig?.joystickSens ?? 1.0;
  joystick.vectorX = Math.max(-1, Math.min(1, (stickX / JOYSTICK_STICK_MAX_DIST) * sens));
  joystick.vectorY = stickY / JOYSTICK_STICK_MAX_DIST;
}

function handleJoyEnd() {
  joystick.active = false;
  joystick.id = null;
  joystick.vectorX = 0;
  joystick.vectorY = 0;
  if (isTouchDevice) {
    applyJoystickHome();
  } else {
    joystickBase.classList.remove('active');
    joystickStick.classList.remove('active');
    joystickBase.style.display = 'none';
  }
}

// [LEGACY] 기존 즉시 대쉬 (하위 호환용)
function attemptDash() {
  if (performance.now() < ignoreInputUntil) return;
  window.player?.dash?.();
}

// [CHARGING SYSTEM] 차징 시작
function startCharging() {
  if (performance.now() < ignoreInputUntil) return;
  const result = window.player?.startCharging?.();

  // [JFB v2] 판정 결과에 따른 피드백 (Reflex Mode)
  if (result === 'perfect') {
    window.Game?.UI?.showToast?.(window.player, 'PERFECT!!', '#00ffff', 1500);
    // [FIX] 슬로우모션 취소를 여기서 직접 호출하지 않음
    // loop.js의 checkCancelPolicy가 실제 부스트 시작 시점에 처리
    // (모바일에서 터치 시작만으로 슬로우모션이 취소되는 문제 해결)
  } else if (result === 'false_start') {
    window.Game?.UI?.showToast?.(window.player, 'FALSE START!', '#e74c3c', 1000);
  }
}

// [CHARGING SYSTEM] 차징 해제 및 대쉬 발동
function releaseDash() {
  if (performance.now() < ignoreInputUntil) return;
  window.player?.releaseDash?.();
}

window.Input = {
  keys,
  joystick,
  initControls,
  destroyControls,
  handleJoyStart,
  handleJoyMove,
  handleJoyEnd,
  attemptDash,        // [LEGACY] 기존 즉시 대쉬
  startCharging,      // [CHARGING SYSTEM] 차징 시작
  releaseDash,        // [CHARGING SYSTEM] 차징 해제 및 대쉬 발동
  setIgnoreInputUntil,
  getIgnoreInputUntil: () => ignoreInputUntil,
  isInitialized: () => controlsInitialized
};
