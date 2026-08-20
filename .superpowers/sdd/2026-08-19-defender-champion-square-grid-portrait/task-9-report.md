# Task 9 Report — Final Square-Grid Portrait Quality Gate

Date: 2026-08-20

Task base: `4dbce08f057295b60a26df1fc120e928cc5ef424`

Branch: `codex/defender-champion`

Validation tier: Tier 3

Result: PASS — No Known In-Scope Risk within the executed Windows Chromium, automated, and code-review scope.

## Final scope

Task 9 found and fixed four narrow rendered-product defects without changing campaign balance, geometry, scale, caps, orientation policy, or asset content:

- Rejected pointer placement now preserves the previously focused square; focus moves only after a build is accepted.
- Manual/host/orientation/modal/visibility pause composition pauses Phaser scenes without sleeping the global loop. A per-game tracked set also prevents duplicate queued pause operations and resumes exactly the scenes paused by the runtime helper. BFCache keeps its separate loop sleep/wake lifecycle.
- The battle Start button now keeps the required 44 CSS-pixel native hit floor.
- Portrait heights up to 680 CSS pixels use a compact two-column defender/action dock, keeping all four cards, tower details, Upgrade, and Sell inside the 360x640 viewport.
- The Defender bundle was regenerated from the final source. Its SHA-256 is `4047D48E62DFA81B765D1BCBD7DA85E193ED5F66D91016EEC5810251E61C7A84`.

The first isolated exact-commit gate also exposed a Windows clean-checkout infrastructure defect: system `core.autocrlf=true` converted `src/generated/contentCatalog.ts` to CRLF, while the deterministic catalog generator intentionally emits LF, causing the catalog parity test to fail before any build generator ran. A one-line `.gitattributes` rule now pins that generated artifact to LF in every checkout. The failed verifier was cleaned, the candidate was amended, and a fresh exact-commit verifier passed the full gate.

Tracked Task 9 product/test files:

- `.gitattributes`
- `public/Games/DefenderChampion/css/game.css`
- `public/Games/DefenderChampion/js/app.bundle.js`
- `public/Games/DefenderChampion/src/main.js`
- `public/Games/DefenderChampion/src/runtime-lifecycle.js`
- `public/Games/DefenderChampion/src/scenes/BattleScene.js`
- `scripts/defenderChampion.runtime.test.mjs`
- this report and the matching progress ledger

The task-brief report path without `-portrait` was treated as the controller-confirmed typo. No sibling workspace or sibling report was created.

## TDD defect record

| Rendered finding | Executable RED witnessed | Narrow GREEN | Exact replay |
| --- | --- | --- | --- |
| A role-incompatible real pointer click changed focus from `r0c0` to `r0c5` even though the build was rejected. | The focused pointer test failed with expected `r0c0`, actual `r0c5`. | `BattleScene.handlePointerDown` changes focus and refreshes focus views only when `attemptBuildAtCell` accepts. | Real Ranger-on-road and Bladeguard-on-grass rejections preserve coins and focus; legal edge/corner touch placements still accept. |
| The pause UI changed to resumed but the rendered Phaser tick stayed at 64 after five seconds because ordinary pause slept the global loop. Repeated composed reasons could also queue duplicate pause calls and emit `Cannot pause non-running Scene` warnings. | The new runtime-pause test first lacked the helper/failed the no-loop-sleep contract, then its stronger repeated-reason sequence exposed duplicate queued scene pause operations. | `applyRuntimePauseState` owns a per-game set of helper-paused scenes, never sleeps the ordinary global loop, and calls the battle resume hook after scene resume. | Browser witness progressed from tick 62 to 64 while paused, then from 64 to 365 after resume; composed lifecycle replay had zero unexpected console warnings/errors. |
| The 360x640 battle Start control measured 40 CSS pixels high. | The new 44-pixel CSS contract failed against `min-height:40px`. | Raised only `.battle-start-button` to `min-height:44px`. | All enabled native controls in all six portrait sizes meet 44x44 CSS pixels. |
| After selecting a tower at 360x640, its contextual action row extended below the viewport. | The new compact-dock contract failed before a short-portrait layout existed; the exact browser rectangle assertion reproduced the clipped Upgrade/Sell row. | Added the `orientation:portrait` / `max-height:680px` two-column dock and action panel. | The complete board, HUD, four cards, tower stats, Upgrade, and Sell fit without document scroll or horizontal overflow at 360x640 and the other five portrait sizes. |

Focused GREEN checks were run after each fix, followed by bundle rebuilds and exact headed-browser replays. No test, balance fixture, geometry assertion, cap, scale, orientation, accessibility requirement, or threshold was weakened.

The repository-gate line-ending failure was independently witnessed in a newly created detached Windows worktree: `src/generated/contentCatalog.ts` contained 1,376 CRLF line endings, while the generator's first output contained LF and `scripts/content-parity.test.mjs` failed its exact deterministic comparison. The `.gitattributes` fix changes checkout normalization only; it does not modify catalog data or a protected manifest.

