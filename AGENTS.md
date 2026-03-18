# AGENTS.md

## Project rules
- Preserve existing working features unless explicitly asked to redesign.
- Prefer small safe edits over large rewrites.
- Keep code compatible with browser deployment and GitHub Pages when applicable.
- Reuse existing utilities and patterns before introducing new abstractions.
- For UI changes, protect responsive layouts and visual consistency.
- For 3D changes, protect render loop stability, object hierarchy, and performance.

## Cross-device default
- Unless the user explicitly says otherwise, treat every task in this repo as cross-device work.
- For changes that affect UI, 3D, touch, audio, video, motion sensors, fullscreen, routing, iframe behavior, safe areas, responsive layout, native wrappers, or performance, use `.codex/skills/cross-device-quality-gate/SKILL.md` as the default QA workflow.
- Consider desktop browsers, Android phones/tablets, iPhone/iPad Safari, portrait/landscape, iframe/standalone embedding, and Capacitor shell behavior before calling work done.
- Do not report a change as fully done without stating what was physically tested, what was only emulated or code-reviewed, and what device-specific checks remain.

## Validation
- Check for broken imports, bad paths, syntax issues, and duplicate logic.
- Verify that interactive behavior still works after edits.
- Run the repo checks needed for the changed surface, and include cross-device verification appropriate to the affected feature.
- Flag follow-up testing steps clearly if not executed.

## Code style
- Use clear names and modular structure.
- Avoid unnecessary dependencies.
- Keep comments minimal and useful.
