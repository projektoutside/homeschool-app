# Final integration review — 2026-10-24

Integration branch: `codex/final-integration-20261024`.
Reviewed base: `33a95d0fc1da0cd349db2df298effa33934a2e12`.

## Source reconciliation

Fresh remote discovery included every head, rather than relying on this clone's
main-only fetch configuration. Every existing branch tip was already an ancestor
of the reviewed main. No feature commits or merge conflicts remained to combine.
Published history was preserved; this integration adds one final commit.

| Source | Reviewed tip | Decision |
| --- | --- | --- |
| main / games-touch-voice-birds-v2 | `33a95d0` | Retain current game, speech, Preschool, and Android release work |
| remote codex/android-game-stability | `4795909` | Already included |
| local/remote codex/homeschool-release-audit | `2ba189c` | Already included |
| remote codex/runtime-stabilization-cleanup-20260401 | `62fbba9` | Already included |
| X: codex/android-on-demand-game-download | `f26b006` | Already included |
| X: codex/defender-champion | `69a0017` | Already included |
| X: older main | `892cbfe` | Already included |
| older detached 7269 worktree | `2bbb291` | Already included; clean |

The separate `X:\homeschool-app` checkout was reviewed without modification.
Its source comparison found 161 equivalent files, 39 differences, and nine files
absent from current main. The differences include superseded game/build snapshots
and unfinished August guest-persistence/account-recovery plans and helpers. Those
plans remain unchecked and would alter current guest and account contracts without
provider validation. They were preserved in their original checkout, not merged.
The proposed duplicate validation workflow was also excluded: the existing Pages
workflow already performs the complete release gate.

Before integration, Git refs/worktree inventory and a recovery bundle were saved
under ignored `output/integration-2026-10-24/recovery/`; earlier release recovery
artifacts were retained. No old branch or worktree was deleted.

## Corrections

- **Retry after a failed route import:** the error boundary previously only reset
  component state, leaving React.lazy's rejected import cached. Retry now reloads
  the current document, retaining its route, query, hash, and session storage.
- **Home recovery on GitHub Pages:** the recovery button now respects the build's
  base path instead of navigating to the host root. Root and native-relative
  builds retain their expected home path.
- **Dependency gate:** update only the lockfile's transitive development tools:
  zod 4.6.7, fast-uri 3.1.9, and serialize-javascript 7.1.4. No dependency override,
  forced downgrade, runtime library change, or CI/security-gate relaxation.

React documents that lazy import promises and their results are cached:
[React.lazy](https://react.dev/reference/react/lazy).
Relevant advisories: [zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), and
[serialize-javascript](https://github.com/advisories/GHSA-m5mm-p8h7-m29v).

## Validation before commit/push

Tier 3: routing, recovery, embedded games, and production deployment paths.

- Baseline and final `npm run check` passed: TypeScript, ESLint, 420 tests,
  84 content entries, 1,136 assets, and the production build.
- Final validation used an independent managed worktree with its own clean
  `npm ci --ignore-scripts --no-audit` installation. The source checkout's shared
  dependency junction was preserved. SHA-256 comparisons proved the validated
  component, browser driver, and lockfile match the integration source.
- `npm audit --audit-level=high` passes: zero high/critical advisories. Three
  moderate Capacitor CLI/xcode/uuid development-tool advisories remain; the
  audit's suggested Capacitor downgrade was deliberately avoided.
- `scripts/errorBoundaryRecovery.browser.mjs` exercises the actual component
  with rejected React.lazy imports: five desktop, Android-viewport, iPhone/tablet
  WebKit, and native-relative-base profiles. All pass Retry, retained URL/session,
  base-aware Home, and horizontal-overflow assertions. Before the correction,
  Retry failed in all five and Home failed for Pages subpaths.
- Actual app recovery passes in development and production builds on desktop
  Chromium and Windows WebKit iPhone/tablet viewports. Production fault injection
  blocks service workers to isolate module rejection from first-install controller
  reloads. Initial harness attempts raced that normal reload; they are retained
  as test-setup failures, not hidden as clean first runs.
- Manual browser interaction verified Guest entry, the 3D homepage, game catalog,
  Many Birds menus and all 18 Custom Play levels, iframe exit, Preschool tutorial,
  eight challenge stages and locks, a fresh empty question, and Help/back controls.
  No points or level completions were awarded during this inspection.

Evidence: ignored `output/integration-2026-10-24/` contains full check/audit logs,
source hashes, before/after recovery reports and screenshots, and manual captures.
The local uncommitted build metadata still identifies its base commit, so the
source-hash receipt, rather than that metadata alone, identifies the candidate.

## Boundaries and release follow-through

These are desktop-browser and viewport/engine-emulation results, not physical
iPhone/iPad/Android, real microphone, or native-shell acceptance. No Android device
was attached and the configured device-lab service did not respond. Local
Supabase configuration was absent; authenticated/provider behavior remains an
explicit gap. Existing game hardware-sensitive tests were not represented as new
real-device proof.

The build retains existing large-asset and chunk-size warnings; asset auditing
reports no blocking assets. No broad asset rewrite was introduced during final
integration.

Only after these checks: create one final commit, fast-forward main, push once,
and verify the exact-head existing GitHub Pages workflow and live release. Save
fresh post-launch customer-journey evidence separately. No additional mobile-store
release or new deployment system is part of this integration request.

Retain the user's live preview and all pre-existing work/release artifacts. Close
only temporary task-owned test resources after preserving their evidence.
