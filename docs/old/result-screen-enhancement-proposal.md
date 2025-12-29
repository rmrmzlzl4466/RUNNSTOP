# 결과창 연출 강화 기획안

## 현재 상태 분석

### 게임 컨셉
- **RUN & STOP**: 사이버/디지털 테마 러닝 게임
- Matrix 스타일 슬로우모션, DATA STORM, DIGITAL CIRCUIT 등 사이버펑크 요소
- 수집 요소: Bits(녹색), Coins(금색), Gems(시안), Distance(흰색)

### 현재 결과창 연출
1. 슬롯머신 스타일 카운팅 (Bits → Coins → Gems → Distance 순차)
2. 랭크 배지 팝업 (D/C/B/A/S)
3. 하이스코어 바 채우기
4. NEW RECORD 배지

---

## 연출 강화 제안

### Phase 1: 진입 연출 (Entry Animation)

#### 1-1. 글리치 트랜지션
```
[현재] 즉시 결과 화면 표시
[개선] 화면이 글리치 효과와 함께 전환
```
- 게임오버 시 0.3초간 화면 글리치 (RGB 분리 + 노이즈)
- "GAME OVER" 텍스트가 타이핑 효과로 출현
- 사이버펑크 느낌의 스캔라인이 위에서 아래로 스캔

**구현 난이도**: ★★☆☆☆ (CSS 애니메이션)

#### 1-2. 카드 슬라이드 인
```
[현재] 결과 카드 즉시 표시
[개선] 결과 카드가 아래에서 바운스하며 등장
```
- `transform: translateY(100%)` → `translateY(0)` with elastic easing
- 약간의 회전 효과 추가 (`rotateX(10deg)` → `rotateX(0)`)

**구현 난이도**: ★☆☆☆☆ (CSS 애니메이션)

---

### Phase 2: 점수 카운팅 연출 강화

#### 2-1. 행별 슬라이드 & 하이라이트
```
[현재] 각 행이 opacity 변화만 있음
[개선] 각 행이 왼쪽에서 슬라이드 인 + 글로우 펄스
```
- 각 행이 순차적으로 `translateX(-20px)` → `translateX(0)`
- 활성 행에 네온 글로우 테두리 펄스
- 완료 시 체크마크 or 플래시 효과

**구현 난이도**: ★★☆☆☆ (CSS + 약간의 JS)

#### 2-2. 숫자 롤링 강화 (슬롯머신 비주얼)
```
[현재] 숫자가 증가하며 표시
[개선] 실제 슬롯머신처럼 숫자가 위로 굴러가는 효과
```
- 각 자릿수가 개별적으로 회전
- 높은 숫자일수록 더 빠르게 회전 후 정지
- 정지 시 "딸깍" 효과음 + 미세한 바운스

**구현 난이도**: ★★★☆☆ (개별 자릿수 DOM 필요)

#### 2-3. 아이템별 이펙트 차별화
| 아이템 | 카운팅 중 이펙트 | 완료 이펙트 |
|--------|------------------|-------------|
| Bits | 녹색 파티클 떨어짐 | 녹색 플래시 |
| Coins | 금색 반짝임 | 동전 회전 아이콘 |
| Gems | 시안 프리즘 효과 | 다이아몬드 샤인 |
| Distance | 속도선 효과 | 거리 아이콘 확대 |

**구현 난이도**: ★★★☆☆ (CSS 파티클 + 애니메이션)

---

### Phase 3: 토탈 스코어 연출

#### 3-1. 드라마틱 빌드업
```
[현재] 토탈 점수가 단순 카운팅
[개선] 4개 점수가 중앙으로 수렴 후 폭발
```
1. 각 항목 점수가 가운데로 모이는 애니메이션 (0.3초)
2. 합쳐지면서 플래시 이펙트
3. 토탈 점수가 큰 스케일로 팝업 후 정상 크기로

**구현 난이도**: ★★★☆☆ (위치 계산 + 애니메이션)

#### 3-2. 스코어 자릿수 캐스케이드
```
각 자릿수가 시차를 두고 등장
100,000 → 1 → 10 → 100 → 1,00 → 10,00 → 100,000
```
- 오른쪽에서 왼쪽으로 자릿수가 순차 등장
- 각 자릿수에 글로우 효과
- 최종 완성 시 전체 펄스

**구현 난이도**: ★★☆☆☆ (자릿수 분리 + CSS)

---

### Phase 4: 랭크 연출 강화

