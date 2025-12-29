# Tutorial Phase 0 – Entry & Re-entry Hooks

## What changed
- Added a tutorial gate inside `lifecycle.startGame` that reads `localStorage` before each run, initializes `runtime.tutorialStep`, and forces tutorial mode when `tutorialCompleted` is not set to `true`.
- Introduced helper accessors (`getTutorialStatus`, `startTutorialAt`) plus global shortcuts so UI and QA tools can consistently start or resume the tutorial.
- Added a persistent, round tutorial button to the lobby footer with refreshed UI text and hover styling.

## Storage contract
- `tutorialCompleted` (`localStorage`): when `true`, normal game flow is used. Any other value (or missing key) forces tutorial mode on start.
- `tutorialProgress` (`localStorage`): last known step index. We clamp to `0+` and persist whenever the tutorial is activated.

## Runtime signals
- `runtime.tutorialStep`: set from the resolved start state, defaults to `null` when not in tutorial mode.
- `runtime.tutorial`: `{ active, step, progress, completed }` for downstream tutorial systems.
- `window.Game.getState()` now includes `tutorialActive` and `tutorialStep` for debug overlays.

## UI behavior
- Lobby now shows a circular “Tutorial” entry on the right side of the footer:
  - Click: starts tutorial from saved progress (or step 0 if completed).
  - Shift+Click: force reset to step 0.
- `window.refreshTutorialCTA()` keeps the label in sync; `updateLobbyUI` calls it whenever the lobby refreshes.

## Notes for future phases
- Completion logic is still a TODO: once the tutorial finale is implemented, set `localStorage.tutorialCompleted = 'true'` to allow the main game start button to bypass the tutorial by default.
- `startTutorial(step, { resetProgress })` and `Game.startTutorialAt(step)` are available for scripted jumps or QA warps when tutorial-only configs land.
