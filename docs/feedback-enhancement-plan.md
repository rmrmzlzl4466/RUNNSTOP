# Feedback Enhancement Plan

## Purpose
Strengthen feel of acceleration and control without adding new systems. Focus on clarity and punch.

## Current feedback inventory
- Visual: player trail, charge glow, dash cooldown ring, boost beam, barrier ring
- UI: phase bar, storm warning banner/text, dash button state, buff icons, toast
- Audio: dash/boost/JFB/alert
- Camera: subtle zoom changes

## Review: keep / improve / add
P0 must add
- Speed feedback (trail scaling, edge flow lines, minimal camera kick)
- Dash impact (bow shock, flash, air-cut SFX)
- Danger/safe state (player rim color + storm proximity vignette)

P1 should add
- JFB success/fail clarity (pre-cue, stamp, micro-slow)
- RUN/STOP transition cue (short flash + sound)

P2 optional
- Stage progress ambience (background density, light sweep)

Not needed now
- Heavy full-screen distortion (too noisy, perf risk). Reserve for special moments.

## Detailed specs
### 1) Speed Feedback (P0)
Trigger
- active when speed ratio > 0.55 (ratio = speed / maxSpeed)
Visual
- Trail thickness/opacity scales with ratio
- Edge flow lines spawn from screen edges, density = 0.5 -> 2.0
- Camera micro-kick on dash start: 2-4px forward, 0.1s ease out
Audio
- subtle wind hiss layer when ratio > 0.7 (volume ramp)

### 2) Dash Impact (P0)
Trigger
- dash start, plus brief tail over dash duration
Visual
- Bow Shock cone line (0.08s strong -> 0.18s fade)
- Compression ring expands 0.06s to 0.12s
- Short glow flash behind player
Audio
- air-cut layer, pitch scaled by dash force
Perf
- particles 8-12 on dash, 2-4 sustain

### 3) Danger/Safe State (P0)
Trigger
- safe tile vs unsafe; storm proximity
Visual
- player rim color: safe = cool cyan, unsafe = warm red
- storm proximity vignette: 0 -> 40% alpha as storm nears
Audio
- low heartbeat when within threshold distance

### 4) JFB Feedback (P1)
Trigger
- JFB window open/close, success, fail
Visual
- pre-cue: dash button pulse 0.15s before window
- success: cyan stamp text (SIGNAL STAMP) + 0.1s slowmo (0.85)
- fail: short desaturate pulse 0.15s
Audio
- success chime, fail dull click

### 5) RUN/STOP Transition (P1)
Visual
- RUN start: upward sweep line (0.1s)
- STOP start: 1-frame grid lock flash
Audio
- RUN: soft whoosh, STOP: tick

### 6) Stage Progress Ambience (P2)
- Background pattern density increases by total distance
- Light sweep every 2-3 minutes
- No speed jumps at stage boundaries

## Acceptance criteria
- Dash feels stronger even at high speed
- Players can tell safe/unsafe without reading text
- JFB timing is readable without learning UI
- Feedback remains legible on mobile and does not drop FPS
