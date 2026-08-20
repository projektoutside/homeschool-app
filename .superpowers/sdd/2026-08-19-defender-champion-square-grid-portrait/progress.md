# SDD ledger — plan: docs/superpowers/plans/2026-08-19-defender-champion-square-grid-portrait.md

## Pre-flight interface and self-consistency scan

| Tasks | Producer / consumer or self-check | Finding |
| --- | --- | --- |
| 1 | Creates `grid-geometry.js`, adds immutable `roadCells`/`cells`, retains legacy `path`/`pads`, and tests exact 9 by 12 maps | Internally consistent; the migration bridge is explicitly removed only after consumers move in Task 5. |
| 2 | Consumes Task 1 cell IDs/centers and migrates build commands, entities, snapshots, combat, presentation, and asset lookup | Internally consistent; focused RED covers schema and compatibility before production changes. |
| 3 | Adds the 18-living FIFO spawn cap and boss summons to the Task 2 cell-based simulation | Internally consistent; scheduled and boss spawns share one cap/queue contract. |
| 4 | Derives melee gates/queues from grid cells and projects fixed readable unit positions | Internally consistent; queue presentation remains projection-only and the simulation stays authoritative. |
| 5 | Replaces the legacy battlefield renderer/input with square cells and removes `path-geometry.js` only after migration | Internally consistent; deletion is sequenced after Tasks 1–4 establish all replacement consumers. |
| 6 | Adds portrait-only orientation lifecycle and accessible rotate cover | Internally consistent; orientation is a composed pause reason, not a separate simulation clock. |
| 7 | Reauthors Levels 1–6 strategies and balance only after grid/combat contracts stabilize | Internally consistent; approved invariants remain fixed and tuning is evidence-backed. |
| 8 | Reauthors Levels 7–10 boss/adversarial balance and removes the final pad adapter | Internally consistent; assertions preserve mixed wins, mono losses, attacker caps, and paid replacements. |
| 9 | Rebuilds the bundle and performs Tier 3 repository/browser/device/performance verification | Internally consistent; fixes are limited to files owned by Tasks 1–8 and must begin with a witnessed RED. |
| 1 → 2 | Grid constants, IDs, centers, terrain, and routes feed placement/simulation schema | Compatible: Task 1 deliberately preserves legacy fields while Task 2 adds cell authority. |
| 1 → 5 | Grid geometry and level terrain feed square Phaser rendering and input | Compatible: Task 5 is the first task allowed to remove legacy path geometry after consumers migrate. |
| 1 → 7/8 | Ten `roadCells`/`cells` maps constrain legal strategy cells and wave tuning | Compatible: map geometry is fixed before balance authorship. |
| 2 → 3 | Cell-based entities/snapshots are extended with pending spawn state | Compatible: Task 3 changes capacity/queue timing without reverting cell ownership. |
| 2 → 4 | Simulation/combat cell positions feed grid-derived blockers and queues | Compatible: Task 4 consumes the Task 2 schema and does not reintroduce pad IDs. |
| 2 → 5 | Cell schema, presentation helpers, and asset metadata feed rendered unit art/input | Compatible: Task 5 completes the renderer migration and preserves combat motion/pools. |
| 2 → 7/8 | Cell commands and simulation test fixtures are reauthored for balance | Compatible: strategy tuning occurs only after schema stability. |
| 3 → 4 | `wave-controller.js`, combat, and simulation share living-cap and queue interfaces | Compatible: Task 4 projects queues; it does not change the 18-living authority. |
| 3 → 7/8 | Spawn timing/cap behavior constrains authored wave and strategy outcomes | Compatible: balance tasks may tune waves/strategies while retaining the cap. |
| 4 → 5 | Gate/queue display data is consumed by `BattleScene` and grid presentation | Compatible: Task 5 renders fixed-scale art from the established projection contract. |
| 4 → 7/8 | Lane-combat attacker limits constrain later deterministic strategy fixtures | Compatible: all mixed fixtures must retain at most three simultaneous attackers. |
| 5 → 6 | HUD, `index.html`, runtime tests, and layout are extended by portrait orientation behavior | Compatible: Task 6 wraps the completed square battlefield without changing grid mechanics. |
| 5 → 7/8 | `levels.js` and config tests move from geometry definitions to balance tuning | Compatible: geometry stays invariant while waves/strategies change. |
| 5/6 → 9 | Runtime/build/host surfaces and generated bundle are verified together | Compatible: Task 9 rebuilds once from final sources and validates ordinary/embedded modes. |
| 7 → 8 | Shared strategies, levels, simulation, and balance tests move from early to late campaign | Compatible: Task 8 preserves Task 7 results while adding boss/adversarial cases. |
| 7/8 → 9 | Deterministic campaign fixtures feed rendered all-level and performance evidence | Compatible: Task 9 verifies rather than silently retunes a passing campaign. |

