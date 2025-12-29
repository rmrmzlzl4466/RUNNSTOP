## Prompt 02 — Tutorial Runtime Control & Game Loop Integration

### 목표
- 튜토리얼 중 게임 종료/결과 흐름을 완전히 차단하고, 완료 시 바로 Stage 1(BOOT SEQUENCE)로 전환되도록 런타임/라이프사이클을 정비합니다.

### 진행 내용
1. `runtime.tutorial` 구조를 표준화해 튜토리얼 플래그, 스텝, 최초 강제 잠금, 종료 중복 방지 상태를 저장합니다.
2. `lifecycle.js`에서 사망/게임오버 처리를 튜토리얼 전용 실패 핸들러로 우회하고, 튜토리얼 중 `startGame` 중복 호출을 막는 옵션을 추가했습니다.
3. `tutorialManager.js`를 추가해 튜토리얼 진입/중단/완료 흐름, 실패 재시작, 새로고침 복구, `localStorage` 불가 시 fallback을 포함한 상태 복구를 담당합니다.
4. 튜토리얼 완료 시 로비로 이동하지 않고 즉시 Stage 1을 시작하도록 finish 로직을 구현했습니다.

### 테스트 메모
- 브라우저 환경이 없어 수동 UI 테스트는 수행하지 못했습니다. 이후 통합 시 튜토리얼 흐름에서 결과 화면 차단, 재진입 복구, 완료 후 Stage 1 전환을 브라우저에서 확인 예정입니다.
