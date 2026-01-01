# 구조 리팩토링 필요성 검토

## 결론
- 현재 구조는 기능 추가/수정 시 충돌 가능성이 높아 중기적 리팩토링이 필요함.
- `docs/structure_improvement_plan.md`의 방향성은 타당하며, 아래 근거를 바탕으로 "점진적 분리"가 적절함.

## 근거 (관찰된 구조적 리스크)
- 전역 상태 과다: `assets/js/main.js`, `assets/js/game/lifecycle.js`, `assets/js/game/loop.js`, `assets/js/game/tutorial.js`에서 `window.*` 접근과 런타임 상태 직접 수정이 빈번함.
- 상태 전이 책임 분산: `runtime.gameState` 변경이 `assets/js/game/loop.js`, `assets/js/game/lifecycle.js`, `assets/js/game/tutorial.js`에 분산됨.
- 튜토리얼/일반 플레이 결합: `assets/js/game/loop.js`에서 `Tutorial.tick()`을 직접 호출하고 다수의 튜토리얼 전용 플래그를 사용함.
- 저장/설정 중복: `assets/js/core/storage.js`(SaveManager)와 `assets/js/game/storage.js`(GameModules.Storage)의 역할이 겹치고, `assets/js/core/config.js`와 `assets/js/game/config.js`가 상호 참조 구조임.
- UI/게임 로직 결합: `assets/js/ui/tutorialUI.js`, `assets/js/ui/uiManager.js`가 게임 상태/튜토리얼 진행 이벤트에 직접 종속됨.
- 스크립트 로딩 순서 의존: `index.html` 내 로딩 순서가 깨지면 GameModules 의존성 오류가 발생할 위험이 큼.
- 네비게이션 부작용: `assets/js/ui/navigation.js`에서 화면 전환과 효과음/탭 초기화 등이 혼재됨.

## 리팩토링 필요 범위(권장)
- 상태 관리: 런타임 상태와 전이를 한 곳에서 관리하도록 책임을 분리 (Lifecycle/Loop/TutorialManager 역할 구분).
- 튜토리얼 분리: 성공 조건 및 전이 로직을 Loop 외부에서 처리하고, Loop는 "읽기 중심"으로 유지.
- 저장/설정 단일화: SaveManager vs GameModules.Storage, GameConfig vs GameModules.Config의 단일 진실원으로 통합.
- UI 업데이트 표준화: UI는 상태를 입력받아 렌더링하는 구조로 변경.
- 모듈 로딩/의존성 표준화: 최소한의 init 순서 정의, 장기적으로 번들러/모듈 로더 도입 검토.

## 추천 접근 (점진적)
- Phase 0: 구조 문서화 보강 및 충돌 지점 목록화.
- Phase 1: TutorialManager 상태 머신화 + Loop 분기 최소화.
- Phase 2: 저장/설정 모듈 통합.
- Phase 3: UI 렌더링 파이프라인 정리 + Navigation side effect 분리.
- Phase 4: 전역 접근 최소화 + 의존성 명시화.

## 리스크/비용 메모
- 전면 개편은 QA 범위가 커지므로 단계별 분리로 리스크 관리 필요.
- 튜토리얼/스테이지 로직은 밸런스에 직접 영향이 있어 작은 단위로 점진 적용 권장.

## 다음 액션
- 구조 개선 계획 기반으로 실제 적용 순서와 담당 범위를 확정.