Pre-flight result: no contradiction between the binding spec, Global Constraints, task-local tests, file ownership, or producer/consumer sequencing was found.

## Execution

Base before Task 1: `d814aa078821be635e14d7dd9fcc735d34760b4b`.

Task 1 review: spec ❌ / quality needs fixes. Open Important findings: missing independently authored invalid-route/terrain/clamping/tile-frame coverage; missing exact full `roadCells` expectations for all ten levels. Minor folded into the same fix: metric/tile fixtures must not use `expandGridPath` to generate their expectations.

Task 1: fix round 1/5 (3 addressed, 0 open — invalid/edge route and terrain coverage added; all ten exact routes asserted; metric/tile fixtures made literal; commits `c09fdeb`..`780130b`).

Task 1: complete (commits `d814aa0`..`780130b`, review clean).

Base before Task 2: `780130b8df5a2e718fb683923b58d28476902b81`.

Task 2 Ruling: the brief lists `src/services/asset-loader.js` as modified, but no Task 2 interface or step requires loader behavior and the task's own commit allowlist omits it. The existing loader is asset-ID/metadata driven and has no pad ownership dependency, so do not create a meaningless no-op hunk; leave it unchanged unless a witnessed focused RED proves a concrete loader migration is required. — The spec favors the smallest complete cell-schema migration and forbids speculative changes. — Cost if wrong: a hidden loader dependency would need a narrow reviewed follow-up before the renderer migration.

Task 2 review: spec ❌ / quality needs fixes. Open findings: current `BattleScene` crashes after a cell-only tower snapshot; pre-simulation mismatch copy still says slots; `occupiedCellIds` is mutable; cell boundary/coverage/occupancy/legacy-map contracts are under-tested.

Task 2 Ruling: extend Fix Round 1 ownership narrowly to `src/scenes/BattleScene.js` and `scripts/defenderChampion.runtime.test.mjs` so the playable renderer remains compatible with cell-only snapshots and the two superseded runtime expectations become green now. Use only a deprecated cell-to-legacy-pad projection adapter and exact new command/copy assertions; do not begin Task 5's square renderer migration. — The spec requires preservation of working gameplay while also forbidding `padId` in new snapshots. — Cost if wrong: Task 5 must delete a small temporary adapter and may need to retune one intermediate runtime fixture.

Task 2: fix round 1/5 (3 addressed, 1 open — copy, immutable metric, and boundary/mapping coverage fixed; renderer adapter still crashes for valid cells outside the eight legacy mappings; commits `c1dd807`..`efbbc23`).

Task 2: fix round 2/5 (1 addressed, 0 open — every valid mapped or unmapped cell projects safely and malformed cells hide; commits `efbbc23`..`068a118`).

Task 2: complete (commits `780130b`..`068a118`, review clean).

Base before Task 3: `068a1189dbed6d8d9c5a7d1b5139bb40536b5e1d`.

Task 3 review: spec ❌ / quality needs fixes. Open Important findings: enqueue leaves `spawnedAllWaves` stale; boss/after-removal requests do not flush immediately when capacity exists; cap counts raw array length rather than living health; combined FIFO/maximum/presentation/teardown/completion tests and complete RED evidence are missing. Minor included: independently justify the reference-strategy tick change.

