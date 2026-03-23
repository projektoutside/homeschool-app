# AGENTS.md

## Project rules
- Preserve existing working features unless explicitly asked to redesign.
- Prefer small safe edits over large rewrites.
- Keep code compatible with browser deployment and GitHub Pages when applicable.
- Reuse existing utilities and patterns before introducing new abstractions.
- For UI changes, protect responsive layouts and visual consistency.
- For 3D changes, protect render loop stability, object hierarchy, and performance.

## Cross-device default
- Start every implementation task by classifying validation risk with the global tiered policy before running checks.
- For tasks that reach `Tier 3` and affect UI, 3D, touch, audio, video, motion sensors, fullscreen, routing, iframe behavior, safe areas, responsive layout, native wrappers, or performance, use `.codex/skills/cross-device-quality-gate/SKILL.md`.
- Consider desktop browsers, Android phones/tablets, iPhone/iPad Safari, portrait/landscape, iframe/standalone embedding, and Capacitor shell behavior before calling `Tier 3` work done.
- Do not report a `Tier 3` change as fully done without stating what was physically tested, what was only emulated or code-reviewed, and what device-specific checks remain.

## Validation
- Check for broken imports, bad paths, syntax issues, and duplicate logic.
- Match validation depth to the tier:
- `Tier 0`: skip validation.
- `Tier 1`: skip or run one cheap targeted static check only when it directly proves the change.
- `Tier 2`: run the smallest relevant repo check without stacking redundant supersets and subsets.
- `Tier 3`: run targeted repo checks plus cross-device verification for the affected surfaces.
- Verify that interactive behavior still works after edits when the task touches interactive runtime behavior.
- If the user explicitly asks to run tests, obey that request and report it.
- Include a final note in this format: `Validation: Tier 0/1/2/3 | skipped/ran <command(s)> | <short reason>`.
- Flag follow-up testing steps clearly if not executed.

## Code style
- Use clear names and modular structure.
- Avoid unnecessary dependencies.
- Keep comments minimal and useful.