## Automated and repository preflight

Commands and final results in the Task 9 worktree:

```powershell
npm run build:defender-champion
$defenderTests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | ForEach-Object FullName
node --test $defenderTests
npm run audit:games
npm run audit:assets
npm run typecheck
npm run lint
git diff --check
```

- Defender bundle: PASS, deterministic 1.5 MB generated bundle.
- Defender suites: PASS, 217 tests / 217 passed / 0 failed / 0 skipped; final duration `149069.9175 ms`.
- Game audit: PASS, 82 catalog entries.
- Asset audit: PASS, 763 files checked; only the existing report-only oversized-asset notices.
- TypeScript: PASS.
- ESLint: PASS.
- Diff whitespace gate: PASS; only Git's configured LF-to-CRLF working-copy notices.
- The final exact candidate additionally passes the isolated full `npm run check` repository gate described below.

Automated deterministic balance evidence remains exact: 20 mixed victories, 10 no-build defeats, 8 late mono-roster defeats, living cap 18, attacker cap 3, Warlord speed 42 / castle damage 3, the Level 7 simultaneous 10- and 32-Skitter authored groups, the Level 10 three-Warlord 114-tick group, and the Level 7/10 death/rebuy ticks.

## Headed Chromium replay

The owned server ran only on `http://127.0.0.1:43176/`. One headed Chromium process was reused by the replay; contexts were closed before the next mode and no duplicate server or browser was launched.

```powershell
node output/playwright/defender-champion-task9/browser-replay.mjs
```

Result: PASS, completed `2026-08-20T10:19:01.250Z`, 41 inspected screenshots, no page errors, failed requests, bad responses, or unexpected console warnings/errors in ordinary, matrix, campaign, performance, lifecycle, embedded, standalone, storage/audio-denial, corrupt-save, or reduced-motion contexts. The essential and optional failure-injection contexts intentionally generated only their requested missing-asset network failures; Retry/Exit and playable fallback behavior passed.

Evidence is intentionally ignored runtime output:

- `output/playwright/defender-champion-task9/browser-evidence.json`
- `output/playwright/defender-champion-task9/browser-replay.mjs`
- `output/playwright/defender-champion-task9/*.png`

### Ordinary product path

- Ordinary mode was run first at 390x844; `window.__defenderChampion` was absent.
- The live board exposed 108 square cells. Road tiles and interaction cells were 1:1 with clean caps/corners; no circle marker or range ring was rendered.
- Ranger-on-road and Bladeguard-on-grass were atomically rejected without focus or coin mutation. Legal road/grass builds and edge/corner touch placement were accepted.
- Individual defender and enemy idle/attack/mastery art, attacks, hits, health loss, result flow, 1x/2x, pause/resume, save, Continue, replay, and exit were exercised.
- Screenshots: `ordinary-level1-planning-390x844.png`, `ordinary-level1-live-attack-390x844.png`, and `ordinary-level1-result-390x844.png`.

### Exact portrait matrix and rotation

| Viewport | Result |
| --- | --- |
| 360x640 | PASS |
| 390x844 | PASS |
| 393x852 | PASS |
| 768x1024 | PASS |
| 820x1180 | PASS |
| 1024x1366 | PASS |

Every portrait had zero document/horizontal overflow; equal cell width/height within 0.5 CSS pixels; complete board/HUD/cards/pause/speed/context actions; enabled 44x44 CSS-pixel controls; defender bodies at least 44 CSS pixels; ordinary enemies at least 38; bosses at least 52. Landscape overlays covered the full screen, froze tick/audio, trapped focus in the rotate dialog, and cleared only `orientation` on return to portrait while preserving other pause reasons. Representative landscape evidence exists at 390x844, 393x852, and 1024x1366 rotations. Reduced motion retained explicit attack/hit communication at tick 4270.

### Rendered campaign and hard waves

All ten rendered mixed victories completed deterministically:

| Level | Result tick | Peak living |
| --- | ---: | ---: |
| 1 | 2086 | 0 |
| 2 | 14700 | 8 |
| 3 | 29898 | 8 |
| 4 | 37972 | 10 |
| 5 | 30299 | 9 |
| 6 | 25156 | 8 |
| 7 | 28013 | 14 |
| 8 | 22114 | 8 |
| 9 | 40506 | 8 |
| 10 | 40492 | 18 |

- Separate rendered Level 1 no-build defeat: tick 31915.
- Level 7: authored zero-interval group boundaries were observed at tick 3271 (wave 5, group size 10) and tick 3847 (finale, group size 32). Capacity/backpressure staged the actual rendered deliveries at fixed scale; the dense queued Skitter delivery remains individually readable. Source/config tests prove the exact simultaneous group counts and intervals.
- Level 7 `r2c2`: permanent death at tick 11647, rendered defeat at 11648, no refund, accepted paid same-cell rebuild at tick 18000.
- Level 10: three Ironhide Warlords were concurrently rendered at tick 5725, with three stable IDs/positions. Source/config tests prove the 114-tick authored spacing.
- Level 10 `r1c2`: permanent death at tick 3444, rendered defeat at 3445, no refund, accepted paid same-cell rebuild at tick 35000.
- Dread Colossus threshold evidence: 75% at tick 20635, 50% at 21235, 25% at 21745; each showed the boss, individual capped units, telegraph/threshold communication, and summons waiting behind the shared living cap.
- Visual review of all 41 screenshots found crisp square cells, no circular/ring battlefield UI, complete native controls, fixed-scale individual unit art, readable dense Level 7/10 combat, and correct attack/death/result states.

