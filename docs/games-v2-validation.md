# Games touch, speech, and woodland refresh

Scope: local work on `codex/games-touch-voice-birds-v2`, based on `2ba189c`. Tier 3: simultaneous pointer input, browser/host speech, audio lifecycle, responsive canvas UI. No publishing or release is authorized.

Plan: isolate handwriting input and stale recognition results; repair split speech candidates and microphone lifecycle; add clear correct-answer feedback; refresh the woodland puzzle and generate its sound pack; run targeted regression tests and browser/device checks.

Baseline: 38 speech/controller/Android initialization tests passed before edits. Vite reports a pre-existing unresolved `three` dependency in the homepage scan; direct game routes remain available.

Visual direction (delegated): a warm illustrated woodland arcade with turquoise sky, layered forest, expressive existing bird animation, timber machinery, golden stone trails, coral primary action, clear progress, and restrained celebratory motion. Preserve the existing physics and all level content. Experience mode, code-led implementation.

Fixed self-assessment rubric: brief fidelity, composition/proportions, detail/finish, style consistency, usability/motion. Every applicable dimension requires 8/10 and no critical defect. Two candidates maximum. Realism is not requested. Review is DEGRADED: single-context (user requested direct execution without delegation).

Layout: fit game and primary actions to desktop/phone/tablet viewports. Intro/result details may scroll inside the overlay on short screens, large text, or zoom; actions stay reachable. Landscape retains the existing portrait guidance and pauses play. No horizontal document overflow is permitted.

## Results (2026-10-21)

- `npm run check`: passed, including typecheck, lint, 370 Node tests, game/asset audits, and production build. A final added transient-speech recovery case and the affected speech suite passed separately (16 tests). After the preview bridge, typecheck and targeted Vite-config lint passed. The final production build is recorded in `output/games-v2/final-build.log`.
- Actual source fingerprint: `5ebd7d77836df1d87ceb5b088f5d71d921a6c96977c76c32cddd5ffb93421fd8`; per-file SHA-256 values are in `output/games-v2/source-sha256.json`. Builds began from base `2ba189c` with uncommitted changes, so the inherited commit-only app-version metadata alone does not identify this patch.
- Browser reports in `output/games-v2/`: `browser-report.json` (initial pass, including the Windows WebKit audio-capability limitation), `browser-confirmation.json`, `browser-feedback-settled.json`, `browser-final.json`, and `browser-small-screen.json`. Later reports supersede earlier affected cases.
- Chromium: desktop 1440x900; Android viewport 393x852; small phone 320x568; simultaneous CDP touch on an 820x1180 tablet viewport. Both players drew at once without zooming; drawing listeners stayed single after repeated matches; cancelled fingers and stale recognition results did not connect or erase new strokes.
- Windows Playwright WebKit: iPhone viewport 390x844 and tablet 1024x1366, plus phone landscape guidance. Layout, drawing, progress/reload persistence, result details scrolling, reachable actions, and synthetic microphone answers passed. No document overflow in the exercised sizes. Installed Windows WebKit exposes neither AudioContext constructor, so it cannot verify Web Audio; this is an explicit engine limitation, not a Safari audio pass.
- Eight ElevenLabs MP3s parsed with ffprobe and decoded in Chromium. Mute/unmute and host sound settings worked. Embedded host pause/resume passed. All generated media and local fonts are in the game asset folder; prompts and provenance are documented there.
- Correct answer banners were rendered and inspected for both games at desktop and phone sizes. Speech inputs were synthetic events through the existing result/submission handlers; no real spoken-word accuracy or microphone hardware claim is made.
- `hmr-validation.json`: changing a public game stylesheet produced a wildcard Vite reload and actual host navigation. The side-panel full app is running as a temporary guest at http://127.0.0.1:5186/; Vite's connected message was verified. Preview tab and task-owned Vite server are intentionally retained at the user's request.

## Physical and native coverage

Device Lab inventory had no connected physical device. BrowserStack authentication, plan, and device inventory were verified using scoped runtime injection; the Google Pixel 8 / Android 14 session request returned `Automate testing time expired.` No physical session started, and no purchase or account change was made. Physical Android/iPhone/iPad multi-finger gestures, microphone accuracy/permission recovery, real Safari audio, fullscreen/system gestures, and Capacitor APK/IPA behavior remain unverified. The task-started Device Lab coordinator was stopped after confirming no active jobs.

## Visual review

DEGRADED: single-context self-assessment. Two candidates in the same woodland direction; the targeted small-screen revision separates scrollable instructions/results from always-reachable action buttons and fits decorative stars. The fixed rubric scores: brief fidelity 8.5, composition/proportions 8, detail/finish 8, style consistency 8.5, usability/motion 8. Screenshots cover intro, drawing, and results at the matrix above; result captures wait for their entrance animation, and drawing captures wait for rendering frames. This is a local visual assessment, not AAA certification or hardware acceptance.

The one mechanical detector pass was reviewed against the captures: warm cream is an intentional woodland palette choice; level dividers have inset desktop content and no mobile border; the gameplay/result overlay is a necessary interaction surface, not decorative nested cards. Existing unrelated card-accent findings in the older Car King and Animal Champion styles were not redesigned.

## Layout exception and remaining checks

`Many Birds One Stone / .overlay-content`, y axis: necessary instructions and result details scroll on short viewports, zoom, or large text, while sibling action buttons remain visible. The 320x568 case scrolled through details and used the result actions successfully. No document-level horizontal exception exists. Actual 200%/400% browser zoom, system text enlargement, and physical screen-reader/keyboard behavior were not tested.

Local changes are retained in the named managed worktree; the primary checkout is unchanged. No push, merge, deployment, native release, or live provider configuration change was performed.
