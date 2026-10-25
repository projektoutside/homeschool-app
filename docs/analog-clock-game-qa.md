# Analog Clock Game review — 2026-10-24

Local gameplay, debugging, and interaction improvements for `math-analog-clock-game-v2`.
All seven levels were played through in isolated Chromium and WebKit sessions. Answers
were selected from the rendered SVG hand positions and visible AM/PM indicator.

## Build and scope

- Worktree: `C:/Users/Xator/.codex/worktrees/analog-clock-smoothness/Main-Homeschool-app`
- Branch: `codex/analog-clock-smoothness`
- Base: `dd0c344c6ed05434c221f4d315b221740d944e74` (includes the preceding guest-persistence fix).
- Embedded preview: <http://127.0.0.1:5173/play/math-analog-clock-game-v2>
- Standalone: <http://127.0.0.1:5173/Games/analogclockgame/index.html>
- Vite serves this worktree on the existing port, with public-game reloads enabled.
- Primary checkout and the user's existing guest points were preserved. Test points
  belong to separate synthetic guest browser contexts.
- Changes are local. No provider configuration, database policies, publishing, or
  remote Git operations were performed for this game review.

Source SHA-256 fingerprints for the reviewed game files:

| File | SHA-256 |
| --- | --- |
| `game.js` | `9DB2B637F5110862863B69A7D010047F980CDD1105A092DAA0976C659E335ABE` |
| `index.html` | `D18965566C6459DDF47AEC04C5C8C59355C503162EF45E72D9885C50BB126C11` |
| `style.css` | `E0EA64F08493B9AEE1023EB5C58DF708D6BEE7FECB324F9CB6F1F3A2ADFF8AAB` |

## Confirmed bugs and fixes

Priorities describe gameplay impact, rather than security severity.

| Priority | Reproduction / observed failure | Result after the fix |
| --- | --- | --- |
| P1 | Answer, immediately return to the menu, then start again: an old callback generated a second unanswered question in the new round. Repeated level-start activation also queued multiple questions. | Round-owned callbacks are canceled at lifecycle boundaries; level starts are guarded and generate one question. |
| P1 | Lose all lives with at least 10 coins, then continue: the game became active with zero lives and locked answers. | Continue restores one life, a fresh question, and time when exhausted. Both life-loss and timer-expiry continuation have regression coverage. |
| P1 | Finish with coins: Retry and Main Menu disappeared until every coin was spent. A pulsing Retry button also prevented normal stable pointer activation. | Players can spend, continue, retry, or leave immediately. Retry is stable and clears the round score. |
| P1 | Open the level-up reward shop: it retained `.hidden`, so `.visible` never made it appear. | Shop opens, purchases once per activation, and Continue actually starts the next level. |
| P1 | Delayed timer callback counted only one second; closing one overlay could resume another overlay's pause; visibility handling only logged messages. | Elapsed-time deadlines preserve fractional time, independent pause reasons compose, deferred questions wait for overlays, and visibility pauses gameplay/music. |
| P1 | Buy points after game over: the round score increased without updating shared app points. | Game-over rewards use the existing points bridge, just like answers and in-game purchases. |
| P2 | Each game-over refresh or purchase inserted another leaderboard entry for the same run. Overlapping score animations could display stale totals. | A run ID updates one entry; final score is exact immediately. Rank, date, and score have separate readable spacing. |
| P2 | Music volume zero became 50; corrupt saved settings reached runtime values; resetting from mute restored only the displayed volume. | Zero persists, known settings are clamped/validated, and Reset updates both audio tracks and enabled state. |
| P2 | Headless WebKit without Web Audio warned on every answer (126 warnings in a full run). | Unsupported Web Audio is detected once; the game remains playable. Audio resume failures are handled. |
| P2 | Touch handlers overlapped synthesized clicks; compact controls were below 44px; short-landscape quick settings extended beyond the right edge. | One activation path, native answer buttons, keyboard support/focus recovery, 44px targets, and a contained quick-settings panel. |
| P2 | Dense shops shrank text; the high-score celebration obscured results and new rounds. | Readable shop cards scroll internally when necessary; results remain available without the dark celebration layer. |

Correct-answer feedback now advances after 700ms (previously 1500ms), and level-up
feedback after 1000ms (previously 2500ms). Correct/wrong choices retain green/red
feedback while disabled. Reduced-motion preferences shorten CSS animation and
transition durations. This is an interaction improvement; no hardware FPS claim
was measured.

## Verification

Classification: **Tier 3** — game lifecycle, timers, touch/keyboard, audio state,
responsive layouts, and embedded points/exit behavior.