### Performance, pools, and payload

The dense Level 10 checkpoint was captured at tick 289 with exactly 18 living snapshots, 18 active enemy views, 0 missing views, and fixed density scale.

| Profile | Samples | Average frame | p95 frame | Requirement |
| --- | ---: | ---: | ---: | --- |
| Headed desktop Chromium | 120 | 13.338 ms | 13.36 ms | PASS, 60 FPS budget |
| Emulated mobile Chromium | 120 | 13.339 ms | 13.37 ms | PASS, 30 FPS budget |

The enemy pool created/high-watered at 18 and reset to 0 active/created after the new Level 10 restart. Projection diagnostics were empty.

```powershell
node output/playwright/defender-champion-task9/payload-ledger.mjs
```

Payload result: PASS — 51 requested first-load files, `14,801,907` raw bytes, `198,093` bytes below the strict `15,000,000` cap. Exact entries are in `output/playwright/defender-champion-task9/payload-ledger.json`.

### Resilience and host paths

- Essential raster failure: blocking recovery UI, Retry reached Menu, Exit present.
- Optional raster failure: gameplay remained playable with the intended single optional-art diagnostic.
- Storage denial, corrupt save, and denied AudioContext: safe fallback and continued play.
- Host mute/pause, synthetic visibility pause, BFCache suspend/resume: composed state and real rendered frames recovered.
- Embedded iframe exit posted `LAHS_GAME_EXIT_TO_HOME` / `games` and tore down.
- Standalone safe-history exit and no-referrer application-root fallback passed.

## Physical and emulated truth

- Physically exercised: Windows desktop with headed Chromium and a real local HTTP server.
- Browser-emulated: 360x640/390x844/393x852 phone viewports, 768x1024/820x1180/1024x1366 tablet viewports, touch input, rotations, mobile performance profile, and `prefers-reduced-motion`.
- Code-reviewed plus automated contracts only: iPhone/iPad Safari, Android browser differences, and Capacitor/native-shell behavior.
- No physical phone, tablet, iOS Safari device, Android device, or Capacitor binary was exercised in this task.

## Exact-commit verifier and cleanup

The candidate commit was checked from a detached disposable sibling worktree at the resolved path `X:\homeschool-app\.worktrees\defender-square-grid-verify`. Before creation/removal, the absolute path was validated as that exact intended sibling. The existing Task 9 `node_modules` was attached only through `defender-square-grid-verify\node_modules` as a directory junction.

```powershell
npm run check
```

Result: PASS at the exact candidate commit — repository tests, TypeScript, ESLint, 82-entry game audit, asset audit, Quiz build, Defender build, and Vite build all completed successfully. The junction was removed, the detached verifier worktree was removed, and Git worktree metadata was pruned.

The headed Chromium replay closed its contexts and browser. The owned Vite server was interrupted and `Get-NetTCPConnection -LocalPort 43176 -State Listen` returned no listener. Temporary debug scripts/captures were removed; the final evidence bundle remains ignored.

## Protected primary-worktree proof

The four protected paths were never edited, staged, reverted, or regenerated by Task 9. Their before/after SHA-256 values are identical:

| Protected path | SHA-256 before and after |
| --- | --- |
| `capacitor.config.json` | `7EB94F474DC09F8AC1C6D1849A8E512929626B43DA6DB6156A2989FFC5F43292` |
| `public/Games/Quiz it Polygon!/js/app.bundle.js` | `7FC0A124CBD7B5FB900BE8DB791ED996A19F074CDE3CF97AEE1B36D1B0548E0B` |
| `public/Worksheets/manifest.json` | `C5EC910B261D5293053DEDF3A2C6C5FB994AB8ED3C8F75C633605B545B295253` |
| `public/manifest.json` | `B90A476DAB81164943E52733AF4776F905D13C1A58FC0D926F8F5AF64F2E5742` |

Root `X:\homeschool-app\progress.md` remained outside Task 9 and untouched. The primary Task 9 worktree finishes with only these four protected unrelated paths unstaged.

## Final assessment

PASS. The square-grid portrait contract, exact campaign outcomes, hard-wave readability, cap/view/pool invariants, payload, responsive/touch/accessibility paths, lifecycle/host resilience, generated bundle, and exact-commit repository gate have passing evidence. Remaining platform-specific limitation: physical iOS Safari, Android, tablet, and Capacitor validation was unavailable and is reported accurately rather than represented as physical coverage.
