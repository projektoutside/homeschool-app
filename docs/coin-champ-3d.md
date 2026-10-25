# Coin Champ: 3D coin drops

Local follow-up to `1724497` on `codex/coin-champ-adventure`, 2026-10-24.
Preview: <http://127.0.0.1:5173/play/coin-champ>.
Verified runtime fingerprint: `1724497+coin-3d:e8cb6d7616992455`.
All 14 changed runtime/image files served by Vite matched their local SHA-256
values. [Evidence](coin-champ-3d.evidence.json) and
[QA ledger](coin-champ-3d.qa.json) record the local scope; nothing was published.

## Behavior and boundaries

One shared Three.js renderer places photographic coin faces on beveled bodies
with metallic reflections, denomination-specific thickness, plain/reeded edges,
and copper-colored core bands on dimes/quarters. New coins tumble from a bank
tap, keyboard choice, or drag release into their labeled stack over 860ms, with
a short landing rebound and optional clink. Native HTML controls, counts, totals,
focus, hints, rewards, and the menu/countdown remain in place. Selection and
local saving happen immediately; animation never gates input or awards points.

Only newly added coins fly. Continue restores saved coins directly. Geometry,
materials and textures are shared; pixel ratio is capped at 1.5. The renderer
stops requesting animation frames at rest. Help/backgrounding settles motion;
reduced motion draws the settled state immediately. WebGL failure/loss reveals
photographic DOM coins while keeping controls working. Context restoration
reconciles the current selection. A disposal guard releases textures that finish
loading after the page has been disposed.

The implementation reuses the repository's local Three.js r160 and matte cleanup,
with no package installation, CDN runtime dependency, paid generation, or changes
to the existing vendor file. Original illustrated assets remain as a final image
fallback. Source photographs, credits and license metadata are recorded in
[the coin asset sources](../public/Games/Coin%20Champion/assets/coins/SOURCES.md).
These are photographed designs from different years, not a matched specimen or
a sculpted portrait scan. Fine relief is photographic/bump detail on 3D geometry.

## Verification

- `node --test scripts/coinChamp.test.mjs scripts/coinChampCountdown.test.mjs scripts/coinChampMotion.test.mjs`:
  29 passed in the initial combined run. After the final shared rest-angle change,
  `node --test scripts/coinChampMotion.test.mjs` passed all six motion tests.
  The unchanged core/countdown suites retain their 23 passes.
- `node --check` on changed runtime modules and `git diff --check`: passed.
- `npm run audit:games`: passed, 84 entries, no catalog changes.
- Chrome and Playwright WebKit each passed 32 browser assertions: actual WebGL
  rendering, immediate saves, 32 rapid additions, capacity enforcement, removal,
  Undo, Start over, keyboard, single-coin drag, Help, synthetic background recovery,
  reload/Continue, no replay of old drops, context loss/restore, reduced motion,
  disabled-WebGL fallback, success, counting, identification, and reachable controls.
- GPU draw-call instrumentation stayed unchanged after settling and while
  synthetically hidden. This proves idle draw suppression in these engine runs,
  not a battery, hardware frame-rate, or power-efficiency benchmark.
- Both engines passed nine layout states: six sizes (1440×900, 390×844, 320×568,
  568×320, 844×390, 768×1024), plus success, count, and identification. No document
  overflow, offscreen action, or occluded action center was found.
- Three additional Chrome assertions passed: muting during flight suppresses
  the later landing oscillators; 320×568 Help keeps Close/Done visible; source
  credits remain accessible. Help's native body scroll is an intentional long
  content exception, with fixed surrounding dialog actions.

Total: 67 browser assertions, including 18 engine/layout states. No uncaught page
errors or bugs observed in the final tested scope. The native browser startup
and interactions used real timing; these are local desktop engines with touch
and viewport emulation, not physical Android/iPhone/iPad sessions.

The initial visual pass found washed-out metal and insufficient stack separation.
One targeted correction adjusted lighting, rest tilt, layer spacing, and contact
shadows. The motion endpoint now uses the same rest angles as the renderer.
A strict floating-point assertion initially differed by about 1e-16; the numeric
test now uses an appropriate tolerance and passes. Full engine coverage is reused
across the final disposal-only guard; its normal rendering path is unchanged,
and the supplemental Chrome checks exercised the final code. Abort-during-load
cleanup was code-reviewed rather than claimed as a physical lifecycle result.

## Visual review and remaining coverage

Self-assessment across two candidates, using desktop/phone/short-landscape
captures and three successive tumble frames. No independent reviewer was used.

| Dimension | Initial | Final | Observable result |
| --- | --- | --- | --- |
| Brief fidelity | 8 | 8 | Actual 3D metal bodies, photo faces and coin drops. |
| Composition | 8 | 8 | Clear native controls and labeled stacks retain viewport fit. |
| Detail/finish | 8 | 8 | Recognizable photography, bevels, reed shading and exact values. |
| Material/style | 7 | 8 | Copper/silver remain distinct after the lighting correction. |
| Usability/motion | 8 | 8 | Finite input-linked motion, idle rendering, interruption and fallback checks. |

Impeccable's detector ran once: three existing menu-shadow warnings and five
advisories. The quantity badge color/radius are now documented. The remaining
retained menu styling is unchanged; this is not a zero-warning detector claim.

Physical phone/tablet frame pacing, real touch, safe areas, large text/zoom,
audible sound quality, browser bfcache, power usage, and installed Capacitor
behavior remain untested. The structured ledger is intentionally `incomplete`
for that gate and passes its consistency validator. Before broader release,
prioritize a 32-coin burst, pause/resume, orientation change and mute-on-landing
journey on representative real phones/tablets, followed by student playtesting.
No additional code improvement is asserted without an observed final defect.

Tests used isolated disposable guests and restored their synthetic visibility
state. Browser contexts closed; no provider/account writes or OS foreground
automation occurred. The user's preview, saved round and shared points were
preserved. Vite remains running. No push/deployment/merge was performed.

Validation: Tier 3 | ran targeted unit/static/catalog and Chrome/WebKit browser
checks | new 3D, motion, input and lifecycle paths; physical/native gates remain.