#### 4-1. 랭크 릴 스피닝
```
[현재] 랭크가 바로 팝업
[개선] D → C → B → A → S 순으로 빠르게 회전 후 정지
```
- 슬롯머신처럼 랭크가 위로 스크롤
- 최종 랭크에서 멈추며 바운스
- 고랭크(S, A)일수록 더 드라마틱한 연출

**구현 난이도**: ★★★☆☆ (DOM 구조 변경 필요)

#### 4-2. 랭크별 특수 이펙트
| 랭크 | 배경 이펙트 | 사운드 | 추가 연출 |
|------|-------------|--------|-----------|
| S | 골드 파티클 폭발 + 렌즈플레어 | 팡파레 | 화면 전체 골드 플래시 |
| A | 녹색 광선 방사 | 성공음 | 배지 주변 광선 |
| B | 파란 글로우 확산 | 긍정음 | 배지 확대 바운스 |
| C | 보라 페이드 | 일반음 | 기본 팝업 |
| D | 회색 정적 노이즈 | 저음 | 글리치 효과 |

**구현 난이도**: ★★★☆☆ (랭크별 CSS 클래스 + 파티클)

#### 4-3. S랭크 특별 연출 (LEGENDARY)
```
S랭크 달성 시 풀스크린 축하 연출
```
1. 화면 전체 골드 플래시
2. "LEGENDARY!" 텍스트가 회전하며 등장
3. 별/스파클 파티클 폭발
4. 짧은 진동 피드백 (모바일)

**구현 난이도**: ★★★★☆ (풀스크린 오버레이 + 파티클 시스템)

---

### Phase 5: NEW RECORD 연출

#### 5-1. 기록 갱신 축하 시퀀스
```
[현재] "NEW RECORD!" 배지만 표시
[개선] 멀티 스테이지 축하 연출
```
1. 하이스코어 바가 이전 기록을 넘는 순간 반짝
2. "RECORD BROKEN!" 텍스트 플래시
3. 새 점수가 강조되며 이전 점수 교체
4. 컨페티(종이조각) 파티클 폭발

**구현 난이도**: ★★★☆☆ (단계별 애니메이션)

#### 5-2. 기록 비교 시각화
```
이전 기록 대비 향상 정도 표시
"+15,000 (+23%)" 형태로 표시
```
- 이전 최고기록과 차이를 시각적으로 표현
- 향상 수치가 커질수록 강조 효과 증가

**구현 난이도**: ★★☆☆☆ (계산 + 표시)

---

### Phase 6: 배경 & 분위기 연출

#### 6-1. 동적 배경
```
[현재] 정적인 어두운 배경
[개선] 점수에 반응하는 동적 배경
```
- 고득점: 배경에 빛나는 파티클이 위로 상승
- 저득점: 정적 노이즈 + 어두운 분위기
- 신기록: 배경에 축하 파티클

**구현 난이도**: ★★★☆☆ (CSS 파티클 애니메이션)

#### 6-2. 사이버 그리드 배경
```
RUN & STOP 테마에 맞는 사이버 그리드
```
- 원근감 있는 그리드 라인이 배경에서 움직임
- TRON/Matrix 스타일의 디지털 미학
- 점수 카운팅에 맞춰 그리드 펄스

**구현 난이도**: ★★★☆☆ (CSS 3D 변환)

---

## 우선순위 추천

### 즉시 적용 가능 (1-2일)
1. **카드 슬라이드 인** - 진입 시 결과 카드 애니메이션
2. **행별 슬라이드** - 각 점수 행 등장 애니메이션
3. **랭크 팝업 강화** - 랭크별 색상 글로우 + 바운스

### 단기 적용 (3-5일)
4. **글리치 트랜지션** - 게임오버 → 결과 전환 효과
5. **NEW RECORD 강화** - 기록 갱신 축하 시퀀스
6. **아이템별 이펙트** - 카운팅 중 색상별 효과

### 중기 적용 (1-2주)
7. **숫자 롤링 슬롯** - 실제 슬롯머신 스타일 숫자 회전
8. **S랭크 특별 연출** - 최고 랭크 풀스크린 축하
9. **사이버 그리드 배경** - 동적 배경 시스템

---

## 기술 구현 노트

