# Fullscreen is optional

2026-10-21, local preview `http://127.0.0.1:5186`, branch `codex/games-touch-voice-birds-v2`, based on `7220fc2`.

Removed automatic entry/reentry from the app shell, game-player startup/load/focus/visibility/input, shared iframe input handlers, and the standalone Math Write, Math Puzzle, Word Puzzle, and Farmers Market games. Removed the blocking fullscreen-required overlay. Explicit fullscreen controls retain their existing permissions and behavior. Zoom prevention for shared touch gameplay is preserved.

The install configuration and generated manifest now request `standalone` rather than `fullscreen`; Farmers Market no longer opts into vendor-specific forced fullscreen. Installed-app manifest adoption and native system bars were not physically tested.

Validation: Tier 3. Baseline fullscreen/policy tests passed before editing. Updated relevant policy/capability/pointer tests passed (16 tests), as did TypeScript, targeted ESLint, `npm run audit:games`, JavaScript syntax checks, and `vite build`. The build retained its existing large-chunk advisory. No deployment or release was performed.

`scripts/fullscreenOptIn.browser.mjs` passed nine scenarios: desktop Chromium, Android viewport Chromium, iPhone viewport WebKit, tablet portrait-to-landscape Chromium, four standalone games, and the Spy Academy explicit fullscreen button. Instrumented standard/prefixed request methods recorded zero calls on startup, ordinary clicks/keys/touch, focus, pageshow, visibility, and orientation events. These lifecycle notifications were synthetic. Embedded Birds accepted Begin and Hint without requesting fullscreen. Explicit Chromium fullscreen entry and exit succeeded; subsequent ordinary interaction did not reenter it. Checked game-host viewports had no document overflow. Screenshots and the JSON report are in `output/fullscreen-opt-in/`.

The observed source fingerprint is `cde3edd815a1eab4c23028e42e2bee730b9bb4324b4b3c6d3e46d8b986be0690`; per-file SHA-256 values are in `output/fullscreen-opt-in/source-sha256.json`. It was captured after the final whitespace cleanup in App.tsx. This document is excluded from the fingerprint.

Coverage is desktop browser and viewport/engine emulation only. No physical device session was available in this chat: the earlier same-day BrowserStack attempt returned `Automate testing time expired`. Real Android/iOS browser chrome, installed PWA adoption, and Capacitor APK/IPA behavior remain manual gates. The visible side-panel preview and its existing server are retained as requested; the primary checkout is unchanged.
