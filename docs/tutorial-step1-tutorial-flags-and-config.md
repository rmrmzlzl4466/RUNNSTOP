# Tutorial Expansion – Step 1

## 작업 요약
- 저장 데이터 구조에 튜토리얼 진행 상태 필드(`tutorialCompleted`, `tutorialProgress`)를 추가했습니다.
- 튜토리얼 단계별 설정과 StageConfig 오버라이드 헬퍼를 제공하는 `TutorialConfig` 모듈을 신규 작성했습니다.

## 세부 변경 내역
1. **저장 데이터 스키마 확장**
   - `assets/js/core/storage.js`와 `assets/js/game/config.js`의 기본 저장 데이터에 튜토리얼 플래그를 추가했습니다.
   - 기본값: `tutorialCompleted: false`, `tutorialProgress: 0`.
   - 기존 필드 구조를 유지하여 기존 저장/불러오기 로직이 그대로 작동합니다.

2. **튜토리얼 설정 모듈 추가**
   - `assets/js/game/tutorialConfig.js`를 생성하여 IIFE 패턴으로 `TutorialConfig`를 정의했습니다.
   - 1~4단계 `TUTORIAL_STEP_CONFIG`를 포함하며, 스톰 속도, 경고/정지 시간, 성공 조건, 힌트 등을 단계별로 제공합니다.
   - `getConfig(step)`으로 단계 설정을 조회하고, `applyOverrides(effectiveConfig, step)`으로 StageConfig 결과에 튜토리얼용 오버라이드를 적용합니다.

## 메모
- StageConfig 계산 이후 `TutorialConfig.applyOverrides`를 호출하면 튜토리얼 단계별로 스톰 속도 배수, 경고/정지 시간이 반영되며 메타데이터(`tutorial`)가 함께 전달됩니다.