### CSS 기반 (성능 우수)
```css
/* 글리치 효과 예시 */
@keyframes glitch {
  0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
  20% { clip-path: inset(92% 0 1% 0); transform: translate(1px, -1px); }
  /* ... */
}

/* 네온 글로우 */
.neon-glow {
  box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
  animation: pulse-glow 1s ease-in-out infinite;
}

/* 카드 진입 */
.result-card-enter {
  animation: slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### JavaScript 확장
```javascript
// 자릿수 캐스케이드 표시
function cascadeNumber(target, finalValue, duration) {
  const digits = finalValue.toString().split('');
  digits.forEach((digit, i) => {
    setTimeout(() => {
      // 각 자릿수 순차 등장
    }, i * (duration / digits.length));
  });
}
```

### 사운드 연동
- 각 연출 단계에 맞는 SFX 추가
- 기존 `window.Sound?.sfx?.()` 시스템 활용
- 새 사운드: `rank_spin`, `score_merge`, `confetti_pop`

---

## 예상 효과

1. **몰입감 향상**: 게임 종료 후에도 시각적 보상 경험
2. **재도전 동기**: 화려한 연출이 더 높은 점수 욕구 자극
3. **SNS 공유 욕구**: 스크린샷/녹화하고 싶은 순간 창출
4. **게임 완성도**: 사이버 테마 일관성 강화

---

## 플랫폼별 대응 전략

### 감지 방식
```javascript
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || ('ontouchstart' in window)
  || (window.innerWidth <= 768);

const isLowEnd = navigator.hardwareConcurrency <= 2
  || navigator.deviceMemory <= 2;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### PC vs 모바일 차별화

| 연출 요소 | PC | 모바일 | 이유 |
|-----------|-----|--------|------|
| **파티클 수** | 50-100개 | 20-30개 | 렌더링 부하 감소 |
| **글리치 복잡도** | RGB 분리 + 노이즈 + 스캔라인 | RGB 분리만 | GPU 부담 감소 |
| **애니메이션 시간** | 기본값 | 80% 단축 | 빠른 피드백 선호 |
| **배경 그리드** | 3D 원근 + 애니메이션 | 정적 2D 그리드 | 성능 최적화 |
| **블러 효과** | backdrop-filter 사용 | 반투명 배경만 | iOS 호환성 |
| **진동 피드백** | 없음 | navigator.vibrate() | 모바일 전용 기능 |
| **호버 효과** | 풀 적용 | 비활성화 | 터치 환경 부적합 |
| **SKIP 버튼 크기** | 기본 | 1.2배 확대 | 터치 편의성 |

