# Stage BGM Plan

## Goals
- Add infinite looping background music per stage.
- Keep transitions smooth and non-intrusive.
- Avoid external audio assets by using procedural Web Audio.

## Theme mapping
- PaletteId to BGM theme:
  - NEON_BASE, CIRCUIT, DEFAULT -> neon_base
  - NEON_CITY -> neon_city
  - GLITCH -> glitch
  - VOID -> void
  - SUNSET -> sunset
  - STORM -> storm
  - TUTORIAL -> tutorial

## Music design
- Each theme defines:
  - tempo (BPM)
  - root frequency
  - scale (semitones)
  - 16-step arpeggio pattern (loop)
  - pad chord intervals (3 voices)
  - filter cutoff and timbre
- Stage id selects a pattern variant and a small root shift.
- Loop stages add a small tempo lift for energy.

## Runtime behavior
- `Sound.bgmStart()` builds nodes and starts a scheduler loop.
- `Sound.bgmSetStage()` is called on stage changes to update the theme.
- `Sound.bgmSetTheme()` is used for tutorial override.
- Pause/death stops BGM; resume restarts from current theme.
- Volume is controlled by `qaConfig.bgmVol` (0-0.25).

## Transition handling
- Theme change applies a short gain dip and retunes the pad.
- Filter cutoff, pad gain, and wave types update with smoothing.

## Acceptance checklist
- BGM loops continuously without gaps.
- Stage change updates music within ~0.3s without clicks.
- Tutorial uses the tutorial BGM theme.
- BGM honors volume slider and audio enable state.
