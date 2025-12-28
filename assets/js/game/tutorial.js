window.GameModules = window.GameModules || {};

(function() {
    const { UI, Renderer } = window.Game;
    const { keys, joystick, isInitialized } = window.Input;

    const PHASES = {
        INACTIVE: 0,
        START: 1,
        MOVE: 2,
        DASH: 3,
        CHARGE_DASH: 4,
        END: 5,
    };

    let currentPhase = PHASES.INACTIVE;
    let subPhase = 0; // 0: initial, 1: left done, 2: right done
    let timeInPhase = 0;
    let phaseActionCompleted = false;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function start() {
        console.log("Tutorial starting...");
        currentPhase = PHASES.START;
        subPhase = 0;
        timeInPhase = 0;
        phaseActionCompleted = false;
        window.runtime.isTutorialActive = true;
    }

    function complete() {
        console.log("Tutorial completed! Transitioning to game...");
        UI.setTutorialMessage(null); // Hide tutorial message
        window.SaveManager.completeTutorial();
        // Transition to the real game instead of quitting to lobby
        window.lifecycle.transitionFromTutorialToGame();
        // The rest is handled by transitionFromTutorialToGame
        currentPhase = PHASES.INACTIVE; 
    }

    function update(dt) {
        if (currentPhase === PHASES.INACTIVE) return;
        timeInPhase += dt;

        switch (currentPhase) {
            case PHASES.START:
                UI.setTutorialMessage("Welcome! Let's learn the controls.");
                if (timeInPhase > 2.5) {
                    currentPhase = PHASES.MOVE;
                    subPhase = 0;
                }
                break;

            case PHASES.MOVE:
                const pcMsg = "Press A, D keys to move left and right.";
                const mobileMsg = "Touch left or right side of the screen to move.";
                UI.setTutorialMessage(isTouchDevice ? mobileMsg : pcMsg);

                let movedLeft = false;
                let movedRight = false;

                if (isTouchDevice) {
                    // For mobile, we check the joystick vector from the input system
                    if (joystick.active && joystick.vectorX < -0.5) movedLeft = true;
                    if (joystick.active && joystick.vectorX > 0.5) movedRight = true;
                } else {
                    if (keys.a) movedLeft = true;
                    if (keys.d) movedRight = true;
                }

                if (movedLeft && !(subPhase & 1)) subPhase |= 1;
                if (movedRight && !(subPhase & 2)) subPhase |= 2;

                if (subPhase === 3) { // Both left and right moved
                    currentPhase = PHASES.DASH;
                    timeInPhase = 0;
                    phaseActionCompleted = false;
                }
                break;

            case PHASES.DASH:
                if (!phaseActionCompleted) {
                    const pcDashMsg = "Great! Now press Space key to Dash.";
                    const mobileDashMsg = "Great! Now tap the Dash button to Dash.";
                    UI.setTutorialMessage(isTouchDevice ? mobileDashMsg : pcDashMsg);
                    
                    if (window.player.isDashing) {
                        phaseActionCompleted = true;
                        setTimeout(() => {
                            currentPhase = PHASES.CHARGE_DASH;
                            timeInPhase = 0;
                            phaseActionCompleted = false;
                        }, 500); // Give a small delay before next instruction
                    }
                }
                break;

            case PHASES.CHARGE_DASH:
                if (!phaseActionCompleted) {
                    const pcChargeMsg = "Excellent! Hold down the Space key to charge, then release to Dash further.";
                    const mobileChargeMsg = "Excellent! Hold down the Dash button, then release to Dash further.";
                    UI.setTutorialMessage(isTouchDevice ? mobileChargeMsg : pcChargeMsg);
                    
                    if (window.player.isDashing && window.player.lastDashWasCharged) {
                        phaseActionCompleted = true;
                        window.player.lastDashWasCharged = false; // Consume the flag
                        setTimeout(() => {
                           currentPhase = PHASES.END;
                           timeInPhase = 0;
                        }, 500);
                    }
                }
                break;

            case PHASES.END:
                UI.setTutorialMessage("All controls learned! Good luck!");
                if (timeInPhase > 2.5) {
                    complete();
                }
                break;
        }
    }

    function stop() {
        currentPhase = PHASES.INACTIVE;
        window.runtime.isTutorialActive = false;
        UI.setTutorialMessage(null);
    }

    window.GameModules.Tutorial = {
        start,
        update,
        stop,
        isActive: () => currentPhase !== PHASES.INACTIVE,
    };

})();