### CSS 미디어쿼리 분기
```css
/* 모바일 최적화 */
@media (max-width: 768px), (hover: none) {
  .result-card-enter {
    animation-duration: 0.3s;  /* PC: 0.5s */
  }
  .particle {
    --particle-count: 20;  /* PC: 50 */
  }
  .glitch-effect {
    animation: glitch-simple 0.2s;  /* 단순화된 글리치 */
  }
  .cyber-grid {
    display: none;  /* 모바일에서 비활성화 */
  }
  .result-skip-btn {
    min-width: 60px;
    min-height: 44px;  /* 터치 최소 크기 */
  }
}

/* 고사양 PC 전용 */
@media (min-width: 1024px) and (hover: hover) {
  .rank-badge.legendary {
    filter: drop-shadow(0 0 30px gold);
  }
  .cyber-grid {
    perspective: 1000px;
    animation: grid-flow 10s linear infinite;
  }
}

/* 저사양/접근성 모드 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 모바일 전용 기능

#### 1. 햅틱 피드백
```javascript
function triggerHaptic(type) {
  if (!isMobile || !navigator.vibrate) return;

  const patterns = {
    tick: [10],           // 카운팅 틱
    complete: [20, 30, 20], // 항목 완료
    rank: [50],           // 랭크 등장
    legendary: [100, 50, 100, 50, 200], // S랭크
    newRecord: [200, 100, 200]  // 신기록
  };

  navigator.vibrate(patterns[type] || [10]);
}
```

#### 2. 터치 제스처
- **탭**: SKIP 버튼 또는 화면 아무 곳 탭으로 스킵
- **스와이프 업**: 빠른 스킵 (연출 전체 건너뛰기)

### PC 전용 기능

#### 1. 키보드 단축키
- `Space` / `Enter`: 스킵
- `Esc`: 로비로 돌아가기
- `R`: 즉시 재시작

#### 2. 마우스 호버 효과
- 버튼 호버 시 글로우 강화
- 랭크 배지 호버 시 상세 정보 툴팁

---

## 예외처리 & 에지케이스

### 1. 데이터 관련 예외

#### 1-1. 점수가 0인 경우
```
상황: 게임 시작 직후 사망 (모든 수집물 0개)
```
| 항목 | 처리 방식 |
|------|----------|
| 카운팅 애니메이션 | 건너뛰기 (0인 행은 즉시 완료 표시) |
| 행 슬라이드 | 흐리게(opacity: 0.4) 표시 |
| 토탈 스코어 | "0" 표시, 빌드업 애니메이션 생략 |
| 랭크 | D랭크 즉시 표시, 글리치 효과만 적용 |
| 메시지 | "BETTER LUCK NEXT TIME" 표시 |

```javascript
// 0점 처리 예시
if (totalScore === 0) {
  skipAllAnimations();
  showMessage('BETTER LUCK NEXT TIME');
  showRank('D', { animation: 'glitch-only' });
}
```

#### 1-2. 극단적 고득점
```
상황: 점수가 1,000,000 이상 (자릿수 오버플로우)
```
| 항목 | 처리 방식 |
|------|----------|
| 숫자 표시 | 축약 표기 (1.2M, 999K+) |
| 카운팅 속도 | 스텝 수 증가 (최대 50스텝) |
| 폰트 크기 | 자동 축소 (clamp 또는 동적 계산) |
| 하이스코어 바 | 로그 스케일 적용 검토 |

```javascript
function formatLargeNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 100000) return Math.floor(num / 1000) + 'K';
  return num.toLocaleString();
}
```

#### 1-3. 동점 (신기록과 동일)
```
상황: 현재 점수 === 이전 최고 점수
```
- NEW RECORD로 처리하지 않음
- "MATCHED HIGH SCORE!" 별도 메시지 표시 (선택)
- 하이스코어 바에서 마커가 정확히 겹침

#### 1-4. 첫 플레이 (하이스코어 없음)
```
상황: highScore === 0 (저장된 기록 없음)
```
- 무조건 NEW RECORD 처리
- 하이스코어 바: 현재 점수를 100%로 표시
- "FIRST RECORD!" 메시지 표시 (선택)

### 2. 애니메이션 관련 예외

#### 2-1. 스킵 버튼 연타
```
상황: 유저가 스킵 버튼을 빠르게 여러 번 클릭
```
| 처리 방식 |
|----------|
| 첫 클릭 후 스킵 버튼 즉시 비활성화 |
| `resultAnimState.skipRequested = true` 플래그 설정 |
| 모든 진행 중인 setTimeout/requestAnimationFrame 즉시 정리 |
| 최종 상태로 즉시 점프 |

```javascript
let skipDebounce = false;
function handleSkip() {
  if (skipDebounce || !resultAnimState.isAnimating) return;
  skipDebounce = true;
  resultAnimState.skipRequested = true;

  // 모든 애니메이션 즉시 종료
  clearAllAnimations();
  showFinalState();

  setTimeout(() => skipDebounce = false, 500);
}
```

#### 2-2. 화면 전환 중 이탈
```
상황: 애니메이션 도중 브라우저 탭 전환, 백그라운드 이동
```
| 처리 방식 |
|----------|
| `visibilitychange` 이벤트 감지 |
| 백그라운드 전환 시 애니메이션 일시정지 |
| 복귀 시 남은 애니메이션 이어서 재생 또는 스킵 |

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden && resultAnimState.isAnimating) {
    pauseResultAnimation();
  } else if (!document.hidden && resultAnimState.isPaused) {
    resumeOrSkipAnimation();
  }
});
```

#### 2-3. 애니메이션 중 RESTART/LOBBY 클릭
```
상황: 연출 완료 전에 버튼 클릭
```
| 처리 방식 |
|----------|
| 즉시 모든 애니메이션 정리 (메모리 누수 방지) |
| 결과 데이터는 이미 저장되어 있으므로 안전하게 전환 |
| 파티클/오버레이 DOM 요소 제거 |

```javascript
function cleanupResultScreen() {
  resultAnimState.skipRequested = true;
  resultAnimState.isAnimating = false;

  // 파티클 컨테이너 비우기
  document.querySelectorAll('.temp-particle').forEach(el => el.remove());

  // 애니메이션 클래스 제거
  document.querySelectorAll('.animating').forEach(el => {
    el.classList.remove('animating');
  });
}
```

### 3. 성능 관련 예외

#### 3-1. 저사양 기기 감지
```
상황: CPU 코어 2개 이하, 메모리 2GB 이하, 프레임 드랍 감지
```
| 처리 방식 |
|----------|
| 파티클 비활성화 또는 최소화 (5개 이하) |
| 글리치/글로우 효과 CSS 단순화 |
| 배경 애니메이션 완전 비활성화 |
| 카운팅 스텝 수 50% 감소 |

```javascript
function detectPerformanceLevel() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

const perfLevel = detectPerformanceLevel();
const animConfig = {
  low: { particles: 5, glitch: false, steps: 10 },
  medium: { particles: 20, glitch: 'simple', steps: 20 },
  high: { particles: 50, glitch: 'full', steps: 30 }
}[perfLevel];
```

