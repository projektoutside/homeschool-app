# Final Fix Report — Defender Champion Square Grid / Portrait

Date: 2026-08-20

Review base: `dc3ed5f55e7880d9c3569f29fdaff052f68b2132`

Branch: `codex/defender-champion`

Validation tier: Tier 3

Result: PASS within the executed Windows Chromium, automated, and code-review scope. Physical iOS, Android, phone, tablet, and Capacitor binaries were not available and are not represented as physically tested.

## Completed review findings

| Finding | Final implementation and evidence |
| --- | --- |
| Spatial truth / early-gate capacity | Lane-aware presentation never searches forward for attacking, queued, or moving bodies. Attackers retain exact authoritative contact, queues remain strictly behind their living gate in stable order, and movers never display beyond authoritative progress. A deterministic FIFO admission guard keeps excess early-gate requests pending until one of the authored entrance lanes has 80 same-lane / 40 adjacent-lane progress clearance. Every living enemy remains individually projected; nothing is aggregated or hidden. Real Level 7/10 snapshots and the synthetic progress-960 gate assert containment, <=1/3 overlap, contact, queue order, no-forward motion, transform alignment, cap 18, and attacker cap three. |
| Initial landscape lifecycle | Phaser post-boot installs a pause replay that applies the current composed pause immediately and after every scene create/activation. It pauses scene systems directly instead of relying on a pre-boot loop sleep. A direct-load 844x390 headed replay held simulation tick, scene time, animation frame, fixed-step accumulator, and audio state at zero before any portrait transition; portrait return removed only orientation and retained the host pause reason. |
| Game-scoped native portrait request | Defender sends same-origin, source-bound request/release messages with a bounded request ID. `GamePlayer` validates the active Defender iframe, game ID, action, portrait value, and request ID, then uses an injected native host bridge, an already-present Capacitor ScreenOrientation capability when available, or the browser Screen Orientation API. No capability returns `{ supported:false, success:false }`. No dependency, manifest-wide lock, or protected Capacitor config change was introduced. Stop also cancels/re-releases an in-flight host lock after a late acknowledgement. |
| Keyboard contract | Enter and Space activate the focused cell; Home selects `r0c0`; End selects `r11c8`; arrows move by row/column. Tab and Escape are not trapped by the battlefield. Pause remains on the visible pause button and is documented in the screen-reader instructions. Handler-level tests dispatch real key events, and headed phone proof builds with Space/Enter and verifies Home/End/Tab/Escape. |
| Accessible action state | One `resolveCellActionState` drives visuals, labels, actionability, and `aria-disabled` from terminal state, occupancy, enemy coverage, selected terrain role, cost, and current coins. Occupied cells stay actionable for upgrade/sell. Headed assertions cover occupied, 120-coin unaffordable with 50 coins available, terrain-incompatible, enemy-blocked, and terminal cells. |
| Endpoint art | Entrance/castle anchors extrapolate one cell beyond the first/last road centers. Both are noninteractive and below the 108-cell interaction layer. The entrance continuation renders above the first road art in a 120x20-world-pixel clipped margin strip; the castle retains a clipped 146.61x57.74 portion. The first and last cells remain full-square interactive on phone and tablet. |
| Test integrity / bundle parity | Lifecycle and keyboard guards execute scene/input behavior. The build test uses esbuild with `write:false`, compares SHA-256 and exact bytes against the committed bundle, and creates no output artifact. `.gitattributes` pins the generated Defender bundle to LF so the same bytes survive a clean Windows checkout. The final generated bundle is 1,580,069 bytes, SHA-256 `6D5F2B1FA520E23625F32CB3C0AC9FF0F135FFD1AA5B5B27DE953D5F6B9EF1DA`. |
| Legacy terminology | `presentation.js` accepts only `cell`; its `pad` and `layer` fallback is gone. The balance variable is `cellDifferenceRatio`. Production Defender source has no exact legacy `padId`, `pads`, `slotId`, `slots`, `legacyPad`, `legacySlot`, or `padDifferenceRatio` identifier. Remaining test-only `pad` mentions are the negative compatibility rejection fixture and asset-normalization metadata; queue `slot` means a current combat contact/queue position. |
| Shared caps | `core/rules.js` is the dependency-neutral origin for `MAX_LIVING_ENEMIES = 18` and `MAX_ATTACKERS_PER_GATE = 3`; placement, lane combat, and waves import/re-export those identities. An executable module-identity/use test protects the contract without a cycle. |

## TDD and review record

