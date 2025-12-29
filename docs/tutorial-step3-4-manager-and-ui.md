# Tutorial Expansion – Step 3 & 4

## 작업 요약
- `TutorialManager` 모듈을 추가해 튜토리얼 단계 진행/판정 로직과 상태 전환, 리트라이/완료 처리를 구현했습니다.
- UI 요소 존재 여부에 안전하게 대응하는 `TutorialUI` 모듈을 추가해 단계 표시, 메시지, 힌트, 하이라이트 기능을 제공했습니다.

## 주요 구현 내용
1. **TutorialManager (`assets/js/game/tutorial.js`)**
   - IIFE 패턴으로 글로벌 `window.TutorialManager`/`GameModules.Tutorial` 노출.
   - state 초기화, 단계 진행 판정(`checkStepCondition`), 단계 전환/완료 처리(`startTutorial`, `onStepComplete`, `onTutorialComplete`, `retryStep`)를 방어적으로 구현.
   - 이동/대쉬/안전판정/거리 조건을 success 설정 기반으로 확인하며, 거리 정보가 없을 경우 안전하게 실패 처리.
   - 저장/네비/UI/런타임이 없을 때도 콘솔 디버그만 남기고 크래시 없이 동작.
   - 외부 이벤트 입력 훅(`markMoved`, `markDashed`, `incrementSafeJudgment`, `setStartDistance`, `setCurrentDistance`)을 제공해 loop/lifecycle 연결 준비.

2. **TutorialUI (`assets/js/ui/tutorialUI.js`)**
   - DOM 요소가 없어도 오류 없이 초기화되도록 방어 처리.
   - 단계 표시, 메시지, 리트라이/전환/완료 안내, 힌트 표시(자동 제거), 요소 하이라이트 토글 기능을 제공.
   - 텍스트는 짧고 단순하게 유지하여 “최소 텍스트/오버레이 중심” 원칙을 반영.

## 메모
- 아직 화면 요소가 없는 상태에서도 init/표시 함수 호출 시 콘솔 디버그 외 부작용 없이 동작합니다.
- Step 4 완료 시 로비 이동/저장은 해당 기능이 존재할 때만 호출합니다.
