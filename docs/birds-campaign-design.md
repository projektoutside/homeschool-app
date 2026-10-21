# Many Birds campaign design

2026-10-21, base `2f1c093`, same task checkout. Tier 3: level geometry, authored trajectories, moving targets, hints, retry timing and touch playability. Keep 18 stage IDs and saved unlocks/scores, the original birds, rendering optimizations, collision solver, materials, sounds and optional fullscreen.

Design plan: three single-bird stages introduce aiming, slope direction and obstacle clearance; three two-bird stages introduce sequencing and a return turn; levels 7-18 build three-bird combinations in four groups of three. Each stage needs a distinct spatial idea, a truthful short instruction, a working hint with an appropriate claw position, a complete physics-based solution, drawing tolerance, and a usable release window. Geometry should create the challenge, with predictable patrols rather than pixel-perfect timing. Early generous routes gradually become longer combinations of familiar moves. Keep retry starts repeatable and avoid a difficulty cliff at the first three-bird stage.

Author and measure representative trajectories, then play every final stage through the production update/collision code. Verify imperfect drawing and timing, poor/no-line attempts, ink use, hint alignment, rewards/unlocks, retry and resume. Review desktop, phone and tablet screenshots for readable routes and reachable controls. No new layout or scrolling exception. Visual authority is the existing woodland game; this is a puzzle design refinement, not an art replacement.

Physical iPhone/iPad and native-shell verification remain separate gates. The existing BrowserStack testing-time limit is unchanged; do independent local engine/viewport checks and report that gap. Keep the visible development preview open and do not push or deploy.

## Implemented progression

| Stages | Chapter | Learning progression |
| --- | --- | --- |
| 1-3 | First Flights | Aim around a shelf, reverse the slope, then clear a lower ledge. One bird each. |
| 4-6 | A Pair of Wings | Catch one bird before steering to the next, then introduce a second runway and a return turn. Two birds each. |
| 7-9 | Follow the Flock | A deliberate breathing space introduces three birds on a broad sweep; later collect a high bird before turning underneath it. |
| 10-12 | Read the Runway | Combine switchbacks, reuse sloping steel, and bank through a gate. |
| 13-15 | Return Routes | Cross the board, connect steel and drawn surfaces, and time a moving relay. |
| 16-18 | Crown Trials | Combine three alternating turns, a constrained passage, and the full crown route. |

All 18 stages now have explicit bird patrols, fixed geometry, guide paths, claw positions, ink budgets and individual teaching notes in `campaign.js`. Removed the implicit vertical offset and old pocket/guide-derived target placement. This is authored data, not runtime random level generation. Keep the first three single targets and next three pairs before the three-bird campaign. Existing stage IDs, save key/version, unlocks and scores remain compatible; no progress reset or new migration.

Retries and new stages restart the patrol clock so learning a route is repeatable. Hints align the claw, stay visible during planning, hide on release, and can be reopened while editing a failed attempt. Their status text explains the no-hint bonus penalty. Every guide has a demonstrated winning route and enough ink left for a three-star clear without using the hint. Chapter completion and the final crown receive distinct result copy. Reward metadata reports the actual bird count; points amounts/contracts are otherwise unchanged.

A phone playthrough exposed excess sensitivity in Stone Stair. Its first runway was widened, its drop position and lower patrol adjusted, and the route verified again with real pointer coordinates. Gatekeeper's contact now uses the side of its post rather than an unpredictable endpoint. Target patrols were also checked against fixed platforms to avoid body overlap.

Synthetic touch testing found that the first Drop tap after drawing delivered pointer-up without a compatibility click. The touch release path now handles primary pointer-up inside the button, retains keyboard/mouse clicks and the existing release guard, and ignores cancelled/outside touches. Tests verify one release and no duplicate activation.

## Verification