- The reviewer progress-960 probe first showed presentation searching forward past a living gate. The initial 390px Level 7 checkpoint showed body overlap approaching 1.0. A first preferred-lane guard then exposed a same-render-lane progress-0/progress-29 collision. A coarse 96-progress admission rule prevented Levels 5, 6, and 9 from terminating, and a 48/96 variant rejected a required Level 9 purchase. Those variants were discarded. The final adaptive 40/80 rule is the smallest version that passes real phone spatial evidence and all campaign/economy semantics.
- The combined suite caught two stale pre-admission lane-offset sentinels: RED 225/227 in `163387.7657 ms`; the expectations now derive from the shared entrance policy. Final simulation-focused result: 35/35 in `528.2534 ms`.
- Pending portrait cleanup was reproduced RED at 6/7 in `506.4991 ms` because stop emitted no release before host acknowledgement. The epoch/release fix passed 7/7 in `146.0436 ms`.
- Rendered entrance occlusion was reproduced RED at 0/1 in `138.801 ms`: the entrance depth was below its covering first road tile. The presentation-margin depth/size fix passed 1/1 in `140.2378 ms`, then passed the strengthened headed 120x20 visible-bound assertion.
- Exact candidate `2ddb5208d4ade0c6252c4256e4a7deb62d301332` reproduced a clean-Windows-checkout line-ending defect: 264/265 repository tests passed in `161900.5994 ms`, but the checked-out bundle SHA-256 was `5B7E2B378F2931B3A29C39BB8E6AC0807433009C4A73D586292C7EA3C1F2B191` while the exact in-memory build was `6D5F2B1FA520E23625F32CB3C0AC9FF0F135FFD1AA5B5B27DE953D5F6B9EF1DA`. Pinning this generated bundle to LF fixes checkout parity rather than weakening the byte assertion.
- Final build/runtime focused verification passed 70/70 in `3307.2431 ms`; bundle parity is part of that run.

No production behavior was changed before its focused executable RED. Temporary collectors and experimental admission constants were removed before final verification.

## Spatial-truth balance ruling and exact rebaseline

Ruling: truthful readable presentation and authoritative FIFO admission/backpressure are binding. The former literal terminal ticks were regression sentinels, not player-facing authority. Do not visually teleport a live enemy, detach an attack from a living gate, or retune combat simply to recover an obsolete tick.

Cost if wrong: campaign completion times shift and downstream exact expectations require refresh. The two independent full passes prove the final literals are stable while all gameplay outcomes and economy remain intact.

| Fixture | Previous tick / score | Final tick / score |
| --- | ---: | ---: |
| Level 2 balanced | 14700 / 1054 | 15588 / 1054 |
| Level 3 balanced | 29898 / 1235 | 30569 / 1235 |
| Level 5 balanced | 30299 / 1125 | 31008 / 1125 |
| Level 5 artillery | 33035 / 1125 | 33596 / 1125 |
| Level 6 balanced | 25156 / 1412 | 26254 / 1412 |
| Level 7 balanced | 28013 / 4539 | 24952 / 4539 |
| Level 8 balanced | 22114 / 3726 | 21302 / 3732 |
| Level 9 balanced | 40506 / 3631 | 40590 / 3631 |

Everything else remains exact: 20/20 mixed reference victories with three hearts; 10/10 no-build defeats; 8/8 Level 7/10 reinvesting mono-roster defeats; Level 4/7/10 paid rebuilds; accepted authored commands; footprints, purchase counts, spend leaders, and all unaffected scores/ticks; living cap 18; attacker cap three; boss mechanics; and campaign difficulty semantics.

Two independent runs of:

```powershell
node --test scripts/defenderChampion.balance.test.mjs
```

- PASS 1: 3/3 tests, 0 failed/skipped, `160904.233 ms`.
- PASS 2: 3/3 tests, 0 failed/skipped, `160402.4244 ms`.

## Final automated gates

```powershell
npm run build:defender-champion
$defenderTests = Get-ChildItem scripts -Filter 'defenderChampion*.test.mjs' | Sort-Object Name | ForEach-Object FullName
node --test $defenderTests
npm run typecheck
npm run lint
npm run audit:games
npm run audit:assets
git diff --check
```

- Generated Defender bundle: PASS; exact in-memory byte/hash parity.
- Complete Defender suite after the final orientation cleanup: PASS 228/228, 0 failed/skipped, `163403.6474 ms`.
- TypeScript: PASS.
- ESLint: PASS.
- Game audit: PASS, 82 content entries.
- Asset audit: PASS, 763 files; only pre-existing report-only size notices.
- Whitespace gate: PASS; only configured LF-to-CRLF working-copy warnings.

## Headed Windows Chromium evidence

Owned server: `http://127.0.0.1:43176/`. Headed Chromium contexts were reused serially and closed after each run.

```powershell
node output/playwright/defender-champion-final-fix/browser-final-fix.mjs
$env:TASK9_PHASES='matrix,motion,resilience'
node output/playwright/defender-champion-task9/browser-replay.mjs
node output/playwright/defender-champion-task9/payload-ledger.mjs
```

Final-fix replay: PASS from `2026-08-20T14:14:56.424Z` through `2026-08-20T14:15:54.720Z`; six Level 7/10 desktop+390 spatial checkpoints, initial landscape, keyboard/accessibility/endpoints, desktop/mobile performance, 11 screenshots, and zero unexpected diagnostics.

