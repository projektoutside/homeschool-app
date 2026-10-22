# Many Birds One Stone: 2 Player VS Mode

## Solvability safety follow-up

Tier 3, base `2484de9`, same task checkout. Plan: require a creator clear under identical opponent rules; bind the proof to exact geometry and settings and invalidate it on editing; then exercise impossible/failed/expired proofs, successful handoffs, both player turns, lifecycle and campaign isolation in desktop/touch/WebKit contexts. Keep validation private and campaign rewards untouched. This is a completion gate rather than an automatic solver for arbitrary freehand shapes.

Implemented and verified on 2026-10-21. `Test map` replaces the direct handoff. A creator must actually drop the original ball and hit every bird using the opponent's solving ink and timer. Test retries reset birds, clock and solving ink; returning to the editor preserves the gray platform design but removes approval. A successful test ends at the last bird, earns no rewards or match score, and exposes `Seal proven map`. Both maps are checked again before competitive turns. Proofs bind every bird/platform coordinate and all match settings; untested, partial, expired, oversized-ball and over-budget clears are rejected. The existing VS debug force-win shortcut cannot approve a map.

Safety validation receipts (all local; no physical/native PASS):

- `node --test scripts/birdsVersus.test.mjs`: six passed, covering stale geometry/settings, incomplete proof, equal equipment/budget/time, untimed proof and both-map gates.
- `scripts/birdsVersus.browser.mjs`: desktop and iPhone WebKit (`safety-core.json`), final desktop including private-test pause/retry/edit controls (`safety-final-desktop.json`), short desktop/Android CDP touch/iPad WebKit/small reduced-motion phone/same-origin iframe (`safety-devices.json`) all passed. Actual collisions prove creator maps before competitive clears. A closed 88×88 gray box around a bird remains locked after a real failed drop; tests also reject a timeout and require another real clear after editing a proven map. Failed tests expose no seal action. Creator solution lines do not transfer to the opponent. Campaign saves, currency and global awards stay isolated.
- All 18 authored campaign hint routes, retries and resume passed (`output/birds-campaign-design/versus-safety-regression.json`). `npm run audit:games` passed 83 entries; Vite build passed. The existing large-chunk warning remains. All 13 game code/style files match built output; inline/JS syntax and diff checks passed. Final game fingerprint: `b8939fa4cbb3702f5ea7bf1f3ea91d1871644dabe7dfbd21b09e7ee39a14f88a`, recorded in `output/birds-versus/source-sha256.json`. Original bird asset is unchanged.
- One visual inspection pass of the inherited desktop/phone proof-required, passed and blocked dialogs: self-assessment 8/10 for fidelity, composition, finish, consistency and usability. Detector found no issues in the changed VS controller/styles. Existing contained dialog scrolling handles short screens and zoom. Physical iOS/Android, real keyboards and Capacitor remain untested because device-lab authorization is unavailable.

Tier 3. Local pass-and-play extension of the established woodland game, using the original birds, claw, ball, sound and connected-stroke physics. Code-led, delegated design choices; Operate editor and protected handoffs. No new assets or providers.

## Implementation order

1. Add an isolated match controller, bounded bird/platform editor and setup/handoff/results interface.
2. Connect custom maps to the existing renderer, physics, pointer controls and lifecycle pause handling, with campaign rewards explicitly excluded.
3. Verify complete matches, timeouts, editor limits, input cancellation, campaign restoration and responsive layouts in isolated desktop/touch/WebKit contexts; build and review the diff.

## Rules

- Player 1 builds for Player 2; Player 2 builds for Player 1. Player 1 then solves Player 2's map, followed by Player 2.
- User-confirmed defaults: three birds and 60 seconds per solving turn. Delegated supplies: 360 platform ink and 480 solving ink. Bird count (1–3), supplies and 30/60/90/120-second or untimed turns are configurable. Building is untimed.
- Place or move birds inside the marked center area. Platforms stay below the claw and above the floor. Birds cannot overlap each other or platforms. Budget measures actual polyline length. Undo refunds it. Test can be used early; spending all platform ink opens the required play-test after the stroke ends. Only a successful creator clear enables sealing and handoff.
- One drop per turn. The clock includes drawing and aiming and starts only after the receiving player presses Begin. A trapped ball returns with lines kept and the clock continues. A miss or timeout ends the turn; a clear lets the ball finish its descent.
- 100 match points per bird, existing x1/x2/x3 bird combo bonuses, and 100 for clearing the entire flock. Equal scores use faster elapsed time when a bird was hit; zero-hit rounds draw. Match points do not change campaign stars, global points, coins, bottles or gear.
- Equal original balls and supplies; no shop upgrades during VS. Transient matches; leaving or reloading returns to the campaign. Both custom maps must have an actual successful creator clear under identical rules before the match can begin. Editing removes that proof.

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

Physical devices, real mobile keyboards, iOS Safari hardware performance and Capacitor shells were not tested. The previously connected device lab requires authorization. No physical/native or authenticated cloud-points PASS is implied. The editor can represent an unsolvable layout, but the mandatory successful-clear gate prevents it from being handed to the opponent; see the safety follow-up above.
