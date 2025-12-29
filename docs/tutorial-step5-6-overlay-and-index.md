# Tutorial Expansion – Step 5 & 6

## 작업 요약
- 튜토리얼 전용 CSS(`assets/css/tutorial.css`)를 추가하여 오버레이, 메시지, 힌트, 하이라이트, 로비 튜토리얼 버튼 스타일을 정의했습니다.
- `index.html`에 튜토리얼 화면 DOM(전용 캔버스 + 오버레이)과 로비 튜토리얼 버튼을 추가하고, 튜토리얼 관련 CSS/JS 리소스를 포함했습니다.

## 세부 변경 내역
1. **스타일 정의**
   - `#tutorial-overlay`, `#tutorial-progress`, `#tutorial-message`, `.tutorial-hint`, `.tutorial-highlight` 등 튜토리얼 전용 스타일과 애니메이션을 추가했습니다.
   - 로비 우하단 플로팅 버튼 `#btn-tutorial` 스타일을 추가해 원형 버튼/hover 효과를 적용했습니다.

2. **화면/리소스 마크업**
   - 로비 이전에 튜토리얼 전용 스크린(`screen-tutorial`)을 추가하고, 오버레이 컨테이너와 메세지/힌트/진행 표시 영역을 포함했습니다.
   - 로비 푸터에 `#btn-tutorial` 버튼을 추가(동작 연결은 이후 단계 예정).
   - `tutorial.css`, `tutorialConfig.js`, `tutorialUI.js`, `tutorial.js`를 로드하도록 리소스 목록을 확장했습니다.

## 메모
- 오버레이/메시지/힌트 요소는 `pointer-events: none` 상태로 기본 UI를 가리지 않습니다.
- 새 DOM 요소가 없어도 기존 화면/버튼 동작에는 영향을 주지 않도록 기존 구조를 유지했습니다.