#### 3-2. 프레임 드랍 실시간 감지
```javascript
let lastFrameTime = performance.now();
let consecutiveDrops = 0;

function checkFrameRate() {
  const now = performance.now();
  const delta = now - lastFrameTime;

  if (delta > 50) { // 20fps 이하
    consecutiveDrops++;
    if (consecutiveDrops > 3) {
      reduceAnimationQuality();
    }
  } else {
    consecutiveDrops = 0;
  }

  lastFrameTime = now;
  requestAnimationFrame(checkFrameRate);
}
```

#### 3-3. 메모리 부족
```
상황: 파티클/DOM 요소 누적으로 메모리 증가
```
| 처리 방식 |
|----------|
| 파티클 풀링 시스템 적용 (재사용) |
| 화면 밖 파티클 즉시 제거 |
| 최대 파티클 수 하드 리밋 (100개) |
| 결과창 종료 시 모든 임시 요소 정리 |

### 4. 브라우저/기기 호환성

#### 4-1. CSS 기능 미지원
| 기능 | 폴백 처리 |
|------|----------|
| `backdrop-filter` | 반투명 배경색 사용 |
| `clip-path` | 글리치 효과 비활성화 |
| CSS Grid | Flexbox로 대체 |
| `env(safe-area-*)` | 고정 패딩 사용 |

```css
/* backdrop-filter 폴백 */
.result-overlay {
  background: rgba(0, 0, 0, 0.85); /* 폴백 */
}
@supports (backdrop-filter: blur(10px)) {
  .result-overlay {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
  }
}
```

#### 4-2. 사운드 재생 실패
```javascript
async function playSfx(name) {
  try {
    await window.Sound?.sfx?.(name);
  } catch (e) {
    console.warn('SFX failed:', name, e);
    // 사운드 없이 진행 (연출에 영향 없음)
  }
}
```

#### 4-3. 진동 API 미지원
```javascript
function safeVibrate(pattern) {
  if (typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // 조용히 실패 (iOS 등)
    }
  }
}
```

### 5. 사용자 설정 관련

#### 5-1. 접근성 모드 (Reduced Motion)
```
상황: prefers-reduced-motion: reduce 설정됨
```
| 처리 방식 |
|----------|
| 모든 애니메이션 즉시 완료 상태로 표시 |
| 파티클/글리치 완전 비활성화 |
| 페이드 인/아웃만 최소한으로 유지 |
| 사운드는 유지 (시각 대체) |

```javascript
if (prefersReducedMotion) {
  showFinalStateImmediately();
  return;
}
```

#### 5-2. 저전력 모드
```javascript
// 배터리 상태 확인 (지원 시)
if ('getBattery' in navigator) {
  const battery = await navigator.getBattery();
  if (battery.level < 0.2 || battery.charging === false) {
    reduceAnimationQuality();
  }
}
```

---

## 예외 상황 테스트 체크리스트

### 데이터 테스트
- [ ] 모든 항목 0점 (즉시 사망)
- [ ] 하나의 항목만 수집 (Bits만 100개)
- [ ] 극단적 고득점 (1,000,000+)
- [ ] 첫 플레이 (기존 기록 없음)
- [ ] 동점 (이전 기록과 동일)
- [ ] 각 랭크 경계값 테스트 (9,999 / 10,000)

### 인터랙션 테스트
- [ ] 스킵 버튼 연타
- [ ] 애니메이션 중 RESTART 클릭
- [ ] 애니메이션 중 LOBBY 클릭
- [ ] 탭 전환 후 복귀
- [ ] 브라우저 뒤로가기
- [ ] 새로고침

### 성능 테스트
- [ ] 저사양 안드로이드 (2GB RAM)
- [ ] 구형 iPhone (iPhone 7 이하)
- [ ] 저가 태블릿
- [ ] 고사양 PC (풀 이펙트)
- [ ] 프레임 드랍 시 자동 품질 저하

### 호환성 테스트
- [ ] Chrome (PC/Mobile)
- [ ] Safari (iOS/macOS)
- [ ] Firefox
- [ ] Samsung Internet
- [ ] iOS PWA 모드
- [ ] Android WebView

---

## 다음 단계

1. 위 제안 중 적용할 항목 선택
2. 우선순위별 구현 시작
3. 각 연출 테스트 및 타이밍 조정
4. 사운드 이펙트 추가/조정
5. 예외 상황 테스트 진행
6. 성능 프로파일링 및 최적화
