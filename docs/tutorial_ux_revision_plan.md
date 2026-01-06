# Tutorial UX Replan (Step-by-Step Execution)

## Purpose
Rebuild the tutorial experience to be slower, more intuitive, and clearly identifiable as a tutorial. Ensure tutorial UI never overlaps existing HUD while staying visible and readable.

## Problems From User Tests
- Tutorial messages advance too fast.
- Steps are not intuitive; users do not understand what to do.
- Users do not realize they are in a tutorial.
 - Guidance UI appears inconsistent in position and can feel visually weak.
 - Spotlight alignment issues reported on wide screens (letterboxing).
 - Game pause on step completion feels disruptive.

## Goals
- Make the tutorial pace user-controlled.
- Make each step action-driven and obvious.
- Make tutorial state constantly visible.
- Avoid overlap with existing UI while keeping the guidance prominent.

## UX Principles
- Action first: show the action and the target before explanation.
- User pacing: no auto-advance without input or completion.
- Single objective per step: one target, one action.
- Persistent tutorial state: banner + progress indicator at all times.
- Visual focus: dim background, highlight only the current target.
 - Flow continuity: tutorial should not pause gameplay on step completion.

## Tutorial UI System (Overlay)
Components
- Background dim layer (40-60% black with soft vignette).
- Highlight mask around target UI or world object.
- Tooltip card with short text + CTA button.
- Tutorial banner with step indicator (e.g., "Tutorial 2/6").
- Optional pointer arrow/line between tooltip and target.

Layering
- Dedicated top-level canvas: TutorialOverlay.
- Sorting order above all existing HUD.
- Tutorial elements never placed inside the main HUD canvas.

## Placement Rules (No Overlap)
 - Guidance panel uses a fixed horizontal banner style near the bottom center.
 - Panel height stays low; width expands to carry short action text + CTA.
 - Bottom offset accounts for mobile controls and safe area insets.
 - Spotlight coordinates are computed relative to the tutorial overlay (not viewport) to match letterboxed surfaces.

Directional Priority (default)
1) Below target
2) Above target
3) Right of target
4) Left of target

Fallbacks
- If target is near edge, mirror to opposite side.
- If target is in scrollable list, auto-scroll to reveal >=60% of target.
- If pointer line causes overlap, remove pointer and rely on highlight.

## Entry Screen Spec (Tutorial Start)
Purpose
- Explicitly signal tutorial mode and pace controls.

Layout
- Full-screen dim background.
- Centered modal card with clear hierarchy.

Content
- Title: "Tutorial Start"
- Duration: "Approx. 2 minutes, 6 steps"
- Goals: 2-3 bullet points describing what the user will learn.
- Pace note: "Steps advance only when you press Next or complete the action."
 - Completion behavior: show Next without pausing gameplay.

Actions
- Primary: "Start"
- Secondary: "Later"
- Optional checkbox: "Do not show again" (after first completion only).

Transition
- On Start: keep dim layer, reveal first highlight, show tooltip and banner.

## Tutorial Step Flow (User-Facing Steps)
Step 0: Entry
- Show entry screen.
- Gate: user must press Start.

Step 1: Identify core UI
- Highlight primary control or main UI element.
- Tooltip: goal + single action.
- Gate: user taps the highlighted control.

Step 2: First core action
- Highlight the main action button.
- Tooltip: what to do + expected effect.
- Gate: action performed successfully.

Step 3: Second core action
- Highlight secondary feature.
- Tooltip: short reason + action.
- Gate: action performed or short confirmation.

Step 4: Confirm understanding
- Recap and apply in a short, real scenario.
- Gate: small success state (e.g., complete one cycle).

Step 5: Wrap-up
- Show summary and where to re-open tutorial.
- CTA: "Finish" + "Replay Tutorial" in menu.

## Execution Plan (Project Steps)
Phase 1: Audit (Day 1)
- Inventory existing tutorial steps and copy.
- Map current HUD zones and safe areas.
- Identify target UI elements for each step.

Phase 2: Flow Redesign (Day 2)
- Rewrite steps into single-action objectives.
- Define gating conditions for each step.
- Confirm step count (target 5-7 steps).

Phase 3: Overlay & Placement (Day 3-4)
- Implement TutorialOverlay canvas and dim layer.
- Add highlight mask and tooltip card.
- Add placement logic with HUD collision avoidance.

Phase 4: Entry Screen (Day 4)
- Build entry modal with start/later actions.
- Add persistent tutorial banner + progress bar.

Phase 5: Copy & Timing (Day 5)
- Finalize concise copy per step.
- Enforce manual advance only.

Phase 6: QA + User Test (Day 6)
- Verify no overlap in all resolutions.
- Track step completion time and drop-off.
- Adjust copy/placement based on feedback.

## Acceptance Criteria
- Users always recognize they are in a tutorial.
- No tutorial UI overlaps existing HUD.
- Step completion rate improves vs baseline.
- Average time per step >= 6 seconds (unless user skips).

## Metrics
- Tutorial completion rate.
- Step-by-step drop-off.
- Time per step.
- Post-tutorial success rate on the main task.
- User survey: "I knew I was in a tutorial" >= 80%.

## Open Questions
- Final list of core actions to teach (3-5 targets).
- Supported aspect ratios and minimum resolution.
- Korean copy vs English copy policy.

