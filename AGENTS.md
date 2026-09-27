# AGENTS.md

## Project rules
- Preserve existing working features unless explicitly asked to redesign.
- Prefer small safe edits over large rewrites.
- Keep code compatible with browser deployment and GitHub Pages when applicable.
- Reuse existing utilities and patterns before introducing new abstractions.
- For UI changes, protect responsive layouts and visual consistency.
- For 3D changes, protect render loop stability, object hierarchy, and performance.

## Working sequence
- Verify this checkout's absolute path, branch, status, applicable instructions, and build target before editing. Keep other homeschool checkouts and unrelated changes untouched.
- Map the affected entry point, data flow, integrations, generated files, and existing tests. Record baseline failures before attributing them to a patch.
- Make a short, prioritized plan for substantial changes. Apply small logical batches, validate each affected behavior, and inspect the final diff for accidental generated-file churn.
- Treat browser UI, iframe messages, Supabase RLS/RPC, guest persistence, and Capacitor lifecycle as separate trust and runtime boundaries. Do not infer production or native behavior from a local build.
- Preserve public routes, message contracts, storage formats, schema behavior, and deployment paths unless a documented bug fix requires a change.

## Cross-device default
- Start every implementation task by classifying validation risk with the global tiered policy before running checks.
- For tasks that reach `Tier 3` and affect UI, 3D, touch, audio, video, motion sensors, fullscreen, routing, iframe behavior, safe areas, responsive layout, native wrappers, or performance, use `.codex/skills/cross-device-quality-gate/SKILL.md`.
- Consider desktop browsers, Android phones/tablets, iPhone/iPad Safari, portrait/landscape, iframe/standalone embedding, and Capacitor shell behavior before calling `Tier 3` work done.
- Do not report a `Tier 3` change as fully done without stating what was physically tested, what was only emulated or code-reviewed, and what device-specific checks remain.

## Device-sensitive acceptance
- Choose devices from the changed behavior, not from a fixed all-device checklist. For a release or a broad device audit, cover representative desktop, Android phone, iPhone, and tablet paths; add older OS, landscape, foldable, iPad, or native shells when that behavior is affected.
- Test the exact build or URL under review. Record its commit/build ID and environment; fingerprint the output or patch when the working tree is dirty because commit-based build IDs do not identify uncommitted changes. A production URL does not verify uncommitted local changes; a browser session does not verify an APK or IPA.
- Use real BrowserStack hardware for physical-browser claims and BrowserStack App Automate for installable native artifacts when available. Label viewport emulation, simulators, code review, and physical sessions separately.
- Prioritize difficult paths: auth/guest recovery, keyboard and safe areas, iframe launch/exit and messages, points/stamina persistence, media and microphone permission, visibility resume, orientation/fullscreen, classroom state, and shell-specific asset loading. Test only applicable paths, then rerun a failed path after a fix.
- Use synthetic accounts and non-destructive actions. Keep BrowserStack credentials in the approved secret workflow; never print them or place them in test URLs, logs, screenshots, or Git.
- For every remote session, record provider session ID, device/OS/browser, build/URL, steps, screenshot or video/log evidence, and the observed result. Provider inventory, queued sessions, and a passing local build are not device PASS results.
- If hardware, entitlement, credentials, native artifacts, or test data are unavailable, complete independent local checks and name the exact unverified gate. Never describe the app as perfect or all-device verified without matching evidence.

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
- For security or data changes, test authorization and failure paths at the relevant boundary; static source checks alone do not prove live database policies or provider behavior.
- Before a release, run the smallest complete repository gate for the changed scope, inspect browser interactions and screenshots for visible changes, and verify the released build identity. Do not deploy or alter live provider configuration merely to satisfy a test request.

## Code style
- Use clear names and modular structure.
- Avoid unnecessary dependencies.
- Keep comments minimal and useful.