Task 3: fix round 1/5 (5 addressed, 0 open — completion invalidation, same-tick/post-removal flush, living-only capacity, lifecycle/FIFO coverage, and tick causality all fixed; commits `489fa09`..`f87102e`).

Task 3: complete (commits `068a118`..`f87102e`, review clean).

Base before Task 4: `f87102e2dc1e6a729d81d5e42dd63b5ebefa1be8`.

Task 4 Ruling: extend ownership narrowly to `scripts/defenderChampion.simulation.test.mjs`. Task 4's required full command includes that suite, while its fixed attacker offsets and early-gate readable backpressure intentionally change two hard-coded Task 3 fixture values; preserving the old values through production compatibility hacks would violate the binding Task 4 constants. Update only the affected assertions, add causal capacity/offset evidence, and do not weaken campaign outcomes. — The spec makes readable fixed-scale grid gates authoritative. — Cost if wrong: Tasks 7–8 may need to re-author one affected deterministic timing expectation during balance work.

Task 4 review: spec ❌ / quality needs fixes. Open Important finding: early/interval-constrained queues clamp multiple overflow rows to the same progress and repeat offsets, yielding only eight unique positions for an injected 18-enemy early-gate state. Minors included: independently cover malformed/non-frontline/non-road gate exclusion and high-water persistence through terminal cleanup.

Task 4: fix round 1/5 (2 addressed, 1 open — gate-filter and terminal high-water coverage fixed; fractional overflow makes centers unique but unit footprints still materially overlap; commits `8080a49`..`5d2aec2`).

Task 4 Ruling: fifteen fixed-scale queued bodies cannot physically fit with readable footprints into the 160-world-pixel upstream span of the earliest gate while also retaining 48-progress rows, the 80-pixel road footprint, and no gate crossing. Treat an over-capacity upstream lane as `enemy-occupied` for build evaluation until enough enemies clear; the square remains buildable afterward, all existing enemies remain alive, and accepted gates retain exact readable spacing. Remove reliance on fractional fan-out as a product solution, while retaining safe deterministic behavior for malformed externally injected state. — This resolves the spec's readable-art and every-square-buildable requirements the same way the existing local enemy-cover rule does: temporary traffic can block construction. — Cost if wrong: players must wait to deploy an early melee defender during extreme upstream congestion, a narrower availability window than the original plan implied.

Task 4: fix round 2/5 (1 addressed, 0 open — unreadable over-capacity prospective gates now reject atomically as temporary enemy occupancy and accept at the readable boundary; commits `5d2aec2`..`655fea0`).

Task 4: complete (commits `f87102e`..`655fea0`, review clean).

Base before Task 5: `655fea0fedb14aabf36d7b60738a68df23fcadf1`.

Task 5 Ruling: extend the explicit file ownership to `public/Games/DefenderChampion/src/services/asset-loader.js` and generated `public/Games/DefenderChampion/js/app.bundle.js`. Step 7 explicitly requires the gameplay-atlas usage description update, while Steps 8–9 explicitly require rebuilding and committing the bundle even though the opening file list omits both. — The step-level requirements and final commit allowlist are more specific than the summary list. — Cost if wrong: one asset-description hunk and one deterministic bundle rebuild would need to be reverted, but leaving either out would ship stale runtime behavior.

Task 5 Ruling: extend ownership narrowly to `public/Games/DefenderChampion/src/core/combat.js` because it is the remaining production importer of `path-geometry.js`; the brief simultaneously mandates deleting that module and keeping the bundle green. Replace only its lazy legacy metric construction with `createGridPathMetrics(level.roadCells)` or the existing grid metric state, preserving combat authority and all deterministic tests. — Deletion of the obsolete module is explicit and cannot coexist with a live import. — Cost if wrong: grid total/progress conversion could shift combat timing, which the full core and later balance suites must detect and retune only if evidence-backed.

Task 5 Ruling: extend ownership narrowly to `public/Games/DefenderChampion/src/core/grid-placement.js`. Step 7 requires levels to retain only direct deprecated `{ id, cellId }` translation records until Task 8, but the current adapter ignores direct `cellId` and derives only from the richer legacy pad geometry being removed. Make direct valid mappings authoritative and retain the old derivation solely as a fallback for legacy-shaped fixtures. — This is the smallest bridge that satisfies both the presentation cleanup and Tasks 7–8 strategy compatibility. — Cost if wrong: direct map validation or fallback ordering could reject an old fixture, which the full simulation/config suites must catch.