- Level 7 artillery active-attack maximum overlap: desktop `0.070053`, phone `0.325197`.
- Level 10 active attack/queue maximum overlap: desktop `0.238576`, phone `0.330044`, below one third.
- At every checkpoint: every living snapshot had an individual body/view; bodies were contained; ordinary/boss art met 38/52 CSS-pixel floors; attackers stayed at contact; queues stayed ordered/behind; movers never projected forward; and projectile/effect/health transforms matched the body root.
- Initial 844x390 direct load held tick `0`, scene time `0`, animation frame `0`, and accumulator `0` across 600ms plus synthetic 1,000ms. Returning portrait retained `host` and cleared only orientation.
- Phone semantics: occupied label remained actionable; unaffordable label was `Ironwarden costs 120 coins, insufficient funds (50 coins available)`; incompatible, enemy-blocked, and terminal labels/disabled states passed. Tab exited to `battle-start-button`; Escape did not steal grid focus.
- Endpoint bounds: entrance anchor `(360,-40)` with clipped `(left=300, top=0, width=120, height=20)`; castle anchor `(360,1000)` with clipped `146.61x57.74`. Both were noninteractive and first/last cell hits succeeded.
- Frame performance: desktop p95 `13.38 ms`; mobile-emulated p95 `13.38 ms`.

Broader replay: PASS from `2026-08-20T14:16:29.989Z` through `2026-08-20T14:17:07.951Z`; six portrait viewports, representative rotations, reduced motion, essential/optional asset failure, storage/audio denial, corrupt save, lifecycle, embedded, and standalone modes; 13 screenshots and no unexpected diagnostics.

Payload: PASS, 51 requested files / `14,816,232` raw bytes, `183,768` below the strict 15,000,000-byte cap.

Evidence remains ignored runtime output:

- `output/playwright/defender-champion-final-fix/browser-evidence.json`
- `output/playwright/defender-champion-final-fix/*.png`
- `output/playwright/defender-champion-task9/browser-evidence.json`
- `output/playwright/defender-champion-task9/*.png`
- `output/playwright/defender-champion-task9/payload-ledger.json`

Physical/emulated truth:

- Physically exercised: Windows desktop, headed Chromium, and a real local HTTP server.
- Browser-emulated: 360x640, 390x844, 393x852, 768x1024, 820x1180, 1024x1366; touch, rotation, reduced motion, and mobile performance.
- Automated/code-reviewed only: iPhone/iPad Safari differences, Android-browser differences, installed native orientation capability, and Capacitor shell binaries.

## Native bridge ruling

No ScreenOrientation native plugin is installed, and adding a runtime dependency or whole-app AndroidManifest/Info.plist orientation lock would violate the final-fix constraints. The smallest viable solution is the tested Defender-only host message seam plus injected-native / already-registered-Capacitor / browser capability adapter. Correctness continues to depend on the authoritative landscape overlay and composed pause reason, not on lock support.

Cost if wrong: a future native shell that exposes none of the three capability surfaces will report unsupported and rely on the overlay; it will not silently claim a lock. Physical native-shell validation remains a release-device follow-up, not passing physical evidence here.

## Protected paths and cleanup

The protected working files retained the same SHA-256 values recorded before this final fix and were never staged, reverted, regenerated, or edited:

| Path | SHA-256 |
| --- | --- |
| `capacitor.config.json` | `7EB94F474DC09F8AC1C6D1849A8E512929626B43DA6DB6156A2989FFC5F43292` |
| `public/Games/Quiz it Polygon!/js/app.bundle.js` | `7FC0A124CBD7B5FB900BE8DB791ED996A19F074CDE3CF97AEE1B36D1B0548E0B` |
| `public/Worksheets/manifest.json` | `C5EC910B261D5293053DEDF3A2C6C5FB994AB8ED3C8F75C633605B545B295253` |
| `public/manifest.json` | `B90A476DAB81164943E52733AF4776F905D13C1A58FC0D926F8F5AF64F2E5742` |

Root `X:\homeschool-app\progress.md` remained untouched. The owned server/browser and detached verifier cleanup are recorded after the exact candidate gate.

## Exact-commit verifier

The first detached candidate gate correctly failed only the clean-checkout bundle parity assertion described above and its disposable worktree/junction were removed.

LF-normalized candidate `c7d984f823719f2125e16232edd0401c66ebee6f` then passed the clean-checkout bundle test 2/2 in `481.0447 ms` and the complete detached command:

```powershell
npm run check
```

Result: PASS. Repository tests passed 265/265 with 0 failed/skipped in `163510.3774 ms`; typecheck, lint, 82-entry game audit, 763-file asset audit, deterministic catalog/install/worksheet generators, Quiz bundle, exact Defender bundle, and Vite production build all passed. Total command duration: `204213.8 ms`.

The verifier generated only disposable-checkout build products; its Defender bundle remained exactly 1,580,069 bytes / SHA-256 `6D5F2B1FA520E23625F32CB3C0AC9FF0F135FFD1AA5B5B27DE953D5F6B9EF1DA`. The junction and detached worktree were removed. This report/ledger-only amend is rerun through the same exact gate before handoff; no production or test bytes change between the two candidate trees.
