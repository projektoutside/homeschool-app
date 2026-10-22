# Many Birds One Stone: 2 Player VS Mode

Tier 3. Local pass-and-play extension of the established woodland game, using the original birds, claw, ball, sound and connected-stroke physics. Code-led, delegated design choices; Operate editor and protected handoffs. No new assets or providers.

## Implementation order

1. Add an isolated match controller, bounded bird/platform editor and setup/handoff/results interface.
2. Connect custom maps to the existing renderer, physics, pointer controls and lifecycle pause handling, with campaign rewards explicitly excluded.
3. Verify complete matches, timeouts, editor limits, input cancellation, campaign restoration and responsive layouts in isolated desktop/touch/WebKit contexts; build and review the diff.

## Rules

- Player 1 builds for Player 2; Player 2 builds for Player 1. Player 1 then solves Player 2's map, followed by Player 2.
- User-confirmed defaults: three birds and 60 seconds per solving turn. Delegated supplies: 360 platform ink and 480 solving ink. Bird count (1–3), supplies and 30/60/90/120-second or untimed turns are configurable. Building is untimed.
- Place or move birds inside the marked center area. Platforms stay below the claw and above the floor. Birds cannot overlap each other or platforms. Budget measures actual polyline length. Undo refunds it. Ready can be used early; spending all platform ink locks in the map after the stroke ends.
- One drop per turn. The clock includes drawing and aiming and starts only after the receiving player presses Begin. A trapped ball returns with lines kept and the clock continues. A miss or timeout ends the turn; a clear lets the ball finish its descent.
- 100 match points per bird, existing x1/x2/x3 bird combo bonuses, and 100 for clearing the entire flock. Equal scores use faster elapsed time when a bird was hit; zero-hit rounds draw. Match points do not change campaign stars, global points, coins, bottles or gear.
- Equal original balls and supplies; no shop upgrades during VS. Transient matches; leaving or reloading returns to the campaign. No claim that arbitrary user maps are guaranteed solvable; UI asks creators to leave a clear route.

## Layout exceptions

The native VS dialog protects private handoffs, setup and pause/results focus. Its `.vs-dialog-body` scrolls vertically for expanded settings/results, short screens, zoom and keyboard height; header and actions stay reachable. The existing desktop `.hud` may scroll vertically for editor controls at short heights. No horizontal document scroll. The editor's coordinate disclosure is an accessible alternative to canvas placement, with all fields/actions reachable through the HUD on short screens. Touch landscape keeps the existing portrait-pause notice.

## Evidence

Verified locally on 2026-10-21 at `http://127.0.0.1:5186`. Task checkout `codex/games-touch-voice-birds-v2`, base `182dd2f`. No publishing or provider changes.

- `node --test scripts/birdsVersus.test.mjs scripts/birdsPhysics.test.mjs scripts/birdsCampaign.test.mjs scripts/birdsShop.test.mjs`: 22 passed. VS rules were checked again after editor refinements.
- `scripts/birdsVersus.browser.mjs`: desktop Chromium, Android touch emulation (actual CDP multi-touch), iPhone/iPad WebKit emulation, 320px reduced-motion phone and a same-origin iframe passed. Two distinct opponent maps produce two real physics clears; timers, misses, partial-hit scores, ties, configurable one/two-bird maps, untimed turns, undo, automatic ink-budget handoff, canceled multi-touch strokes, hidden/host/modal pause, trap recovery, clean campaign restoration and zero VS point events are covered. Expanded coordinate controls and 150% text were exercised with a simulated keyboard-height resize and landscape pause. Report: `output/birds-versus/verified.json`, fingerprint `67cc147bcc809eaef5f2517a110cd92115a79eb1666b739570d71123bc008fa3`. The iframe uses the normal render scheduler: 600ms wall time advanced the turn clock 634ms; host pause froze it.
- A subsequent five-line desktop-only CSS correction kept the campaign combo tally visible at 900×900. Final-source VS short-desktop journey passed (`verified-short-desktop.json`), as did the existing desktop combo/campaign regression (`output/birds-combos/versus-compact-regression.json`). The other viewport media rules and all runtime code are identical to the six-profile receipt above. Existing iPhone campaign/combo and iframe point-bridge regressions also passed (`versus-regression.json`; its earlier desktop layout failure was corrected and rerun).
- `npm run audit:games`: 83 entries passed. `node node_modules/vite/bin/vite.js build`: passed; existing large-chunk warning remains. All 13 game code/style files exactly match the built copies. Final game fingerprint: `b50ef61ca77d2264c04e2c280c5dd035e0e5e381e66bd2473d7e34c0d8900452` (`output/birds-versus/source-sha256.json`). Inline scripts parse; JS syntax and `git diff --check` passed. Original bird asset blob remains `d069289580f4dbe6cd2b895c2acb9ed10cd38293`.
- Existing in-app preview shows the new entry/setup with the user's 675 global points, 540 coins and level 8 preserved. All match tests use isolated synthetic storage. The live Vite server stays available for HMR.

DEGRADED: single-context (user requested direct execution without delegation). Visual self-assessment, two candidate passes: brief fidelity 8, composition 8, finish 8, style consistency 8, usability/motion 8. Reviewed desktop, phone, tablet, setup/editor/solve/results and reduced-motion/keyboard-height captures. Original birds and metal surfaces match the incumbent game. The detector's inherited cream-palette, old HUD/card and shadow suggestions were assessed against that deliberate woodland identity; no unrelated redesign or ignored-rule changes. VS combo text is 12px minimum at the default rem size.

Physical devices, real mobile keyboards, iOS Safari hardware performance and Capacitor shells were not tested. The previously connected device lab requires authorization. No physical/native or authenticated cloud-points PASS is implied. Custom geometry can still be unsolvable; the editor enforces space and budgets and tells creators to leave a route, without claiming an automatic solvability proof.
