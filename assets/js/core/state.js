// state.js (classic script - must be loaded before game.js)
// Use `var` to guarantee the identifier is in the global scope for separately-loaded scripts.
var STATE = { RUN: 0, WARNING: 1, STOP: 2, PAUSE: 3 };

var gameState = STATE.RUN;
var gameActive = false;
var cycleTimer = 0;
var targetColorIndex = -1;
var currentThemeIdx = 0;
var currentLevelGoal = 2000;
var lastTime = 0;
var bigGemSpawned = false;  // [위험한 유혹] WARNING당 big_gem 1회 스폰 플래그

// Safety: expose explicitly on window as well
window.STATE = STATE;