Reviewed source fingerprint: `1703746be9bde6c0ed318d7437d7f5e8185c5808924f166ade64ba8ba4804ada`, covering HTML, campaign, physics, bird renderer, runway/drop helpers and CSS. The production copies match source byte for byte; manifest in `output/birds-campaign-design/source-sha256.json`. Original bird PNG Git blob remains `d069289580f4dbe6cd2b895c2acb9ed10cd38293`; the renderer, physics module, materials, audio and CSS are unchanged from the previous checkpoint.

- `node --test scripts/birdsCampaign.test.mjs`: three tests passed for count/chapter progression, guide/claw/ink bounds, explicit patrol bounds and clearance from fixed platforms over sampled flight phases.
- `scripts/birdsCampaign.browser.mjs`: all 18 stages cleared through production collisions and normal controls in desktop Chromium 1440x1000, Android viewport Chromium 393x852 with synthetic CDP touch drawing/aiming, phone Windows WebKit 390x844, and tablet Windows WebKit 1024x1366. This is 72 actual level clears, each reaching the floor and earning three stars. Verified stage locking, chapter results, unlocking, saved stats, final replay and persistence in a fresh document. Accepted reports: `final-regression.json` and `final-phone-balance.json` under `output/birds-campaign-design/`.
- A further complete Android touch pass also used taps for every Next Level and final Replay transition; all 18 stages passed. Report: `android-touch-navigation.json` in the same output directory.
- The browser balance pass executes the production solver/update loop with painting disabled. All 18 reference routes clear; 143 of 144 small drawing/aim perturbations clear. The sampled contiguous successful release windows range from 2.1 to 7.2 seconds, rather than requiring split-second taps. Of 648 sampled no-line attempts, one clears; the layouts reward routing rather than an obvious vertical drop. These are sampled checks, not proof that no shortcut exists or a measurement of human enjoyment.
- All 18 hints clear with the correct two-star/no-hint-bonus penalty. Checked guides after 12 seconds of planning, deterministic retries, pause/resume and reopening a guide after Edit Lines. Dedicated touch tests passed for a single tap, cancellation, dragging outside, compatibility-click idempotence and keyboard release.
- Save fixtures passed: legacy partial/final/unplayed, malformed saves, current versioned progress, and backup-write failure. Reports: `output/birds-starter-levels/crafted-campaign-saves.json` and `crafted-current-save.json`.
- Small-phone layout and iframe host lifecycle passed via `scripts/gamesV2.browser.mjs`; report `output/games-v2/crafted-host-layout.json`. Existing accessible contained result scrolling remains; no new scrolling exception or layout hiding was introduced.
- Worst-route guide rendering with three birds, three guides and three drawn runways: 96 local update/draw samples averaged 0.26 ms in Chromium / 0.32 ms in Windows WebKit; p95 0.4 / 1 ms. This is local engine work, not physical-device FPS. Report: `output/birds-campaign-design/hint-performance.json`.
- `npm run audit:games` passed 83 entries. Syntax, `git diff --check`, and direct Vite production build passed; the existing chunk-size advisory remains. Final design detection retained the same existing palette/card/padding findings; no CSS or detector suppression/configuration changed.

Reviewed the real game captures for all 18 authored routes, representative phone/tablet playfields, and chapter/final result screens. Route galleries are `output/birds-campaign-design/levels-1-9.png` and `levels-10-18.png`; brass lines in those galleries are tested player solutions, not extra fixed platforms. Single-model visual/design self-review: spatial variety 9, learning sequence 8.5, route readability 9, touch forgiveness 8.5, material consistency 9. This is a self-assessment; player enjoyment and physical-device behavior still require human acceptance.

The deterministic browser harness pauses only the game's scheduler while continuing to use the production update/render/collision functions. Browser fonts, layout, CSS animation and input stay native; it avoids the earlier global-animation-frame reload test stall. Its diagnostic balance pass disables painting only, while the full playthroughs render and use actual pointer/touch controls. Browser contexts and save data were isolated from the user's preview.

No physical hardware or Capacitor shell was tested in this pass. Prior BrowserStack testing-time entitlement was not retried; physical Safari touch, thermal/frame stability and native lifecycle remain unverified. The visible local preview remains open; no push, deploy, provider configuration or database changes were performed.
