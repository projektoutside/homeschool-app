# AGENTS.md

## Project rules
- Preserve existing working features unless explicitly asked to redesign.
- Prefer small safe edits over large rewrites.
- Keep code compatible with browser deployment and GitHub Pages when applicable.
- Reuse existing utilities and patterns before introducing new abstractions.
- For UI changes, protect responsive layouts and visual consistency.
- For 3D changes, protect render loop stability, object hierarchy, and performance.

## Validation
- Check for broken imports, bad paths, syntax issues, and duplicate logic.
- Verify that interactive behavior still works after edits.
- Flag follow-up testing steps clearly if not executed.

## Code style
- Use clear names and modular structure.
- Avoid unnecessary dependencies.
- Keep comments minimal and useful.