Task 5 Ruling: extend ownership narrowly to `scripts/defenderChampion.combat.test.mjs`, `scripts/defenderChampion.lane-combat.test.mjs`, and `scripts/defenderChampion.simulation.test.mjs`. The brief's Step 8 explicitly requires all three suites to pass after deleting `path-geometry.js` and simplifying deprecated pad records, so their direct imports/fixture reads must migrate to grid metrics and cell tables. Update only obsolete path/pad fixture setup and evidence-backed exact outputs; preserve combat, lane, terminal, FIFO, and campaign assertions. — Tests cannot remain live consumers of a module the same task must delete. — Cost if wrong: a migrated fixture might hide a timing change, which independent causal assertions and later full balance review must catch.

Task 5 review: spec ❌ / quality needs fixes. Open Important findings: attack/hit motion moves bodies without their health/plates/aura/effects and boss accents use the wrong frame basis; accessible coverage/labels are inferred from shared colors, become stale, and lack row/gridcell semantics; defender defeat transients can exhaust the 108 occupied-view pool on immediate rebuild; malformed cell/unknown-ID entries remain leased or can abort projection. Minor included: a grid adjacency assertion uses `assert.ok` incorrectly.

Task 5: fix round 1/5 (5 addressed, 0 open — shared visual-root motion plus 384-basis boss accent fixed; semantic grid/labels/state refreshed without tab explosion; defender defeat transients moved to a separate bounded pool; malformed tower/enemy projections now release leases and isolate diagnostics; exact square-cell adjacency assertions now enforce the 80-pixel floor and the two affected deprecated cell fixtures were corrected; commits `12ebbdb`..`2bbb558`).

Task 5: complete (commits `655fea0`..`2bbb558`, review clean).

Base before Task 6: `2bbb558734fb51c91a731fe3329daa5196885f94`.

Task 6 Ruling: extend ownership narrowly to `public/Games/DefenderChampion/src/scenes/BattleScene.js`. The brief adds a new external `orientation` pause reason, but the current simulation bridge only projects `host`, `visibility`, and `modal`; without extending that one adapter, landscape lock would not reach the authoritative pause state during active battle. Update only `setExternalPauseReasons` to include `orientation`, preserving simulation authority and existing manual-pause behavior. — The spec binds landscape lock to a real composed pause reason rather than a cosmetic overlay. — Cost if wrong: a one-line adapter change could pause or resume the battle incorrectly and would need a focused regression against the host/orientation lifecycle.

Task 6: complete (commits `2bbb558`..`2477c3e`, review clean).

Base before Task 7: `2477c3eec65486429b2aeb2967104540aedb0992`.

Task 7 Ruling: keep ownership strictly to the early-campaign balance/config/simulation files and the task report/progress ledger. Do not solve the Level 7/10 mono-roster failure introduced by the strengthened balance suite; Task 8 owns that later-campaign behavior.

Task 7: complete (cell-based Levels 1–6 fixtures, stable `upgrade-ref`/same-cell replacement support, Level 4 rebuild-proof wave retune, and owned config/simulation contract updates; review clean).

Task 7: fix round 1 complete (Important test-strength gaps closed without gameplay retune: exact literal expectations for all 12 Levels 1–6 fixtures, explicit Level 4 defeat/repurchase evidence, stale-ref cleanup plus same-ref replacement upgrade regression, one late authored strategy reordered chronologically, and stale config assertions aligned to current immutable levels/strategies; verification green, scoped follow-up commit pending).

Task 7: fix round 2 complete (restored Levels 7–10 live configs and legacy late strategies exactly to base `2477c3e`, removed unused late helper blueprints, restored late config expectations and the >=25% placement-difference contract, and revalidated that the current late strategy command arrays semantically match base while the Levels 1–6 exact-balance contract remains green).
