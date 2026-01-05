# Signal Graffiti Runner - Concept + Trace/Tag System

## Concept Summary
A data signal is escaping a neon surveillance grid while leaving glitch graffiti behind. The storm is a firewall wave. RUN is transmission and drawing; STOP is hiding and stamping a tag. The player is both an escapee and a street artist of code.

## Core Fantasy Mapping
- RUN: signal transmission + live graffiti stroke
- WARNING: high-risk setup for the next stamp
- STOP: hide the signal and confirm the artwork
- Dash: a glitch stroke (visible, punchy motion)
- JFB: perfect timing cut, rewarded as a signature

## Scoring Model (Distance as Base)
BaseScore is strictly the distance traveled. This keeps the "I ran this far" logic intact.

- BaseScore += frameDistance
- TraceLength += frameDistance * traceGainRate

TraceLength is a pending bonus pool. It only becomes score when a Tag is confirmed during STOP.

## Tag Confirmation
- Tag input: short tap of the dash button during STOP
- Tag window: first 0.40s of STOP (configurable)
- Success: converts TraceLength to bonus score, adds style multiplier, then resets TraceLength
- Failure: TraceLength decays or is partially lost (see Tuning)

## Style Multiplier (Art Quality)
TraceBonus = TraceLength * StyleMultiplier

Suggested components:
- +0.05 per dash used during the RUN window
- +0.15 if JFB was triggered during this cycle
- +0.00 to +0.30 based on average storm proximity (risk line)

Clamp final multiplier within 0.80 to 2.00.

## Visual + Audio Feedback
- Dash button gets a Trace ring that fills during RUN
- STOP start flashes "TAG" for 0.25s
- Tag success: short glitch stamp animation on player trail
- Tag failure: desaturate trail for 0.5s

## Tuning Knobs
- traceGainRate: 1.0
- tagWindowSec: 0.40
- tagFailLoss: 0.50 (50% TraceLength loss) or 1.00 (full loss)
- styleClampMin / styleClampMax: 0.80 / 2.00
- dashStyleValue: 0.05
- jfbStyleValue: 0.15
- riskStyleMax: 0.30

## Implementation Notes (No Code)
- Hook BaseScore to actual per-frame distance (dx, dy length).
- Accumulate TraceLength only during RUN.
- On STOP start, open TagWindow timer.
- On tag input, convert TraceLength into score and reset it.
- If TagWindow expires without tag, apply tagFailLoss and keep remaining TraceLength for the next cycle or clear it.

## Player Promise
"The farther and cleaner you run, the bigger your tag. Risky lines make it legendary."
