(function() {
  'use strict';

  const TutorialManager = {
    state: {
      step: 0,
      subStep: 0, // 각 Step 내부의 하위 단계 (예: Step 1-1: 이동, Step 1-2: 대쉬)
      isActive: false,
      retryCount: 0,
      moveDetected: false,
      dashDetected: false,
      safeJudgmentCount: 0,
      startDistance: 0,
      platform: 'unknown', // 'pc' or 'mobile'
    },

    init() {
      this.state = { step: 0, subStep: 0, isActive: false, retryCount: 0, platform: this.detectPlatform() };
    },

    detectPlatform() {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      return isMobile ? 'mobile' : 'pc';
    },

    startTutorial(step = 1) {
      this.state.step = step;
      this.state.subStep = 1; // 첫 번째 하위 단계부터 시작
      this.state.isActive = true;
      this.state.retryCount = 0;
      this.resetStepProgress();

      // runtime에 튜토리얼 모드 설정
      if (window.runtime) {
        window.runtime.tutorialMode = true;
        window.runtime.tutorialStep = step;
        window.runtime.tutorialSubStep = this.state.subStep;
      }

      // UI 업데이트
      window.TutorialUI?.showStep(step, this.state.subStep); // subStep 정보 추가 전달
      window.TutorialUI?.showHint(step, this.state.subStep, this.state.platform); // 플랫폼 정보 전달

      // 게임 시작
      this.startGameForStep(step);
    },

    checkStepCondition() {
      const config = window.TutorialConfig.getConfig(this.state.step); // getConfig 사용
      const condition = config.successCondition;

      if (this.state.step === 1) { // Step 1: 기본 조작
        if (this.state.subStep === 1) { // 이동 학습
          return this.state.moveDetected;
        }
        if (this.state.subStep === 2) { // 대쉬 학습
          return this.state.dashDetected;
        }
      }
      
      if (this.state.step === 2) { // Step 2: 핵심 메커니즘
        return this.state.safeJudgmentCount >= condition.safeJudgmentCount;
      }
      if (this.state.step === 3 || this.state.step === 4) { // Step 3, 4: 거리 기반
        const traveled = window.player?.y - this.state.startDistance;
        return traveled >= condition.distance;
      }
      return false;
    },

    checkEventTriggers() {
      const config = window.TutorialConfig.getConfig(this.state.step);
      if (!config.eventTriggers) return;

      const traveled = window.player?.y - this.state.startDistance;

      config.eventTriggers.forEach(trigger => {
        if (trigger.triggered) return;

        let conditionMet = false;
        if (trigger.type === 'distance' && traveled >= trigger.value) {
          conditionMet = true;
        } else if (trigger.type === 'fixed_position' && window.player?.y >= trigger.value) {
          conditionMet = true;
        }
        
        if (conditionMet) {
          this.handleEventTrigger(trigger.action);
          trigger.triggered = true; // 한 번만 실행되도록 플래그 설정
        }
      });
    },

    handleEventTrigger(action) {
      switch(action) {
        case 'start_run_stop_cycle':
          // GameModules.Loop 또는 runtime의 특정 함수를 호출하여 사이클 시작
          console.log("TUTORIAL: Run/Stop cycle starts now.");
          // TODO: 실제 게임 루프의 상태 전환 시작 로직 호출
          break;
        case 'spawn_item_shield':
          // GameModules.Items.spawnItemAt() 같은 함수 호출
          console.log("TUTORIAL: Spawning shield item.");
          // TODO: 실제 아이템 스폰 로직 호출
          break;
        case 'activate_storm':
          // runtime.storm.active = true; 와 같이 스톰 활성화
          console.log("TUTORIAL: Storm is now active.");
          // TODO: 실제 스톰 활성화 로직 호출
          break;
      }
    },

    onStepComplete() {
      if (this.state.step === 1) {
        if (this.state.subStep === 1) { // 이동 완료 -> 대쉬로 진행
          this.state.subStep++;
          window.runtime.tutorialSubStep = this.state.subStep;
          this.resetStepProgress(); // 대쉬 관련 상태 리셋
          window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform);
          return; // 아직 전체 Step 완료 아님
        }
      }

      // 현재 Step 완료 처리
      this.state.step++;
      this.state.subStep = 1; // 다음 Step의 첫 번째 subStep으로 시작
      window.runtime.tutorialStep = this.state.step;
      window.runtime.tutorialSubStep = this.state.subStep;

      if (this.state.step > 4) {
        this.onTutorialComplete();
      } else {
        this.resetStepProgress();
        window.TutorialUI?.showStepTransition(this.state.step);
        window.TutorialUI?.updateUIVisibility(this.state.step); // UI 가시성 업데이트
        this.startGameForStep(this.state.step);
      }
    },

    retryStep() {
      this.state.retryCount++;
      this.resetStepProgress();

      // 힌트 UI 활성화 (3회 실패 시)
      if (this.state.retryCount >= 3) {
        window.TutorialUI?.showHint(this.state.step, this.state.subStep, this.state.platform); // 플랫폼 정보 전달
      }

      window.TutorialUI?.showRetryMessage();
      window.TutorialUI?.updateUIVisibility(this.state.step); // UI 가시성 업데이트
      this.startGameForStep(this.state.step);
    },

    onTutorialComplete() {
      this.state.isActive = false;

      // 저장
      const gameData = window.SaveManager.load(); // SaveManager 사용
      gameData.tutorialCompleted = true;
      gameData.tutorialProgress = 4;
      window.SaveManager.persist(gameData); // SaveManager 사용

      // 완료 연출 후 로비로
      window.TutorialUI?.showCompletionAnimation(() => {
        window.Navigation.go('lobby');
      });
    },

    resetStepProgress() {
      this.state.moveDetected = false;
      this.state.dashDetected = false;
      this.state.safeJudgmentCount = 0;
      // 플레이어 위치 초기화 로직 (필요 시 GameModules.Player.resetPosition() 등 호출)
      this.state.startDistance = window.player?.y || 0; // 현재 플레이어 위치를 시작 지점으로 설정
      // 모든 이벤트 트리거의 'triggered' 플래그를 리셋
      const config = window.TutorialConfig.getConfig(this.state.step);
      if (config.eventTriggers) {
        config.eventTriggers.forEach(trigger => trigger.triggered = false);
      }
    },

    startGameForStep(step) {
      // 튜토리얼 전용 StageConfig 오버라이드 적용
      const baseConfig = window.GameConfig.createFullConfig();
      const tutorialStageConfig = window.TutorialConfig.applyOverrides(
        baseConfig, // 전역 config 복사
        step
      );
      window.runtime.currentStage = tutorialStageConfig; // 튜토리얼 스펙 적용
      
      // UI 가시성 초기 업데이트
      window.TutorialUI?.updateUIVisibility(step);

      // 실제 게임 시작(lifecycle.startGame())은 이 함수를 호출한 쪽(main.js)에서 담당
    },
    
    // 플레이어 이동 감지 (GameModules.Controls에서 호출)
    onPlayerMove() {
      if (this.state.isActive && this.state.step === 1 && this.state.subStep === 1) {
        this.state.moveDetected = true;
      }
    },

    // 플레이어 대쉬 감지 (GameModules.Controls에서 호출)
    onPlayerDash() {
      if (this.state.isActive && this.state.step === 1 && this.state.subStep === 2) {
        this.state.dashDetected = true;
      }
    },

    quitTutorial() {
      this.state.isActive = false;
      if (window.runtime) {
        window.runtime.tutorialMode = false;
        window.runtime.tutorialStep = 0;
        window.runtime.tutorialSubStep = 0;
      }
      // UI 초기화 및 원래 HUD 가시성 복구
      window.TutorialUI?.removeHighlights();
      window.Game.UI.setMobileControls(false); // Mobile controls may have been hidden by tutorial
      document.getElementById('hud').style.display = 'block'; // Restore full HUD
      window.Navigation?.go('lobby');
    }
  };

  window.TutorialManager = TutorialManager;
  window.GameModules = window.GameModules || {};
  window.GameModules.Tutorial = TutorialManager;
})();