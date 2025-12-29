## Prompt 02+ — Tutorial Runtime Guardrails Follow-up

### 보완 목표
- 튜토리얼 중 `startGame` 재호출로 인한 프레임 상태 파손을 방지하고, 네비게이션 전환/완료 시 안전하게 런을 시작하도록 지연 처리합니다.
- 튜토리얼 실패/완료 플로우에서 중복 호출을 방지하고, 남을 수 있는 튜토리얼 전용 오버라이드를 해제합니다.
- 새로고침/복구 시 최초 진입 강제 플로우를 명시적으로 재개합니다.

### 변경 사항
1. `startTutorial`에서 `Navigation.go('tutorial')` 후 `requestAnimationFrame`에 `startGame`/`startStep`을 지연 호출하고, 런이 이미 활성 상태라면 재시작하지 않습니다. (`assets/js/tutorial/tutorialManager.js`)
2. 튜토리얼 실패 핸들러에 `_handlingFail` 플래그를 추가해 중복 호출을 방지하고, 실패 후 짧은 지연 뒤에만 재시작하도록 조정했습니다. (`assets/js/game/lifecycle.js`, `assets/js/tutorial/tutorialManager.js`)
3. 튜토리얼 완료 시 `clearTutorialOverrides`로 입력/슬로모/튜토리얼 모드 관련 오버라이드를 해제한 뒤 Stage 1 재시작을 지연 호출합니다. (`assets/js/tutorial/tutorialManager.js`)
4. `restoreFromStorage`가 진행 중 상태를 발견하면 부팅 플로우(`from: 'boot'`)로 재진입하도록 보완했습니다. (`assets/js/tutorial/tutorialManager.js`)

### 테스트 메모
- 브라우저 환경이 없어 수동 UI 테스트는 수행하지 못했습니다. 이후 통합 시 튜토리얼 중 결과 화면 차단, 실패 재시작, 완료 후 Stage 1 전환, 새로고침 복구 동작을 확인 예정입니다.
