# 구조 개선 및 점검 계획서

본 문서는 현재 코드 구조를 파악하고, 개선 방향을 구조적으로 정리한 제안서이다. 목표는 안정적인 런타임/튜토리얼 전이, UI 일관성, 모듈 책임 분리, 테스트 가능한 구조로의 전환이다.

## 1) 범위 및 전제
- 대상 브랜치: sdk_youtube
- 주요 대상: 런타임/루프/튜토리얼/스테이지/네비게이션/상점 UI
- 최우선 목표: 튜토리얼 흐름과 일반 플레이 흐름의 충돌 제거, 상태 전이 안정화

## 2) 현재 구조 요약

### 2.1 런타임/루프 계층
- 런타임 생성: `assets/js/game/runtime.js`
- 라이프사이클: `assets/js/game/lifecycle.js`
- 메인 루프: `assets/js/game/loop.js`
- 물리/렌더/입력/아이템/스테이지는 각 모듈이 window.GameModules 하위로 전역 노출

흐름(요약):
- `main.js` 부트스트랩
  - GameData 로딩
  - runtime/player 초기화
  - lifecycle 생성
  - 화면 네비게이션 바인딩
- `lifecycle.startGame`이 runtime 초기화 및 loop 시작
- `loop.js`가 매 프레임 상태 갱신, UI 업데이트 호출

### 2.2 튜토리얼 계층
- 튜토리얼 상태/전이: `assets/js/game/tutorial.js`
- 튜토리얼 설정: `assets/js/game/tutorialConfig.js`
- 튜토리얼 UI: `assets/js/ui/tutorialUI.js`
- 루프 분기: `assets/js/game/loop.js`

특징:
- runtime에 `tutorialMode`, `tutorialStep`, `tutorialSubStep` 등 플래그로 분기
- loop 내부에서 tutorial 분기/성공/실패 처리
- UI/메시지/하이라이트를 tutorialUI에서 직접 DOM 업데이트

### 2.3 UI/네비게이션
- 전환: `assets/js/ui/navigation.js`
- 스크린: `index.html`의 `#screen-*`
- 상점/탭: `assets/js/ui/shop.js`, `assets/js/ui/tabs.js`

특징:
- Navigation.go가 모든 화면을 숨기고 한 화면만 보이도록 설정
- 상점 기본 탭 및 UI 업데이트가 Navigation.go 내부에서 호출

### 2.4 스테이지/레벨
- 스테이지 계산: `assets/js/core/levelManager.js`
- 스테이지 진행: `assets/js/game/stage.js`
- 스테이지 설정/QA 오버라이드: `assets/js/game/stageConfig.js`

특징:
- distance 기반 스테이지 전환
- tutorial 모드에서는 stage 진행/테마/목표를 일부 고정 처리

## 3) 구조적 문제 및 리스크

### 3.1 전역 상태 과다
- 다수 모듈이 `window.runtime`, `window.player`, `window.GameData`에 직접 접근
- 상태 변경이 분산되어 있어 전이 순서 의존이 큼

### 3.2 튜토리얼 분기 난립
- loop 내부 분기가 많아져 정상 플레이와 튜토리얼이 강하게 결합됨
- retry/step 전이가 runtime 및 UI 업데이트를 동시에 수행

### 3.3 UI/게임 로직 결합
- tutorialUI는 DOM 변경을 즉시 수행, 게임 로직이 UI 결과에 의존
- shop.js는 데이터 변경과 UI 렌더가 한 함수에 혼재

### 3.4 거리/목표 기준 혼용 가능성
- `player.dist`, `getTraveledDistance`, `currentLevelGoal` 등 기준이 다층적
- 튜토리얼 종료 조건이 step 기준인지 stage 기준인지 혼재 가능

### 3.5 네비게이션 부작용
- Navigation.go에서 탭 기본 상태를 강제로 변경
- 화면 전환 시 로직이 분기되어 있어 사용자 상태가 끊길 위험

## 4) 개선 방향 (구조 우선)

### 4.1 상태 모델 일원화
- 런타임 상태를 하나의 상태 객체로 일관 관리
- 튜토리얼 전용 상태를 별도 state machine로 분리
- 전역 접근을 최소화하고, interface 기반 접근으로 점진 전환

### 4.2 루프 책임 축소
- loop는 “읽기 중심”으로 유지하고, 상태 전이는 각 시스템 모듈에 위임
- 튜토리얼/스테이지/아이템 로직을 루프에서 직접 처리하지 않도록 분리

### 4.3 UI 레이어 분리
- UI는 상태 변경을 수신하는 subscriber 역할로 재구성
- UI 업데이트 트리거를 명시적으로 분리(예: `UI.updateFromState(state)`)

### 4.4 거리/목표 기준 명문화
- 거리 기준을 “절대 거리”와 “스텝 상대 거리”로 구분
- 튜토리얼 성공 조건에 명시적으로 목표 종류를 지정
  - 예: { type: 'stage_end' } 또는 { type: 'relative_distance', value: 700 }

### 4.5 네비게이션 표준화
- Navigation.go에서 자동 탭 선택 제거 또는 외부에서 명시 호출
- 화면 전환 정책을 별도 config로 분리

## 5) 단계적 개선 로드맵

### Phase 0: 구조 점검/문서화 (현재 단계)
- 모듈 책임/의존 관계 문서화
- 튜토리얼 상태 전이 표 작성

### Phase 1: 튜토리얼 상태 머신 분리
- `TutorialManager`를 상태 머신 기반으로 재구성
- loop에서 조건 체크만 하고 전이는 TutorialManager에서 처리
- 성공/실패/전환 이벤트를 단일 경로로 통합

### Phase 2: 거리/목표 기준 통합
- 모든 성공 조건을 공통 구조로 표준화
- tutorialConfig에 목표 타입 선언 추가
- 거리 계산 유틸로 통합

### Phase 3: UI 업데이트 구조화
- UI 레이어에 render 함수 표준화
- Shop/Upgrade/Treasure/Skin 렌더를 통합 렌더 파이프라인으로 정리

### Phase 4: Navigation 분리
- 화면 전환 정책을 `navigationConfig`로 분리
- 각 화면의 초기화 로직을 해당 모듈에서 담당하도록 이동

## 6) 개선 대상 파일(우선순위)

1. `assets/js/game/tutorial.js`
2. `assets/js/game/loop.js`
3. `assets/js/game/lifecycle.js`
4. `assets/js/game/stage.js`
5. `assets/js/ui/tutorialUI.js`
6. `assets/js/ui/navigation.js`
7. `assets/js/ui/shop.js`

## 7) 기대 효과
- 튜토리얼/게임 루프 간 결합도 감소
- 상태 전이 버그 예방
- UI 변경 시 부작용 최소화
- QA 및 디버깅 효율 개선

## 8) 다음 작업 제안
- 튜토리얼 상태 전이 다이어그램 작성
- 거리 기준 및 목표 구조 표준화 설계
- UI 렌더링 함수 통합 설계

---
문서 작성: Codex (구조 개선 초안)
