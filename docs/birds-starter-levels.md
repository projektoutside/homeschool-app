# Many Birds: six starter levels

2026-10-21. Local follow-up on `codex/games-touch-voice-birds-v2`, base `bf75015`. Tier 3: playable level data, bird counts, drawing/physics, goals/results, and persisted progress migration.

Explicit sequence: three new one-bird levels, three new two-bird levels, then the existing twelve three-bird levels. Delegated design: gentle aiming and runway practice before the larger flock puzzles. Preserve the steel/brass artwork, ground landing, collision rules, points contract, and existing level geometry. The campaign will contain 18 levels.

Plan: prepend six distinct stages; hydrate explicit bird positions/counts for the new stages; make HUD/goals/result language match the actual target count; remap legacy unlocked/selected levels and best-stat keys by six. Keep the existing storage key and fields, add a campaign-version marker, and preserve the original legacy JSON in a separate local backup before saving converted progress. Verify actual physics-based clears for all six new stages, progression into the original first stage, reload/locking, malformed and legacy saves, and responsive layouts.

Visual scope is six authored playfields and count-aware HUD text/icons using the incumbent art. Fixed rubric: brief fidelity, composition, finish, material consistency, usability/motion; minimum 8/10 each, two candidates maximum. Review is a self-assessment, DEGRADED: single-context (user requested direct execution without delegation). No scrolling/layout expansion is intended.

## Result

Levels 1-3 are First Feather, Little Drift, and Brass Bend (one bird each). Levels 4-6 are Twin Feathers, Paired Perches, and Split Flight (two birds each). The twelve original three-bird levels occupy 7-18 with their geometry preserved. The HUD hides surplus tokens and uses the actual bird count throughout goals and results. Split Flight introduces a short drawn runway; its second bird was adjusted after measuring the stone trajectory.

Played legacy saves retain their original selected/unlocked stages and best scores at indices shifted by six. Unplayed saves begin at level 1. Migration saves a version marker and recoverable original JSON; a failed backup write leaves the original record intact while converted progress remains playable in memory. Reload does not apply the migration twice.

## Validation evidence

Environment: local Vite preview at `http://127.0.0.1:5186`, task base `bf75015`. Reviewed source fingerprint: `cd0d16ecc25bec0d9f30b0c8b05bb5d5ff46d35b024f26e82576a9281c08ef24` (HTML, CSS, and the three affected browser scripts; manifest in `output/birds-starter-levels/source-sha256.json`). Production HTML/CSS matched the reviewed source byte for byte.

- `scripts/birdsStarterLevels.browser.mjs`: all ten cases passed. All six starter levels cleared through actual collisions in desktop Chromium (1440x1000), Android viewport Chromium (393x852), iPhone viewport WebKit (390x844), and tablet viewport WebKit (1024x1366): 24 actual clears. Verified floor landings, stage locking, results, saving/reload, and transition to three birds on level 7. Five save fixtures plus backup-write failure passed. Report: `output/birds-starter-levels/browser-report.json`.
- `scripts/gamesV2.browser.mjs`: filtered small-phone and iframe lifecycle cases passed, including results, audio settings, pause/resume, and landscape guidance. Report: `output/games-v2/browser-starter-levels.json`.
- `scripts/birdsRunways.browser.mjs`: desktop regression passed for floor/support behavior, result pause/reset, all 18 count bands, and visible collider geometry. Report: `output/birds-runways/starter-campaign-regression.json`. Its diagnostic forced clears do not replace the separate actual starter playthroughs.
- Targeted ESLint, `npm run audit:games` (83 content entries), `git diff --check`, and `node node_modules/vite/bin/vite.js build` passed. The build retained the existing large-chunk advisory. Build log: `output/birds-starter-levels/build.log`.
- Fresh screenshots confirmed levels 1, 4, and 7 on Android viewport Chromium and tablet viewport WebKit, with the correct 1/2/3 birds and tokens. Earlier test captures held an old canvas frame under frozen animation; the harness now renders explicitly before capture, and fresh normal-animation captures replaced the affected evidence. Report: `output/birds-starter-levels/fresh-frame-confirmation.json`.

Visual review used two candidates: initial stage authoring, then the measured Split Flight adjustment. Self-assessment: brief fidelity 8.5, composition 8, finish 8.5, material consistency 8.5, usability/motion 8.5. No critical visual issue found. The design detector ran once; findings concern the unchanged palette, HUD dividers, panels, and shadows. Report: `output/birds-starter-levels/design-detect.json`.

Coverage is desktop engines and viewport emulation, not physical Android/iOS hardware. BrowserStack entitlement was previously blocked by expired Automate testing time; physical touch, actual mobile Safari, and Capacitor shells remain unverified. No production deployment or provider changes were performed. The live preview remains open on the new first level with existing progress preserved; changes are local to the task worktree.