| Check | Evidence / result |
| --- | --- |
| `node --test scripts/analogClockGame.test.mjs` | 22 passed, including stale-round callbacks, nested pauses, time expiry/continue, leaderboard updates, audio reset, malformed storage, and unsupported audio. |
| Generator stress within that suite | 80 generated questions per level, 560 total: valid times, four distinct choices, exactly one correct choice. Clock-hand geometry also covers fractional minutes/seconds and hour boundaries. |
| `node --check public/Games/analogclockgame/game.js` | Passed. |
| `npm run audit:games` | Passed: 84 catalog entries checked. |
| `git diff --check` | Passed. |
| Chromium gameplay | 64 correct answers across all seven levels and all six transitions, including five level-7 seconds questions. Three deliberate mistakes, paid continue, and a correct post-continue answer passed. |
| WebKit gameplay | 63 correct answers across all seven levels, including five seconds questions. Mistakes, continue, Medium/Hard starting levels, mute, zero volume, and Reset passed. WebKit here is a desktop engine with mobile emulation. |
| Final embedded app journey | Correct answer +10, in-game purchase +10, correct answer +10, game-over purchase +10 = +40 shared points. Exact final score 40; normal Retry resets round score while lifetime points remain. Repeated successfully after final logic edits. |
| Embedded exit | Quick Settings → Exit returned to `/apps` with synthetic guest lifetime points preserved. |
| Keyboard / touch | Touch purchases once, level-up shop continuation works, Space opens shop/settings once, Escape closes, focus returns, and paused answers cannot be submitted. |
| Responsive layouts | Desktop 1440×900; touch emulation 393×852, 390×844 WebKit, 320×568, 844×390, 568×320, 1024×1366, and 1366×1024. Settled gameplay has no document overflow; affected answer/settings controls remain at least 44px. |
| Final embedded console | Zero errors. Two existing host warnings remain: `allow` versus `allowfullscreen`, and combined iframe `allow-scripts`/`allow-same-origin`. Sandbox configuration was not changed by this task. |
| Audio fallback | A fresh WebKit smoke produced zero errors and one unsupported-WebAudio warning rather than repeated per-answer warnings. Audio element volume/state were verified; audible output was not physically assessed. |

One embedded answer-to-next-ready sample measured 1153ms including Playwright's
interaction overhead. It is a single local sample, not a performance benchmark.
The suite exercises the shipped game classes in a VM; it does not substitute for
the browser playthroughs. No React/TypeScript, catalog, generated bundle, or native
wrapper was edited, so a full application build/native release was not run.

## Intentional contained scrolling

| Container | Direction and reason | Trigger / verification |
| --- | --- | --- |
| `.start-menu-content` | Vertical; preserve menu text and controls. | Small/short screens or zoom; primary actions remain reachable. |
| `.modal-content > .modal-body` | Vertical; keep modal header/footer actions available while content grows. | Results, instructions, or settings exceeding available height. |
| `.shop-items-grid` | Vertical; preserve readable cards rather than compressing all products. | Phone, landscape, and small viewport; last shop item reached at 393×852, 844×390, 1024×1366, and 320×568. |
| `.shop-overlay-body` | Vertical; level-up products can exceed the overlay height. | Level transition shop, including touch purchase and Continue. |

No horizontal page scrolling is intended. Keyboard activation and Escape were
tested. Browser zoom/large system text, real mobile keyboards, dynamic browser
toolbars, and physical safe areas remain unverified.

## Evidence and remaining gates

Local artifacts are retained in `output/clock-audit/` (ignored by Git):
`level-1.png` through `level-7.png`, `game-over.png`, `embedded-points.png`,
`results-final-desktop.png`, `phone-shop.png`, `shop-*.png`, `game-*.png`, and
`quick-settings-*.png`. The playthrough, finish-round, and embedded-points scripts
are retained alongside them. Playwright console logs are in task-owned browser
artifact directories. The level images were most recently captured by WebKit.

Remaining checks, in priority order:

1. **Physical Android and iPhone/iPad acceptance:** tap/keyboard behavior, audio
   unlock/mute/restore, background/foreground recovery, and portrait/landscape
   safe areas. The Device Lab coordinator returned `fetch failed`; ADB reported
   no attached devices. No physical-device PASS is claimed.
2. **Capacitor shell:** verify the same game inside an installed build, including
   background/resume and exit. Only browser standalone/iframe flows were tested.
3. **Host iframe configuration review:** investigate the observed host warnings
   separately with the parent application's trust requirements before changing
   permissions. No exploit or authorization-policy result is inferred here.

Guest lifetime progress continues to use the existing local-persistence feature.
This change does not add restoration of an unfinished clock round after closing.
